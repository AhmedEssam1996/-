import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { hasSupabaseCredentials } from '@/lib/env';
import type { TypedDatabase } from '@/types/database';

/**
 * Request-scoped Supabase client that reads the session from cookies and is
 * bound by Row Level Security.
 *
 * Cookie writes are best-effort: in a Server Component the cookie store is
 * read-only, and the middleware is what actually refreshes the session. We
 * therefore swallow the "read-only cookies" error rather than letting it break
 * a render — this is the documented @supabase/ssr pattern.
 */
export async function createServerSupabaseClient() {
  if (!hasSupabaseCredentials()) return null;

  const cookieStore = await cookies();

  return createServerClient<TypedDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — the middleware handles refresh.
          }
        },
      },
    },
  );
}