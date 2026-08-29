'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdminApplication,
  getAdminApplications,
  PendingApplication,
} from '@/actions/admin/applications';
import { t } from '@/lib/i18n';
import { ApplicationStatusEnum } from '@/types/schema';
import { Button } from '../Button';

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  PENDING: {
    label: 'Pending Review',
    badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  },
  PENDING_CONFIRMATION: {
    label: 'Pending Confirmation',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  ACTIVE: {
    label: 'Active',
    badgeClass: 'bg-green-100 text-green-800 border border-green-300',
  },
  ACCEPTED: {
    label: 'Accepted',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
  },
  REAPPLY: {
    label: 'Reapply',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-300',
  },
  ENDED: {
    label: 'Ended',
    badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300',
  },
  INCOMPLETE: {
    label: 'Incomplete',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
};

const STATUS_FILTERS: {
  value: ApplicationStatusEnum | 'ALL';
  label: string;
}[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'PENDING_CONFIRMATION', label: 'Pending Confirmation' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INCOMPLETE', label: 'Incomplete' },
  { value: 'REAPPLY', label: 'Reapply' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ENDED', label: 'Ended' },
  { value: 'ACCEPTED', label: 'Accepted' },
];

export function AdminApplicationsList() {
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<
    ApplicationStatusEnum | 'ALL'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    const res = await getAdminApplications();
    if (res.success) {
      setApps(res.data || []);
    } else {
      setError(res.error || t('admin.pending_applications.no_apps'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Compute count of applications per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: apps.length };
    apps.forEach(app => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return counts;
  }, [apps]);

  // Filter applications by status and search query
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesStatus =
        selectedStatus === 'ALL' || app.status === selectedStatus;

      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const adopterMatch = app.adopter_name.toLowerCase().includes(q);
      const emailMatch = app.adopter_email.toLowerCase().includes(q);
      const adopteeMatch = app.adoptee_name?.toLowerCase().includes(q) ?? false;
      const uuidMatch = app.app_uuid.toLowerCase().includes(q);
      const rankedMatch = app.ranked_adoptees.some(a =>
        a.name.toLowerCase().includes(q),
      );

      return (
        adopterMatch || emailMatch || adopteeMatch || uuidMatch || rankedMatch
      );
    });
  }, [apps, selectedStatus, searchQuery]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <p className="text-gray-500 italic">
          {t('admin.pending_applications.loading')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {t('admin.pending_applications.title')}
          </h2>
          <Button variant="secondary" onClick={fetchApps}>
            {t('admin.pending_applications.refresh')}
          </Button>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {t('admin.pending_applications.title')}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {t('admin.pending_applications.showing_count', {
              count: String(filteredApps.length),
              total: String(apps.length),
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchApps}>
            {t('admin.pending_applications.refresh')}
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Status Filter Tabs / Pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(filter => {
            const count = statusCounts[filter.value] || 0;
            const isSelected = selectedStatus === filter.value;
            // Only hide statuses with 0 count if not 'ALL' and not selected
            if (filter.value !== 'ALL' && count === 0 && !isSelected) {
              return null;
            }

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedStatus(filter.value)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-red-800 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
                    isSelected
                      ? 'bg-red-900 text-red-100'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('admin.pending_applications.search_placeholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm placeholder-gray-400 focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredApps.length === 0 ? (
        <p className="text-gray-500 italic">
          {t('admin.pending_applications.no_apps')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  {t('admin.pending_applications.table.adopter')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  {t('admin.pending_applications.table.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  {t('admin.pending_applications.table.submitted')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  {t('admin.pending_applications.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  {t('admin.pending_applications.table.matched_adoptee')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  {t('admin.pending_applications.table.ranked_candidates')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredApps.map(app => {
                const statusMeta = STATUS_CONFIG[app.status] || {
                  label: app.status,
                  badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
                };

                const dateDisplay = app.time_submitted
                  ? new Date(app.time_submitted).toLocaleString()
                  : app.time_created
                    ? `Started: ${new Date(app.time_created).toLocaleDateString()}`
                    : t('common.n_a');

                return (
                  <tr key={app.app_uuid} className="hover:bg-gray-50/70">
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                      {app.adopter_name}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {app.adopter_email}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {dateDisplay}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {app.adoptee_name || (
                        <span className="text-gray-400 italic">
                          {t('common.none')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {app.ranked_adoptees.length > 0 ? (
                        <ol className="list-inside list-decimal">
                          {app.ranked_adoptees.map(adoptee => (
                            <li key={adoptee.id} title={adoptee.id}>
                              {adoptee.name}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-gray-400 italic">
                          {t('common.none')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Alias for backward compatibility
export const PendingApplicationsList = AdminApplicationsList;
export type { PendingApplication };
