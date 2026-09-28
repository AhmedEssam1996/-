import 'server-only';

import { isDatabaseConfigured, query } from '@/lib/db/pg';

/**
 * Builds the chatbot's live site context.
 *
 * The chatbot must be context-AWARE, not just chatty: the system prompt is
 * rebuilt per request from REAL data — active categories with gift counts, the
 * freshest public gifts, and the shop catalogue. The model then answers from
 * what actually exists instead of inventing gifts.
 *
 * Everything the context exposes is already public (published gifts, active
 * products). No user data, no drafts, no emails.
 */

export interface ChatSiteContext {
  categories: Array<{ category: string; count: number }>;
  recentGifts: Array<{ title: string; slug: string; category: string; occasion: string | null }>;
  products: Array<{ title: string; kind: string; price_cents: number; currency: string; slug: string }>;
}

export async function loadChatSiteContext(): Promise<ChatSiteContext> {
  const empty: ChatSiteContext = { categories: [], recentGifts: [], products: [] };

  try {
    if (isDatabaseConfigured()) {
      const [categories, recentGifts, products] = await Promise.all([
        query<{ category: string; count: string | number }>(
          `select category, count(*) as count
           from public.gifts
           where status = 'PUBLISHED' and visibility = 'public' and not is_demo
           group by category
           order by count desc
           limit 8`,
        ),
        query<Record<string, unknown>>(
          `select title, slug, category, occasion
           from public.gifts
           where status = 'PUBLISHED' and visibility = 'public' and not is_demo
           order by published_at desc nulls last
           limit 6`,
        ),
        query<Record<string, unknown>>(
          `select slug, coalesce(title_ar, title_en, slug) as title, kind, price_cents, currency
           from public.products
           where is_active and not is_demo
           order by position asc
           limit 8`,
        ),
      ]);

      return {
        categories: categories.map((row) => ({ category: row.category, count: Number(row.count) })),
        recentGifts: recentGifts.map((row) => ({
          title: String(row.title ?? ''),
          slug: String(row.slug ?? ''),
          category: String(row.category ?? ''),
          occasion: row.occasion ? String(row.occasion) : null,
        })),
        products: products.map((row) => ({
          title: String(row.title ?? ''),
          kind: String(row.kind ?? 'digital'),
          price_cents: Number(row.price_cents ?? 0),
          currency: String(row.currency ?? 'usd'),
          slug: String(row.slug ?? ''),
        })),
      };
    }
  } catch (error) {
    // A context failure must never break the chat — the model degrades to
    // generic helpfulness instead of erroring the request.
    console.warn('[chat] context load failed:', (error as Error).message);
  }

  return empty;
}

export function buildChatSystemPrompt(context: ChatSiteContext): string {
  const lines: string[] = [
    'أنت "مساعد هدية" — مساعد ذكي داخل موقع "هدية" (Hadiya)، منصة هدايا رقمية بالذكاء الاصطناعي.',
    'بترد بالعامية المصرية البسيطة والودية، وبأسلوب مختصر ومفيد. ردودك قصيرة (٢-٥ جمل) إلا لو المستخدم طلب تفاصيل.',
    '',
    'قدرات الموقع اللي تقدر توجه عليها المستخدم:',
    '• مكتشف الهدايا بالذكاء الاصطناعي (/ai-gift) — اقتراحات مخصصة حسب الشخص والمناسبة.',
    '• مولّد الرسائل (/ai-message) — رسائل بأسلوب وأطوال مختلفة.',
    '• إنشاء هدية تفاعلية (/create-gift) — قصص وذكريات وعدادات وكويز في صفحة واحدة.',
    '• المتجر (/shop) — هدايا مادية بتشتريها بالدفع (Stripe) وهدايا رقمية مجانية بالمطالبة.',
    '',
    'المحتوى المتاح حاليًا على الموقع:',
  ];

  if (context.categories.length > 0) {
    lines.push(
      `الفئات النشطة: ${context.categories.map((c) => `${c.category} (${c.count})`).join('، ')}`,
    );
  }
  if (context.recentGifts.length > 0) {
    lines.push('أحدث الهدايا المنشورة:');
    for (const gift of context.recentGifts) {
      lines.push(
        `- «${gift.title}» (${gift.category}${gift.occasion ? ` — ${gift.occasion}` : ''}) في المسار /gift/${gift.slug}`,
      );
    }
  }
  if (context.products.length > 0) {
    lines.push('منتجات المتجر:');
    for (const product of context.products) {
      const price =
        product.price_cents === 0
          ? 'مجاني'
          : `${(product.price_cents / 100).toFixed(2)} ${product.currency.toUpperCase()}`;
      lines.push(
        `- «${product.title}» — ${product.kind === 'physical' ? 'منتج مادي' : 'هدية رقمية'} — ${price} — /shop/${product.slug}`,
      );
    }
  }
  if (context.categories.length === 0 && context.products.length === 0) {
    lines.push('(قاعدة البيانات فاضية حاليًا — اشرح القدرات العامة بس من غير ما تنسب حاجات مش موجودة.)');
  }

  lines.push(
    '',
    'قواعد صارمة:',
    '١. ما تنسبش هدايا أو منتجات مش موجودة في السياق. استخدم أدوات البحث قبل ما تدّعي إن فيه حاجة.',
    '٢. لو المستخدم محتار، اسأل سؤال واحد محدد (المين؟ المناسبة إيه؟ الميزانية؟) وبعدين اقترح.',
    '٣. ما تختلقش أسعار ولا وعود توصيل. الأسعار من السياق أو من أداة البحث بس.',
    '٤. ما تشاركش أي بيانات عن المستخدمين التانيين ولا مسارات إدارية.',
    '٥. الروابط دايمًا بالشكل النسبي (/shop أو /gift/slug) مش روابط مطلقة.',
  );

  return lines.join('\n');
}
