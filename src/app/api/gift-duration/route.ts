import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { giftDurationRequest } from '@/lib/api/schemas';
import { getOrCreateSessionId, updateGiftOpenDuration } from '@/lib/analytics/track';
import { getPublishedGiftBySlug } from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';

/**
 * POST /api/gift-duration
 *
 * Reports dwell time for an open, once, on page-hide. The value is clamped to
 * 24 hours inside `updateGiftOpenDuration`, and the row it updates is the one
 * already keyed by (gift, session) — so this endpoint can only ever refine an
 * existing open, never create one.
 */

export const dynamic = 'force-dynamic';

export const POST = route(async ({ request }) => {
  const body = await readBody(request, giftDurationRequest, 4 * 1024);

  const bundle = await getPublishedGiftBySlug(body.slug);
  if (!bundle) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  const { sessionId } = getOrCreateSessionId(request);
  await updateGiftOpenDuration(bundle.gift.id, sessionId, body.seconds);

  return jsonOk({ recorded: true });
});