'use client';

import { LuLogOut } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { signOut } from '@/actions/auth';
import { Button } from '@/components/Button';
import { t } from '@/lib/i18n';

interface LogoutButtonProps {
  showLabel?: boolean;
}

export default function LogoutButton({ showLabel }: LogoutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await signOut();

    if (error) alert(error.message);
    else router.push('/');
  };

  return (
    <Button
      type="button"
      onClick={handleSignOut}
      variant="outline"
      aria-label={t('sidebar.logout')}
      className={showLabel ? 'w-full justify-start gap-3 px-4!' : ''}
    >
      <LuLogOut className="h-5 w-5 text-red-9" />
      {showLabel && <span>{t('sidebar.logout')}</span>}
    </Button>
  );
}
