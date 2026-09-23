'use client';

import React, { createContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { AuthSession } from '@/types/auth';
import type { UserRole } from '@/types/database';
import { formatProfileName } from '@/lib/profileName';

const supabase = createClient();
const SESSION_LIMIT_MS = 60 * 60 * 1000;
const loginKey = (id: string) => `uniclinic_login_at:${id}`;

interface AuthContextType extends AuthSession {
  signOut: () => Promise<void>;
  role: UserRole | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseSession.user.id)
            .single();

          if (profile) {
            setSession({
              user: {
                id: profile.id,
                email: supabaseSession.user.email!,
                role: profile.role,
                displayName: formatProfileName(profile),
                avatar_url: profile.avatar_url,
              },
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching auth session:', error);
      }
      
      setSession({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
          
        if (profile) {
          setSession({
            user: {
              id: profile.id,
              email: currentSession.user.email!,
              role: profile.role,
              displayName: formatProfileName(profile),
              avatar_url: profile.avatar_url,
            },
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else {
        setSession({ user: null, isLoading: false, isAuthenticated: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session.user) return;
    const id = session.user.id;
    const checkExpiry = async () => {
      const raw = localStorage.getItem(loginKey(id));
      // Older sessions have no login timestamp; start their one-hour window now.
      const loginAt = raw ? Number(raw) : Date.now();
      if (!raw || !Number.isFinite(loginAt)) localStorage.setItem(loginKey(id), String(Date.now()));
      if (Number.isFinite(loginAt) && Date.now() - loginAt >= SESSION_LIMIT_MS) {
        localStorage.removeItem(loginKey(id));
        await supabase.auth.signOut();
        setSession({ user: null, isLoading: false, isAuthenticated: false });
        router.replace('/login?expired=1');
        router.refresh();
      }
    };
    void checkExpiry();
    const timer = window.setInterval(() => { void checkExpiry(); }, 1000);
    const onFocus = () => { void checkExpiry(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onFocus); };
  }, [session.user?.id, router]);

  const signOut = async () => {
    if (session.user) localStorage.removeItem(loginKey(session.user.id));
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during signOut:', error);
    } finally {
      setSession({ user: null, isLoading: false, isAuthenticated: false });
      router.push('/');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider value={{ ...session, signOut, role: session.user?.role || null }}>
      {children}
    </AuthContext.Provider>
  );
}
