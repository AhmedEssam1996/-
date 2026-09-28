import { Gift, Heart, Sparkles, Wand2 } from 'lucide-react';
import type { MetadataRoute } from 'next';

import { isDatabaseConfigured, query } from '@/lib/db/pg';

/**
 * Dynamic sitemap.
 *
 * Includes the static marketing routes plus every PUBLISHED + public gift, read
 * from the database. Private drafts are never listed, and the query is bounded
 * so a huge install cannot generate a multi-megabyte sitemap.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/gifts', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/ai-gift', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/ai-message', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/create-gift', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/login', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/register', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/forgot-password', priority: 0.3, changeFrequency: 'monthly' },
];

export const ICONS = { Gift, Heart, Sparkles, Wand2 };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${APP_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  if (!isDatabaseConfigured()) {
    return staticEntries;
  }

  try {
    const gifts = await query<{ slug: string; updated_at: string }>(
      `select slug, updated_at from public.gifts
       where status = 'PUBLISHED' and visibility = 'public' and disabled_at is null
       order by published_at desc nulls last
       limit 5000`,
    );

    return [
      ...staticEntries,
      ...gifts.map((gift) => ({
        url: `${APP_URL}/gift/${encodeURIComponent(gift.slug)}`,
        lastModified: new Date(gift.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticEntries;
  }
}