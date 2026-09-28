import { getOrCreateSessionId, trackEvent } from '@/lib/analytics/track';
import { jsonOk, readBody, requireApiUser, route } from '@/lib/api/route-helpers';
import { publishRequest } from '@/lib/api/schemas';
import { setGiftStatus } from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';
import { giftUrl } from '@/lib/utils';

/**
 * POST /api/gifts/[id]/publish
 *
 * Moves a gift between DRAFT / PUBLISHED / DISABLED.
 *
 * Two rules enforced in the data layer rather than trusted from the client:
 *   • a gift with no sections cannot be published (a recipient landing on an
 *     empty page is a worse outcome than an error for the author);
 *   • `published_at` is stamped once, and disabling clears `disabled_at` on
 *     re-enable, so the public query's `disabled_at is null` filter stays honest.
 *
 * The share URL is returned on publish so the UI never has to construct it.
 */

export const dynamic = 'force-dynamic';

export const POST = route(async ({ request, params }) => {
  const user = await requireApiUser();
  const input = await readBody(request, publishRequest, 4 * 1024);

  const gift = await setGiftStatus(params.id, user.id, input.status);
  if (!gift) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  if (input.status === 'PUBLISHED') {
    const { sessionId } = getOrCreateSessionId(request);
    await trackEvent({
      sessionId,
      eventName: 'gift_published',
      userId: user.id,
      page: '/api/gifts/publish',
      userAgent: request.headers.get('user-agent'),
      metadata: { category: gift.category, type: gift.type },
    });
  }

  return jsonOk({
    gift: {
      id: gift.id,
      slug: gift.slug,
      status: gift.status,
      visibility: gift.visibility,
      published_at: gift.published_at,
    },
    share_url: gift.status === 'PUBLISHED' ? giftUrl(gift.slug) : null,
  });
});