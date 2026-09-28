import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getServerEnv, hasSupabaseCredentials } from '@/lib/env';
import type { TypedDatabase } from '@/types/database';

export type TypedSupabase = SupabaseClient<TypedDatabase>;

/**
 * Service-role Supabase client.
 *
 * ⚠️  This client BYPASSES Row Level Security. It is used for exactly four
 * things, each of which is authorised in application code first:
 *
 *   1. Writing analytics events / gift opens (anonymous recipients have no JWT).
 *   2. Admin mutations (role changes, disabling users, deleting gifts).
 *   3. Reading aggregate analytics through the admin_* SQL functions.
 *   4. Triggering Supabase Auth admin APIs (create/delete users).
 *
 * It must never be imported into a Client Component. The `server-only` import
 * above turns that mistake into a build error.
 */
let serviceClient: TypedSupabase | null = null;

export function getServiceClient(): TypedSupabase | null {
  const env = getServerEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;

  if (!serviceClient) {
    serviceClient = createClient<TypedDatabase>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-hadiya-client': 'service' },
      },
    });
  }

  return serviceClient;
}

/** Throws a descriptive error instead of silently degrading privileged paths. */
export function requireServiceClient(): TypedSupabase {
  const client = getServiceClient();
  if (!client) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured — this privileged operation cannot run.',
    );
  }
  return client;
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(getServerEnv().supabaseServiceRoleKey);
}

export function isSupabaseConfigured(): boolean {
  return hasSupabaseCredentials();
}

/**
 * Publishable (anon) client for server-side reads that should still respect RLS,
 * e.g. rendering a public gift page.
 */
export function getAnonClient(): TypedSupabase | null {
  const env = getServerEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;

  return createClient<TypedDatabase>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}