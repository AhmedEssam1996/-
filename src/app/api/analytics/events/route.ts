import { jsonOk, route, requestReferrer, requestUserAgent } from '@/lib/api/route-helpers';
import { getSessionUser } from '@/lib/auth/session';
import {
  ANALYTICS_EVENTS,
  getOrCreateSessionId,
  isAnalyticsEventName,
  trackEvent,
} from '@/lib/analytics/track';
import { ApiError, readJsonBody } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/analytics/events
 *
 * The single ingestion point for product analytics.
 *
 * Security decisions that matter:
 *   • `user_id` is taken from the SERVER session, never from the body — a client
 *     cannot attribute an event to someone else.
 *   • The event name must be in the fixed catalogue; unknown names are rejected
 *     rather than stored, so the table cannot be used as free-form storage.
 *   • The session id comes from the httpOnly cookie (minted in middleware); the
 *     client never sees or supplies it.
 *   • Metadata is name/number/boolean only, capped at 12 keys of 200 chars.
 *   • Rate limited per hashed session, because this endpoint is unauthenticated.
 *
 * Failure policy: analytics must never break a user flow. A rejected event
 * returns 202 (accepted, ignored) except for genuine abuse, which returns 429.
 */

export const dynamic = 'force-dynamic';

/** The client may report which route it is on; it cannot report who it is. */
function readBodyString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

/** GET documents the event catalogue, so it is discoverable in one place. */
export const GET = route(async () => jsonOk({ events: ANALYTICS_EVENTS }));

export const POST = route(async ({ request }) => {
  const body = (await readJsonBody(request, 8 * 1024)) as Record<string, unknown>;

  if (!isAnalyticsEventName(body.event_name)) {
    throw new ApiError('VALIDATION_ERROR', 'حدث غير معروف.', 422);
  }

  const user = await getSessionUser();
  const { sessionId, isNew } = getOrCreateSessionId(request);

  const limit = await rateLimit('analytics', sessionId, 120, 60);
  if (!limit.allowed) {
    throw new ApiError('RATE_LIMIT', 'بعّد شوية وجرّب تاني.', 429);
  }

  const metadata =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};

  await trackEvent({
    sessionId,
    eventName: body.event_name,
    userId: user?.id ?? null,
    // The client may report which route it is on; it cannot report who it is.
    page: readBodyString(body.page, 512),
    referrer: readBodyString(body.referrer, 512) ?? requestReferrer(request),
    userAgent: requestUserAgent(request),
    metadata,
  });

  return jsonOk({ recorded: true }, 202, isNew ? { 'x-hadiya-session': 'new' } : undefined);
});