import { NextRequest } from 'next/server';
import autoEmailSender from '@/actions/emails/email';
import Logger from '@/actions/logging';
import { mondayApiClient } from '@/actions/monday/core';
import { buildStatusMutationFields } from '@/actions/monday/mutations/changeStatus';
import { CONFIG } from '@/config';
import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';
import { getEnvVar } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const CRON_SECRET = getEnvVar('CRON_SECRET');
  const MONDAY_ADOPTER_DATA_SUBITEM_BOARD_ID = getEnvVar(
    'MONDAY_ADOPTER_DATA_SUBITEM_BOARD_ID',
  );

  // check that this is issued by cron job
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // find apps waiting for confirmation and 2 weeks late
  const supabaseService = await dangerous_getSupabaseServiceClient();
  const now = new Date();

  // 1. Handle Reminders (7 days after PENDING_CONFIRMATION)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data: reminderApps } = await supabaseService
    .from('adopter_applications')
    .select('app_uuid, adopter_uuid, adopter_profiles(first_name)')
    .eq('waiting_confirmation', true)
    .is('reminder_sent_at', null)
    .lte('time_confirmation_due', sevenDaysFromNow.toISOString());

  if (reminderApps && reminderApps.length > 0) {
    for (const app of reminderApps) {
      try {
        const { data: userData } = await supabaseService.auth.admin.getUserById(
          app.adopter_uuid,
        );
        const email = userData.user?.email;
        const profile = app.adopter_profiles as unknown as {
          first_name: string;
        };
        const firstName = profile?.first_name || 'Adopter';

        if (email) {
          const siteUrl = getEnvVar('NEXT_PUBLIC_SITE_URL');
          const emailBody = `Hi ${firstName},

This is a reminder to please come back to the Adopt an Inmate app to approve your match. 
You can access your application here: ${siteUrl}/app

If you don't respond within the next 7 days, your application will be automatically closed.

Best,
Adopt an Inmate Team`;

          await autoEmailSender(
            emailBody,
            'Reminder: Action required on your application',
            email,
            CONFIG.matchwatchersEmail,
          );

          await supabaseService
            .from('adopter_applications')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('app_uuid', app.app_uuid);

          Logger.log(`Sent reminder email to ${email} for app ${app.app_uuid}`);
        }
      } catch (e) {
        Logger.error(
          `Error sending reminder email for app ${app.app_uuid}: ${e}`,
        );
      }
    }
  }

  // 2. Handle DNR (7 days after reminder)
  const { data: dnrApps, error: getAppsError } = await supabaseService.rpc(
    'get_dnr_applications',
  );

  if (getAppsError) {
    Logger.error(`Error fetching DNR apps: ${getAppsError}`);
    return new Response('An unexpected error occurred.', { status: 500 });
  }

  if (!dnrApps || dnrApps.length === 0) {
    return new Response('Processed reminders. No apps past DNR deadline.');
  }

  // map ids
  const dnrAppIds = dnrApps.map(app => app.app_uuid);

  const dnrMondayIds = dnrApps
    .map(app => app.app_monday_id)
    .filter(id => id !== null);

  const dnrAdopteeGroups = dnrApps
    .map(app => ({
      id: app.matched_adoptee,
      formerlyAdopted: app.formerly_adopted,
    }))
    .filter(adoptee => adoptee.id !== null);

  // db: update app status
  const { error: updateAppStatusError } = await supabaseService
    .from('adopter_applications')
    .update({
      status: 'REAPPLY',
      time_ended: now.toISOString(),
      ended_reason: 'Adopter DNR',
      time_confirmation_due: null,
      waiting_confirmation: false,
    })
    .in('app_uuid', dnrAppIds);

  if (updateAppStatusError) {
    Logger.error(
      `Error trying to update application statuses: ${updateAppStatusError.message}`,
    );
    return new Response('An unexpected error occurred.', { status: 500 });
  }

  // db: update adoptee status
  const { error: updateAdopteeStatusError } = await supabaseService
    .from('adoptee_vector')
    .update({ status: 'WAIT_LISTED' })
    .in(
      'id',
      dnrAdopteeGroups.map(g => g.id),
    );

  if (updateAdopteeStatusError) {
    Logger.error(
      `Error trying to update adoptee statuses: ${updateAdopteeStatusError.message}`,
    );
    return new Response('An unexpected error occurred.', { status: 500 });
  }

  // monday: update app status to DNR
  const generateUpdateStatusQuery = (id: string) => `
    app${id}:change_simple_column_value(
      board_id: "${MONDAY_ADOPTER_DATA_SUBITEM_BOARD_ID}",
      item_id: "${id}",
      column_id: "status",
      value: "DNR (Did Not Respond)"
    ) { id }
  `;

  const updateAppStatusQueries = dnrMondayIds.map(id =>
    generateUpdateStatusQuery(id),
  );

  // monday: update adoptee status to WL/WLFA
  const statusLabelsById = Object.fromEntries(
    dnrAdopteeGroups.map(g => [
      g.id,
      g.formerlyAdopted
        ? 'WLFA: Wait Listed Formerly Adopted'
        : 'WL: Wait Listed',
    ]),
  );

  let updateAdopteeStatusQueries = '';
  try {
    updateAdopteeStatusQueries = await buildStatusMutationFields(
      dnrAdopteeGroups.map(g => g.id),
      statusLabelsById,
      'adoptee',
    );
  } catch (error) {
    Logger.error(
      `Error building Monday adoptee status update fields: ${error}`,
    );
    return new Response('An unexpected error occurred.', { status: 500 });
  }

  const query = `
    mutation {
      ${updateAppStatusQueries.join('\n')}
      ${updateAdopteeStatusQueries}
    }
  `;

  try {
    await mondayApiClient.request(query);
  } catch (error) {
    Logger.error(
      `Error trying to update adoptee and app status on Monday: ${error}`,
    );
    return new Response('An unexpected error occurred.', { status: 500 });
  }

  return new Response('Success.');
}
