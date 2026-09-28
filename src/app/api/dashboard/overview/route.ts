import { jsonOk, requireApiUser, route } from '@/lib/api/route-helpers';
import {
  getRecentGiftsForUser,
  getUserOverview,
  listGiftsForUser,
} from '@/lib/gifts/queries';
import { getAiQuota } from '@/lib/settings';
import { isDatabaseConfigured } from '@/lib/db/pg';

/**
 * GET /api/dashboard/overview
 *
 * Everything the user dashboard renders, in one round trip: counters, the most
 * recent gifts, and the caller's AI allowance.
 *
 * All counters are real aggregates over the user's own rows (see
 * `getUserOverview`) — there are no fixtures and no placeholder numbers, so a
 * brand-new account sees zeros, which is the truth.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const user = await requireApiUser();

  const [overview, recent, quota] = await Promise.all([
    getUserOverview(user.id),
    getRecentGiftsForUser(user.id, 5),
    getAiQuota(user.id),
  ]);

  const drafts = await listGiftsForUser({ userId: user.id, status: 'DRAFT', limit: 3 });

  const finite = (value: number) => (Number.isFinite(value) ? value : null);

  return jsonOk({
    database: isDatabaseConfigured(),
    user: {
      id: user.id,
      name: user.fullName,
      email: user.email,
      avatar_url: user.avatarUrl,
      role: user.role,
    },
    overview: {
      total_gifts: overview.totalGifts,
      published_gifts: overview.publishedGifts,
      draft_gifts: overview.draftGifts,
      total_opens: overview.totalOpens,
      unique_open_gifts: overview.uniqueOpenGifts,
      ai_generations: overview.aiGenerations,
    },
    recent_gifts: recent.map((gift) => ({
      id: gift.id,
      title: gift.title,
      slug: gift.slug,
      status: gift.status,
      category: gift.category,
      updated_at: gift.updated_at,
    })),
    drafts: drafts.rows.map((gift) => ({
      id: gift.id,
      title: gift.title,
      slug: gift.slug,
      updated_at: gift.updated_at,
    })),
    ai_quota: {
      daily_limit: quota.dailyLimit,
      monthly_limit: quota.monthlyLimit,
      used_today: quota.usedToday,
      used_month: quota.usedMonth,
      remaining_today: finite(quota.remainingToday),
      remaining_month: finite(quota.remainingMonth),
      exhausted: quota.exhausted,
      unlimited: quota.unlimited,
    },
  });
});