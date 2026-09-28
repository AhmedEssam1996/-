import { listAdminUsers, type AdminUserFilters } from '@/lib/admin/queries';
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
import { adminUserUpdateRequest } from '@/lib/api/schemas';
import type { UserRole } from '@/types/database';

/**
 * /api/admin/users
 *
 * GET  list users with search / role / status filters and pagination
 * PATCH perform exactly one privileged action: set_role | set_status | delete
 *
 * The PATCH body is a discriminated union, so "which action" and "which fields
 * that action needs" are validated together. A malformed request cannot reach
 * the mutation layer.
 *
 * Two protections live below this route, in `src/lib/admin/queries.ts`, and are
 * the reason an admin cannot lock themselves out:
 *   • an admin may not change their own role;
 *   • an admin may not disable or delete their own account.
 *
 * Every successful action is written to `admin_logs` with the acting admin id,
 * the target, and the before/after values.
 */

export const dynamic = 'force-dynamic';

const ROLES = ['USER', 'ADMIN', 'ALL'] as const;
const STATUSES = ['ACTIVE', 'DISABLED', 'ALL'] as const;
const DEMO_FILTERS = ['all', 'only', 'exclude'] as const;

export const GET = route(async ({ request }) => {
  await requireApiAdmin();
  const params = searchParams(request);

  const filters: AdminUserFilters = {
    search: readString(params, 'q', 80),
    role: readEnum<UserRole | 'ALL'>(params, 'role', ROLES) ?? 'ALL',
    status: readEnum<'ACTIVE' | 'DISABLED' | 'ALL'>(params, 'status', STATUSES) ?? 'ALL',
    page: readInt(params, 'page', 1, 1, 10_000),
    pageSize: readInt(params, 'page_size', 20, 5, 100),
    // Demo rows are opt-in, so the default view matches the "real data only"
    // promise made on the dashboard.
    includeDemo: readEnum(params, 'demo', DEMO_FILTERS) === 'only',
  };

  const result = await listAdminUsers(filters);

  return jsonOk({
    users: result.rows,
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
  const body = await readBody(request, adminUserUpdateRequest, 8 * 1024);

  // Imported lazily so the read path never pulls the mutation module (and the
  // Supabase Auth admin API) into the same graph.
  const { setUserRole, setUserStatus, deleteUser } = await import('@/lib/admin/queries');

  switch (body.action) {
    case 'set_role':
      await setUserRole(admin.id, body.user_id, body.role);
      return jsonOk({ updated: true, action: 'set_role', role: body.role });

    case 'set_status':
      await setUserStatus(admin.id, body.user_id, body.status);
      return jsonOk({ updated: true, action: 'set_status', status: body.status });

    case 'delete':
      await deleteUser(admin.id, body.user_id);
      return jsonOk({ deleted: true, action: 'delete' });

    default: {
      // Exhaustiveness: adding a variant to the schema without handling it here
      // becomes a compile error rather than a silent no-op.
      const exhaustive: never = body;
      return exhaustive;
    }
  }
});