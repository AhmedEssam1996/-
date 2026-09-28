import { jsonOk, route } from '@/lib/api/route-helpers';
import { listTemplates } from '@/lib/gifts/queries';

/**
 * GET /api/public/templates
 *
 * Active gift templates for the marketing/templates pages. Public by design:
 * every row returned here is active and non-sensitive (title, category, emoji,
 * gradient). Demo rows are flagged so the UI can label them.
 *
 * Query: `?category=romantic` (optional, exact match).
 */

export const dynamic = 'force-dynamic';

export const GET = route(async ({ request }) => {
  const category = new URL(request.url).searchParams.get('category')?.trim() || undefined;

  const templates = await listTemplates({ category });

  return jsonOk({
    templates: templates.map((template) => ({
      id: template.id,
      slug: template.slug,
      title_ar: template.title_ar,
      title_en: template.title_en,
      description_ar: template.description_ar,
      category: template.category,
      emoji: template.emoji,
      gradient: template.gradient,
      accent: template.accent,
      type: template.type,
      is_demo: template.is_demo,
    })),
    total: templates.length,
  });
});