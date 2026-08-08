'use client';

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient as supabase } from '@/lib/supabase/client';

type AuthContextType = {
  userId: string | null;
  userEmail: string | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch the user info once and listen for changes
  useEffect(() => {
    const supabaseClient = supabase();
    const getUser = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) {
          console.warn('Error fetching user in AuthProvider:', error.message);
          // If the error is refresh_token_not_found, it means the session is definitely invalid
          if (error.code === 'refresh_token_not_found') {
            setUserId(null);
            setUserEmail(null);
          }
          return;
        }
        if (data?.user) {
          setUserId(data.user.id);
          setUserEmail(data.user.email ?? null);
        }
      } catch (err) {
        console.error('Unexpected error in AuthProvider getUser:', err);
      }
    };

    getUser();

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUserId(session.user.id);
          setUserEmail(session.user.email ?? null);
        } else {
          setUserId(null);
          setUserEmail(null);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = { userId, userEmail };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
