import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    function applySession(nextSession: Session | null, event?: string) {
      const nextUserId = nextSession?.user.id ?? null;
      if (previousUserIdRef.current !== null && previousUserIdRef.current !== nextUserId) {
        queryClient.clear();
      }
      if (event === 'SIGNED_OUT') queryClient.clear();
      previousUserIdRef.current = nextUserId;
      setSession(nextSession);
      setLoading(false);
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        applySession(data.session);
      })
      .catch(() => {
        if (!active) return;
        applySession(null);
      });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      applySession(nextSession, event);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
