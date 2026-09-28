import { getAdminUser } from '@/lib/admin/queries';
import { jsonOk, requireApiAdmin, route } from '@/lib/api/route-helpers';
import { ApiError } from '@/lib/http';

/**
 * GET /api/admin/users/[id]
 *
 * One user's full admin view: profile, role, counters, their last eight gifts and
 * their last eight AI generations.
 *
 * Everything here is read-only. Mutations deliberately live on the collection
 * route (/api/admin/users) so a single URL cannot both display and change an
 * account — a small thing that removes a whole class of accidental write.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async ({ params }) => {
  await requireApiAdmin();

  const user = await getAdminUser(params.id);
  if (!user) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      status: user.status,
      role: user.role,
      is_demo: user.is_demo,
      created_at: user.created_at,
      last_seen_at: user.last_seen_at,
    },
    counters: {
      gifts: user.gift_count,
      published: user.published_count,
      ai_generations: user.ai_count,
    },
    last_gifts: user.lastGifts,
    recent_generations: user.recentGenerations,
  });
});