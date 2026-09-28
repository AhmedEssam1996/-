import { useEffect, useState } from 'react';

import { getBrowserClient } from '@/lib/supabase/client';
import type { SessionUser } from '@/types/database';

export interface AuthState {
  user: SessionUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let client: ReturnType<typeof getBrowserClient> | null = null;

    try {
      client = getBrowserClient();
    } catch {
      setUser(null);
      if (!cancelled) setLoading(false);
      return;
    }

    const resolve = async () => {
      try {
        const { data } = await client.auth.getUser();
        if (!cancelled) {
          if (!data.user) {
            setUser(null);
          } else {
            const [{ data: profile }, { data: roleRow }] = await Promise.all([
              (client.from('profiles').select('full_name, avatar_url, email, status').eq('id', data.user.id).maybeSingle() as unknown as Promise<{ data: { full_name: string | null; avatar_url: string | null; email: string; status: string } | null }>),
              (client.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle() as unknown as Promise<{ data: { role: string } | null }>),
            ]);

            const role = roleRow?.role === 'ADMIN' ? 'ADMIN' : 'USER';
            const status = profile?.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
            setUser({
              id: data.user.id,
              email: profile?.email ?? data.user.email ?? null,
              fullName: profile?.full_name ?? null,
              avatarUrl: profile?.avatar_url ?? null,
              role: role as 'USER' | 'ADMIN',
              status: status as 'ACTIVE' | 'DISABLED',
            });
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolve();

    const { data: listener } = client.auth.onAuthStateChange(async () => {
      resolve();
    });

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export async function signIn(email: string, password: string): Promise<void> {
  const client = getBrowserClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function register(email: string, password: string, fullName: string): Promise<void> {
  const client = getBrowserClient();
  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function resetPassword(email: string): Promise<void> {
  const client = getBrowserClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const client = getBrowserClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}
