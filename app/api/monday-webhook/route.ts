import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import autoEmailSender from '@/actions/emails/email';
import Logger from '@/actions/logging';
import { MONDAY_GROUPS } from '@/actions/monday/constants';
import {
  moveAdopteeToBoard,
  updateAdopteeMondayStatus,
} from '@/actions/monday/mutations/changeStatus';
import { queryMatchedAdoptees } from '@/actions/monday/queryMatchedAdoptee';
import { CONFIG } from '@/config';
import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';
import { assertEnvVarExists, getEnvVar } from '@/lib/utils';
import { ApplicationStatusEnum } from '@/types/schema';

export async function POST(request: NextRequest) {
  assertEnvVarExists('MONDAY_SIGNING_SECRET');
  const signingSecret = getEnvVar('MONDAY_SIGNING_SECRET');

  let data: {
    challenge?: string;
    payload?: {
      inputFields?: {
        subitemId: string;
        subitemStatus: string;
      };
    };
    event?: {
      boardId: number;
      pulseId: number;
      value?: {
        index?: number;
        text?: string;
      };
      columnId: string;
      columnType: string;
    };
  };
  try {
    data = await request.json();
  } catch (error) {
    Logger.error(`Error parsing JSON from Monday webhook: ${error}`);
    return new Response('Invalid JSON', { status: 400 });
  }

  // 1. Handle Monday's verification challenge
  if (data.challenge) {
    return Response.json({ challenge: data.challenge });
  }

  // 2. Verify JWT if present (for Monday Apps / Custom Actions)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      jwt.verify(authHeader, signingSecret);
    } catch (error) {
      Logger.error(`Error decoding JWT from Monday webhook: ${error}`);
      // Note: We don't return here because standard webhooks might not have a valid JWT
      // if they are not coming from a Monday App custom action.
    }
  }

  let appMondayId: string | undefined;
  let status: ApplicationStatusEnum | undefined;

  // 3. Parse payload (Custom Action vs Standard Webhook)
  if (data.payload && data.payload.inputFields) {
    // Custom Action structure
    const { subitemId, subitemStatus } = data.payload.inputFields;
    appMondayId = subitemId;

    const statusCodeMap: Record<number, ApplicationStatusEnum> = {
      8: 'PENDING_CONFIRMATION',
      4: 'REJECTED',
      1: 'REAPPLY',
      10: 'ACTIVE',
      12: 'ENDED',
    };

    if (subitemStatus !== undefined) {
      status = statusCodeMap[Number(subitemStatus)];
    }
  } else if (data.event) {
    // Standard Webhook structure
    const { boardId, pulseId, value, columnId } = data.event;

    // Check if it's an application status change (usually on board 6666910653)
    if (columnId === 'status' || columnId === 'status__1') {
      const subitemStatus = value?.index;

      const statusCodeMap: Record<number, ApplicationStatusEnum> = {
        8: 'PENDING_CONFIRMATION',
        4: 'REJECTED',
        1: 'REAPPLY',
        10: 'ACTIVE',
        12: 'ENDED',
      };

      if (subitemStatus !== undefined) {
        appMondayId = String(pulseId);
        status = statusCodeMap[subitemStatus];
      }
    }

    // Check if it's an inmate status change (board 6439746168)
    if (String(boardId) === '6439746168' && value?.text?.includes('Adopted')) {
      return await handleInmateAdopted(String(pulseId));
    }
  }

  if (!appMondayId || !status) {
    return Response.json({
      success: true,
      message: 'No actionable change detected',
    });
  }

  Logger.log(
    `Updating application with Monday ID ${appMondayId} to status ${status}`,
  );

  // update app status
  const supabase = await dangerous_getSupabaseServiceClient();
  const { error: updateError } = await supabase
    .from('adopter_applications')
    .update({
      status,
      ...(status === 'ACTIVE'
        ? {
            waiting_confirmation: false,
            time_confirmation_due: null,
            time_started: new Date().toISOString(),
          }
        : {}),
    })
    .eq('monday_id', appMondayId);

  if (updateError) {
    Logger.error(`Error updating Supabase application status: ${updateError}`);
    return Response.json({ data });
  }

  // if status is PENDING_CONFIRMATION, find and store matched adoptee
  if (status === 'PENDING_CONFIRMATION') {
    // fetch the application to get its app_uuid and adopter details
    const { data: appData, error: fetchError } = await supabase
      .from('adopter_applications')
      .select('app_uuid, adopter_uuid, adopter_profiles(first_name, last_name)')
      .eq('monday_id', appMondayId)
      .maybeSingle();

    if (fetchError || !appData) {
      Logger.error(
        `Error fetching application for monday_id ${appMondayId}: ${fetchError?.message}`,
      );
      return Response.json({ data });
    }

    // call query to find matched adoptee
    const { data: matchResult, error: matchError } = await queryMatchedAdoptees(
      appData.app_uuid,
    );

    if (matchError || !matchResult) {
      Logger.error(
        `Error finding matched adoptee for app ${appData.app_uuid}: ${matchError}`,
      );
      return new Response(
        JSON.stringify({
          data,
          success: false,
          severityCode: 4000,
          notificationErrorTitle: 'Failed to fetch match',
          notificationErrorDescription:
            "Couldn't identify which adoptee was matched. Did you update the adoptee's status?",
          runtimeErrorDescription: 'Webhook failed to identify matched adoptee',
        }),
        { status: 404 },
      );
    }

    const {
      matchedAdopteeId,
      unmatchedAdopteeIds,
      isDefaultMatch,
      adopteeBoardIds,
    } = matchResult;

    const MONDAY_ADOPTED_BOARD_ID = getEnvVar('MONDAY_ADOPTED_BOARD_ID');
    const MONDAY_WL_PIPS_BOARD_ID = getEnvVar('MONDAY_WL_PIPS_BOARD_ID');

    // move matched adoptee to Adopted board if needed
    if (
      isDefaultMatch ||
      adopteeBoardIds[matchedAdopteeId] !== MONDAY_ADOPTED_BOARD_ID
    ) {
      Logger.log(
        `Moving matched adoptee ${matchedAdopteeId} to Adopted board ${MONDAY_ADOPTED_BOARD_ID}`,
      );
      await moveAdopteeToBoard(
        matchedAdopteeId,
        MONDAY_ADOPTED_BOARD_ID,
        MONDAY_GROUPS.ADOPTED_LOCAL,
      );
    }

    // always ensure status is ADOPTED on Monday
    try {
      await updateAdopteeMondayStatus([matchedAdopteeId], 'ADOPTED');
    } catch (e) {
      Logger.error(`Error updating matched adoptee status on Monday: ${e}`);
    }

    // calculate time_confirmation_due: midnight UTC 2 weeks from now
    const confirmationDue = new Date();
    confirmationDue.setUTCDate(confirmationDue.getUTCDate() + 14);
    confirmationDue.setUTCHours(0, 0, 0, 0);

    // update application with matched adoptee, confirmation due date, and waiting_confirmation
    const { error: appUpdateError } = await supabase
      .from('adopter_applications')
      .update({
        matched_adoptee: matchedAdopteeId,
        time_confirmation_due: confirmationDue.toISOString(),
        waiting_confirmation: true,
      })
      .eq('app_uuid', appData.app_uuid);

    if (appUpdateError) {
      Logger.error(
        `Error updating matched adoptee for app ${appData.app_uuid}: ${appUpdateError.message}`,
      );
    }

    // mark matched adoptee as ADOPTED in adoptee_vector
    const { error: adoptedError } = await supabase
      .from('adoptee_vector')
      .update({ status: 'ADOPTED' })
      .eq('id', matchedAdopteeId);

    if (adoptedError) {
      Logger.error(
        `Error marking adoptee ${matchedAdopteeId} as ADOPTED: ${adoptedError.message}`,
      );
    }

    // mark unmatched adoptees as WAIT_LISTED in adoptee_vector and on Monday WL PIPs board
    if (unmatchedAdopteeIds.length > 0) {
      const { error: wlError } = await supabase
        .from('adoptee_vector')
        .update({ status: 'WAIT_LISTED' })
        .in('id', unmatchedAdopteeIds);

      if (wlError) {
        Logger.error(
          `Error marking unmatched adoptees as WAIT_LISTED: ${wlError.message}`,
        );
      }

      // update unmatched adoptees status on Monday WL PIPs board
      try {
        // Move to WL board if they are somewhere else
        for (const id of unmatchedAdopteeIds) {
          if (adopteeBoardIds[id] !== MONDAY_WL_PIPS_BOARD_ID) {
            Logger.log(
              `Moving unmatched adoptee ${id} to WL board ${MONDAY_WL_PIPS_BOARD_ID}`,
            );
            await moveAdopteeToBoard(
              id,
              MONDAY_WL_PIPS_BOARD_ID,
              MONDAY_GROUPS.WL_READY,
            );
          }
        }
        await updateAdopteeMondayStatus(unmatchedAdopteeIds, 'WL');
      } catch (e) {
        Logger.error(
          `Error updating unmatched adoptees on Monday WL PIPs board: ${e}`,
        );
      }
    }

    Logger.log(
      `Successfully processed PENDING_CONFIRMATION for app ${appData.app_uuid}. Matched: ${matchedAdopteeId}, Unmatched: ${unmatchedAdopteeIds}`,
    );

    // send email notification to adopter and BCC matchwatchers
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(
        appData.adopter_uuid,
      );
      const adopterEmail = userData.user?.email;

      const profile = appData.adopter_profiles as unknown as {
        first_name: string;
        last_name: string;
      };
      const firstName = profile?.first_name || 'Adopter';

      if (adopterEmail) {
        const siteUrl = getEnvVar('NEXT_PUBLIC_SITE_URL');
        const emailBody = `Hi ${firstName},

A match has been approved for your adoption application! Please return to the Adopt an Inmate app to review and accept the single adoptee approved for you within the next 14 days.
You can access your application here: ${siteUrl}/app

If you don't respond within 14 days, your application will be automatically closed.

Best,
Adopt an Inmate Team`;

        await autoEmailSender(
          emailBody,
          'Your match has been approved - Action required',
          adopterEmail,
          CONFIG.matchwatchersEmail,
        );
      }
    } catch (emailError) {
      Logger.error(`Failed to send match approval email: ${emailError}`);
    }
  }

  return Response.json({ data });
}

/**
 * Handles the case where an inmate is set to "Adopted" on Monday.
 * It finds the corresponding pending application and activates it.
 */
async function handleInmateAdopted(inmateId: string) {
  const supabase = await dangerous_getSupabaseServiceClient();

  // Find application for this inmate that is waiting for confirmation
  const { data: app, error } = await supabase
    .from('adopter_applications')
    .select('app_uuid')
    .eq('matched_adoptee', inmateId)
    .eq('status', 'PENDING_CONFIRMATION')
    .maybeSingle();

  if (error || !app) {
    Logger.log(
      `Inmate ${inmateId} set to Adopted but no pending application found.`,
    );
    return Response.json({
      success: true,
      message: 'Inmate adopted, but no matching pending application found.',
    });
  }

  // Set to ACTIVE
  const { error: updateError } = await supabase
    .from('adopter_applications')
    .update({
      status: 'ACTIVE',
      waiting_confirmation: false,
      time_confirmation_due: null,
      time_started: new Date().toISOString(),
    })
    .eq('app_uuid', app.app_uuid);

  if (updateError) {
    Logger.error(
      `Error auto-activating app ${app.app_uuid}: ${updateError.message}`,
    );
    return Response.json({ success: false, error: updateError.message });
  }

  // Also ensure inmate is marked as ADOPTED and formerly_adopted
  await supabase
    .from('adoptee_vector')
    .update({ status: 'ADOPTED', formerly_adopted: true })
    .eq('id', inmateId);

  Logger.log(
    `Automatically set app ${app.app_uuid} to ACTIVE because inmate ${inmateId} was set to Adopted on Monday.`,
  );
  return Response.json({
    success: true,
    message: `Application ${app.app_uuid} activated.`,
  });
}
