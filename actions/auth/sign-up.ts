'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase';
import { EmailPasswordCredentials } from '@/types/types';
import Logger from '../logging';

export async function signUpWithEmailPassword({
  email,
  password,
}: EmailPasswordCredentials) {
  const supabase = await getSupabaseServerClient();

  // Prevent signing up if already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return {
      error: {
        message: 'Cannot sign up while logged in. Please log out first.',
        code: 'already_logged_in',
      },
    };
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    Logger.error(`Error attempting sign up: ${error.message} (${error.code})`);
    return { error: JSON.parse(JSON.stringify(error)) };
  }

  revalidatePath('/');
  return { error: null };
}
