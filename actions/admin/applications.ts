'use server';

import Logger from '@/actions/logging';
import { getSupabaseServerClient } from '@/lib/supabase';
import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';
import { ApplicationStatusEnum } from '@/types/schema';

export interface PendingApplication {
  app_uuid: string;
  status: ApplicationStatusEnum;
  time_submitted: string | null;
  adopter_name: string;
  adopter_email: string;
}

export async function getPendingApplications(): Promise<{
  success: boolean;
  data?: PendingApplication[];
  error?: string;
}> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email !== 'admin@adoptaninmate') {
    return { success: false, error: 'Unauthorized' };
  }

  const supabaseService = await dangerous_getSupabaseServiceClient();

  const { data: apps, error } = await supabaseService
    .from('adopter_applications')
    .select(
      `
      app_uuid,
      status,
      time_submitted,
      adopter_uuid,
      adopter_profiles (
        first_name,
        last_name
      )
    `,
    )
    .eq('status', 'PENDING')
    .order('time_submitted', { ascending: false });

  if (error) {
    Logger.error(`Error fetching pending applications: ${error.message}`);
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

  const formattedApps: PendingApplication[] = apps.map(app => {
    const profile = app.adopter_profiles as unknown as {
      first_name: string;
      last_name: string;
    } | null;

    return {
      app_uuid: app.app_uuid,
      status: app.status,
      time_submitted: app.time_submitted,
      adopter_name: profile
        ? `${profile.first_name} ${profile.last_name}`
        : 'Unknown',
      adopter_email: userEmailMap.get(app.adopter_uuid) || 'Unknown',
    };
  });

  return { success: true, data: formattedApps };
}
