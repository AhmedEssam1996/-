import { jsonOk, readBody, route, requestUserAgent } from '@/lib/api/route-helpers';
import { giftOpenRequest } from '@/lib/api/schemas';
import {
  getOrCreateSessionId,
  recordGiftOpen,
  sessionCookieOptions,
  trackEvent,
} from '@/lib/analytics/track';
import { getPublishedGiftBySlug } from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/gift-open
 *
 * Records that a recipient opened a gift. This is the only write an anonymous
 * visitor can perform, so the route is deliberately tight:
 *
 *   • the gift must exist AND be PUBLISHED and not disabled — otherwise 404, so a
 *     guessed slug cannot be used to probe draft existence;
 *   • the caller supplies only a slug; `gift_id` is resolved server-side;
 *   • the session id comes from the httpOnly cookie, and `recordGiftOpen` holds a
 *     `unique (gift_id, session_id)` so refreshing cannot inflate the count;
 *   • rate limited, because the endpoint is unauthenticated.
 *
 * Returns `{ recorded: false }` (200) when analytics is unavailable rather than
 * erroring: a recipient must always see their gift.
 */

export const dynamic = 'force-dynamic';

export const POST = route(async ({ request }) => {
  const body = await readBody(request, giftOpenRequest, 4 * 1024);

  const bundle = await getPublishedGiftBySlug(body.slug);
  if (!bundle) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  const { sessionId } = getOrCreateSessionId(request);

  const limit = await rateLimit('gift-open', sessionId, 60, 60);
  if (!limit.allowed) {
    throw new ApiError('RATE_LIMIT', 'بعّد شوية وجرّب تاني.', 429);
  }

  const openId = await recordGiftOpen({
    giftId: bundle.gift.id,
    sessionId,
    userAgent: requestUserAgent(request),
    isDemo: bundle.gift.is_demo,
  });

  await trackEvent({
    sessionId,
    eventName: 'gift_opened',
     page: `/gift/${bundle.gift.slug}`,
    userAgent: requestUserAgent(request),
    metadata: { gift_id: bundle.gift.id, category: bundle.gift.category },
  });

  return jsonOk(
    { recorded: openId !== null, open_id: openId },
    200,
    { 'Set-Cookie': `${sessionCookieOptions().name}=${sessionId}; Path=/; HttpOnly; SameSite=Lax` },
  );
});