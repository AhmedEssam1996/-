import { jsonOk, readBody, requireApiUser, route } from '@/lib/api/route-helpers';
import { updateGiftRequest } from '@/lib/api/schemas';
import {
  deleteGift,
  getGiftOpenStats,
  getGiftWithSectionsForUser,
  updateGift,
} from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';
import { getFeatureFlags } from '@/lib/settings';

/**
 * /api/gifts/[id] — a single gift, owner-scoped.
 *
 * GET     read with its ordered sections + open stats
 * PATCH   update metadata / content / theme
 * DELETE  remove permanently
 *
 * Every path goes through `getGiftForUser`-backed helpers, which match on
 * (id, user_id). A gift belonging to someone else returns 404 — the same answer
 * as a gift that does not exist, so the endpoint cannot be used to enumerate ids.
 */

export const dynamic = 'force-dynamic';

async function ownedGift(giftId: string, userId: string) {
  const bundle = await getGiftWithSectionsForUser(giftId, userId);
  if (!bundle) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }
  return bundle;
}

export const GET = route(async ({ params }) => {
  const user = await requireApiUser();
  const bundle = await ownedGift(params.id, user.id);

  // Analytics for the author are opt-in per install.
  const flags = await getFeatureFlags();
  const stats = flags.gift_analytics
    ? await getGiftOpenStats(bundle.id, user.id)
    : { opens: 0, uniqueOpens: 0, firstOpenedAt: null, lastOpenedAt: null, avgDurationSeconds: 0 };

  return jsonOk({
    gift: {
      id: bundle.id,
      title: bundle.title,
      slug: bundle.slug,
      category: bundle.category,
      type: bundle.type,
      status: bundle.status,
      visibility: bundle.visibility,
      recipient_name: bundle.recipient_name,
      occasion: bundle.occasion,
      content: bundle.content_json,
      theme: bundle.theme_json,
      cover_image: bundle.cover_image,
      is_demo: bundle.is_demo,
      published_at: bundle.published_at,
      created_at: bundle.created_at,
      updated_at: bundle.updated_at,
    },
    sections: bundle.sections.map((section) => ({
      id: section.id,
      type: section.type,
      position: section.position,
      content: section.content_json,
    })),
    stats: {
      opens: stats.opens,
      unique_opens: stats.uniqueOpens,
      first_opened_at: stats.firstOpenedAt,
      last_opened_at: stats.lastOpenedAt,
      avg_duration_seconds: stats.avgDurationSeconds,
    },
  });
});

export const PATCH = route(async ({ request, params }) => {
  const user = await requireApiUser();
  const input = await readBody(request, updateGiftRequest, 256 * 1024);

  const updated = await updateGift(params.id, user.id, {
    title: input.title,
    category: input.category,
    type: input.type,
    recipientName: input.recipient_name,
    occasion: input.occasion,
    content: input.content,
    theme: input.theme,
    coverImage: input.cover_image,
    visibility: input.visibility,
    slug: input.slug,
  });

  if (!updated) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  return jsonOk({
    gift: {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      status: updated.status,
      visibility: updated.visibility,
      updated_at: updated.updated_at,
    },
  });
});

export const DELETE = route(async ({ params }) => {
  const user = await requireApiUser();
  const removed = await deleteGift(params.id, user.id);

  if (!removed) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  return jsonOk({ deleted: true });
});