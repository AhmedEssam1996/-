import { isDatabaseConfigured } from '@/lib/db/pg';
import { createGift, listGiftsForUser } from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';
import type { Gift, GiftStatus } from '@/types/database';
import { getOrCreateSessionId, trackEvent } from '@/lib/analytics/track';
import {
  jsonOk,
  readBody,
  readEnum,
  readPagination,
  readString,
  requireApiUser,
  route,
  searchParams,
} from '@/lib/api/route-helpers';
import { createGiftRequest } from '@/lib/api/schemas';

/**
 * /api/gifts — the signed-in user's own gifts.
 *
 * GET  list (filtered, searched, paginated)
 * POST create a DRAFT
 *
 * Ownership is enforced in SQL (`where user_id = $1`), not here, so even a bug in
 * this handler cannot expose another user's gift. Drafts never leave the server
 * for anyone but their owner — including through this endpoint.
 */

export const dynamic = 'force-dynamic';

const GIFT_STATUSES = ['DRAFT', 'PUBLISHED', 'DISABLED', 'ALL'] as const;

/** Client-facing projection: the owner sees everything, but nothing undefined. */
function serialize(gift: Gift) {
  return {
    id: gift.id,
    title: gift.title,
    slug: gift.slug,
    category: gift.category,
    type: gift.type,
    status: gift.status,
    visibility: gift.visibility,
    recipient_name: gift.recipient_name,
    occasion: gift.occasion,
    content: gift.content_json,
    theme: gift.theme_json,
    cover_image: gift.cover_image,
    is_demo: gift.is_demo,
    published_at: gift.published_at,
    created_at: gift.created_at,
    updated_at: gift.updated_at,
  };
}

export const GET = route(async ({ request }) => {
  const user = await requireApiUser();
  const params = searchParams(request);

  const status = readEnum<GiftStatus | 'ALL'>(params, 'status', GIFT_STATUSES) ?? 'ALL';
  const search = readString(params, 'q', 80);
  const { page, pageSize, limit, offset } = readPagination(params);

  // An unconfigured database is a valid first-run state, not an error: the
  // dashboard shows an empty list rather than a crash.
  const { rows, total } = await listGiftsForUser({
    userId: user.id,
    status,
    search,
    limit,
    offset,
  });

  return jsonOk({
    gifts: rows.map(serialize),
    pagination: { page, page_size: pageSize, total, has_more: offset + rows.length < total },
    database: isDatabaseConfigured(),
  });
});

export const POST = route(async ({ request }) => {
  const user = await requireApiUser();
  const input = await readBody(request, createGiftRequest, 256 * 1024);

  if (!isDatabaseConfigured()) {
    throw new ApiError('DB_UNAVAILABLE', 'قاعدة البيانات مش متاحة حاليًا. جرّب تاني بعد شوية.', 503);
  }

  const gift = await createGift({
    userId: user.id,
    title: input.title,
    category: input.category,
    type: input.type,
    templateId: input.template_id ?? null,
    recipientName: input.recipient_name ?? null,
    occasion: input.occasion ?? null,
    content: input.content,
    theme: input.theme,
    coverImage: input.cover_image ?? null,
    visibility: input.visibility,
    source: input.source ?? 'builder',
    sections: input.sections?.map((section) => ({ ...section })),
  });

  const { sessionId } = getOrCreateSessionId(request);
  await trackEvent({
    sessionId,
    eventName: 'gift_created',
    userId: user.id,
    page: '/api/gifts',
    userAgent: request.headers.get('user-agent'),
    metadata: { category: gift.category, type: gift.type, sections: input.sections?.length ?? 0 },
  });

  return jsonOk({ gift: serialize(gift) }, 201);
});