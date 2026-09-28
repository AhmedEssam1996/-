import { aiStatus } from '@/lib/ai/service';
import { configStatus } from '@/lib/api/config-status';
import { jsonOk, route } from '@/lib/api/route-helpers';
import { APP_VERSION } from '@/lib/version';

/**
 * GET /api/health
 *
 * Liveness + configuration probe. Reports only BOOLEANS about what is wired up —
 * never a key, a partial key, or a connection string. Safe to expose.
 *
 * `status` is `ok` when the app can serve pages (it always can; missing Supabase
 * degrades to empty states), and `degraded` when the AI provider is unusable, so
 * an uptime monitor can page on the thing that actually breaks the product.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const config = configStatus();
  const ai = aiStatus();

  return jsonOk({
    status: ai.configured ? 'ok' : 'degraded',
    version: APP_VERSION,
    environment: process.env.NODE_ENV ?? 'development',
    time: new Date().toISOString(),
    config,
    ai: {
      configured: ai.configured,
      provider: ai.provider,
      is_mock: ai.isMock,
    },
  });
});