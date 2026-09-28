import 'server-only';

import { tool, type ToolSet } from 'ai';

import { z } from 'zod';

import { listChatProducts } from '@/lib/commerce/products';
import { isDatabaseConfigured, query } from '@/lib/db/pg';

/**
 * Context-aware tools for the chatbot.
 *
 * The model calls these to ground its answers in what actually exists. Every
 * tool reads public data only (published gifts, active products) and every
 * result is size-capped so a single tool call cannot blow up the context or
 * the latency budget.
 */
export function buildChatTools(): ToolSet {
  return {
    search_gifts: tool({
      description:
        'يبحث في الهدايا المنشورة العامة بالموقع حسب كلمة مفتاحية (فئة أو مناسبة أو عنوان). يرجّع حتى ٥ نتائج.',
      inputSchema: z.object({
        query: z.string().trim().min(1).max(80).describe('كلمة البحث، مثل: عيد ميلاد، صداقة، رومانسي'),
      }),
      execute: async ({ query: term }) => {
        if (!isDatabaseConfigured()) {
          return { gifts: [] as Array<{ title: string; slug: string; category: string; occasion: string | null }> };
        }
        const rows = await query<Record<string, unknown>>(
          `select title, slug, category, occasion
           from public.gifts
           where status = 'PUBLISHED' and visibility = 'public' and not is_demo
             and (title ilike '%' || $1::text || '%'
                  or category ilike '%' || $1::text || '%'
                  or coalesce(occasion, '') ilike '%' || $1::text || '%')
           order by published_at desc nulls last
           limit 5`,
          [term],
        );
        return {
          gifts: rows.map((row) => ({
            title: String(row.title ?? ''),
            slug: String(row.slug ?? ''),
            category: String(row.category ?? ''),
            occasion: row.occasion ? String(row.occasion) : null,
          })),
        };
      },
    }),

    get_categories: tool({
      description: 'يرجّع فئات الهدايا النشطة في الموقع مع عدد الهدايا المنشورة في كل فئة.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!isDatabaseConfigured()) return { categories: [] as Array<{ category: string; count: number }> };
        const rows = await query<{ category: string; count: string | number }>(
          `select category, count(*) as count
           from public.gifts
           where status = 'PUBLISHED' and visibility = 'public' and not is_demo
           group by category
           order by count desc
           limit 10`,
        );
        return {
          categories: rows.map((row) => ({ category: row.category, count: Number(row.count) })),
        };
      },
    }),

    recommend_products: tool({
      description:
        'يرجّع منتجات المتجر المتاحة (مادية بتشترى بالدفع، ورقمية مجانية) مع أسعارها، مع خيار تصفية بالكلمة المفتاحية أو النوع.',
      inputSchema: z.object({
        query: z.string().trim().max(80).optional().describe('كلمة تصفية اختيارية'),
        kind: z.enum(['physical', 'digital']).optional().describe('نوع المنتج'),
      }),
      execute: async ({ query: term = '', kind }) => {
        const products = await listChatProducts(term, 6);
        return {
          products: (kind ? products.filter((p) => p.kind === kind) : products).map((p) => ({
            slug: p.slug,
            title: p.title,
            kind: p.kind,
            price_cents: p.price_cents,
            currency: p.currency,
            stock: p.stock,
          })),
        };
      },
    }),
  };
}
