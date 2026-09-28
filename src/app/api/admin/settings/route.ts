import { updateAppSettings } from '@/lib/admin/queries';
import { adminSettingsRequest } from '@/lib/api/schemas';
import { jsonOk, readBody, requireApiAdmin, route } from '@/lib/api/route-helpers';
import { getServerEnv } from '@/lib/env';
import { invalidateSettingsCache, loadSettings } from '@/lib/settings';
import { DEFAULT_FEATURE_FLAGS } from '@/types/database';

/**
 * /api/admin/settings
 *
 * GET   the effective runtime settings + where each value came from
 * PATCH update site name, AI model, AI limits, default visibility, maintenance
 *       mode and feature flags
 *
 * Two behaviours worth calling out:
 *
 *  • The patch is applied by column allow-list inside `updateAppSettings`, so a
 *    field that is not in that list (say `id`) cannot be written even if it
 *    appears in the body.
 *  • The settings cache is invalidated immediately after a successful write, so
 *    the admin sees their own change on the next request instead of waiting up to
 *    the 15-second TTL.
 *
 * The response includes `env_*` values so the UI can show the operator which
 * variables still need to be set on the host — secrets themselves are never
 * returned, only presence booleans.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  await requireApiAdmin();

  const settings = await loadSettings(true);
  const env = getServerEnv();

  return jsonOk({
    settings: {
      site_name: settings.siteName,
      site_name_en: settings.siteNameEn,
      ai_model: settings.aiModel,
      ai_daily_limit: settings.aiDailyLimit,
      ai_monthly_limit: settings.aiMonthlyLimit,
      default_gift_visibility: settings.defaultGiftVisibility,
      maintenance_mode: settings.maintenanceMode,
      feature_flags: settings.featureFlags,
      source: settings.source,
    },
    defaults: {
      feature_flags: DEFAULT_FEATURE_FLAGS,
      ai_model: env.openrouterModel,
      ai_daily_limit: env.freeDailyAiLimit,
      ai_monthly_limit: env.freeMonthlyAiLimit,
      rate_limit_per_minute: env.aiRateLimitPerMinute,
    },
    environment: {
      ai_provider: env.aiProvider,
      has_openrouter_key: Boolean(env.openrouterApiKey),
      has_service_role_key: Boolean(env.supabaseServiceRoleKey),
      has_database_url: Boolean(env.databaseUrl),
      has_bootstrap_token: Boolean(env.adminBootstrapToken),
      initial_admin_email_set: Boolean(env.initialAdminEmail),
    },
  });
});

export const PATCH = route(async ({ request }) => {
  const admin = await requireApiAdmin();
  const patch = await readBody(request, adminSettingsRequest, 16 * 1024);

  // Drop `undefined` values: `null` is a meaningful "clear this field" for
  // ai_model, while `undefined` means "not sent".
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) payload[key] = value;
  }

  await updateAppSettings(admin.id, payload);
  invalidateSettingsCache();

  const settings = await loadSettings(true);

  return jsonOk({
    saved: true,
    keys: Object.keys(payload),
    settings: {
      site_name: settings.siteName,
      site_name_en: settings.siteNameEn,
      ai_model: settings.aiModel,
      ai_daily_limit: settings.aiDailyLimit,
      ai_monthly_limit: settings.aiMonthlyLimit,
      default_gift_visibility: settings.defaultGiftVisibility,
      maintenance_mode: settings.maintenanceMode,
      feature_flags: settings.featureFlags,
      source: settings.source,
    },
  });
});