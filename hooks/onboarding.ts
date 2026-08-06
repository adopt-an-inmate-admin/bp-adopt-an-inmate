import z from 'zod';
import Logger from '@/actions/logging';
import { createRow } from '@/actions/monday/mutation';
import { upsertProfile } from '@/actions/queries/profile';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { capitalize, capitalizePronouns } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Profile } from '@/types/schema';
import { OnboardingInfo } from '@/types/types';

// schema used by useSubmitOnboarding for data validation
const onboardingSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dob: z.date(),
  gender: z.enum(['male', 'female', 'other']),
  pronouns: z.string().optional(),
  location: z.string(), // now holds full address
  isVeteran: z.boolean(),
  howDidYouHear: z.string(),
  howDidYouHearOther: z.string().optional(),
  adoptedBefore: z.boolean(),
  stillActive: z.boolean().optional(),
  numPastActive: z.number().optional(),
  pastInactiveReason: z.string().optional(),
});

/**
 * Provides a helper function to submit
 * currently stored onboarding information
 * to Supabase.
 */
export const useSubmitOnboarding = () => {
  const { onboardingInfoRef } = useOnboardingContext();

  const submitOnboardingInfo = async (overrideInfo?: OnboardingInfo) => {
    try {
      const info: OnboardingInfo = onboardingSchema.parse(
        overrideInfo || onboardingInfoRef.current,
      );

      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Logger.warn(
          'Attempt made to submit onboarding info without logging in',
        );
        return { error: 'You must be logged in to submit onboarding info.' };
      }

      const profile: Profile = {
        user_id: user.id,
        date_of_birth: info.dob.toUTCString(),
        first_name: info.firstName,
        last_name: info.lastName,
        gender: capitalize(info.gender),
        pronouns: capitalizePronouns(info.pronouns || ''),
        state: info.location,
        veteran_status: info.isVeteran,
        how_did_you_hear: info.howDidYouHear,
        how_did_you_hear_other: info.howDidYouHearOther || null,
        monday_id: null,
        past_inactive_reason: info.pastInactiveReason || null,
      };

      const result = await upsertProfile(profile, info.numPastActive ?? 0);
      if (result.error) {
        return { error: result.error };
      }
      await createRow(profile);
      return { error: null };
    } catch (err) {
      Logger.error(`Error in submitOnboardingInfo: ${err}`);
      return { error: 'An unexpected error occurred during submission.' };
    }
  };

  return { submitOnboardingInfo };
};
