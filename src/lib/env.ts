/**
 * Single source of truth for runtime configuration.
 *
 * Guarantees:
 *  - Server-only secrets never carry a `NEXT_PUBLIC_` prefix.
 *  - `getServerEnv()` throws a descriptive error when required values are missing,
 *    so a misconfigured deployment fails loudly instead of silently degrading.
 *  - `env` access is lazy: importing this module in the browser is safe.
 */

export type AiProviderMode = 'openrouter' | 'mock';

function read(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = read(key);
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function readInt(key: string, fallback: number): number {
  const raw = read(key);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Public configuration — safe to reference from client components.
 * Only ever read from `NEXT_PUBLIC_*` variables.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;

export function hasSupabaseCredentials(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export interface ServerEnv {
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  appUrl: string;

  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string | undefined;
  databaseUrl: string | undefined;

  openrouterApiKey: string | undefined;
  openrouterModel: string;
  openrouterBaseUrl: string;
  openrouterAppName: string;
  openrouterTimeoutMs: number;
  openrouterMaxRetries: number;
  openrouterTemperature: number;
  openrouterMaxTokens: number;

  /**
   * `mock` keeps the whole product explorable (and testable) without an
   * OpenRouter key. It is refused in production by `assertAiConfigured()`.
   */
  aiProvider: AiProviderMode;

  freeDailyAiLimit: number;
  freeMonthlyAiLimit: number;
  aiRateLimitPerMinute: number;

  // Stripe (commerce). All server-only.
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripeCurrency: string;
  stripePublishableKey: string | undefined;

  initialAdminEmail: string | undefined;
  adminBootstrapToken: string | undefined;

  maintenanceMode: boolean;
}

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const nodeEnv = (read('NODE_ENV') ?? 'development') as ServerEnv['nodeEnv'];
  const isProduction = nodeEnv === 'production';

  const explicitProvider = read('AI_PROVIDER');
  const aiProvider: AiProviderMode =
    explicitProvider === 'openrouter' || explicitProvider === 'mock'
      ? explicitProvider
      : read('OPENROUTER_API_KEY')
        ? 'openrouter'
        : 'mock';

  cached = {
    nodeEnv,
    isProduction,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',

    supabaseUrl: read('NEXT_PUBLIC_SUPABASE_URL') ?? '',
    supabaseAnonKey: read('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '',
    supabaseServiceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
    databaseUrl: read('DATABASE_URL'),

    openrouterApiKey: read('OPENROUTER_API_KEY'),
    openrouterModel: read('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini',
    openrouterBaseUrl: read('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1',
    openrouterAppName: read('OPENROUTER_APP_NAME') ?? 'Hadiya',
    openrouterTimeoutMs: readInt('OPENROUTER_TIMEOUT_MS', 45_000),
    openrouterMaxRetries: readInt('OPENROUTER_MAX_RETRIES', 2),
    openrouterTemperature: Number(read('OPENROUTER_TEMPERATURE') ?? '0.85'),
    openrouterMaxTokens: readInt('OPENROUTER_MAX_TOKENS', 2_400),

    aiProvider,

    freeDailyAiLimit: readInt('FREE_DAILY_AI_LIMIT', 10),
    freeMonthlyAiLimit: readInt('FREE_MONTHLY_AI_LIMIT', 120),
    aiRateLimitPerMinute: readInt('AI_RATE_LIMIT_PER_MINUTE', 6),

    stripeSecretKey: read('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: read('STRIPE_WEBHOOK_SECRET'),
    stripeCurrency: (read('STRIPE_CURRENCY') ?? 'usd').toLowerCase().slice(0, 3),
    stripePublishableKey: read('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),

    initialAdminEmail: read('INITIAL_ADMIN_EMAIL')?.toLowerCase(),
    adminBootstrapToken: read('ADMIN_BOOTSTRAP_TOKEN'),

    maintenanceMode: readBool('MAINTENANCE_MODE', false),
  };

  return cached;
}

/** Test helper — clears the memoised env so a changed `process.env` is re-read. */
export function resetServerEnvCache(): void {
  cached = null;
}

/** Names of the environment variables that are missing for full DB access. */
export function missingDatabaseEnv(): string[] {
  const env = getServerEnv();
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!env.databaseUrl && !env.supabaseServiceRoleKey) {
    missing.push('DATABASE_URL (or SUPABASE_SERVICE_ROLE_KEY)');
  }
  return missing;
}

/** Names of the environment variables that are missing for live AI. */
export function missingAiEnv(): string[] {
  const env = getServerEnv();
  return env.openrouterApiKey ? [] : ['OPENROUTER_API_KEY'];
}