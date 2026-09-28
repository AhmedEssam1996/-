import {
  getAdminDistributions,
  getAdminFunnel,
  getAdminOverview,
  getAdminTimeSeries,
  isAdminDataAvailable,
} from '@/lib/admin/queries';
import { jsonOk, readEnum, requireApiAdmin, route, searchParams } from '@/lib/api/route-helpers';
import { rangeToSince, type DateRangeKey } from '@/lib/utils';

/**
 * GET /api/admin/stats
 *
 * The admin dashboard payload: overview counters, time series, distributions and
 * the funnel — all four aggregates in parallel.
 *
 * Where the numbers come from: the `admin_*` SQL functions in migration 0001,
 * which exclude every `is_demo = true` row. That separation is the point — the
 * dashboard reports REAL usage, while demo data stays visible on /admin/gifts
 * behind an explicit filter.
 *
 * `?range=today|7d|30d|90d|custom&from=YYYY-MM-DD` selects the window. When the
 * database is unreachable the aggregates come back as zeros with
 * `available: false`, so the UI can say "مفيش بيانات" instead of showing a false
 * flat line.
 */

export const dynamic = 'force-dynamic';

const RANGES = ['today', '7d', '30d', '90d', 'custom'] as const;

export const GET = route(async ({ request }) => {
  await requireApiAdmin();

  const params = searchParams(request);
  const range = readEnum<DateRangeKey>(params, 'range', RANGES) ?? '30d';
  const from = params.get('from');
  const since = rangeToSince(range, from);

  if (!isAdminDataAvailable()) {
    return jsonOk({
      available: false,
      range,
      since: since.toISOString(),
      overview: null,
      time_series: null,
      distributions: null,
      funnel: null,
    });
  }

  const [overview, timeSeries, distributions, funnel] = await Promise.all([
    getAdminOverview(since),
    getAdminTimeSeries(since),
    getAdminDistributions(),
    getAdminFunnel(),
  ]);

  return jsonOk({
    available: true,
    range,
    since: since.toISOString(),
    overview,
    time_series: timeSeries,
    distributions,
    funnel,
  });
});