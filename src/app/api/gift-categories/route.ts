import { jsonOk, route, searchParams, readInt, readString } from '@/lib/api/route-helpers';
import { isDatabaseConfigured, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import { CATEGORIES } from '@/lib/mock-data';
import type { GiftTemplate } from '@/types/database';

/**
 * GET /api/gift-categories
 *
 * Distinct gift categories with metadata (emoji, gradient) and a count of
 * published gifts in each. Public by design — just metadata.
 *
 * Falls back to the built-in category list when the database is unreachable.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async ({ request }) => {
  const params = searchParams(request);
  const limit = readInt(params, 'limit', 50, 1, 100);
  const search = readString(params, 'search', 100);

  const rows = await (async (): Promise<GiftTemplate[]> => {
    if (isDatabaseConfigured()) {
      const conditions: string[] = [];
      const values: unknown[] = [];
      conditions.push('is_active = true');
      if (search?.trim()) {
        values.push(`%${search}%`);
        conditions.push(`category ilike $${values.length}`);
      }
      const _where = `where ${conditions.join(' and ')}`;

      const sql = `
        select category as category,
               max(emoji) as emoji,
               max(gradient) as gradient,
               max(accent) as accent,
               max(description_ar) as description_ar,
               count(*)::int as gift_count,
               max(position) as position
        from public.gift_templates
        where is_active = true
        ${search ? `and category ilike $${values.length}` : ''}
        group by category
        order by max(position) asc, category asc
        limit ${limit}`;

      return query<{
        category: string;
        emoji: string;
        gradient: string;
        accent: string;
        description_ar: string;
        gift_count: number;
        position: number;
      }>(sql, values).then((rows) =>
        rows.map((r) => ({
          id: r.category,
          slug: r.category,
          title_ar: r.category,
          title_en: r.category,
          description_ar: r.description_ar,
          category: r.category,
          emoji: r.emoji,
          gradient: r.gradient,
          accent: r.accent,
           type: 'generic' as const,
          is_active: true,
          is_demo: false,
          default_sections: [],
          position: r.position,
          created_at: '',
          updated_at: '',
        } as GiftTemplate)),
      );
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      let builder = supabase.from('gift_templates').select();
      if (!search) builder = builder.eq('is_active', true);
      const { data } = await builder;
      return (data ?? []) as GiftTemplate[];
    }

    return [];
  })();

  if (rows.length === 0) {
    return jsonOk({
      categories: CATEGORIES,
      total: CATEGORIES.length,
      source: 'mock',
    });
  }

  const categories = rows.map((row) => ({
    id: row.category,
    name: row.category,
    slug: row.category,
    emoji: row.emoji || '🎁',
    gradient: row.gradient || 'from-[var(--hd-pink)] to-[var(--hd-purple)]',
    count: (row as unknown as { gift_count?: number }).gift_count ?? 0,
    description: row.description_ar || '',
  }));

  return jsonOk({
    categories,
    total: categories.length,
    source: 'database',
  });
});
