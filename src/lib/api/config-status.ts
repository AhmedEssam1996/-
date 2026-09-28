import 'server-only';

import { getServerEnv, hasSupabaseCredentials } from '@/lib/env';
import { isDatabaseConfigured } from '@/lib/db/pg';
import { isServiceRoleConfigured } from '@/lib/db/supabase-admin';

import type { AiProviderMode } from '@/lib/env';

export function isAiConfiguredServerSide(): boolean {
  const env = getServerEnv();
  return env.aiProvider === 'mock' || Boolean(env.openrouterApiKey);
}

export interface ConfigStatus {
  supabase: boolean;
  service_role: boolean;
  database: boolean;
  ai: AiProviderMode;
}

export function configStatus(): ConfigStatus {
  const env = getServerEnv();
  return {
    supabase: hasSupabaseCredentials(),
    service_role: isServiceRoleConfigured(),
    database: isDatabaseConfigured(),
    ai: env.aiProvider,
  };
}
