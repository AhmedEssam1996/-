import { jsonOk, route } from '@/lib/api/route-helpers';
import { isDatabaseConfigured, queryOne } from '@/lib/db/pg';
import { listTemplates } from '@/lib/gifts/queries';

/**
 * GET /api/public/stats
 *
 * Homepage trust signals. These are REAL counts from the database — never
 * invented numbers. Demo rows are excluded so the figures a visitor sees match
 * the figures the admin dashboard reports.
 *
 * When no database is configured every counter is 0 and `available: false`, so
 * the UI can render a first-run state instead of a fake "1,284 gifts created".
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const templates = await listTemplates();

  if (!isDatabaseConfigured()) {
    return jsonOk({
      available: false,
      gifts_created: 0,
      gifts_published: 0,
      gifts_opened: 0,
      templates: templates.length,
    });
  }

  const row = await queryOne<{
    gifts_created: string;
    gifts_published: string;
    gifts_opened: string;
  }>(
    `select
       (select count(*)::text from public.gifts where not is_demo)          as gifts_created,
       (select count(*)::text from public.gifts
          where not is_demo and status = 'PUBLISHED')                      as gifts_published,
       (select count(distinct o.gift_id)::text from public.gift_opens o
          join public.gifts g on g.id = o.gift_id
          where not o.is_demo and not g.is_demo)                           as gifts_opened`,
  );

  return jsonOk({
    available: true,
    gifts_created: Number(row?.gifts_created ?? 0),
    gifts_published: Number(row?.gifts_published ?? 0),
    gifts_opened: Number(row?.gifts_opened ?? 0),
    templates: templates.length,
  });
});