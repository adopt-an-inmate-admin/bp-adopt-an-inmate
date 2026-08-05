'use server';

import { revalidatePath } from 'next/cache';
import { mondayApiClient } from '@/actions/monday/core';
import { getSupabaseServerClient } from '@/lib/supabase';
import { dangerous_getSupabaseServiceClient } from '@/lib/supabase/service';

async function deleteMondayItem(itemId: string | null) {
  if (!itemId) return;
  const query = `mutation { delete_item (item_id: "${itemId}") { id } }`;
  try {
    await mondayApiClient.request(query);
  } catch (err) {
    console.error(`Failed to delete Monday item ${itemId}:`, err);
  }
}

export async function resetTestData(email: string) {
  const supabase = await dangerous_getSupabaseServiceClient();

  // Check if current user is the global admin
  const {
    data: { user: currentUser },
  } = await (await getSupabaseServerClient()).auth.getUser();

  const isGlobalAdmin =
    currentUser?.email?.toLowerCase() === 'admin@adoptaninmate.org';

  if (process.env.NODE_ENV !== 'development' && !isGlobalAdmin) {
    return {
      success: false,
      error: 'Only allowed in development mode or for global admin.',
    };
  }

  try {
    // 1. Find user by email
    const { data: users, error: listError } =
      await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.users.find(u => u.email === email);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const userId = user.id;

    // Fetch Monday IDs before deleting
    const { data: profile } = await supabase
      .from('adopter_profiles')
      .select('monday_id')
      .eq('user_id', userId)
      .single();
    const { data: apps } = await supabase
      .from('adopter_applications')
      .select('monday_id')
      .eq('adopter_uuid', userId);

    if (profile?.monday_id) await deleteMondayItem(profile.monday_id);
    if (apps) {
      for (const app of apps) {
        if (app.monday_id) await deleteMondayItem(app.monday_id);
      }
    }

    // 2. Reset onboarding metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { onboarding_complete: false },
    });

    // 3. Delete from applications
    await supabase
      .from('adopter_applications')
      .delete()
      .eq('adopter_uuid', userId);

    // 4. Delete from profiles
    await supabase.from('adopter_profiles').delete().eq('user_id', userId);

    // 5. Delete from app_counter
    await supabase.from('app_counter').delete().eq('adopter_uuid', userId);

    // 6. Delete from adopter_num_external_active
    await supabase
      .from('adopter_num_external_active')
      .delete()
      .eq('adopter_uuid', userId);

    // 7. Delete from adopter_monday_ids
    await supabase
      .from('adopter_monday_ids')
      .delete()
      .eq('adopter_email', email);

    // 8. Delete the user from auth.users
    const { error: deleteUserError } =
      await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.warn(`Could not delete auth user ${userId}:`, deleteUserError);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error during dev cleanup:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}
