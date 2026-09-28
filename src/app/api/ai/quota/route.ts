import { jsonOk, requireApiUser, route } from '@/lib/api/route-helpers';
import { getAiQuota } from '@/lib/settings';

/**
 * GET /api/ai/quota
 *
 * The signed-in user's own allowance. Counts come from `ai_generations`
 * (`status = 'success'`), never from an in-memory counter, so a deploy cannot
 * reset anybody's usage.
 *
 * `Infinity` is not JSON-serialisable, so "unlimited" is reported as
 * `unlimited: true` with the raw limit (0) left intact.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const user = await requireApiUser();
  const quota = await getAiQuota(user.id);

  const finite = (value: number) => (Number.isFinite(value) ? value : null);

  return jsonOk({
    daily_limit: quota.dailyLimit,
    monthly_limit: quota.monthlyLimit,
    used_today: quota.usedToday,
    used_month: quota.usedMonth,
    remaining_today: finite(quota.remainingToday),
    remaining_month: finite(quota.remainingMonth),
    exhausted: quota.exhausted,
    unlimited: quota.unlimited,
  });
});