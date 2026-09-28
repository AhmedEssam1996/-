import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Authenticated and API surfaces must never be crawled: drafts would be
        // exposed to search engines even though RLS blocks them from users.
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/create-gift/',
          '/settings/',
          '/gift/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}