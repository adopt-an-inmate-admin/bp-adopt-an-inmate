'use client';

import { ReactNode, useState } from 'react';
import {
  BsCalendar4Week,
  BsEnvelope,
  BsGenderAmbiguous,
  BsGlobe2,
  BsPerson,
} from 'react-icons/bs';
import { FaRibbon } from 'react-icons/fa';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { useAuth } from '@/contexts/AuthProvider';
import { useProfile } from '@/contexts/ProfileProvider';
import { getDisplayAddress } from '@/lib/formatters';
import { t } from '@/lib/i18n';

type ProfileRowProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

export default function ProfileView() {
  const { profileData, profileReady } = useProfile();
  const { userEmail } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  if (!profileReady) return null;
  if (!profileData) return null;

  return (
    <main className="flex min-h-screen w-full flex-col bg-gray-1">
      {/* Header */}
      <div className="flex w-full flex-col gap-14 border-b border-gray-4 px-16 pt-16 pb-4">
        <div className="flex h-12 items-center gap-3 text-3xl text-gray-12">
          <BsPerson size={36} />
          <h1 className="text-3xl font-normal">{t('profile.title')}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-full w-full justify-center px-16 py-10">
        <div className="flex w-full max-w-2xl flex-col gap-10">
          {/* Account */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-row justify-between">
              <p className="text-base font-medium text-gray-11">
                {t('profile.account')}
              </p>
              <p
                className="cursor-pointer text-base font-medium text-gray-11 underline hover:text-gray-12"
                onClick={() => setIsEditProfileOpen(true)}
              >
                {t('profile.edit_profile')}
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-gray-3 px-8 py-6">
              <ProfileRow
                icon={<BsPerson size={22} />}
                label={t('profile.fields.name')}
                value={`${profileData.first_name} ${profileData.last_name}`}
              />
              <ProfileRow
                icon={<BsEnvelope size={22} />}
                label={t('profile.fields.email')}
                value={userEmail}
              />
            </div>
          </div>

          {/* Personal Info */}
          <div className="flex flex-col gap-4">
            <p className="text-base font-medium text-gray-11">
              {t('profile.personal_info')}
            </p>

            <div className="flex flex-col gap-4 rounded-2xl bg-gray-3 px-8 py-6">
              <ProfileRow
                icon={<BsCalendar4Week size={22} />}
                label={t('profile.fields.dob')}
                value={new Date(
                  `${profileData.date_of_birth}T00:00:00`,
                ).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              />
              <ProfileRow
                icon={<BsGenderAmbiguous size={22} />}
                label={t('profile.fields.gender')}
                value={profileData.gender}
              />
              <ProfileRow
                icon={<BsGenderAmbiguous size={22} />}
                label={t('profile.fields.pronouns')}
                value={profileData.pronouns}
              />
              <ProfileRow
                icon={<BsGlobe2 size={22} />}
                label={t('profile.fields.location')}
                value={getDisplayAddress(profileData.state)}
              />
              <ProfileRow
                icon={<FaRibbon size={22} />}
                label={t('profile.fields.veteran')}
                value={
                  profileData.veteran_status ? t('common.yes') : t('common.no')
                }
              />
            </div>
          </div>

          {/* More */}
          <div className="pt-0">
            <p className="text-center text-gray-10 italic">
              {t('profile.help', { email: 'adopt@adoptaninmate.org' })}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          profileData={profileData}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}
    </main>
  );
}

function ProfileRow({ icon, label, value }: ProfileRowProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">{icon}</div>

      <p className="text-base font-medium text-gray-12">{label}</p>

      <p className="ml-auto text-base text-gray-11">{value}</p>
    </div>
  );
}
