import 'server-only';

import { cache } from 'react';

import { isDatabaseConfigured, queryOne } from '@/lib/db/pg';
import { getServerEnv } from '@/lib/env';
import { getServiceClient } from '@/lib/db/supabase-admin';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags, type GiftVisibility } from '@/types/database';

/**
 * Single source of truth for runtime business configuration.
 *
 * Nothing in the app should hardcode an AI limit, a model name, or a feature
 * switch. Admin edits land in `app_settings` (one row, id = 1) and take effect
 * within the cache window.
 *
 * Fallbacks are layered: database → environment variables → built-in defaults.
 * That means the app is fully functional before any admin ever opens
 * /admin/settings, and the env vars in .env.example remain meaningful.
 */

export interface RuntimeSettings {
  siteName: string;
  siteNameEn: string;
  aiModel: string;
  aiDailyLimit: number;
  aiMonthlyLimit: number;
  defaultGiftVisibility: GiftVisibility;
  maintenanceMode: boolean;
  featureFlags: FeatureFlags;
  source: 'database' | 'environment';
}

const CACHE_TTL_MS = 15_000;

let cacheEntry: { value: RuntimeSettings; at: number } | null = null;

interface SettingsRow {
  site_name: string;
  site_name_en: string;
  ai_model: string | null;
  ai_daily_limit: number;
  ai_monthly_limit: number;
  default_gift_visibility: string;
  maintenance_mode: boolean;
  feature_flags: unknown;
}

function environmentFallback(): RuntimeSettings {
  const env = getServerEnv();
  return {
    siteName: 'هدية',
    siteNameEn: 'Hadiya',
    aiModel: env.openrouterModel,
    aiDailyLimit: env.freeDailyAiLimit,
    aiMonthlyLimit: env.freeMonthlyAiLimit,
    defaultGiftVisibility: 'unlisted',
    maintenanceMode: env.maintenanceMode,
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    source: 'environment',
  };
}

function mergeFeatureFlags(raw: unknown): FeatureFlags {
  const flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'boolean') flags[key] = value;
    }
  }
  return flags;
}

/**
 * Reads the settings row. Uses the direct Postgres pool when available,
 * otherwise the service-role REST client, otherwise environment defaults.
 */
export async function loadSettings(force = false): Promise<RuntimeSettings> {
  const now = Date.now();
  if (!force && cacheEntry && now - cacheEntry.at < CACHE_TTL_MS) {
    return cacheEntry.value;
  }

  let row: SettingsRow | null = null;

  try {
    if (isDatabaseConfigured()) {
      row = await queryOne<SettingsRow>(
        `select site_name, site_name_en, ai_model, ai_daily_limit, ai_monthly_limit,
                default_gift_visibility, maintenance_mode, feature_flags
         from public.app_settings where id = 1`,
      );
    } else {
      const supabase = getServiceClient();
      if (supabase) {
        const { data } = await supabase
          .from('app_settings')
          .select(
            'site_name, site_name_en, ai_model, ai_daily_limit, ai_monthly_limit, default_gift_visibility, maintenance_mode, feature_flags',
          )
          .eq('id', 1)
          .maybeSingle();
        row = (data as SettingsRow | null) ?? null;
      }
    }
  } catch (error) {
    console.warn('[settings] falling back to environment:', (error as Error).message);
  }

  if (!row) {
    const value = environmentFallback();
    cacheEntry = { value, at: now };
    return value;
  }

  const env = getServerEnv();
  const value: RuntimeSettings = {
    siteName: row.site_name || 'هدية',
    siteNameEn: row.site_name_en || 'Hadiya',
    aiModel: row.ai_model || env.openrouterModel,
    aiDailyLimit: Number(row.ai_daily_limit ?? env.freeDailyAiLimit),
    aiMonthlyLimit: Number(row.ai_monthly_limit ?? env.freeMonthlyAiLimit),
    defaultGiftVisibility:
      row.default_gift_visibility === 'public' ? 'public' : 'unlisted',
    maintenanceMode: Boolean(row.maintenance_mode ?? env.maintenanceMode),
    featureFlags: mergeFeatureFlags(row.feature_flags),
    source: 'database',
  };

  cacheEntry = { value, at: now };
  return value;
}

/** React `cache()` wrapper so one render pass reads settings once. */
export const getSettings = cache(async (): Promise<RuntimeSettings> => loadSettings());

export function invalidateSettingsCache(): void {
  cacheEntry = null;
}

/**
 * Feature-flag check. Unknown flags default to `false` so a typo fails closed.
 */
export async function isFeatureEnabled(flag: keyof FeatureFlags | string): Promise<boolean> {
  const settings = await loadSettings();
  return settings.featureFlags[flag] === true;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const settings = await loadSettings();
  return settings.featureFlags;
}

// ---------------------------------------------------------------------------
// AI quota — deliberately lives here, not scattered through the app
// ---------------------------------------------------------------------------

export interface AiQuota {
  dailyLimit: number;
  monthlyLimit: number;
  usedToday: number;
  usedMonth: number;
  remainingToday: number;
  remainingMonth: number;
  exhausted: boolean;
  unlimited: boolean;
}

interface CountRow {
  today: string | number;
  month: string | number;
}

/**
 * Counts successful generations for a user. `0` means "unlimited".
 * Counts come straight from `ai_generations` — never from an in-memory counter,
 * so a server restart cannot hand out a fresh quota.
 */
export async function getAiQuota(userId: string): Promise<AiQuota> {
  const settings = await loadSettings();
  const dailyLimit = settings.aiDailyLimit;
  const monthlyLimit = settings.aiMonthlyLimit;
  const unlimited = dailyLimit <= 0 && monthlyLimit <= 0;

  if (!isDatabaseConfigured()) {
    return {
      dailyLimit,
      monthlyLimit,
      usedToday: 0,
      usedMonth: 0,
      remainingToday: dailyLimit,
      remainingMonth: monthlyLimit,
      exhausted: false,
      unlimited,
    };
  }

  let usedToday = 0;
  let usedMonth = 0;

  try {
    const row = await queryOne<CountRow>(
      `select
         count(*) filter (where created_at >= date_trunc('day', now())) as today,
         count(*) filter (where created_at >= date_trunc('month', now())) as month
       from public.ai_generations
       where user_id = $1 and status = 'success'`,
      [userId],
    );
    usedToday = Number(row?.today ?? 0);
    usedMonth = Number(row?.month ?? 0);
  } catch (error) {
    console.warn('[quota] count failed:', (error as Error).message);
  }

  const remainingToday = dailyLimit <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, dailyLimit - usedToday);
  const remainingMonth =
    monthlyLimit <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, monthlyLimit - usedMonth);

  return {
    dailyLimit,
    monthlyLimit,
    usedToday,
    usedMonth,
    remainingToday,
    remainingMonth,
    exhausted: !unlimited && (remainingToday <= 0 || remainingMonth <= 0),
    unlimited,
  };
}