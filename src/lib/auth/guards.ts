import 'server-only';

import { NextResponse } from 'next/server';

import { getSessionUser, isAdminUser } from '@/lib/auth/session';
import { ApiError, apiError } from '@/lib/http';
import type { SessionUser } from '@/types/database';

/**
 * Route-handler guards.
 *
 * Every protected API route starts with one of these. The checks are:
 *   authenticated → account is ACTIVE → (optionally) role is ADMIN.
 *
 * The role comes from `getSessionUser()`, i.e. from the database. A caller
 * cannot influence it with headers, cookies or body fields.
 */

export type GuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function guardUser(): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: apiError('AUTH_REQUIRED', 'لازم تسجّل دخول الأول.', 401) };
  }
  if (user.status === 'DISABLED') {
    return {
      ok: false,
      response: apiError('ACCOUNT_DISABLED', 'حسابك متوقف حاليًا. تواصل مع الدعم.', 403),
    };
  }
  return { ok: true, user };
}

export async function guardAdmin(): Promise<GuardResult> {
  const result = await guardUser();
  if (!result.ok) return result;

  if (!isAdminUser(result.user)) {
    // Deliberately identical to a 404-ish generic message: an unauthorised
    // caller learns nothing about whether the resource exists.
    return {
      ok: false,
      response: apiError('FORBIDDEN', 'مش مسموح لك بالوصول للصفحة دي.', 403),
    };
  }
  return result;
}

/** Wraps a handler so thrown ApiErrors become clean JSON and unknown errors are logged. */
export async function withApiErrors<T>(
  handler: () => Promise<T>,
  fallbackMessage = 'حصلت مشكلة بسيطة. جرّب مرة أخرى.',
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    // Log server-side with detail, return nothing sensitive to the client.
    console.error('[api] unhandled error:', error);
    return apiError('INTERNAL_ERROR', fallbackMessage, 500);
  }
}