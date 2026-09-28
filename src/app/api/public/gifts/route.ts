import { jsonOk, readInt, readString, route, searchParams } from '@/lib/api/route-helpers';
import { isDatabaseConfigured, query } from '@/lib/db/pg';

/**
 * GET /api/public/gifts
 *
 * Public discovery feed: PUBLISHED gifts whose author opted into `visibility =
 * 'public'`. Two properties matter and are enforced in SQL, not in the client:
 *
 *   • a `DRAFT` / `DISABLED` / `unlisted` gift can never appear here, even if a
 *     caller guesses its slug;
 *   • only the author's display name is exposed — never their email.
 *
 * Query: `?limit=12&offset=0&category=birthday`
 */

export const dynamic = 'force-dynamic';

export const GET = route(async ({ request }) => {
  const params = searchParams(request);
  const limit = readInt(params, 'limit', 12, 1, 48);
  const offset = readInt(params, 'offset', 0, 0, 10_000);
  const category = readString(params, 'category', 40);

  if (!isDatabaseConfigured()) {
    return jsonOk({ gifts: [], total: 0, limit, offset });
  }

  const conditions = ["g.status = 'PUBLISHED'", "g.visibility = 'public'", 'g.disabled_at is null'];
  const values: unknown[] = [];

  if (category) {
    values.push(category);
    conditions.push(`g.category = $${values.length}`);
  }

  const where = conditions.join(' and ');
  const rows = await query<{
    slug: string;
    title: string;
    category: string;
    type: string;
    recipient_name: string | null;
    published_at: string | null;
    author_name: string | null;
  }>(
    `select g.slug, g.title, g.category, g.type::text as type, g.recipient_name,
            coalesce(g.published_at, g.created_at) as published_at,
            p.full_name as author_name
     from public.gifts g
     left join public.profiles p on p.id = g.user_id
     where ${where}
     order by coalesce(g.published_at, g.created_at) desc
     limit $${values.length + 1} offset $${values.length + 2}`,
    [...values, limit, offset],
  );

  return jsonOk({
    gifts: rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      category: row.category,
      type: row.type,
      recipient_name: row.recipient_name,
      published_at: row.published_at,
      author_name: row.author_name,
    })),
    total: rows.length,
    limit,
    offset,
  });
});