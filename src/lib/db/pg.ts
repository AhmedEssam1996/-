import 'server-only';

import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import { getServerEnv } from '@/lib/env';

/**
 * Server-only Postgres access.
 *
 * Why a direct connection instead of PostgREST?
 *  - Aggregations for the admin dashboard run as SQL functions (see migration
 *    0001). Doing them over REST would mean N round trips and client-side math.
 *  - We need advisory-lock-free atomic upserts for slug reservation and
 *    `on conflict` for session-scoped open tracking.
 *
 * This pool authenticates with DATABASE_URL, i.e. it is effectively a
 * superuser connection. It is therefore imported ONLY from server modules, and
 * nothing it returns is ever passed to the client without an explicit mapping.
 *
 * When DATABASE_URL is absent the whole layer degrades to `null` and the app
 * falls back to the request-scoped Supabase client (RLS enforced).
 */

export function isDatabaseConfigured(): boolean {
  return Boolean(getServerEnv().databaseUrl);
}

function createPool(): Pool {
  const env = getServerEnv();
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  return new Pool({
    connectionString: env.databaseUrl,
    max: 8,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 12_000,
    ssl: /localhost|127\.0\.0\.1/.test(env.databaseUrl) ? false : { rejectUnauthorized: false },
    application_name: 'hadiya-web',
  });
}

/**
 * The pool is memoised on `globalThis` so Next.js hot reload in development does
 * not open a new pool on every recompile and exhaust the connection limit.
 */
declare global {
  var __hadiyaPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!globalThis.__hadiyaPgPool) {
    globalThis.__hadiyaPgPool = createPool();
  }
  return globalThis.__hadiyaPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params as never[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      /* the connection is already broken; nothing useful to do */
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * A single `jsonb` result column (used by the admin_* SQL functions) arrives as
 * a parsed object. Guard the shape so a schema drift cannot crash a page.
 */
export function asObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    } catch {
      /* fall through */
    }
  }
  return fallback;
}