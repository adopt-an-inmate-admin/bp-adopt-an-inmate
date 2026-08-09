'use client';

import { useState } from 'react';
import { resetTestData } from '@/actions/dev/cleanup';
import { t } from '@/lib/i18n';
import { Button } from '../Button';
import { Textbox } from '../Textbox';

export function AdminResetSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (confirmText !== 'DELETE') {
      alert(t('admin.reset_records.confirm.alert_confirm'));
      return;
    }

    setLoading(true);
    const res = await resetTestData(email);
    setLoading(false);

    if (res.success) {
      alert(t('admin.reset_records.confirm.alert_success', { email }));
      setEmail('');
      setConfirmText('');
      setShowConfirm(false);
    } else {
      alert(
        t('admin.reset_records.confirm.alert_error', {
          error: res.error || '',
        }),
      );
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-red-700">
        {t('admin.reset_records.title')}
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        {t('admin.reset_records.description')}
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('admin.reset_records.label')}
          </label>
          <Textbox
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('admin.reset_records.placeholder')}
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
            {loading
              ? t('admin.reset_records.processing')
              : t('admin.reset_records.button')}
          </Button>
        )}

        {showConfirm && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-sm font-bold text-red-700">
              {t('admin.reset_records.confirm.title')}
            </p>
            <p className="mb-3 text-xs text-red-600">
              {t('admin.reset_records.confirm.description')}
            </p>
            <Textbox
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={t('admin.reset_records.confirm.placeholder')}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                disabled={loading || confirmText !== 'DELETE'}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {t('admin.reset_records.confirm.confirm_button')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                {t('admin.reset_records.confirm.cancel_button')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
