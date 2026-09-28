import 'server-only';

import { extractJson, generate, getActiveProvider, isAiConfigured } from '@/lib/ai/provider';
import {
  giftFinderPrompt,
  giftExperiencePrompt,
  messagePrompt,
  storyPrompt,
  vibePrompt,
  type ExperienceInput,
  type GiftFinderInput,
  type MessageInput,
  type StoryInput,
  type VibeInput,
} from '@/lib/ai/prompts';
import { sanitizeDeep, validateAiPayload, type AiSchemaKey } from '@/lib/ai/schemas';
import { isDatabaseConfigured, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import { ApiError } from '@/lib/http';
import type { AiFeature, AiGenerationStatus } from '@/types/database';

/**
 * The single entry point for every AI capability in Hadiya.
 *
 * Responsibilities, in order:
 *   1. Build the prompt (prompts.ts).
 *   2. Call the provider with timeout + retry handling (provider.ts).
 *   3. Extract JSON defensively from whatever came back.
 *   4. Validate against a strict Zod schema — AI output is untrusted input.
 *   5. Sanitize every string so a model coaxed into emitting markup cannot
 *      produce a stored XSS payload.
 *   6. Record a metering row (feature, model, tokens, latency, status) so usage
 *      limits and admin analytics are computed from real data.
 *
 * On a validation failure the call is retried ONCE with a corrective follow-up
 * message. If it fails again the caller receives a typed ApiError, and the
 * failure is still metered so abuse is visible in the admin dashboard.
 */

export interface AiCallContext {
  userId: string | null;
  sessionId?: string | null;
  giftId?: string | null;
}

export interface AiResult<T> {
  data: T;
  model: string;
  /** True when the deterministic offline provider produced this content. */
  isMock: boolean;
  latencyMs: number;
}

async function recordGeneration(input: {
  feature: AiFeature;
  model: string;
  provider: string;
  status: AiGenerationStatus;
  ctx: AiCallContext;
  usage?: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
  latencyMs?: number;
  errorCode?: string;
}): Promise<void> {
  const row = {
    user_id: input.ctx.userId,
    session_id: input.ctx.sessionId ?? null,
    feature: input.feature,
    model: input.model,
    provider: input.provider,
    status: input.status,
    input_tokens: input.usage?.inputTokens ?? null,
    output_tokens: input.usage?.outputTokens ?? null,
    total_tokens: input.usage?.totalTokens ?? null,
    latency_ms: input.latencyMs ?? null,
    gift_id: input.ctx.giftId ?? null,
    error_code: input.errorCode ?? null,
  };

  try {
    if (isDatabaseConfigured()) {
      await query(
        `insert into public.ai_generations
           (user_id, session_id, feature, model, provider, status,
            input_tokens, output_tokens, total_tokens, latency_ms, gift_id, error_code)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.user_id,
          row.session_id,
          row.feature,
          row.model,
          row.provider,
          row.status,
          row.input_tokens,
          row.output_tokens,
          row.total_tokens,
          row.latency_ms,
          row.gift_id,
          row.error_code,
        ],
      );
      return;
    }

    const supabase = getUntypedServiceClient();
    if (supabase) {
      await supabase.from('ai_generations').insert(row);
    }
  } catch (error) {
    // Metering must never break the user's request.
    console.warn('[ai] could not record generation:', (error as Error).message);
  }
}

interface RunOptions<T> {
  feature: AiSchemaKey;
  prompt: { system: string; user: string };
  ctx: AiCallContext;
  /** Compact, non-sensitive hint used only by the offline mock provider. */
  mockParams?: Record<string, string>;
  /** Phantom marker: keeps `T` referenced so the generic stays meaningful. */
  readonly __payload?: T;
}

// The generic parameter is the validated payload type each caller pins via
// `runFeature<T>()`; it reaches the implementation through `RunOptions<T>`.
async function runFeature<T>(options: RunOptions<T>): Promise<AiResult<T>> {
  if (!isAiConfigured()) {
    throw new ApiError(
      'AI_UNAVAILABLE',
      'خدمة الذكاء الاصطناعي مش متظبطة حاليًا. كلّم مدير الموقع.',
      503,
    );
  }

  const provider = getActiveProvider();
  const mockBlock = options.mockParams
    ? `\n<hadiya-mock-params>${JSON.stringify(options.mockParams)}</hadiya-mock-params>`
    : '';

  const messages = [
    { role: 'system' as const, content: options.prompt.system },
    { role: 'user' as const, content: `${options.prompt.user}${mockBlock}` },
  ];

  let lastIssues: string[] = [];

  // Two attempts total: initial + one corrective retry on schema failure.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    try {
      result = await generate({
        messages:
          attempt === 0
            ? messages
            : [
                ...messages,
                {
                  role: 'assistant' as const,
                  content: 'وصل رد غير مطابق للمطلوب.',
                },
                {
                  role: 'user' as const,
                  content:
                    'الرد السابق مش مطابق للمخطط المطلوب. رجّع JSON صحيح بس، بنفس المفاتيح المطلوبة بالظبط، ومن غير أي كلام إضافي.',
                },
              ],
        feature: options.feature as AiFeature,
        jsonMode: true,
      });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'AI_UNAVAILABLE';
      await recordGeneration({
        feature: options.feature as AiFeature,
        model: 'unknown',
        provider,
        status: code === 'RATE_LIMIT' ? 'rate_limited' : 'error',
        ctx: options.ctx,
        errorCode: code,
      });
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = extractJson(result.text);
    } catch (error) {
      lastIssues = ['response was not parseable JSON'];
      if (attempt === 1) {
        await recordGeneration({
          feature: options.feature as AiFeature,
          model: result.model,
          provider: result.provider,
          status: 'invalid_output',
          ctx: options.ctx,
          usage: result.usage,
          latencyMs: result.latencyMs,
          errorCode: 'AI_INVALID_OUTPUT',
        });
        throw error;
      }
      continue;
    }

    const validated = validateAiPayload(options.feature, parsed);
    if (!validated.ok) {
      lastIssues = validated.issues;
      console.warn(
        `[ai] schema validation failed for ${options.feature} (attempt ${attempt + 1}):`,
        validated.issues.slice(0, 5).join(' | '),
      );
      if (attempt === 1) {
        await recordGeneration({
          feature: options.feature as AiFeature,
          model: result.model,
          provider: result.provider,
          status: 'invalid_output',
          ctx: options.ctx,
          usage: result.usage,
          latencyMs: result.latencyMs,
          errorCode: 'AI_INVALID_OUTPUT',
        });
        throw new ApiError(
          'AI_INVALID_OUTPUT',
          'الرد اللي وصلنا مش مظبوط. جرّب توليد نسخة تانية.',
          502,
        );
      }
      continue;
    }

    await recordGeneration({
      feature: options.feature as AiFeature,
      model: result.model,
      provider: result.provider,
      status: 'success',
      ctx: options.ctx,
      usage: result.usage,
      latencyMs: result.latencyMs,
    });

    return {
      data: sanitizeDeep(validated.data) as T,
      model: result.model,
      isMock: result.provider === 'mock',
      latencyMs: result.latencyMs,
    };
  }

  // Unreachable in practice: both paths either return or throw above.
  console.error('[ai] exhausted attempts', lastIssues);
  throw new ApiError('AI_INVALID_OUTPUT', 'الرد اللي وصلنا مش مظبوط. جرّب توليد نسخة تانية.', 502);
}

// ---------------------------------------------------------------------------
// Public capabilities
// ---------------------------------------------------------------------------

export function generateGiftSuggestions(input: GiftFinderInput, ctx: AiCallContext) {
  return runFeature<import('@/lib/ai/schemas').GiftSuggestionsPayload>({
    feature: 'gift_suggestions',
    prompt: giftFinderPrompt(input),
    ctx,
    mockParams: {
      recipient: input.recipientName ?? '',
      relationship: input.relationship ?? '',
      occasion: input.occasion ?? '',
      interests: input.interests ?? '',
    },
  });
}

export function generateMessage(input: MessageInput, ctx: AiCallContext) {
  return runFeature<import('@/lib/ai/schemas').MessagePayload>({
    feature: 'message',
    prompt: messagePrompt(input),
    ctx,
    mockParams: {
      recipient: input.recipientName ?? '',
      relationship: input.relationship ?? '',
      tone: input.tone ?? '',
      length: input.length ?? 'medium',
      context: input.context ?? '',
    },
  });
}

export function generateGiftExperience(input: ExperienceInput, ctx: AiCallContext) {
  return runFeature<import('@/lib/ai/schemas').GiftExperiencePayload>({
    feature: 'gift_experience',
    prompt: giftExperiencePrompt(input),
    ctx,
    mockParams: {
      recipient: input.recipientName ?? '',
      occasion: input.occasion ?? '',
    },
  });
}

export function generateStory(input: StoryInput, ctx: AiCallContext) {
  return runFeature<import('@/lib/ai/schemas').StoryPayload>({
    feature: 'story',
    prompt: storyPrompt(input),
    ctx,
    mockParams: {
      recipient: input.recipientName ?? '',
      tone: input.tone ?? '',
      length: input.length ?? 'medium',
    },
  });
}

export function generateVibe(input: VibeInput, ctx: AiCallContext) {
  return runFeature<import('@/lib/ai/schemas').VibePayload>({
    feature: 'vibe',
    prompt: vibePrompt(input),
    ctx,
    mockParams: {},
  });
}

/** Exposed for the AI status banner in the UI. */
export function aiStatus(): { configured: boolean; provider: string; isMock: boolean } {
  const provider = getActiveProvider();
  return { configured: isAiConfigured(), provider, isMock: provider === 'mock' };
}