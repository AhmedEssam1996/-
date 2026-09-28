import { createBrowserClient } from '@supabase/ssr';

import type { TypedDatabase } from '@/types/database';

/**
 * Browser Supabase client — holds the *publishable* anon key only.
 *
 * This client is bound by Row Level Security. It is used for sign-in / sign-up
 * and for reading the current session. It never performs privileged writes.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createBrowserClient<TypedDatabase>(url, anonKey);
}

let cached: ReturnType<typeof createClient> | null = null;

/** Memoised browser client — one GoTrue instance per tab. */
export function getBrowserClient() {
  if (!cached) cached = createClient();
  return cached;
}