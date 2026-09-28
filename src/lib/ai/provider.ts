import 'server-only';

import { generateText, type ModelMessage } from 'ai';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import { getServerEnv, type AiProviderMode } from '@/lib/env';
import { ApiError } from '@/lib/http';
import type { AiFeature } from '@/types/database';

/**
 * Provider-agnostic chat abstraction — Vercel AI SDK edition.
 *
 * Only ONE place in the codebase knows how to talk to OpenRouter. Everything
 * else asks this module for a structured object and receives either data or a
 * typed ApiError with Arabic-facing copy.
 *
 * The engine is the Vercel AI SDK (`generateText`) over an OpenAI-compatible
 * transport pointed at the OpenRouter base URL. Guarantees:
 *  • The API key is read from the server environment. It is never sent to the
 *    browser, never echoed in an error, and never logged.
 *  • Every request has an AbortController timeout, so a hung provider cannot
 *    pin a serverless function until the platform kills it.
 *  • Retries happen only for transient conditions (429/5xx/network), with the
 *    SDK's exponential backoff. A 4xx validation error is never retried.
 *  • Provider error bodies are never forwarded to the caller. We map to our own
 *    codes and log the detail server-side.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  messages: ChatMessage[];
  /** Overrides app_settings.ai_model for this call (rarely needed). */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for a JSON object when it supports response_format. */
  jsonMode?: boolean;
  feature: AiFeature;
}

export interface GenerateResult {
  text: string;
  model: string;
  provider: AiProviderMode;
  usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
  latencyMs: number;
}

declare global {
  var __hadiyaAiEngine: ReturnType<typeof createOpenAICompatible> | undefined;
}

export function getActiveProvider(): AiProviderMode {
  const env = getServerEnv();
  if (env.isProduction && env.aiProvider === 'mock') {
    // Refusing mock in production is the whole point: an offline provider must
    // never silently ship fake gift content to real recipients.
    throw new ApiError(
      'AI_UNAVAILABLE',
      'خدمة الذكاء الاصطناعي مش متظبطة على السيرفر. كلّم مدير الموقع.',
      503,
    );
  }
  return env.aiProvider;
}

export function isAiConfigured(): boolean {
  const env = getServerEnv();
  if (env.aiProvider === 'mock') return true;
  return Boolean(env.openrouterApiKey);
}

/**
 * Resolves a chat model id (e.g. `openai/gpt-4o-mini`) into an AI SDK
 * LanguageModel through the memoised OpenRouter transport. Used by the chat
 * route, which owns its own streaming call instead of `generate()`.
 */
export function chatModelFor(modelId: string) {
  return getEngine().chatModel(modelId);
}


// ---------------------------------------------------------------------------
// Engine transport (Vercel AI SDK → OpenRouter)
// ---------------------------------------------------------------------------
/** The OpenRouter transport, memoised per process. */
function getEngine() {
  const env = getServerEnv();
  if (!env.openrouterApiKey) {
    throw new ApiError(
      'AI_UNAVAILABLE',
      'خدمة الذكاء الاصطناعي مش متظبوطة حاليًا. جرّب تاني بعد شوية.',
      503,
    );
  }
  if (!globalThis.__hadiyaAiEngine) {
    globalThis.__hadiyaAiEngine = createOpenAICompatible({
      name: 'openrouter',
      baseURL: env.openrouterBaseUrl,
      apiKey: env.openrouterApiKey,
      headers: {
        // OpenRouter attribution headers — optional but recommended.
        'HTTP-Referer': env.appUrl,
        'X-Title': env.openrouterAppName,
      },
    });
  }
  return globalThis.__hadiyaAiEngine;
}

async function callEngine(options: GenerateOptions): Promise<GenerateResult> {
  const env = getServerEnv();
  const engine = getEngine();

  const model = options.model ?? env.openrouterModel;
  const started = Date.now();

  const systemParts: string[] = [];
  const rest: ModelMessage[] = [];
  for (const message of options.messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
    } else {
      rest.push({ role: message.role, content: message.content });
    }
  }
  if (options.jsonMode) {
    // The OpenAI-compatible transport does not forward `response_format`, so a
    // JSON-only instruction is appended instead. The Zod validation downstream
    // is what actually guarantees the shape — this only improves the hit rate.
    systemParts.push(
      'أهم قاعدة: ردّك لازم يكون JSON صالح بس — من غير أي كلام قبله أو بعده، ومن غير علامات ```.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.openrouterTimeoutMs);

  try {
    const result = await generateText({
      model: engine.chatModel(model),
      system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
      messages: rest,
      temperature: options.temperature ?? env.openrouterTemperature,
      maxOutputTokens: options.maxTokens ?? env.openrouterMaxTokens,
      abortSignal: controller.signal,
      maxRetries: env.openrouterMaxRetries,
    });

    return {
      text: result.text,
      model,
      provider: 'openrouter',
      usage: {
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
      },
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    throw mapEngineError(error);
  } finally {
    clearTimeout(timer);
  }
}

/** Maps any SDK/network error to a typed ApiError without leaking internals. */
function mapEngineError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const err = error as { name?: string; statusCode?: number; responseBody?: string };
  const name = err?.name ?? '';

  // Retry budget exhausted — surface it as a transient overload.
  if (name.includes('RetryError')) {
    console.error('[ai] retries exhausted:', name);
    return new ApiError('AI_UNAVAILABLE', 'الخدمة مزحومة شوية. جرّب تاني بعد دقيقة.', 503);
  }

  if (typeof err?.statusCode === 'number') {
    if (err.statusCode === 429) {
      return new ApiError('RATE_LIMIT', 'الخدمة مزحومة شوية. جرّب تاني بعد دقيقة.', 429);
    }
    if (err.statusCode >= 500) {
      return new ApiError('AI_UNAVAILABLE', 'حصلت مشكلة بسيطة أثناء إنشاء الهدية. جرّب مرة أخرى.', 503);
    }
  }

  if (name.includes('AbortError') || name.includes('TimeoutError')) {
    console.warn(`[ai] timeout after (engine) — mapped to 504`);
    return new ApiError('AI_UNAVAILABLE', 'الطلب اخد وقت أطول من المسموح. جرّب مرة أخرى.', 504);
  }

  // Permanent — do not retry, do not leak the provider body.
  console.error('[ai] provider rejected request:', name, String(err?.responseBody ?? '').slice(0, 400));
  return new ApiError('AI_UNAVAILABLE', 'حصلت مشكلة بسيطة أثناء إنشاء الهدية. جرّب مرة أخرى.', 502);
}

// ---------------------------------------------------------------------------
// Mock provider
//
// Deterministic, offline, and deliberately obvious: it returns schema-valid but
// clearly-labelled placeholder content so the WHOLE product can be explored
// before an OpenRouter key exists. Every surface that renders AI output shows a
// "وضع تجريبي" badge when `provider === 'mock'`.
// ---------------------------------------------------------------------------
async function callMock(options: GenerateOptions): Promise<GenerateResult> {
  const { mockProvider } = await import('@/lib/ai/mock-provider');
  const started = Date.now();
  // A small delay keeps the loading states honest during development.
  await new Promise((resolve) => setTimeout(resolve, 450));
  const text = mockProvider(options);
  return {
    text,
    model: `mock/${options.feature}`,
    provider: 'mock',
    usage: { inputTokens: null, outputTokens: null, totalTokens: null },
    latencyMs: Date.now() - started,
  };
}

/** Entry point used by the AI service layer. Never call OpenRouter directly. */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const provider = getActiveProvider();
  return provider === 'mock' ? callMock(options) : callEngine(options);
}

// ---------------------------------------------------------------------------
// JSON extraction
// ---------------------------------------------------------------------------

/**
 * Extracts a JSON value from a model response.
 *
 * Models wrap JSON in prose or markdown fences often enough that naive
 * `JSON.parse(text)` fails a meaningful fraction of the time. Strategy:
 *   1. Try the raw string.
 *   2. Try each fenced code block.
 *   3. Scan for the first balanced `{...}` or `[...]`.
 *
 * The result is still validated by Zod by the caller — extraction is not trust.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fenceMatch: RegExpExecArray | null;
  while ((fenceMatch = fencePattern.exec(trimmed)) !== null) {
    const parsed = tryParse(fenceMatch[1].trim());
    if (parsed !== undefined) return parsed;
  }

  const balanced = extractBalanced(trimmed);
  if (balanced !== undefined) return balanced;

  throw new ApiError('AI_INVALID_OUTPUT', 'الرد اللي وصلنا مش مظبوط. جرّب توليد نسخة تانية.', 502);
}

function tryParse(candidate: string): unknown {
  if (!candidate) return undefined;
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function extractBalanced(input: string): unknown {
  const openers = ['{', '['] as const;

  for (const opener of openers) {
    const closer = opener === '{' ? '}' : ']';
    const start = input.indexOf(opener);
    if (start === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < input.length; i += 1) {
      const char = input[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === opener) {
        depth += 1;
      } else if (char === closer) {
        depth -= 1;
        if (depth === 0) {
          const parsed = tryParse(input.slice(start, i + 1));
          if (parsed !== undefined) return parsed;
          break;
        }
      }
    }
  }

  return undefined;
}