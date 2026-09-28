import 'server-only';

import { getServiceClient } from '@/lib/db/supabase-admin';
import { ApiError } from '@/lib/http';

/**
 * A deliberately narrow, untyped handle on the service-role Supabase client.
 *
 * It exists for the handful of calls PostgREST's generated types cannot express:
 *
 *  1. `rate_limit_windows` — a table the app creates lazily at runtime, so it is
 *     intentionally absent from the hand-written `Database` type.
 *  2. Upserts with a composite conflict target (`onConflict: 'gift_id,session_id'`),
 *     which collapse to `never` in the postgrest-js payload types.
 *  3. `select('col_a, col_b')` string projections, whose result shape the client
 *     cannot infer.
 *
 * The cast lives HERE and nowhere else, so every call site stays explicit about
 * what it expects back (`maybeSingle<Gift>()`, `returns<Row[]>()`). That is the
 * whole point of the file: one documented escape hatch instead of `any` sprinkled
 * through the query layer.
 *
 * These builders are `PromiseLike`, not `Promise`: postgrest-js returns
 * thenables, and awaiting one is exactly how the real client is consumed.
 */

export interface UntypedFilterBuilder<T = unknown> {
  select(columns?: string): UntypedFilterBuilder<T>;
  eq(column: string, value: unknown): UntypedFilterBuilder<T>;
  is(column: string, value: unknown): UntypedFilterBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): UntypedFilterBuilder<T>;
  limit(count: number): UntypedFilterBuilder<T>;
  range(from: number, to: number): UntypedFilterBuilder<T>;
  in(column: string, values: readonly unknown[]): UntypedFilterBuilder<T>;
  or(filter: string): UntypedFilterBuilder<T>;
  maybeSingle<TResult = T>(): PromiseLike<{ data: TResult | null; error: unknown }>;
  single<TResult = T>(): PromiseLike<{ data: TResult | null; error: unknown }>;
  /** Re-types the resolved payload without `.returns()` losing the builder. */
  as<TResult>(): PromiseLike<{
    data: TResult | null;
    error: unknown;
    count?: number | null;
  }>;
  then<TResult1 = {
    data: T | null;
    error: unknown;
    count?: number | null;
  }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: T | null; error: unknown; count?: number | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}

export interface UntypedWriteBuilder<T = unknown>
  extends PromiseLike<{ data: T | null; error: unknown }> {
  select(columns?: string): UntypedFilterBuilder<T>;
}

export interface UntypedTable {
  insert(values: unknown): UntypedWriteBuilder;
  upsert(values: unknown, options?: unknown): UntypedWriteBuilder;
  update(values: unknown): UntypedFilterBuilder<never>;
  delete(): UntypedFilterBuilder<never>;
  select(
    columns?: string,
    options?: { count?: 'exact'; head?: boolean },
  ): UntypedFilterBuilder<unknown>;
}

export interface UntypedSupabase {
  from(table: string): UntypedTable;
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
}

/** Returns the service-role client as an untyped handle, or null when unset. */
export function getUntypedServiceClient(): UntypedSupabase | null {
  const client = getServiceClient();
  if (!client) return null;
  return client as unknown as UntypedSupabase;
}

/** Same as above, but throws the standard DB_UNAVAILABLE error when unset. */
export function requireUntypedServiceClient(): UntypedSupabase {
  const client = getUntypedServiceClient();
  if (!client) {
    throw new ApiError('DB_UNAVAILABLE', 'مقدرناش نوصل للداتا.', 503);
  }
  return client;
}