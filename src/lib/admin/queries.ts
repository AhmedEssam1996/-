import 'server-only';

import { asObject, isDatabaseConfigured, query, queryOne } from '@/lib/db/pg';
import { getServiceClient } from '@/lib/db/supabase-admin';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import { ApiError } from '@/lib/http';
import type {
  AdminDistributions,
  AdminFunnel,
  AdminGiftRow,
  AdminOverview,
  AdminTimeSeries,
  AdminUserRow,
  Paginated,
  UserRole,
} from '@/types/database';

/**
 * Admin data access.
 *
 * Every number produced here comes from the database. There are no fixtures, no
 * random placeholders and no "if empty show 1,284" fallbacks — an empty install
 * shows 0. Aggregation happens inside Postgres via the SQL functions defined in
 * migration 0001 so this layer stays a thin, testable mapping.
 *
 * All demo rows (`is_demo = true`) are excluded by those SQL functions, so the
 * dashboard reports REAL usage only. The seed script's data is visible through
 * the DEMO DATA filter on /admin/gifts instead.
 */

const OVERVIEW_FALLBACK: AdminOverview = {
  total_users: 0,
  new_users_today: 0,
  new_users_week: 0,
  new_users_month: 0,
  total_gifts: 0,
  published_gifts: 0,
  draft_gifts: 0,
  gifts_today: 0,
  total_opens: 0,
  unique_opens: 0,
  total_ai: 0,
  ai_today: 0,
  total_visitors: 0,
  visitors_today: 0,
  visitors_week: 0,
  visitors_month: 0,
  page_views: 0,
  page_views_today: 0,
  total_sessions: 0,
  events_in_range: 0,
  active_users_7d: 0,
  active_users_30d: 0,
};

const TIME_SERIES_FALLBACK: AdminTimeSeries = {
  visitors: [],
  new_users: [],
  gifts_created: [],
  gifts_opened: [],
  ai_generations: [],
};

const DISTRIBUTIONS_FALLBACK: AdminDistributions = {
  top_categories: [],
  ai_features: [],
  devices: [],
  browsers: [],
  top_pages: [],
  traffic_sources: [],
  recent_events: [],
};

const FUNNEL_FALLBACK: AdminFunnel = {
  visitors: 0,
  registered: 0,
  created_gift: 0,
  used_ai: 0,
  published_gift: 0,
  gift_opened: 0,
};

export function isAdminDataAvailable(): boolean {
  return isDatabaseConfigured() || getUntypedServiceClient() !== null;
}

async function callRpc<T>(fn: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    if (isDatabaseConfigured()) {
      const sqlArgs = Object.keys(args).map((key) => args[key]);
      const placeholders = Object.keys(args)
        .map((_, index) => `$${index + 1}`)
        .join(', ');
      const row = await queryOne<Record<string, unknown>>(
        `select public.${fn}(${placeholders}) as result`,
        sqlArgs,
      );
      return asObject<T>(row?.result, fallback);
    }

    // The admin_* SQL functions are read-only aggregates; the untagged client is
    // only used to avoid re-deriving their return types by hand.
    const supabase = getUntypedServiceClient() as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
    } | null;
    if (supabase) {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      return asObject<T>(data, fallback);
    }
  } catch (error) {
    console.error(`[admin] ${fn} failed:`, (error as Error).message);
  }

  return fallback;
}

export function getAdminOverview(since: Date): Promise<AdminOverview> {
  return callRpc('admin_overview', { p_since: since.toISOString() }, OVERVIEW_FALLBACK);
}

export function getAdminTimeSeries(since: Date): Promise<AdminTimeSeries> {
  return callRpc('admin_time_series', { p_since: since.toISOString() }, TIME_SERIES_FALLBACK);
}

export function getAdminDistributions(): Promise<AdminDistributions> {
  return callRpc('admin_distributions', {}, DISTRIBUTIONS_FALLBACK);
}

export function getAdminFunnel(): Promise<AdminFunnel> {
  return callRpc('admin_funnel', {}, FUNNEL_FALLBACK);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface AdminUserFilters {
  search?: string;
  role?: UserRole | 'ALL';
  status?: 'ACTIVE' | 'DISABLED' | 'ALL';
  page?: number;
  pageSize?: number;
  includeDemo?: boolean;
}

export async function listAdminUsers(
  filters: AdminUserFilters = {},
): Promise<Paginated<AdminUserRow>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const empty: Paginated<AdminUserRow> = { rows: [], total: 0, page, pageSize };
  if (!isDatabaseConfigured()) return empty;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!filters.includeDemo) conditions.push('p.is_demo = false');

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(p.email ilike $${params.length} or coalesce(p.full_name, '') ilike $${params.length})`,
    );
  }
  if (filters.role && filters.role !== 'ALL') {
    params.push(filters.role);
    conditions.push(`coalesce(r.role, 'USER') = $${params.length}`);
  }
  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    conditions.push(`p.status = $${params.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const [rows, countRow] = await Promise.all([
    query<AdminUserRow>(
      `select p.id,
              p.email,
              p.full_name,
              p.avatar_url,
              p.status,
              coalesce(r.role, 'USER') as role,
              p.is_demo,
              p.created_at,
              p.last_seen_at,
              (select count(*)::int from public.gifts g where g.user_id = p.id) as gift_count,
              (select count(*)::int from public.gifts g
                 where g.user_id = p.id and g.status = 'PUBLISHED') as published_count,
              (select count(*)::int from public.ai_generations a
                 where a.user_id = p.id and a.status = 'success') as ai_count
       from public.profiles p
       left join public.user_roles r on r.user_id = p.id
       ${where}
       order by p.created_at desc
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, offset],
    ),
    queryOne<{ total: string }>(
      `select count(*)::text as total
       from public.profiles p
       left join public.user_roles r on r.user_id = p.id
       ${where}`,
      params,
    ),
  ]);

  return { rows, total: Number(countRow?.total ?? 0), page, pageSize };
}

export async function getAdminUser(userId: string): Promise<
  | (AdminUserRow & {
      lastGifts: Array<{ id: string; title: string; status: string; created_at: string; slug: string }>;
      recentGenerations: Array<{ feature: string; status: string; model: string; created_at: string }>;
    })
  | null
> {
  if (!isDatabaseConfigured()) return null;

  const base = await queryOne<AdminUserRow>(
    `select p.id, p.email, p.full_name, p.avatar_url, p.status,
            coalesce(r.role, 'USER') as role, p.is_demo, p.created_at, p.last_seen_at,
            (select count(*)::int from public.gifts g where g.user_id = p.id) as gift_count,
            (select count(*)::int from public.gifts g
               where g.user_id = p.id and g.status = 'PUBLISHED') as published_count,
            (select count(*)::int from public.ai_generations a
               where a.user_id = p.id and a.status = 'success') as ai_count
     from public.profiles p
     left join public.user_roles r on r.user_id = p.id
     where p.id = $1`,
    [userId],
  );

  if (!base) return null;

  const [lastGifts, recentGenerations] = await Promise.all([
    query<{ id: string; title: string; status: string; created_at: string; slug: string }>(
      `select id, title, status, created_at, slug from public.gifts
       where user_id = $1 order by created_at desc limit 8`,
      [userId],
    ),
    query<{ feature: string; status: string; model: string; created_at: string }>(
      `select feature::text as feature, status::text as status, model, created_at
       from public.ai_generations where user_id = $1 order by created_at desc limit 8`,
      [userId],
    ),
  ]);

  return { ...base, lastGifts, recentGenerations };
}

// ---------------------------------------------------------------------------
// Gifts
// ---------------------------------------------------------------------------

export interface AdminGiftFilters {
  search?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ALL';
  demo?: 'all' | 'only' | 'exclude';
  page?: number;
  pageSize?: number;
}

export async function listAdminGifts(
  filters: AdminGiftFilters = {},
): Promise<Paginated<AdminGiftRow>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const empty: Paginated<AdminGiftRow> = { rows: [], total: 0, page, pageSize };
  if (!isDatabaseConfigured()) return empty;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.demo === 'only') conditions.push('g.is_demo = true');
  else if (filters.demo !== 'all') conditions.push('g.is_demo = false');

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(g.title ilike $${params.length} or g.slug ilike $${params.length}
        or coalesce(p.email, '') ilike $${params.length})`,
    );
  }
  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    conditions.push(`g.status = $${params.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const [rows, countRow] = await Promise.all([
    query<AdminGiftRow>(
      `select g.id, g.title, g.slug, g.category, g.type, g.status, g.visibility, g.is_demo,
              g.created_at, g.published_at, g.disabled_at,
              coalesce(opens.total, 0)::int as opens,
              opens.last_opened_at,
              p.full_name as owner_name,
              p.email as owner_email,
              g.user_id as owner_id
       from public.gifts g
       left join public.profiles p on p.id = g.user_id
       left join (
         select gift_id, count(*) as total, max(opened_at) as last_opened_at
         from public.gift_opens group by gift_id
       ) opens on opens.gift_id = g.id
       ${where}
       order by g.created_at desc
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, offset],
    ),
    queryOne<{ total: string }>(
      `select count(*)::text as total
       from public.gifts g
       left join public.profiles p on p.id = g.user_id
       ${where}`,
      params,
    ),
  ]);

  return { rows, total: Number(countRow?.total ?? 0), page, pageSize };
}

// ---------------------------------------------------------------------------
// Privileged mutations
//
// Each of these MUST be called from a route that has already passed
// `guardAdmin()`. They take `actingAdminId` so the action is attributable in
// admin_logs, and they refuse to let an admin demote/disable themselves — that
// is the classic way a single-admin install locks itself out.
// ---------------------------------------------------------------------------

async function logAdminAction(input: {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (isDatabaseConfigured()) {
      await query(
        `insert into public.admin_logs (admin_user_id, action, target_type, target_id, metadata_json)
         values ($1,$2,$3,$4,$5::jsonb)`,
        [
          input.adminUserId,
          input.action,
          input.targetType ?? null,
          input.targetId ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      return;
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      await supabase.from('admin_logs').insert({
        admin_user_id: input.adminUserId,
        action: input.action,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        metadata_json: input.metadata ?? {},
      });
    }
  } catch (error) {
    console.warn('[admin] could not write audit log:', (error as Error).message);
  }
}

export { logAdminAction };

export async function setUserRole(
  actingAdminId: string,
  targetUserId: string,
  role: UserRole,
): Promise<void> {
  if (actingAdminId === targetUserId) {
    throw new ApiError('FORBIDDEN', 'مش مسموح تغيّر صلاحيتك بنفسك.', 403);
  }

  const previous = await queryOne<{ role: UserRole }>(
    'select role from public.user_roles where user_id = $1',
    [targetUserId],
  );

  if (isDatabaseConfigured()) {
    await query(
      `insert into public.user_roles (user_id, role, granted_by)
       values ($1, $2, $3)
       on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by`,
      [targetUserId, role, actingAdminId],
    );
  } else {
    const supabase = getUntypedServiceClient();
    if (!supabase) throw new ApiError('DB_UNAVAILABLE', 'مقدرناش نوصل للداتا.', 503);
    await supabase
      .from('user_roles')
      .upsert({ user_id: targetUserId, role, granted_by: actingAdminId }, { onConflict: 'user_id' });
  }

  await logAdminAction({
    adminUserId: actingAdminId,
    action: 'user.role_changed',
    targetType: 'user',
    targetId: targetUserId,
    metadata: { from: previous?.role ?? 'USER', to: role },
  });
}

export async function setUserStatus(
  actingAdminId: string,
  targetUserId: string,
  status: 'ACTIVE' | 'DISABLED',
): Promise<void> {
  if (actingAdminId === targetUserId) {
    throw new ApiError('FORBIDDEN', 'مش مسموح توقف حسابك بنفسك.', 403);
  }

  if (isDatabaseConfigured()) {
    await query(
      `update public.profiles
       set status = $2, disabled_at = case when $2 = 'DISABLED' then now() else null end
       where id = $1`,
      [targetUserId, status],
    );
  } else {
    const supabase = getUntypedServiceClient();
    if (!supabase) throw new ApiError('DB_UNAVAILABLE', 'مقدرناش نوصل للداتا.', 503);
    await supabase
      .from('profiles')
      .update({
        status,
        disabled_at: status === 'DISABLED' ? new Date().toISOString() : null,
      })
      .eq('id', targetUserId);
  }

  await logAdminAction({
    adminUserId: actingAdminId,
    action: status === 'DISABLED' ? 'user.disabled' : 'user.enabled',
    targetType: 'user',
    targetId: targetUserId,
  });
}

/**
 * Deletes a user. Removing the auth row cascades to profiles, roles, gifts and
 * sections — which is why the caller is asked to confirm explicitly in the UI.
 */
export async function deleteUser(actingAdminId: string, targetUserId: string): Promise<void> {
  if (actingAdminId === targetUserId) {
    throw new ApiError('FORBIDDEN', 'مش مسموح تحذف حسابك بنفسك.', 403);
  }

  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.auth.admin.deleteUser(targetUserId);
    if (error) {
      // Fall back to a direct delete when the auth API is unavailable (e.g. when
      // only DATABASE_URL is configured, which is the common self-hosted setup).
      if (!isDatabaseConfigured()) {
        throw new ApiError('INTERNAL_ERROR', 'مقدرناش نحذف المستخدم.', 500);
      }
    }
  }

  if (isDatabaseConfigured()) {
    await query('delete from auth.users where id = $1', [targetUserId]);
  }

  await logAdminAction({
    adminUserId: actingAdminId,
    action: 'user.deleted',
    targetType: 'user',
    targetId: targetUserId,
  });
}

export async function adminDisableGift(
  actingAdminId: string,
  giftId: string,
  disabled: boolean,
): Promise<void> {
  if (isDatabaseConfigured()) {
    await query(
      `update public.gifts
       set status = case when $2 then 'DISABLED' else 'PUBLISHED' end,
           disabled_at = case when $2 then now() else null end
       where id = $1`,
      [giftId, disabled],
    );
  } else {
    const supabase = getUntypedServiceClient();
    if (!supabase) throw new ApiError('DB_UNAVAILABLE', 'مقدرناش نوصل للداتا.', 503);
    await supabase
      .from('gifts')
      .update({
        status: disabled ? 'DISABLED' : 'PUBLISHED',
        disabled_at: disabled ? new Date().toISOString() : null,
      })
      .eq('id', giftId);
  }

  await logAdminAction({
    adminUserId: actingAdminId,
    action: disabled ? 'gift.disabled' : 'gift.reenabled',
    targetType: 'gift',
    targetId: giftId,
  });
}

export async function adminDeleteGift(actingAdminId: string, giftId: string): Promise<void> {
  if (isDatabaseConfigured()) {
    await query('delete from public.gifts where id = $1', [giftId]);
  } else {
    const supabase = getUntypedServiceClient();
    if (!supabase) throw new ApiError('DB_UNAVAILABLE', 'مقدرناش نوصل للداتا.', 503);
    await supabase.from('gifts').delete().eq('id', giftId);
  }

  await logAdminAction({
    adminUserId: actingAdminId,
    action: 'gift.deleted',
    targetType: 'gift',
    targetId: giftId,
  });
}

// ---------------------------------------------------------------------------
// Settings + logs
// ---------------------------------------------------------------------------

export async function updateAppSettings(
  actingAdminId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const columns = [
    'site_name',
    'site_name_en',
    'ai_model',
    'ai_daily_limit',
    'ai_monthly_limit',
    'default_gift_visibility',
    'maintenance_mode',
    'feature_flags',
  ];

  const sets: string[] = [];
  const params: unknown[] = [actingAdminId];

  for (const column of columns) {
    if (!(column in patch)) continue;
    params.push(
      column === 'feature_flags' ? JSON.stringify(patch[column]) : patch[column],
    );
    sets.push(`${column} = $${params.length}${column === 'feature_flags' ? '::jsonb' : ''}`);
  }

  if (sets.length === 0) return;

  if (isDatabaseConfigured()) {
    await query(
      `update public.app_settings set ${sets.join(', ')}, updated_by = $1 where id = 1`,
      params,
    );
  } else {
    const supabase = getUntypedServiceClient();
    if (!supabase) throw new ApiError('DB_UNAVAILABLE', 'مقدرناش نوصل للداتا.', 503);
    await supabase
      .from('app_settings')
      .update({ ...patch, updated_by: actingAdminId })
      .eq('id', 1);
  }

  await logAdminAction({
    adminUserId: actingAdminId,
    action: 'settings.updated',
    targetType: 'settings',
    targetId: '1',
    metadata: { keys: Object.keys(patch) },
  });
}

export async function listAdminLogs(limit = 50): Promise<
  Array<{
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata_json: Record<string, unknown>;
    created_at: string;
    admin_name: string | null;
    admin_email: string | null;
  }>
> {
  if (!isDatabaseConfigured()) return [];

  return query(
    `select l.id, l.action, l.target_type, l.target_id, l.metadata_json, l.created_at,
            p.full_name as admin_name, p.email as admin_email
     from public.admin_logs l
     left join public.profiles p on p.id = l.admin_user_id
     order by l.created_at desc
     limit $1`,
    [limit],
  );
}

/** Applies the INITIAL_ADMIN_EMAIL promotion server-side (no client involvement). */
export async function promoteInitialAdmin(email: string, actingAdminId?: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  const user = await queryOne<{ id: string }>(
    'select id from auth.users where lower(email) = lower($1) limit 1',
    [normalized],
  );
  if (!user) return null;

  if (isDatabaseConfigured()) {
    await query(
      `insert into public.user_roles (user_id, role, granted_by)
       values ($1, 'ADMIN', $2)
       on conflict (user_id) do update set role = 'ADMIN', granted_by = $2`,
      [user.id, actingAdminId ?? user.id],
    );
  } else {
    const supabase = getUntypedServiceClient();
    if (!supabase) return null;
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'ADMIN', granted_by: actingAdminId ?? user.id }, { onConflict: 'user_id' });
    if (error) return null;
  }

  await logAdminAction({
    adminUserId: actingAdminId ?? user.id,
    action: 'admin.bootstrap',
    targetType: 'user',
    targetId: user.id,
    metadata: { email: normalized },
  });

  return user.id;
}

/** Removes every demo row. Exposed to the admin UI for the seed cleanup button. */
export async function purgeDemoData(): Promise<Record<string, number>> {
  if (!isDatabaseConfigured()) {
    throw new ApiError('DB_UNAVAILABLE', 'محتاج DATABASE_URL عشان تنفّذ العملية دي.', 503);
  }

  const counts: Record<string, number> = {};
  const tables = [
    'gift_opens',
    'admin_logs',
    'analytics_events',
    'ai_generations',
    'gifts',
    'profiles',
    'gift_templates',
  ];

  for (const table of tables) {
    const rows = await query<{ count: string }>(
      `with deleted as (delete from public.${table} where is_demo returning 1)
       select count(*)::text as count from deleted`,
    );
    counts[table] = Number(rows[0]?.count ?? 0);
  }

  const users = await query<{ count: string }>(
    `with deleted as (
       delete from auth.users where email like '%@demo.hadiya.local' returning 1
     ) select count(*)::text as count from deleted`,
  );
  counts['auth_users'] = Number(users[0]?.count ?? 0);

  return counts;
}