import { jsonOk, readBody, requireApiUser, route } from '@/lib/api/route-helpers';
import { sectionsRequest } from '@/lib/api/schemas';
import { getGiftForUser, replaceSections } from '@/lib/gifts/queries';
import { ApiError } from '@/lib/http';

/**
 * PUT /api/gifts/[id]/sections
 *
 * Replaces the gift's section list atomically.
 *
 * Full replacement rather than a diff is a deliberate design choice: the builder
 * always holds the complete ordered array, so reordering, inserting and deleting
 * all collapse into "here is the new list". A partial update would need position
 * reconciliation on the server and is a classic source of duplicated or lost
 * sections.
 *
 * The ownership check happens inside `replaceSections` (via `getGiftForUser`) and
 * again here for the 404, so a wrong id can never write.
 */

export const dynamic = 'force-dynamic';

export const PUT = route(async ({ request, params }) => {
  const user = await requireApiUser();
  const input = await readBody(request, sectionsRequest, 256 * 1024);

  const owned = await getGiftForUser(params.id, user.id);
  if (!owned) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  const ok = await replaceSections(
    params.id,
    user.id,
    input.sections.map((section) => ({ ...section })),
  );

  if (!ok) {
    throw new ApiError('NOT_FOUND', 'الحاجة اللي بتدور عليها مش موجودة.', 404);
  }

  return jsonOk({ saved: true, sections: input.sections.length });
});