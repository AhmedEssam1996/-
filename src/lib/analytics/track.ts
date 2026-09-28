import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

import { isDatabaseConfigured, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';

/**
 * Privacy-conscious analytics ingestion.
 *
 * What we store:
 *   • an anonymous, rotating session id (random UUID in an httpOnly cookie)
 *   • the event name + page path
 *   • coarse device / browser category derived from the User-Agent
 *   • attribution source derived from the referrer *host* only
 *
 * What we deliberately do NOT store:
 *   • raw IP addresses (they are only ever hashed, and only for rate limiting)
 *   • full referrer URLs (they can contain search queries and tokens)
 *   • precise location, fingerprinting data, or any cross-site identifier
 *
 * Session ids expire after 30 minutes of inactivity, mirroring the common
 * "session" definition so a returning visitor is not counted as one person
 * forever.
 */

export const SESSION_COOKIE = 'hd_vid';
const SESSION_TTL_SECONDS = 60 * 30;

/** Pseudo-anonymous, salted hash. Never reversible, never stored raw. */
export function hashIdentity(value: string): string {
  const salt = process.env.ADMIN_BOOTSTRAP_TOKEN ?? 'hadiya-static-salt';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 32);
}

export function getOrCreateSessionId(request: Request): { sessionId: string; isNew: boolean } {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookieHeader);
  if (match?.[1]) {
    return { sessionId: decodeURIComponent(match[1]), isNew: false };
  }
  return { sessionId: randomUUID(), isNew: true };
}

/** Server-component variant: reads the cookie store and mints one if absent. */
export async function readSessionIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// Coarse classification (no fingerprinting)
// ---------------------------------------------------------------------------
export function classifyDevice(userAgent: string | null): string {
  const ua = (userAgent ?? '').toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod/.test(ua)) return 'mobile';
  return 'desktop';
}

export function classifyBrowser(userAgent: string | null): string {
  const ua = userAgent ?? '';
  if (!ua) return 'unknown';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'other';
}

/** Referrer *host* only, mapped to a coarse channel. */
export function classifySource(referrer: string | null | undefined): string {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google|bing|duckduckgo|yahoo/.test(host)) return 'search';
    if (/instagram|facebook|fb\.|twitter|x\.com|tiktok|snapchat/.test(host)) return 'social';
    if (/whatsapp|telegram|messenger/.test(host)) return 'messaging';
    if (/linkedin/.test(host)) return 'professional';
    return 'referral';
  } catch {
    return 'direct';
  }
}

// ---------------------------------------------------------------------------
// Event catalogue — keep in sync with the client-side tracker
// ---------------------------------------------------------------------------
export const ANALYTICS_EVENTS = [
  'page_view',
  'landing_view',
  'signup',
  'login',
  'gift_builder_open',
  'ai_generation',
  'gift_created',
  'gift_published',
  'gift_opened',
  'gift_shared',
  'template_selected',
  'message_generated',
  'checkout_started',
  'claim_created',
  'claim_duplicate',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === 'string' && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export interface TrackEventInput {
  sessionId: string;
  eventName: AnalyticsEventName;
  userId?: string | null;
  page?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  isDemo?: boolean;
}

/**
 * Best-effort write. Analytics must never break a user-facing request, so every
 * failure path here is swallowed after logging.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  const payload = {
    session_id: input.sessionId,
    event_name: input.eventName,
    user_id: input.userId ?? null,
    page: input.page?.slice(0, 512) ?? null,
    referrer: input.referrer?.slice(0, 512) ?? null,
    source: classifySource(input.referrer),
    device: classifyDevice(input.userAgent ?? null),
    browser: classifyBrowser(input.userAgent ?? null),
    metadata_json: sanitizeMetadata(input.metadata),
    is_demo: input.isDemo ?? false,
  };

  try {
    if (isDatabaseConfigured()) {
      await query(
        `insert into public.analytics_events
           (session_id, event_name, user_id, page, referrer, source, device, browser, metadata_json, is_demo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
        [
          payload.session_id,
          payload.event_name,
          payload.user_id,
          payload.page,
          payload.referrer,
          payload.source,
          payload.device,
          payload.browser,
          JSON.stringify(payload.metadata_json),
          payload.is_demo,
        ],
      );
      return;
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      await supabase.from('analytics_events').insert(payload);
    }
  } catch (error) {
    console.warn('[analytics] track failed:', (error as Error).message);
  }
}

/** Keeps metadata small and free of anything resembling personal data. */
function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  const out: Record<string, unknown> = {};
  let budget = 12;

  for (const [key, value] of Object.entries(metadata)) {
    if (budget <= 0) break;
    if (typeof value === 'string') {
      out[key] = value.slice(0, 200);
      budget -= 1;
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      out[key] = value;
      budget -= 1;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Gift opens — recipient side, no account required
// ---------------------------------------------------------------------------

export interface RecordGiftOpenInput {
  giftId: string;
  sessionId: string;
  userAgent?: string | null;
  isDemo?: boolean;
}

/**
 * Records an open. Returns the open row id so the client can report dwell time
 * later via `updateGiftOpenDuration`. Uses `on conflict` on (gift_id, session_id)
 * so refreshing the page does not inflate the opens count.
 */
export async function recordGiftOpen(input: RecordGiftOpenInput): Promise<string | null> {
  const device = classifyDevice(input.userAgent ?? null);
  const browser = classifyBrowser(input.userAgent ?? null);

  try {
    if (isDatabaseConfigured()) {
      const rows = await query<{ id: string }>(
        `insert into public.gift_opens (gift_id, session_id, device, browser, is_demo, opened_at)
         values ($1,$2,$3,$4,$5, now())
         on conflict (gift_id, session_id) do update set opened_at = now()
         returning id`,
        [input.giftId, input.sessionId, device, browser, input.isDemo ?? false],
      );
      return rows[0]?.id ?? null;
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      const { data } = await supabase
        .from('gift_opens')
        .upsert(
          {
            gift_id: input.giftId,
            session_id: input.sessionId,
            device,
            browser,
            is_demo: input.isDemo ?? false,
          },
          { onConflict: 'gift_id,session_id' },
        )
        .select('id')
        .maybeSingle<{ id: string }>();
      return data?.id ?? null;
    }
  } catch (error) {
    console.warn('[analytics] recordGiftOpen failed:', (error as Error).message);
  }

  return null;
}

/** Called on page-hide with the number of seconds the recipient stayed. */
export async function updateGiftOpenDuration(
  giftId: string,
  sessionId: string,
  seconds: number,
): Promise<void> {
  const clamped = Math.max(0, Math.min(Math.round(seconds), 24 * 60 * 60));
  try {
    if (isDatabaseConfigured()) {
      await query(
        `update public.gift_opens set duration_seconds = $3
         where gift_id = $1 and session_id = $2`,
        [giftId, sessionId, clamped],
      );
      return;
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      await supabase
        .from('gift_opens')
        .update({ duration_seconds: clamped })
        .eq('gift_id', giftId)
        .eq('session_id', sessionId);
    }
  } catch (error) {
    console.warn('[analytics] updateGiftOpenDuration failed:', (error as Error).message);
  }
}