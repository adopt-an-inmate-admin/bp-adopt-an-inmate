'use server';

import Logger from '@/actions/logging';
import { getSupabaseServerClient } from '@/lib/supabase';
import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';
import { ApplicationStatusEnum } from '@/types/schema';

export interface AdminApplication {
  app_uuid: string;
  status: ApplicationStatusEnum;
  time_submitted: string | null;
  time_created?: string | null;
  adopter_name: string;
  adopter_email: string;
  adoptee_name: string | null;
  ranked_adoptees: {
    id: string;
    name: string;
  }[];
}

export type PendingApplication = AdminApplication;

export async function getAdminApplications(
  statusFilter?: ApplicationStatusEnum | 'ALL',
): Promise<{
  success: boolean;
  data?: AdminApplication[];
  error?: string;
}> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (user?.email?.toLowerCase() !== 'admin@adoptaninmate.org') {
    return { success: false, error: 'Unauthorized' };
  }

  const supabaseService = await dangerous_getSupabaseServiceClient();

  let query = supabaseService.from('adopter_applications').select(
    `
      app_uuid,
      status,
      time_submitted,
      time_created,
      adopter_uuid,
      ranked_cards,
      adoptee_name,
      adopter_profiles (
        first_name,
        last_name
      )
    `,
  );

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }

  const { data: apps, error } = await query
    .order('time_submitted', { ascending: false, nullsFirst: false })
    .order('time_created', { ascending: false });

  if (error) {
    Logger.error(`Error fetching applications: ${error.message}`);
    return { success: false, error: error.message };
  }

  // Fetch emails from auth.admin
  const { data: users, error: usersError } =
    await supabaseService.auth.admin.listUsers();

  if (usersError) {
    Logger.error(`Error fetching users for admin: ${usersError.message}`);
    return { success: false, error: usersError.message };
  }

  const userEmailMap = new Map(users.users.map(u => [u.id, u.email]));

  // Fetch all ranked adoptees' names
  const allRankedIds = Array.from(
    new Set(apps.flatMap(app => app.ranked_cards || [])),
  );

  let adopteeNameMap = new Map<string, string>();
  if (allRankedIds.length > 0) {
    const { data: adoptees, error: adopteesError } = await supabaseService
      .from('adoptee_vector')
      .select('id, first_name, last_name')
      .in('id', allRankedIds);

    if (adopteesError) {
      Logger.error(`Error fetching adoptees: ${adopteesError.message}`);
      // Non-fatal error, we'll just have unknown names
    } else if (adoptees) {
      adopteeNameMap = new Map(
        adoptees.map(a => [
          a.id,
          `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown',
        ]),
      );
    }
  }

  const formattedApps: AdminApplication[] = apps.map(app => {
    const profile = app.adopter_profiles as unknown as {
      first_name: string;
      last_name: string;
    } | null;

    const rankedAdoptees = (app.ranked_cards || []).map((id: string) => ({
      id,
      name: adopteeNameMap.get(id) || 'Unknown',
    }));

    return {
      app_uuid: app.app_uuid,
      status: app.status,
      time_submitted: app.time_submitted,
      time_created: app.time_created,
      adopter_name: profile
        ? `${profile.first_name} ${profile.last_name}`
        : 'Unknown',
      adopter_email: userEmailMap.get(app.adopter_uuid) || 'Unknown',
      adoptee_name: app.adoptee_name,
      ranked_adoptees: rankedAdoptees,
    };
  });

  return { success: true, data: formattedApps };
}

export async function getPendingApplications(
  statusFilter?: ApplicationStatusEnum | 'ALL',
) {
  return getAdminApplications(statusFilter);
}
