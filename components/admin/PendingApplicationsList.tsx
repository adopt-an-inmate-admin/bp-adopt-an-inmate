'use client';

import { useEffect, useState } from 'react';
import {
  getPendingApplications,
  PendingApplication,
} from '@/actions/admin/applications';
import { Button } from '../Button';

export function PendingApplicationsList() {
  const [apps, setApps] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    const res = await getPendingApplications();
    if (res.success) {
      setApps(res.data || []);
    } else {
      setError(res.error || 'Failed to fetch applications');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  if (loading) return <div>Loading applications...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          Pending Applications
        </h2>
        <Button variant="secondary" onClick={fetchApps}>
          Refresh
        </Button>
      </div>

      {apps.length === 0 ? (
        <p className="text-gray-500 italic">No pending applications found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Adopter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Matched Adoptee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Ranked Candidates
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {apps.map(app => (
                <tr key={app.app_uuid}>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                    {app.adopter_name}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {app.adopter_email}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {app.time_submitted
                      ? new Date(app.time_submitted).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${
                        app.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                    {app.adoptee_name || (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <ol className="list-inside list-decimal">
                      {app.ranked_adoptees.map(adoptee => (
                        <li key={adoptee.id} title={adoptee.id}>
                          {adoptee.name}
                        </li>
                      ))}
                    </ol>
                    {app.ranked_adoptees.length === 0 && (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
