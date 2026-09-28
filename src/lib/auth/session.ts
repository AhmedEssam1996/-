import 'server-only';

import { cache } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SessionUser, UserRole, UserStatus } from '@/types/database';

/**
 * Authoritative session resolution.
 *
 * TWO RULES THAT MUST NOT BE BROKEN:
 *
 *  1. The role is read from the database (`user_roles`), never from a JWT claim,
 *     never from user metadata, never from a request header. Supabase's
 *     `user_metadata` is user-writable, so trusting it would be a free admin
 *     escalation. This is why migration 0002 grants a SELECT policy on
 *     `user_roles` and no write policy at all.
 *
 *  2. `status` is re-checked on every request. Disabling an account takes effect
 *     immediately instead of waiting for the access token to expire.
 *
 * `cache()` dedupes the work across a single render pass (layout + page + API
 * route all share one lookup).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

   const [{ data: profile }, { data: roleRow }] = await Promise.all([
    (supabase.from('profiles').select('full_name, avatar_url, status, email').eq('id', user.id).maybeSingle() as unknown as Promise<{ data: { full_name: string | null; avatar_url: string | null; status: string; email: string } | null }>),
    (supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle() as unknown as Promise<{ data: { role: string } | null }>),
  ]);

  const status: UserStatus = profile?.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
  const role: UserRole = roleRow?.role === 'ADMIN' ? 'ADMIN' : 'USER';

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role,
    status,
  };
});

export async function requireUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.status === 'DISABLED') return null;
  return user;
}

export function isAdminUser(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN' && user.status !== 'DISABLED';
}