'use client';

import { useState } from 'react';
import { resetTestData } from '@/actions/dev/cleanup';
import { Button } from '../Button';
import { Textbox } from '../Textbox';

export function AdminResetSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm.');
      return;
    }

    setLoading(true);
    const res = await resetTestData(email);
    setLoading(false);

    if (res.success) {
      alert(`Test data for ${email} reset successfully.`);
      setEmail('');
      setConfirmText('');
      setShowConfirm(false);
    } else {
      alert('Error resetting test data: ' + res.error);
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-red-700">
        Reset Test Records
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        This will delete the user&apos;s profile, applications, and auth
        account. Use with caution.
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            User Email to Reset
          </label>
          <Textbox
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={loading}
          />
        </div>

        {email && (
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className="border-red-500 text-red-500 hover:bg-red-50"
          >
            {loading ? 'Processing...' : 'Reset User Data'}
          </Button>
        )}

        {showConfirm && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-sm font-bold text-red-700">
              ARE YOU ABSOLUTELY SURE?
            </p>
            <p className="mb-3 text-xs text-red-600">
              This action is permanent and cannot be undone. Type
              &quot;DELETE&quot; below to confirm.
            </p>
            <Textbox
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                disabled={loading || confirmText !== 'DELETE'}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Delete
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
