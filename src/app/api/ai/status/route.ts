import { aiStatus } from '@/lib/ai/service';
import { aiFeatureDescriptors } from '@/lib/api/features';
import { jsonOk, route } from '@/lib/api/route-helpers';
import { loadSettings } from '@/lib/settings';

/**
 * GET /api/ai/status
 *
 * Everything the UI needs to render the AI surfaces honestly:
 *
 *   • which provider is live (`openrouter` vs the offline `mock`), so a
 *     "وضع تجريبي" badge can be shown next to generated content;
 *   • whether generation is possible at all;
 *   • the feature catalogue and the per-feature endpoint;
 *   • the admin-configured limits and feature flags.
 *
 * It deliberately reports NO quota for a signed-in user — that lives behind
 * /api/ai/quota, because this endpoint is cacheable and public.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const status = aiStatus();
  const settings = await loadSettings();

  return jsonOk({
    configured: status.configured,
    provider: status.provider,
    is_mock: status.isMock,
    model: settings.aiModel,
    maintenance: settings.maintenanceMode,
    feature_flags: settings.featureFlags,
    features: aiFeatureDescriptors(),
  });
});