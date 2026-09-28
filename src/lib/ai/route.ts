import {
  aiStatus,
  type AiCallContext,
  type AiResult,
} from '@/lib/ai/service';
import { jsonOk, route, type RouteContext } from '@/lib/api/route-helpers';
import { getFeatureFlags, getAiQuota, loadSettings } from '@/lib/settings';
import { getSessionUser } from '@/lib/auth/session';
import { getOrCreateSessionId, hashIdentity, trackEvent } from '@/lib/analytics/track';
import { ApiError } from '@/lib/http';
import { rateLimitAi } from '@/lib/rate-limit';
import type { FeatureFlags } from '@/types/database';

/**
 * Shared pipeline for every AI endpoint.
 *
 * The five AI routes differ only in which capability they call and which feature
 * flag gates them. Everything security- and cost-related lives HERE so it cannot
 * be forgotten in one of them:
 *
 *   1. **Auth.** Signed-in users get their own quota. Anonymous visitors are only
 *      allowed to use the AI at all when explicitly permitted (see `allowGuest`),
 *      and are metered by session so the limiter still bites.
 *   2. **Feature flag.** A disabled capability returns FEATURE_DISABLED before a
 *      single token is spent.
 *   3. **Maintenance.** A site in maintenance mode does not generate.
 *   4. **Rate limit.** Per-minute cap from env, keyed on a HASHED identity — no
 *      raw user id or IP is ever used as a limiter key.
 *   5. **Quota.** Daily/monthly ceilings counted from `ai_generations` (success
 *      rows only), so a restart cannot hand out a fresh allowance.
 *   6. **Analytics.** One `ai_generation` event, recorded after the call so the
 *      event reflects reality rather than intent.
 *
 * Ordering is deliberate: cheapest checks first, so an abusive request is
 * rejected before it can reach the (paid) provider.
 */

export interface AiRunResult<T> {
  data: T;
  model: string;
  is_mock: boolean;
  latency_ms: number;
}

export interface AiRouteOptions<T> {
  flag: keyof FeatureFlags;
  /** Analytics bucket + rate-limit bucket name, e.g. `message`. */
  bucket: string;
  /** Allow signed-out visitors (the gift finder and message tools do). */
  allowGuest: boolean;
  run: (ctx: AiCallContext, settings: { aiModel: string }) => Promise<AiResult<T>>;
  /** Extra metadata for the analytics event (never contains user text). */
  eventMetadata?: Record<string, unknown>;
}

export async function runAiRoute<T>(
  context: RouteContext,
  options: AiRouteOptions<T>,
): Promise<ReturnType<typeof jsonOk<AiRunResult<T>>>> {
  const user = await getSessionUser();
  if (!user && !options.allowGuest) {
    throw new ApiError('AUTH_REQUIRED', 'لازم تسجّل دخول الأول.', 401);
  }
  if (user && user.status === 'DISABLED') {
    throw new ApiError('ACCOUNT_DISABLED', 'حسابك متوقف حاليًا. تواصل مع الدعم.', 403);
  }

  const settings = await loadSettings();

  // Maintenance mode is a hard stop for generation, but never for reading a gift.
  if (settings.maintenanceMode && settings.source === 'database') {
    throw new ApiError('MAINTENANCE', 'الموقع تحت الصيانة حاليًا. نرجعلك قريب.', 503);
  }

  const flags = await getFeatureFlags();
  if (flags[options.flag] !== true) {
    throw new ApiError('FEATURE_DISABLED', 'الخاصية دي متوقفة حاليًا.', 403);
  }

  const { sessionId } = getOrCreateSessionId(context.request);
  const identity = user ? hashIdentity(user.id) : hashIdentity(`session:${sessionId}`);

  const limited = await rateLimitAi(identity, options.bucket);
  if (!limited.allowed) {
    throw new ApiError('RATE_LIMIT', 'بعّد شوية وجرّب تاني.', 429);
  }

  if (user) {
    const quota = await getAiQuota(user.id);
    if (quota.exhausted) {
      throw new ApiError(
        'QUOTA_EXCEEDED',
        'وصلت للحد المسموح من استخدام الذكاء الاصطناعي. هيرجع تاني قريب.',
        429,
      );
    }
  }

  const status = aiStatus();
  if (!status.configured) {
    throw new ApiError(
      'AI_UNAVAILABLE',
      'خدمة الذكاء الاصطناعي مش متظبطة حاليًا. كلّم مدير الموقع.',
      503,
    );
  }

  const result = await options.run(
    {
      userId: user?.id ?? null,
      sessionId,
    },
    { aiModel: settings.aiModel },
  );

  await trackEvent({
    sessionId,
    eventName: 'ai_generation',
    userId: user?.id ?? null,
    page: new URL(context.request.url).pathname,
    userAgent: context.request.headers.get('user-agent'),
    metadata: {
      feature: options.bucket,
      is_mock: result.isMock,
      // Deliberately no prompt text: analytics must not retain user content.
      ...options.eventMetadata,
    },
  });

  return jsonOk<AiRunResult<T>>({
    data: result.data,
    model: result.model,
    is_mock: result.isMock,
    latency_ms: result.latencyMs,
  });
}

/** Wraps an AI handler in the shared error/trace envelope. */
export function aiRoute<T>(handler: (context: RouteContext) => Promise<ReturnType<typeof jsonOk<AiRunResult<T>>>>) {
  return route(handler);
}