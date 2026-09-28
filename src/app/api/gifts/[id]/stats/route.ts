import { analyzeGiftPerformance } from '@/lib/gifts/insights';
import { jsonOk, requireApiUser, route } from '@/lib/api/route-helpers';
import { getGiftOpenStats, getGiftWithSectionsForUser } from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';
import { getFeatureFlags } from '@/lib/settings';

/**
 * GET /api/gifts/[id]/stats
 *
 * Per-gift analytics for its author: opens, unique opens, average dwell time, and
 * a derived section-completion estimate.
 *
 * The completion figure is a HEURISTIC and is labelled as one: we cannot observe
 * scroll depth server-side, so it is inferred from dwell time against the gift's
 * length. Presenting it as a precise measurement would be dishonest, so the
 * response carries `completion_is_estimate: true` and the UI words it accordingly.
 *
 * Gated by the `gift_analytics` feature flag — when an install turns analytics
 * off, the endpoint returns zeros rather than a 403, because the dashboard still
 * calls it and an error there would be a false alarm.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async ({ params }) => {
  const user = await requireApiUser();
  const bundle = await getGiftWithSectionsForUser(params.id, user.id);
  if (!bundle) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  const flags = await getFeatureFlags();
  if (!flags.gift_analytics) {
    return jsonOk({
      enabled: false,
      opens: 0,
      unique_opens: 0,
      first_opened_at: null,
      last_opened_at: null,
      avg_duration_seconds: 0,
      completion_rate: 0,
      completion_is_estimate: true,
      sections: bundle.sections.length,
    });
  }

  const stats = await getGiftOpenStats(bundle.id, user.id);
  const insight = analyzeGiftPerformance({
    opens: stats.opens,
    uniqueOpens: stats.uniqueOpens,
    avgDurationSeconds: stats.avgDurationSeconds,
    sectionCount: bundle.sections.length,
    status: bundle.status,
  });

  return jsonOk({
    enabled: true,
    opens: stats.opens,
    unique_opens: stats.uniqueOpens,
    first_opened_at: stats.firstOpenedAt,
    last_opened_at: stats.lastOpenedAt,
    avg_duration_seconds: stats.avgDurationSeconds,
    completion_rate: insight.completionRate,
    completion_is_estimate: true,
    sections: bundle.sections.length,
    insights: insight.messages,
  });
});