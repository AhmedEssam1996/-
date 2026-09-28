import 'server-only';

import { isDatabaseConfigured, query, queryOne, withTransaction } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import { ApiError } from '@/lib/http';
import { slugify, randomSuffix } from '@/lib/utils';
import type {
  Gift,
  GiftSectionRow,
  GiftTemplate,
  GiftWithSections,
  GiftStatus,
} from '@/types/database';

/**
 * Gift persistence.
 *
 * Every function that touches a gift takes an explicit `userId` and enforces
 * ownership in SQL. That is deliberate: even if a route handler forgot a guard,
 * a caller cannot read or mutate another user's gift because the WHERE clause
 * requires it. Admin paths are separated into `adminX` functions that are only
 * reachable from `guardAdmin()`-protected routes.
 *
 * Drafts never leave the server for anyone but their owner.
 */

const GIFT_COLUMNS = `
  id, user_id, title, slug, category, template_id, type, status, visibility,
  content_json, cover_image, theme_json, recipient_name, occasion, source,
  is_demo, disabled_at, published_at, created_at, updated_at
`;

const SECTION_COLUMNS = `
  id, gift_id, type, position, content_json, created_at, updated_at
`;

// ---------------------------------------------------------------------------
// Slug management
// ---------------------------------------------------------------------------

/**
 * Reserves a unique slug.
 *
 * `gifts.slug` has a UNIQUE constraint, so we could simply retry on conflict.
 * We instead probe first (cheap indexed lookup) and append a short random suffix
 * when taken, which keeps slugs readable rather than turning them into UUIDs.
 */
export async function reserveSlug(title: string, preferred?: string): Promise<string> {
  const base = slugify(preferred || title || 'hadiya');
  const candidates = [
    base,
    `${base}-${randomSuffix(4)}`,
    `${base}-${randomSuffix(6)}`,
    `${base}-${randomSuffix(8)}`,
  ];

  for (const candidate of candidates) {
    const existing = await queryOne<{ id: string }>('select id from public.gifts where slug = $1', [
      candidate,
    ]);
    if (!existing) return candidate;
  }

  return `${base}-${randomSuffix(12)}`;
}

export async function isSlugAvailable(slug: string, excludeGiftId?: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    'select id from public.gifts where slug = $1 and ($2::uuid is null or id <> $2)',
    [slug, excludeGiftId ?? null],
  );
  return row === null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface ListGiftsOptions {
  userId: string;
  status?: GiftStatus | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listGiftsForUser(
  options: ListGiftsOptions,
): Promise<{ rows: Gift[]; total: number }> {
  const { userId, status = 'ALL', search, limit = 50, offset = 0 } = options;

  if (!isDatabaseConfigured()) return { rows: [], total: 0 };

  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];

  if (status !== 'ALL') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`title ilike $${params.length}`);
  }

  const where = conditions.join(' and ');

  const [rows, countRow] = await Promise.all([
    query<Gift>(
      `select ${GIFT_COLUMNS} from public.gifts
       where ${where}
       order by updated_at desc
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, limit, offset],
    ),
    queryOne<{ total: string }>(
      `select count(*)::text as total from public.gifts where ${where}`,
      params,
    ),
  ]);

  return { rows, total: Number(countRow?.total ?? 0) };
}

/**
 * Ownership-enforced read. Returns null (→ 404 for the client) when the gift
 * either does not exist OR belongs to someone else. The two cases are
 * indistinguishable on purpose.
 */
export async function getGiftForUser(giftId: string, userId: string): Promise<Gift | null> {
  if (!isDatabaseConfigured()) return null;
  return queryOne<Gift>(
    `select ${GIFT_COLUMNS} from public.gifts where id = $1 and user_id = $2`,
    [giftId, userId],
  );
}

export async function getGiftWithSectionsForUser(
  giftId: string,
  userId: string,
): Promise<GiftWithSections | null> {
  const gift = await getGiftForUser(giftId, userId);
  if (!gift) return null;
  const sections = await getSections(gift.id);
  return { ...gift, sections };
}

export async function getSections(giftId: string): Promise<GiftSectionRow[]> {
  if (!isDatabaseConfigured()) return [];
  return query<GiftSectionRow>(
    `select ${SECTION_COLUMNS} from public.gift_sections
     where gift_id = $1 order by position asc, created_at asc`,
    [giftId],
  );
}

export interface PublicGiftBundle {
  gift: Gift;
  sections: GiftSectionRow[];
}

/**
 * Public read for /g/[slug]. Only PUBLISHED (and not disabled) gifts are
 * reachable — an unreleased draft must never be discoverable by guessing a slug.
 *
 * When a direct connection is unavailable we fall back to the service client,
 * because the anon REST client would need the same RLS allowance and we would
 * rather have one explicit query than two divergent behaviours.
 */
export async function getPublishedGiftBySlug(slug: string): Promise<PublicGiftBundle | null> {
  if (isDatabaseConfigured()) {
    const gift = await queryOne<Gift>(
      `select ${GIFT_COLUMNS} from public.gifts
       where slug = $1 and status = 'PUBLISHED' and disabled_at is null`,
      [slug],
    );
    if (!gift) return null;
    const sections = await getSections(gift.id);
    return { gift, sections };
  }

  const supabase = getUntypedServiceClient();
  if (!supabase) return null;

  const { data: gift } = await supabase
    .from('gifts')
    .select(GIFT_COLUMNS.replace(/\s+/g, ' '))
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .is('disabled_at', null)
    .maybeSingle<Gift>();

  if (!gift) return null;

  const { data: sections } = await supabase
    .from('gift_sections')
    .select(SECTION_COLUMNS.replace(/\s+/g, ' '))
    .eq('gift_id', gift.id)
    .order('position', { ascending: true })
    .as<GiftSectionRow[]>();

  return { gift, sections: sections ?? [] };
}

export async function getGiftOwnerName(userId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const row = await queryOne<{ full_name: string | null }>(
    'select full_name from public.profiles where id = $1',
    [userId],
  );
  return row?.full_name ?? null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateGiftInput {
  userId: string;
  title?: string;
  category?: string;
  type?: Gift['type'];
  templateId?: string | null;
  recipientName?: string | null;
  occasion?: string | null;
  content?: Gift['content_json'];
  theme?: Gift['theme_json'];
  coverImage?: string | null;
  visibility?: Gift['visibility'];
  source?: string;
  sections?: Array<{ type: string; title?: string; content?: string; [key: string]: unknown }>;
  slug?: string;
}

export async function createGift(input: CreateGiftInput): Promise<Gift> {
  const title = input.title?.trim() || 'هدية بدون عنوان';
  const slug = await reserveSlug(title, input.slug);

  return withTransaction(async (client) => {
    const { rows } = await client.query<Gift>(
      `insert into public.gifts
         (user_id, title, slug, category, template_id, type, status, visibility,
          content_json, cover_image, theme_json, recipient_name, occasion, source)
       values ($1,$2,$3,$4,$5,$6,'DRAFT',$7,$8::jsonb,$9,$10::jsonb,$11,$12,$13)
       returning ${GIFT_COLUMNS}`,
      [
        input.userId,
        title,
        slug,
        input.category ?? 'generic',
        input.templateId ?? null,
        input.type ?? 'experience',
        input.visibility ?? 'unlisted',
        JSON.stringify(input.content ?? {}),
        input.coverImage ?? null,
        JSON.stringify(input.theme ?? {}),
        input.recipientName ?? null,
        input.occasion ?? null,
        input.source ?? 'builder',
      ],
    );

    const gift = rows[0];
    if (!gift) throw new ApiError('INTERNAL_ERROR', 'مقدرناش نحفظ الهدية. جرّب تاني.', 500);

    if (input.sections?.length) {
      await replaceSectionsWithClient(client, gift.id, input.sections);
    }

    return gift;
  });
}

export interface UpdateGiftInput {
  title?: string;
  category?: string;
  type?: Gift['type'];
  recipientName?: string | null;
  occasion?: string | null;
  content?: Gift['content_json'];
  theme?: Gift['theme_json'];
  coverImage?: string | null;
  visibility?: Gift['visibility'];
  slug?: string;
}

export async function updateGift(
  giftId: string,
  userId: string,
  patch: UpdateGiftInput,
): Promise<Gift | null> {
  const sets: string[] = [];
  const params: unknown[] = [giftId, userId];

  const push = (column: string, value: unknown, cast?: string) => {
    params.push(value);
    sets.push(`${column} = $${params.length}${cast ?? ''}`);
  };

  if (patch.title !== undefined) push('title', patch.title.trim().slice(0, 200) || 'هدية بدون عنوان');
  if (patch.category !== undefined) push('category', patch.category);
  if (patch.type !== undefined) push('type', patch.type);
  if (patch.recipientName !== undefined) push('recipient_name', patch.recipientName);
  if (patch.occasion !== undefined) push('occasion', patch.occasion);
  if (patch.content !== undefined) push('content_json', JSON.stringify(patch.content), '::jsonb');
  if (patch.theme !== undefined) push('theme_json', JSON.stringify(patch.theme), '::jsonb');
  if (patch.coverImage !== undefined) push('cover_image', patch.coverImage);
  if (patch.visibility !== undefined) push('visibility', patch.visibility);

  if (patch.slug !== undefined) {
    const candidate = slugify(patch.slug);
    const available = await isSlugAvailable(candidate, giftId);
    if (!available) {
      throw new ApiError('CONFLICT', 'الرابط ده مستخدم قبل كده. جرّب رابط تاني.', 409);
    }
    push('slug', candidate);
  }

  if (sets.length === 0) {
    return getGiftForUser(giftId, userId);
  }

  return queryOne<Gift>(
    `update public.gifts set ${sets.join(', ')}
     where id = $1 and user_id = $2
     returning ${GIFT_COLUMNS}`,
    params,
  );
}

export async function deleteGift(giftId: string, userId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    'delete from public.gifts where id = $1 and user_id = $2 returning id',
    [giftId, userId],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

type SectionInput = { type: string; title?: string; content?: string; [key: string]: unknown };

/** Collapses a section's flat fields into the single `content_json` blob. */
function sectionContent(section: SectionInput): Record<string, unknown> {
  const { type: _type, ...rest } = section;
  return rest;
}

async function replaceSectionsWithClient(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  giftId: string,
  sections: SectionInput[],
): Promise<void> {
  await client.query('delete from public.gift_sections where gift_id = $1', [giftId]);

  for (const [position, section] of sections.entries()) {
    await client.query(
      `insert into public.gift_sections (gift_id, type, position, content_json)
       values ($1,$2,$3,$4::jsonb)`,
      [giftId, section.type, position, JSON.stringify(sectionContent(section))],
    );
  }
}

/**
 * Replaces the whole section list atomically.
 *
 * Full replacement (rather than a diff) is intentional: the builder sends the
 * complete ordered array, so reordering is just a different array. A partial
 * update would need position reconciliation and is a rich source of bugs.
 */
export async function replaceSections(
  giftId: string,
  userId: string,
  sections: SectionInput[],
): Promise<boolean> {
  const owned = await getGiftForUser(giftId, userId);
  if (!owned) return false;

  await withTransaction(async (client) => {
    await replaceSectionsWithClient(client, giftId, sections);
  });

  return true;
}

// ---------------------------------------------------------------------------
// Publish / unpublish
// ---------------------------------------------------------------------------

export async function setGiftStatus(
  giftId: string,
  userId: string,
  status: GiftStatus,
): Promise<Gift | null> {
  if (status === 'PUBLISHED') {
    // Refuse to publish an empty gift — a recipient landing on a blank page is
    // worse than an error message for the author.
    const sectionCount = await queryOne<{ total: string }>(
      'select count(*)::text as total from public.gift_sections where gift_id = $1',
      [giftId],
    );
    if (Number(sectionCount?.total ?? 0) === 0) {
      throw new ApiError('VALIDATION_ERROR', 'لازم تضيف سيكشن واحد على الأقل قبل النشر.', 422);
    }
  }

  return queryOne<Gift>(
    `update public.gifts
     set status = $3,
         published_at = case when $3 = 'PUBLISHED' and published_at is null then now()
                             when $3 = 'PUBLISHED' then published_at
                             else published_at end,
         disabled_at = case when $3 = 'DISABLED' then now() else null end
     where id = $1 and user_id = $2
     returning ${GIFT_COLUMNS}`,
    [giftId, userId, status],
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listTemplates(options?: {
  category?: string;
  includeInactive?: boolean;
}): Promise<GiftTemplate[]> {
  const fallback: GiftTemplate[] = [];

  try {
    if (isDatabaseConfigured()) {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (!options?.includeInactive) conditions.push('is_active = true');
      if (options?.category) {
        params.push(options.category);
        conditions.push(`category = $${params.length}`);
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      return await query<GiftTemplate>(
        `select id, slug, title_ar, title_en, description_ar, category, emoji, gradient, accent,
                type, is_active, is_demo, default_sections, position, created_at, updated_at
         from public.gift_templates ${where}
         order by position asc, created_at asc`,
        params,
      );
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      let builder = supabase
        .from('gift_templates')
        .select('*')
        .order('position', { ascending: true });
      if (!options?.includeInactive) builder = builder.eq('is_active', true);
      if (options?.category) builder = builder.eq('category', options.category);
      const { data } = await builder;
      return (data ?? []) as GiftTemplate[];
    }
  } catch (error) {
    console.warn('[gifts] listTemplates failed:', (error as Error).message);
  }

  return fallback;
}

export async function getTemplateBySlug(slug: string): Promise<GiftTemplate | null> {
  if (!isDatabaseConfigured()) return null;
  return queryOne<GiftTemplate>(
    `select id, slug, title_ar, title_en, description_ar, category, emoji, gradient, accent,
            type, is_active, is_demo, default_sections, position, created_at, updated_at
     from public.gift_templates where slug = $1`,
    [slug],
  );
}

// ---------------------------------------------------------------------------
// Dashboard aggregates (real counts, no fixtures)
// ---------------------------------------------------------------------------

export interface UserOverview {
  totalGifts: number;
  publishedGifts: number;
  draftGifts: number;
  totalOpens: number;
  uniqueOpenGifts: number;
  aiGenerations: number;
}

export async function getUserOverview(userId: string): Promise<UserOverview> {
  const empty: UserOverview = {
    totalGifts: 0,
    publishedGifts: 0,
    draftGifts: 0,
    totalOpens: 0,
    uniqueOpenGifts: 0,
    aiGenerations: 0,
  };

  if (!isDatabaseConfigured()) return empty;

  const row = await queryOne<{
    total_gifts: string;
    published_gifts: string;
    draft_gifts: string;
    total_opens: string;
    unique_open_gifts: string;
    ai_generations: string;
  }>(
    `select
       (select count(*)::text from public.gifts where user_id = $1) as total_gifts,
       (select count(*)::text from public.gifts where user_id = $1 and status = 'PUBLISHED') as published_gifts,
       (select count(*)::text from public.gifts where user_id = $1 and status = 'DRAFT') as draft_gifts,
       (select count(*)::text from public.gift_opens o
          join public.gifts g on g.id = o.gift_id where g.user_id = $1) as total_opens,
       (select count(distinct o.gift_id)::text from public.gift_opens o
          join public.gifts g on g.id = o.gift_id where g.user_id = $1) as unique_open_gifts,
       (select count(*)::text from public.ai_generations where user_id = $1 and status = 'success') as ai_generations`,
    [userId],
  );

  if (!row) return empty;

  return {
    totalGifts: Number(row.total_gifts),
    publishedGifts: Number(row.published_gifts),
    draftGifts: Number(row.draft_gifts),
    totalOpens: Number(row.total_opens),
    uniqueOpenGifts: Number(row.unique_open_gifts),
    aiGenerations: Number(row.ai_generations),
  };
}

export async function getRecentGiftsForUser(userId: string, limit = 5): Promise<Gift[]> {
  if (!isDatabaseConfigured()) return [];
  return query<Gift>(
    `select ${GIFT_COLUMNS} from public.gifts
     where user_id = $1 order by updated_at desc limit $2`,
    [userId, limit],
  );
}

export interface GiftOpenStats {
  opens: number;
  uniqueOpens: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  avgDurationSeconds: number;
}

export async function getGiftOpenStats(giftId: string, userId: string): Promise<GiftOpenStats> {
  const empty: GiftOpenStats = {
    opens: 0,
    uniqueOpens: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    avgDurationSeconds: 0,
  };

  const owned = await getGiftForUser(giftId, userId);
  if (!owned) throw new ApiError('NOT_FOUND', 'الهدية مش موجودة.', 404);

  const row = await queryOne<{
    opens: string;
    unique_opens: string;
    first_opened_at: string | null;
    last_opened_at: string | null;
    avg_duration: string | null;
  }>(
    `select count(*)::text as opens,
            count(distinct session_id)::text as unique_opens,
            min(opened_at) as first_opened_at,
            max(opened_at) as last_opened_at,
            avg(duration_seconds)::text as avg_duration
     from public.gift_opens where gift_id = $1`,
    [giftId],
  );

  if (!row) return empty;

  return {
    opens: Number(row.opens),
    uniqueOpens: Number(row.unique_opens),
    firstOpenedAt: row.first_opened_at,
    lastOpenedAt: row.last_opened_at,
    avgDurationSeconds: Number(row.avg_duration ?? 0),
  };
}