import 'server-only';

import { asObject, isDatabaseConfigured, query, queryOne } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import type { Paginated, Product, ProductKind } from '@/types/database';

/**
 * Product queries.
 *
 * Every read is public-safe: products are world-visible catalog data and RLS
 * only ever exposes `is_active = true` rows to clients. Admin writes go
 * through the seed script / service role, so there is no create/update path
 * here on purpose — a missing write path cannot be forgotten by a route
 * handler.
 */

const PRODUCT_COLUMNS = `
  id, slug, kind, title_ar, title_en, description_ar, description_en,
  category, price_cents, currency, images, model_url, emoji, gradient, accent,
  stock, max_per_user, weight_grams, shipping_note_ar, is_active, is_claimable,
  is_demo, position, created_at, updated_at
`;

interface ListProductsOptions {
  kind?: ProductKind;
  category?: string;
  onlyActive?: boolean;
  limit?: number;
  offset?: number;
}

export async function listProducts(options: ListProductsOptions = {}): Promise<Paginated<Product>> {
  const { kind, category, onlyActive = true, limit = 24, offset = 0 } = options;

  const filters: string[] = [];
  const params: unknown[] = [];
  const addFilter = (clause: string, value: unknown): void => {
    params.push(value);
    filters.push(clause.replace('$?', `$${params.length}`));
  };

  if (onlyActive) addFilter('is_active = $?', true);
  if (kind) addFilter('kind = $?', kind);
  if (category) addFilter('category = $?', category);

  const where = filters.length > 0 ? `where ${filters.join(' and ')}` : '';
  const cappedLimit = Math.min(Math.max(limit, 1), 100);

  if (isDatabaseConfigured()) {
    const totalRow = await queryOne<{ total: string | number }>(
      `select count(*) as total from public.products ${where}`,
      params,
    );
    const rows = await query<Record<string, unknown>>(
      `select ${PRODUCT_COLUMNS} from public.products ${where}
       order by position asc, created_at desc
       limit ${cappedLimit} offset ${Math.max(offset, 0)}`,
      params,
    );
    return {
      rows: rows.map((row) => asObject<Product>(row, row as unknown as Product)),
      total: Number(totalRow?.total ?? 0),
      page: Math.floor(offset / cappedLimit) + 1,
      pageSize: cappedLimit,
    };
  }

  // Supabase REST fallback (RLS-enforced).
  const supabase = getUntypedServiceClient();
  if (supabase) {
    let builder = supabase
      .from('products')
      .select(PRODUCT_COLUMNS, { count: 'exact' });
    if (onlyActive) builder = builder.eq('is_active', true);
    if (kind) builder = builder.eq('kind', kind);
    if (category) builder = builder.eq('category', category);
    const { data, count } = await builder
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + cappedLimit - 1)
      .as<Product[]>();
    return {
      rows: data ?? [],
      total: count ?? 0,
      page: Math.floor(offset / cappedLimit) + 1,
      pageSize: cappedLimit,
    };
  }

  return { rows: [], total: 0, page: 1, pageSize: cappedLimit };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<Record<string, unknown>>(
      `select ${PRODUCT_COLUMNS} from public.products where slug = $1 limit 1`,
      [slug],
    );
    return row ? asObject<Product>(row, row as unknown as Product) : null;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();
    return (data as Product | null) ?? null;
  }
  return null;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<Record<string, unknown>>(
      `select ${PRODUCT_COLUMNS} from public.products where id = $1::uuid limit 1`,
      [id],
    );
    return row ? asObject<Product>(row, row as unknown as Product) : null;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    return (data as Product | null) ?? null;
  }
  return null;
}

/** Cheap list for the chatbot tools (names + prices only, capped). */
export interface ChatProductSummary {
  slug: string;
  title: string;
  kind: ProductKind;
  price_cents: number;
  currency: string;
  stock: number | null;
}

export async function listChatProducts(term = '', limit = 6): Promise<ChatProductSummary[]> {
  const capped = Math.min(Math.max(limit, 1), 10);

  if (isDatabaseConfigured()) {
    const rows = await query<ChatProductSummary>(
      `select slug,
              coalesce(title_ar, title_en, slug) as title,
              kind, price_cents, currency, stock
       from public.products
       where is_active
         and ($1::text is null
              or title_ar ilike '%' || $1::text || '%'
              or title_en ilike '%' || $1::text || '%')
       order by position asc
       limit ${capped}`,
      [term || null],
    );
    return rows;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('products')
      .select('slug, title_ar, title_en, kind, price_cents, currency, stock')
      .eq('is_active', true)
      .limit(capped);
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      slug: String(row.slug),
      title: String(row.title_ar ?? row.title_en ?? row.slug),
      kind: (row.kind as ProductKind) ?? 'digital',
      price_cents: Number(row.price_cents ?? 0),
      currency: String(row.currency ?? 'usd'),
      stock: row.stock === null || row.stock === undefined ? null : Number(row.stock),
    }));
  }
  return [];
}

