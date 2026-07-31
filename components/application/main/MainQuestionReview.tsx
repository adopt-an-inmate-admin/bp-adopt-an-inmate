'use client';

import { useEffect, useState } from 'react';
import { fetchProfileById } from '@/actions/queries/profile';
import { Button } from '@/components/Button';
import QuestionBack from '@/components/questions/QuestionBack';
import { useApplicationContext } from '@/contexts/ApplicationContext';
import { useApplicationNavigation } from '@/hooks/app-process';
import { formatGenderPreference } from '@/lib/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { ApplicationStage } from '@/types/enums';
import { Profile } from '@/types/schema';

export default function MainQuestionReview() {
  const { appState } = useApplicationContext();
  const { advanceToStage } = useApplicationNavigation();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const data = await fetchProfileById(user.id);
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleContinue = () => {
    advanceToStage(ApplicationStage.MATCHING);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1>Does this look right?</h1>
      </header>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-11">First name</p>
            <p>{profile?.first_name || 'N/A'}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-11">Last name</p>
            <p>{profile?.last_name || 'N/A'}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-11">Date of birth</p>
            <p>
              {profile?.date_of_birth
                ? new Date(profile.date_of_birth).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-11">State</p>
            <p>{profile?.state || 'N/A'}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-11">Sex/Gender</p>
            <p className="capitalize">{profile?.gender || 'N/A'}</p>
          </div>
          {profile?.gender === 'other' && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-11">Pronouns</p>
              <p>{profile?.pronouns || 'N/A'}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-11">Personal bio</p>
          <p>{appState.form.bio}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-11">Gender preference</p>
          <p>{formatGenderPreference(appState.form.genderPreference)}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-11">
            {appState.stillInCorrespondence
              ? 'Reason for adopting'
              : 'Why it ended'}
          </p>
          <p>
            {(appState.stillInCorrespondence
              ? appState.form.whyAdopting
              : appState.form.whyEnded) || 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <QuestionBack />
        <Button variant="primary" type="button" onClick={handleContinue}>
          Looks good
        </Button>
      </div>
    </div>
  );
}
