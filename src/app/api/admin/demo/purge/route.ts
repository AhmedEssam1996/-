import { jsonOk, requireApiAdmin, route } from '@/lib/api/route-helpers';
import { readJsonBody, ApiError } from '@/lib/http';
import { logAdminAction, purgeDemoData } from '@/lib/admin/queries';

/**
 * POST /api/admin/demo/purge
 *
 * Removes every `is_demo = true` row and the seeded `@demo.hadiya.local`
 * accounts. It is the HTTP equivalent of `npm run db:seed:clear`.
 *
 * Safety properties:
 *   • admin-guarded like every other privileged route;
 *   • `confirm` must be exactly `"DELETE_DEMO_DATA"`, so a stray fetch or an
 *     accidental double-click cannot wipe the seed;
 *   • it only ever deletes rows already tagged as demo — real data is untouched
 *     by construction, not by prompt;
 *   • the action and the per-table counts are written to the audit log, because
 *     a bulk delete should be attributable.
 *
 * It requires DATABASE_URL: purging through PostgREST would need one request per
 * table and could partially fail, leaving a half-cleaned install.
 */

export const dynamic = 'force-dynamic';

const CONFIRMATION = 'DELETE_DEMO_DATA';

export const POST = route(async ({ request }) => {
  const admin = await requireApiAdmin();
  const body = (await readJsonBody(request, 4 * 1024)) as Record<string, unknown>;

  if (body.confirm !== CONFIRMATION) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `لازم تأكيد العملية بالضبط بالكلمة "${CONFIRMATION}".`,
      422,
    );
  }

  const counts = await purgeDemoData();

  await logAdminAction({
    adminUserId: admin.id,
    action: 'demo.purged',
    targetType: 'system',
    targetId: 'demo',
    metadata: counts,
  });

  return jsonOk({ purged: true, counts });
});