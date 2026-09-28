import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  simulateReadableStream,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

import { buildChatSystemPrompt, loadChatSiteContext } from '@/lib/ai/chat-context';
import { buildChatTools } from '@/lib/ai/chat-tools';
import { chatModelFor, isAiConfigured } from '@/lib/ai/provider';
import { jsonError, traceId } from '@/lib/api/route-helpers';
import { getSessionUser } from '@/lib/auth/session';
import { isDatabaseConfigured, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import { getServerEnv } from '@/lib/env';
import { ApiError, friendlyMessage } from '@/lib/http';
import { rateLimitAi } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { getOrCreateSessionId } from '@/lib/analytics/track';

/**
 * POST /api/chat — the floating assistant's streaming endpoint (AI SDK v7).
 *
 * Pipeline (mirrors the shared AI route pipeline, adapted for streaming):
 *   1. Feature flag + maintenance mode → rejected before any cost.
 *   2. Rate limit on a HASHED identity (never a raw user id or IP).
 *   3. Live site context → system prompt (categories, latest gifts, products).
 *   4. streamText with tool calling (search_gifts / get_categories /
 *      recommend_products) so answers are grounded in real catalogue data.
 *   5. Metered like every other AI capability: one ai_generations row with
 *      feature = 'chat', and the conversation persisted to chat_messages.
 *
 * With AI_PROVIDER=mock (development), a deterministic Arabic reply streams
 * back so the widget is fully usable without an OpenRouter key.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const CHAT_MAX_TOKENS = 900;

interface ChatBody {
  messages: UIMessage[];
}

function extractLastUserText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') return '';
  return last.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .trim()
    .slice(0, 2000);
}

async function persistChatMessage(input: {
  sessionId: string;
  userId: string | null;
  role: 'user' | 'assistant';
  content: string;
  model: string;
}): Promise<void> {
  if (!input.content) return;
  try {
    if (isDatabaseConfigured()) {
      await query(
        `insert into public.chat_messages (session_id, user_id, role, content, model)
         values ($1, $2, $3, $4, $5)`,
        [input.sessionId, input.userId, input.role, input.content, input.model],
      );
      return;
    }
    const supabase = getUntypedServiceClient();
    if (supabase) {
      await supabase.from('chat_messages').insert({
        session_id: input.sessionId,
        user_id: input.userId,
        role: input.role,
        content: input.content,
        model: input.model,
      });
    }
  } catch (error) {
    // Persistence must never break the chat itself.
    console.warn('[chat] persist failed:', (error as Error).message);
  }
}

async function recordMetering(input: {
  userId: string | null;
  sessionId: string;
  model: string;
  provider: string;
  status: 'success' | 'error' | 'rate_limited';
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  errorCode?: string | null;
}): Promise<void> {
  try {
    if (isDatabaseConfigured()) {
      await query(
        `insert into public.ai_generations
           (user_id, session_id, feature, model, provider, status,
            input_tokens, output_tokens, total_tokens, latency_ms, error_code)
         values ($1,$2,'chat',$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          input.userId,
          input.sessionId,
          input.model,
          input.provider,
          input.status,
          input.inputTokens,
          input.outputTokens,
          input.totalTokens,
          input.latencyMs,
          input.errorCode ?? null,
        ],
      );
      return;
    }
    const supabase = getUntypedServiceClient();
    if (supabase) {
      await supabase.from('ai_generations').insert({
        user_id: input.userId,
        session_id: input.sessionId,
        feature: 'chat',
        model: input.model,
        provider: input.provider,
        status: input.status,
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        total_tokens: input.totalTokens,
        latency_ms: input.latencyMs,
        error_code: input.errorCode ?? null,
      });
    }
  } catch (error) {
    console.warn('[chat] metering failed:', (error as Error).message);
  }
}

export async function POST(request: Request): Promise<Response> {
  const id = traceId();
  let sessionId = '';
  let userId: string | null = null;
  let model = 'unknown';

  try {
    const settings = await getSettings();
    if (settings.featureFlags.ai_chatbot !== true) {
      throw new ApiError('FEATURE_DISABLED', friendlyMessage('FEATURE_DISABLED'), 403);
    }
    if (settings.maintenanceMode) {
      throw new ApiError('MAINTENANCE', friendlyMessage('MAINTENANCE'), 503);
    }

    const limiter = await rateLimitAi(await hashedIdentity(request), 'chat');
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMIT', friendlyMessage('RATE_LIMIT'), 429);
    }

    if (!isAiConfigured()) {
      throw new ApiError(
        'AI_UNAVAILABLE',
        'خدمة الذكاء الاصطناعي مش متظبطة حاليًا. جرّب تاني بعد شوية.',
        503,
      );
    }

    const body = (await request.json()) as ChatBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userText = extractLastUserText(messages);
    if (!userText) {
      throw new ApiError('VALIDATION_ERROR', 'اكتب رسالة الأول.', 422);
    }

    const user = await getSessionUser();
    userId = user?.id ?? null;
    sessionId = getOrCreateSessionId(request).sessionId;
    const env = getServerEnv();
    const started = Date.now();

    const context = await loadChatSiteContext();
    const system = buildChatSystemPrompt(context);
    const tools = buildChatTools();
    model = settings.aiModel || env.openrouterModel;

    // Development without a key: stream a deterministic Arabic reply.
    if (env.aiProvider === 'mock') {
      model = 'mock/chat';
      const reply =
        'أنا شغّال في الوضع التجريبي (من غير مفتاح ذكاء اصطناعي). لما المدير يضيف OPENROUTER_API_KEY هقدر أرشحلك هدايا حقيقية من الكتالوج وتقولّي: هدية لـ مين؟ المناسبة إيه؟ 🎁';
      const chunks = reply.match(/[\s\S]{1,18}/g) ?? [reply];
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.merge(
            toUIMessageStream({
              stream: simulateReadableStream({
                chunks: [
                  { type: 'text-start', id: '0' },
                  ...chunks.map((text) => ({ type: 'text-delta' as const, id: '0', text })),
                  { type: 'text-end', id: '0' },
                ],
                chunkDelayInMs: 40,
              }),
            }),
          );
        },
      });
      await persistChatMessage({ sessionId, userId, role: 'user', content: userText, model });
      await persistChatMessage({ sessionId, userId, role: 'assistant', content: reply, model });
      await recordMetering({
        userId,
        sessionId,
        model,
        provider: 'mock',
        status: 'success',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs: Date.now() - started,
      });
      return createUIMessageStreamResponse({ stream });
    }

    await persistChatMessage({ sessionId, userId, role: 'user', content: userText, model });

    const result = streamText({
      model: chatModelFor(model),
      system,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: isStepCount(4),
      temperature: 0.7,
      maxOutputTokens: CHAT_MAX_TOKENS,
      abortSignal: request.signal,
      maxRetries: env.openrouterMaxRetries,
    });

    void Promise.resolve(
      result.usage.then(async (usage) => {
        await recordMetering({
          userId,
          sessionId,
          model,
          provider: 'openrouter',
          status: 'success',
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          totalTokens: usage?.totalTokens ?? null,
          latencyMs: Date.now() - started,
        });
      }),
    ).catch(() => undefined);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.merge(toUIMessageStream({ stream: result.fullStream, tools }));
      },
      onError: () => 'حصلت مشكلة بسيطة في المساعد. جرّب تاني.',
      onEnd: async () => {
        try {
          const text = await result.text;
          await persistChatMessage({
            sessionId,
            userId,
            role: 'assistant',
            content: text.slice(0, 4000),
            model,
          });
        } catch (error) {
          console.warn('[chat] assistant persist failed:', (error as Error).message);
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    await Promise.resolve(
      recordMetering({
        userId,
        sessionId: sessionId || 'unknown',
        model,
        provider: 'openrouter',
        status: 'error',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs: null,
        errorCode: error instanceof ApiError ? error.code : 'INTERNAL_ERROR',
      }),
    ).catch(() => undefined);
    if (error instanceof ApiError) return jsonError(error, id);
    console.error(`[chat:${id}] unhandled error:`, error);
    return jsonError(new ApiError('INTERNAL_ERROR', friendlyMessage('INTERNAL_ERROR'), 500), id);
  }
}

/** Hashed limiter identity — a raw user id or IP is never used as the key. */
async function hashedIdentity(request: Request): Promise<string> {
  const { hashIdentity } = await import('@/lib/analytics/track');
  const user = await getSessionUser();
  if (user?.id) return hashIdentity(`user:${user.id}`);
  const ip = request.headers.get('x-forwarded-for') ?? 'anon';
  return hashIdentity(`ip:${ip}`);
}

