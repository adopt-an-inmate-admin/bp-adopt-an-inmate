'use server';

import type { FeatureExtractionPipeline } from '@huggingface/transformers';
import { pipeline } from '@huggingface/transformers';
import { parseStateFromLocation } from '@/lib/formatters';
import { getSupabaseServerClient } from '@/lib/supabase';
import Logger from '../logging';
import { fetchTopK } from '../queries/query';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
const getExtractor = (): Promise<FeatureExtractionPipeline> => {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { dtype: 'fp32' },
    ) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
};

/**
 * Takes in an application ID and finds four matches
 * based on the application bio stored on the database.
 *
 * Returns existing matches if the application already has matches.
 * Errors if the application bio does not exist.
 */
export const findMatches = async (appId: string) => {
  try {
    // check if app id already has matches
    const supabase = await getSupabaseServerClient();

    const { data: appData, error: fetchAppError } = await supabase
      .from('adopter_applications')
      .select()
      .eq('app_uuid', appId)
      .maybeSingle();

    if (fetchAppError) return { data: null, error: fetchAppError.message };
    if (!appData) return { data: null, error: 'Application not found' };
    if (!appData.personal_bio)
      return { data: null, error: 'Application has no bio' };

    // return existing data
    if (appData.ranked_cards) {
      const matches = appData.ranked_cards as string[];
      return { data: matches, error: null };
    }

    // if we reached this point,
    // then we have not yet created a match

    // find user
    const { data: userProfile, error: fetchUserError } = await supabase
      .from('adopter_profiles')
      .select()
      .eq('user_id', appData.adopter_uuid)
      .maybeSingle();

    if (fetchUserError) return { data: null, error: fetchUserError.message };
    if (!userProfile) return { data: null, error: 'User profile not found' };

    // generate embedding locally
    const extractor = await getExtractor();
    const output = await extractor(appData.personal_bio, {
      pooling: 'mean',
      normalize: true,
    });
    const embedding = Array.from(output.data as Float32Array);

    if (embedding.length === 0 || typeof embedding[0] !== 'number') {
      Logger.error(`Unexpected embedding generated: ${embedding}`);
      return { data: null, error: 'Failed to generate embedding' };
    }

    // Map veteran status to filter criteria
    const matches = await fetchTopK(
      embedding,
      4,
      appData.gender_pref ?? undefined,
      userProfile.veteran_status ? 'Yes' : 'No',
      parseStateFromLocation(userProfile.state),
      appData.age_pref ?? undefined,
    );

    if (!matches)
      return {
        data: null,
        error: 'An unexpected error occurred while finding matches',
      };
    const matchIds: string[] = matches.map(m => m.id);

    // update application
    const { error: updateError } = await supabase
      .from('adopter_applications')
      .update({ ranked_cards: matchIds })
      .eq('app_uuid', appId);

    if (updateError) {
      Logger.error(`Error updating to Supabase: ${updateError.message}`);
      return { data: null, error: 'An unexpected error occurred' };
    }

    return { data: matchIds, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Error in findMatches: ${message}`);
    return { data: null, error: message };
  }
};
