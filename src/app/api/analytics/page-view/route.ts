import { ANALYTICS_EVENTS, isAnalyticsEventName, trackEvent, type AnalyticsEventName } from '@/lib/analytics/track';
import { jsonOk, route, requestReferrer, requestUserAgent } from '@/lib/api/route-helpers';
import { getSessionUser } from '@/lib/auth/session';
import { ApiError, readJsonBody } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { randomSuffix } from '@/lib/utils';

/**
 * POST /api/analytics/page-view
 *
 * Convenience endpoint for the root client shell: one page_view per navigation.
 *
 * It exists separately from /api/analytics/events so the common case can be a
 * one-field request (`{ path }`) that `sendBeacon` can fire without a JSON body
 * builder. It is still rate limited and still derives identity server-side.
 *
 * When the visitor has no session cookie yet (a first, cookieless request), one
 * is generated but NOT persisted — the middleware is what mints the real cookie
 * on the HTML response. Analytics must not be able to set auth-adjacent cookies.
 */

export const dynamic = 'force-dynamic';

export const POST = route(async ({ request }) => {
  const body = (await readJsonBody(request, 2 * 1024)) as Record<string, unknown>;

  const path = typeof body.path === 'string' ? body.path.trim().slice(0, 512) : '/';
  const eventName: AnalyticsEventName = isAnalyticsEventName(body.event_name)
    ? body.event_name
    : 'page_view';

  if (!ANALYTICS_EVENTS.includes(eventName)) {
    throw new ApiError('VALIDATION_ERROR', 'حدث غير معروف.', 422);
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = /(?:^|;\s*)hd_vid=([^;]+)/.exec(cookieHeader);
  const sessionId = match?.[1] ? decodeURIComponent(match[1]) : `anon_${randomSuffix(20)}`;

  const limit = await rateLimit('page-view', sessionId, 240, 60);
  if (!limit.allowed) {
    throw new ApiError('RATE_LIMIT', 'بعّد شوية وجرّب تاني.', 429);
  }

  const user = await getSessionUser();

  await trackEvent({
    sessionId,
    eventName,
    userId: user?.id ?? null,
    page: path,
    referrer: requestReferrer(request),
    userAgent: requestUserAgent(request),
  });

  return jsonOk({ recorded: true }, 202);
});