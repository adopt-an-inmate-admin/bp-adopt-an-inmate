'use client';

import { useState } from 'react';
import { resetTestData } from '@/actions/dev/cleanup';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '../Button';

export function DevResetButton() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV !== 'development' || !userEmail) {
    return null;
  }

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to RESET ALL test data for this user? This will delete your profile and application from Supabase and reset your onboarding status.',
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await resetTestData(userEmail);
    setLoading(false);

    if (res.success) {
      alert(
        'Test data reset successfully. You can now start onboarding again.',
      );
      window.location.reload();
    } else {
      alert('Error resetting test data: ' + res.error);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Button
        variant="secondary"
        onClick={handleReset}
        disabled={loading}
        className="border-red-500 bg-white text-red-500 hover:bg-red-50"
      >
        {loading ? 'Resetting...' : 'DEV: Reset My Test Data'}
      </Button>
    </div>
  );
}
