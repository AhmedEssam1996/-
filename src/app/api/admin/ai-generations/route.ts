import { jsonOk, requireApiAdmin, route, searchParams, readString, readPagination } from '@/lib/api/route-helpers';
import { isDatabaseConfigured, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import type { AiGenerationRow } from '@/types/database';

/**
 * GET /api/admin/ai-generations
 *
 * Paginated list of AI generation records for the admin monitoring page.
 *
 * Query: `?page=1&page_size=20&status=success|error&feature=gift_suggestions&search=...`
 */

export const dynamic = 'force-dynamic';

export const GET = route(async ({ request }) => {
  await requireApiAdmin();

  const params = searchParams(request);
  const { page, pageSize, limit, offset } = readPagination(params, 20);
  const status = readString(params, 'status', 20);
  const feature = readString(params, 'feature', 40);
  const search = readString(params, 'search', 100);
  const includeDemo = params.get('include_demo') === 'true';

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}::ai_generation_status`);
  }
  if (feature) {
    values.push(feature);
    conditions.push(`feature = $${values.length}::ai_feature`);
  }
  if (!includeDemo) {
    conditions.push('is_demo = false');
  }
  if (search?.trim()) {
    values.push(`%${search.trim()}%`);
    conditions.push(`(error_code ilike $${values.length} or model ilike $${values.length})`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';

  if (!isDatabaseConfigured()) {
    const supabase = getUntypedServiceClient();
    if (!supabase) {
      return jsonOk({ rows: [], total: 0, page, pageSize });
    }

    const query = supabase
      .from('ai_generations')
      .select()
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data } = await query;

    return jsonOk({
      rows: (data as AiGenerationRow[]) ?? [],
      total: (data as AiGenerationRow[])?.length ?? 0,
      page,
      pageSize,
      source: 'supabase',
    });
  }

  const [rows, countRow] = await Promise.all([
    query<{
      id: string;
      user_id: string | null;
      session_id: string | null;
      feature: string;
      model: string;
      provider: string;
      status: string;
      input_tokens: number | null;
      output_tokens: number | null;
      total_tokens: number | null;
      latency_ms: number | null;
      gift_id: string | null;
      error_code: string | null;
      is_demo: boolean;
      created_at: string;
      user_email: string | null;
    }>(
      `select a.id, a.user_id, a.session_id, a.feature::text as feature, a.model, a.provider,
              a.status::text as status, a.input_tokens, a.output_tokens, a.total_tokens,
              a.latency_ms, a.gift_id, a.error_code, a.is_demo, a.created_at,
              p.email as user_email
       from public.ai_generations a
       left join public.profiles p on p.id = a.user_id
       ${where}
       order by a.created_at desc
       limit $${values.length + 1} offset $${values.length + 2}`,
      [...values, limit, offset],
    ),
    query<{ total: string }>(
      `select count(*)::text as total from public.ai_generations ${where}`,
      values,
    ),
  ]);

  return jsonOk({
    rows,
    total: Number(countRow[0]?.total ?? 0),
    page,
    pageSize,
    source: 'database',
  });
});
