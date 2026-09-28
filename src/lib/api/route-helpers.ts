import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { getSessionUser } from '@/lib/auth/session';
import { formatIssues } from '@/lib/api/schemas';
import { ApiError, friendlyMessage, readJsonBody } from '@/lib/http';
import type { SessionUser } from '@/types/database';

/**
 * Shared plumbing for every route handler under `src/app/api`.
 *
 * Why a wrapper instead of `try/catch` in each route:
 *   • One place decides what a thrown error becomes. An `ApiError` keeps its
 *     code + Arabic message; anything else is logged server-side and reported as
 *     a generic INTERNAL_ERROR, so a stack trace can never leak.
 *   • Error responses are marked `no-store` — a cached 401 is a security bug.
 *   • A short trace id is attached (and logged) so a user-visible failure can be
 *     matched to a server log line without exposing internals.
 */

export interface RouteContext {
  /** Raw Request — used for headers (User-Agent, cookie) and body reads. */
  request: Request;
  /** Route params, when the path is dynamic. */
  params: Record<string, string>;
}

export function traceId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function jsonError(error: ApiError, id: string): NextResponse {
  const body = {
    error: {
      code: error.code,
      message: error.message || friendlyMessage(error.code),
      details: error.details,
      trace_id: id,
    },
  };
  return NextResponse.json(body, {
    status: error.status,
    headers: { 'Cache-Control': 'no-store', 'x-hadiya-trace': id },
  });
}

/** JSON success response. Never cached: every payload here is per-request. */
export function jsonOk<T>(data: T, status = 200, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

type Handler = (context: RouteContext) => Promise<NextResponse>;

/**
 * Wraps a handler so every thrown value becomes a clean JSON error response.
 * The returned function signature matches what Next.js passes to a route.
 */
export function route(handler: Handler) {
  return async (
    request: Request,
    // Next.js type-checks this parameter against `{ params: Promise<SegmentParams> }`
    // (see next-types-plugin's `Diff<ParamCheck<RouteContext>, ...>`). The type must
    // therefore be a plain object — NOT `| undefined` and NOT optional — or the
    // generated checker rejects every route in the app at build time.
    // Non-dynamic routes simply never call the second argument, so a non-optional
    // parameter is harmless at runtime.
    segment: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const id = traceId();
    try {
      const params: Record<string, string> = segment ? await segment.params : {};
      return await handler({ request, params });
    } catch (error) {
      if (error instanceof ApiError) return jsonError(error, id);
      console.error(`[api:${id}] unhandled error:`, error);
      return jsonError(
        new ApiError('INTERNAL_ERROR', 'حصلت مشكلة بسيطة. جرّب مرة أخرى.', 500),
        id,
      );
    }
  };
}

/**
 * Guard for user-scoped routes. Throws instead of returning a response so the
 * happy path stays linear (`const user = await requireApiUser()`).
 */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError('AUTH_REQUIRED', 'لازم تسجّل دخول الأول.', 401);
  }
  if (user.status === 'DISABLED') {
    throw new ApiError('ACCOUNT_DISABLED', 'حسابك متوقف حاليًا. تواصل مع الدعم.', 403);
  }
  return user;
}

/** Guard for admin-only routes. Role comes from the DB, never from a claim. */
export async function requireApiAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'مش مسموح لك بالوصول للصفحة دي.', 403);
  }
  return user;
}

/**
 * Reads and validates a JSON body in one step.
 *
 * The body is size-capped before parsing (see `readJsonBody`), every schema is
 * `.strict()`, and a failure returns field paths WITHOUT the offending values —
 * so a validation error can never echo user input back into a log or a response.
 */
export async function readBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  maxBytes = 64 * 1024,
): Promise<z.infer<T>> {
  const raw = await readJsonBody(request, maxBytes);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'في بيانات ناقصة أو غير صحيحة. راجع الحقول وجرّب تاني.',
      422,
      formatIssues(parsed.error),
    );
  }
  return parsed.data as z.infer<T>;
}

// ---------------------------------------------------------------------------
// Query-string helpers (every value is untrusted)
// ---------------------------------------------------------------------------

export function searchParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

export function readString(
  params: URLSearchParams,
  key: string,
  maxLength = 200,
): string | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const value = raw.trim().slice(0, maxLength);
  return value.length > 0 ? value : undefined;
}

export function readEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

export function readInt(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = params.get(key);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** `page` + `pageSize` → the `limit`/`offset` pair the SQL layer expects. */
export function readPagination(
  params: URLSearchParams,
  defaultPageSize = 20,
): { page: number; pageSize: number; limit: number; offset: number } {
  const page = readInt(params, 'page', 1, 1, 10_000);
  const pageSize = readInt(params, 'page_size', defaultPageSize, 1, 100);
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

/** Coarse device/browser context, forwarded to the analytics layer. */
export function requestUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}

export function requestReferrer(request: Request, fallback: string | null = null): string | null {
  const header = request.headers.get('referer');
  return header && header.length > 0 ? header : fallback;
}