import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { bootstrapRequest } from '@/lib/api/schemas';
import { promoteInitialAdmin } from '@/lib/admin/queries';
import { getServerEnv } from '@/lib/env';
import { ApiError } from '@/lib/http';
import { getSessionUser } from '@/lib/auth/session';

/**
 * POST /api/admin/bootstrap
 *
 * The one-time promotion of the owner account when a deployment has no shell
 * access (no `npm run admin:promote`).
 *
 * Three independent conditions must all hold, which is what makes this safe to
 * leave in the codebase:
 *
 *   1. `ADMIN_BOOTSTRAP_TOKEN` must be configured server-side. With no token
 *      configured the endpoint is permanently disabled — it cannot be triggered
 *      by guessing an email.
 *   2. The caller must present that exact token, compared in CONSTANT TIME so the
 *      endpoint cannot be used as an oracle to recover it byte by byte.
 *   3. `INITIAL_ADMIN_EMAIL` must be configured; the caller cannot nominate an
 *      arbitrary address.
 *
 * The token is never logged and never echoed. The account is resolved from the
 * server-side config, so a leaked endpoint does not let an attacker promote
 * themselves.
 */

export const dynamic = 'force-dynamic';

/** Length-independent comparison — no early return on the first differing byte. */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Compare a fixed length so timing does not leak the token's length either.
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

export const POST = route(async ({ request }) => {
  const env = getServerEnv();

  if (!env.adminBootstrapToken) {
    // Deliberately the same message as a wrong token: an unconfigured install
    // should not advertise that the feature exists but is switched off.
    throw new ApiError('FORBIDDEN', 'مش مسموح لك بالوصول للصفحة دي.', 403);
  }

  const body = await readBody(request, bootstrapRequest, 4 * 1024);
  if (!safeEqual(body.token, env.adminBootstrapToken)) {
    console.warn('[admin] bootstrap attempt with an invalid token');
    throw new ApiError('FORBIDDEN', 'مش مسموح لك بالوصول للصفحة دي.', 403);
  }

  const targetEmail = env.initialAdminEmail;
  if (!targetEmail) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'مفيش INITIAL_ADMIN_EMAIL متظبط على السيرفر.',
      422,
    );
  }

  const acting = await getSessionUser();
  const promotedId = await promoteInitialAdmin(targetEmail, acting?.id);

  if (!promotedId) {
    throw new ApiError(
      'NOT_FOUND',
      `مفيش حساب مسجّل بالإيميل ${targetEmail}. اعمل حساب الأول وبعدين جرّب تاني.`,
      404,
    );
  }

  return jsonOk({ promoted: true, email: targetEmail });
});