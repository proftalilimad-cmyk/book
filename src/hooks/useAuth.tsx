// ============================================================
// سياق المصادقة
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionUser } from '@/types';
import { getSession, signIn as svcSignIn, signOut as svcSignOut } from '@/services/authService';
import { supabase } from '@/lib/supabaseClient';

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signIn: async () => {
    throw new Error('not ready');
  },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSession()
      .then((u) => {
        if (alive) setUser(u);
      })
      .finally(() => alive && setLoading(false));

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange(async () => {
        const u = await getSession();
        setUser(u);
      });
      return () => {
        alive = false;
        sub.subscription.unsubscribe();
      };
    }
    return () => {
      alive = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const u = await svcSignIn(email, password);
    setUser(u);
    return u;
  };
  const signOut = async () => {
    await svcSignOut();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
