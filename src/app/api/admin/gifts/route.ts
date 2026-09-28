import {
  adminDeleteGift,
  adminDisableGift,
  listAdminGifts,
  type AdminGiftFilters,
} from '@/lib/admin/queries';
import { adminGiftUpdateRequest } from '@/lib/api/schemas';
import {
  jsonOk,
  readBody,
  readEnum,
  readInt,
  readString,
  requireApiAdmin,
  route,
  searchParams,
} from '@/lib/api/route-helpers';

/**
 * /api/admin/gifts
 *
 * GET   every gift on the install, with owner, status and open count
 * PATCH disable / re-enable / delete a gift
 *
 * This is the ONLY surface where demo rows are reachable by default (`demo=only`
 * vs the default `exclude`), which is what keeps the "dashboard shows real data"
 * promise while still making seeded content reviewable.
 *
 * `adminDisableGift` sets `disabled_at` alongside the status, so a disabled gift
 * immediately stops resolving for recipients even if its slug was cached.
 */

export const dynamic = 'force-dynamic';

const STATUSES = ['DRAFT', 'PUBLISHED', 'DISABLED', 'ALL'] as const;
const DEMO_FILTERS = ['all', 'only', 'exclude'] as const;

export const GET = route(async ({ request }) => {
  await requireApiAdmin();
  const params = searchParams(request);

  const filters: AdminGiftFilters = {
    search: readString(params, 'q', 80),
    status: readEnum<'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ALL'>(params, 'status', STATUSES) ?? 'ALL',
    demo: readEnum<'all' | 'only' | 'exclude'>(params, 'demo', DEMO_FILTERS) ?? 'exclude',
    page: readInt(params, 'page', 1, 1, 10_000),
    pageSize: readInt(params, 'page_size', 20, 5, 100),
  };

  const result = await listAdminGifts(filters);

  return jsonOk({
    gifts: result.rows,
    pagination: {
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
      has_more: result.page * result.pageSize < result.total,
    },
  });
});

export const PATCH = route(async ({ request }) => {
  const admin = await requireApiAdmin();
  const body = await readBody(request, adminGiftUpdateRequest, 8 * 1024);

  switch (body.action) {
    case 'set_disabled':
      await adminDisableGift(admin.id, body.gift_id, body.disabled);
      return jsonOk({ updated: true, disabled: body.disabled });

    case 'delete':
      await adminDeleteGift(admin.id, body.gift_id);
      return jsonOk({ deleted: true });

    default: {
      const exhaustive: never = body;
      return exhaustive;
    }
  }
});