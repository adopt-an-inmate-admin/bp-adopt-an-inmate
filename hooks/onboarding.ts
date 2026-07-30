'use client';

import z from 'zod';
import Logger from '@/actions/logging';
import { createRow } from '@/actions/monday/mutation';
import { upsertProfile } from '@/actions/queries/profile';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Profile } from '@/types/schema';
import { OnboardingInfo } from '@/types/types';

// schema used by useSubmitOnboarding for data validation
const onboardingSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dob: z.date(),
  pronouns: z.string(),
  state: z.string(),
  isVeteran: z.boolean(),
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

  const submitOnboardingInfo = async () => {
    try {
      const info: OnboardingInfo = onboardingSchema.parse(
        onboardingInfoRef.current,
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
        pronouns: info.pronouns,
        state: info.state,
        veteran_status: info.isVeteran,
        monday_id: null,
        past_inactive_reason: info.pastInactiveReason || null,
      };

      await upsertProfile(profile, info.numPastActive ?? 0);
      await createRow(profile);
      return { error: null };
    } catch (err) {
      Logger.error(`Error in submitOnboardingInfo: ${err}`);
      return { error: 'An unexpected error occurred during submission.' };
    }
  };

  return { submitOnboardingInfo };
};
