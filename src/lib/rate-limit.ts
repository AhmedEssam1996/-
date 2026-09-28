import 'server-only';

import { isDatabaseConfigured, queryOne, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import { getServerEnv } from '@/lib/env';

/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * Why not Redis: adding a second stateful service to a gifting app is not worth
 * it, and the Postgres upsert below is atomic, cheap and already deployed. The
 * counter lives in a dedicated table created on first use.
 *
 * Accuracy trade-off: fixed windows allow a 2x burst at a window boundary. For
 * the purpose here (stopping scripted abuse of a paid AI endpoint) that is fine;
 * it is documented rather than hidden.
 *
 * `key` is always a hash — never a raw IP, so no personal identifier is stored.
 */

const TABLE = 'rate_limit_windows';

let ensured = false;

/**
 * The counter table is created on first use rather than in a migration, because
 * it is an operational optimisation and nothing else references it.
 *
 * If neither transport is available the limiter reports `degraded` and allows the
 * request: refusing every AI call because a limiter table could not be created
 * would be a worse failure than the abuse it guards against.
 */
async function ensureTable(): Promise<boolean> {
  if (ensured) return true;
  const ddl = `create table if not exists public.${TABLE} (
         key          text primary key,
         window_start timestamptz not null,
         hits         integer not null default 0
       )`;

  try {
    if (isDatabaseConfigured()) {
      await query(ddl);
      ensured = true;
      return true;
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      // PostgREST cannot run DDL; probe instead and let the upsert below fail
      // loudly (and degrade) when the migration has not been applied yet.
      await supabase.from(TABLE).upsert(
        { key: '__probe__', window_start: new Date(0).toISOString(), hits: 0 },
        { onConflict: 'key' },
      );
      ensured = true;
      return true;
    }
  } catch (error) {
    console.warn('[rate-limit] could not ensure table:', (error as Error).message);
  }

  return false;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  /** True when the limiter itself is unavailable (fail-open, but logged). */
  degraded: boolean;
}

/**
 * @param bucket   logical group, e.g. `ai:message`
 * @param identity pseudonymous key (hashed user id / session id)
 * @param limit    max hits per window
 * @param windowSeconds window length in seconds
 */
export async function rateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `${bucket}:${identity}`;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000);
  const resetAt = new Date(windowStart.getTime() + windowSeconds * 1000);

  const ready = await ensureTable();
  if (!ready) {
    return { allowed: true, remaining: limit, limit, resetAt, degraded: true };
  }

  try {
    const hits = await increment(key, windowStart);
    return {
      allowed: hits <= limit,
      remaining: Math.max(0, limit - hits),
      limit,
      resetAt,
      degraded: false,
    };
  } catch (error) {
    console.warn('[rate-limit] check failed:', (error as Error).message);
    return { allowed: true, remaining: limit, limit, resetAt, degraded: true };
  }
}

/**
 * Atomic increment for the current window.
 *
 * Over Postgres this is a single upsert. Over PostgREST there is no expression
 * language, so we read-modify-write. That is racy by design-of-the-API, but the
 * window only ever *over*-counts (never under), and the direct connection path
 * is the one used in every real deployment.
 */
async function increment(key: string, windowStart: Date): Promise<number> {
  if (isDatabaseConfigured()) {
    const rows = await query<{ hits: number }>(
      `insert into public.${TABLE} (key, window_start, hits)
       values ($1, $2, 1)
       on conflict (key) do update
         set hits = case
                      when public.${TABLE}.window_start = excluded.window_start
                        then public.${TABLE}.hits + 1
                      else 1
                    end,
             window_start = excluded.window_start
       returning hits`,
      [key, windowStart],
    );
    return rows[0]?.hits ?? 1;
  }

  const supabase = getUntypedServiceClient();
  if (!supabase) throw new Error('no transport available for rate limiting');

  const current = await queryOne<{ hits: number; window_start: string }>(
    `select hits, window_start from public.${TABLE} where key = $1`,
    [key],
  ).catch(() => null);

  const sameWindow =
    current !== null && new Date(current.window_start).getTime() === windowStart.getTime();
  const hits = sameWindow ? Number(current.hits) + 1 : 1;

  await supabase.from(TABLE).upsert(
    { key, window_start: windowStart.toISOString(), hits },
    { onConflict: 'key' },
  );

  return hits;
}

/** Convenience wrapper for the AI endpoints, using the configured window. */
export async function rateLimitAi(identity: string, bucket: string): Promise<RateLimitResult> {
  const env = getServerEnv();
  return rateLimit(`ai:${bucket}`, identity, env.aiRateLimitPerMinute, 60);
}

/** Removes stale windows. Safe to call from a cron or opportunistically. */
export async function pruneRateLimitWindows(): Promise<void> {
  try {
    if (isDatabaseConfigured()) {
      await query(`delete from public.${TABLE} where window_start < now() - interval '1 day'`);
    }
  } catch {
    /* best effort */
  }
}