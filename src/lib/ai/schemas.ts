import { z } from 'zod';

/**
 * Schemas for everything the model is allowed to return.
 *
 * RULE: AI output is untrusted input. It arrives from a third party, it may be
 * truncated, hallucinated, wrapped in prose, or actively hostile (prompt
 * injection through a user-typed "interests" field). Nothing is rendered or
 * persisted before it has passed one of these schemas.
 *
 * All schemas are `strict()` where feasible so unexpected keys are dropped, and
 * every string is length-bounded so a runaway generation cannot blow up the DB
 * or the layout.
 */

const shortText = (max: number) => z.string().trim().min(1).max(max);

/** Strips control characters and collapses runs of blank lines. */
function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const prose = (max: number) =>
  z
    .string()
    .transform(normalizeWhitespace)
    .pipe(z.string().min(1).max(max));

// ---------------------------------------------------------------------------
// Gift finder
// ---------------------------------------------------------------------------
export const giftSuggestionSchema = z.object({
  title: shortText(120),
  description: prose(900),
  reason: prose(700),
  type: z.enum(['رقمية', 'تفاعلية', 'رسالة', 'صورة', 'قصة', 'فيديو', 'غير محدد', 'digital', 'interactive', 'message', 'image', 'story', 'video', 'generic']),
  personalization: prose(700),
});

export const giftSuggestionsSchema = z.object({
  suggestions: z.array(giftSuggestionSchema).min(1).max(8),
});

export type GiftSuggestion = z.infer<typeof giftSuggestionSchema>;
export type GiftSuggestionsPayload = z.infer<typeof giftSuggestionsSchema>;

// ---------------------------------------------------------------------------
// Message generator
// ---------------------------------------------------------------------------
export const messageSchema = z.object({
  message: prose(4000),
  tone_note: z.string().max(200).optional(),
  variants: z.array(prose(4000)).max(4).optional(),
});

export type MessagePayload = z.infer<typeof messageSchema>;

// ---------------------------------------------------------------------------
// Gift experience
// ---------------------------------------------------------------------------
export const experienceSectionTypeSchema = z.enum([
  'story',
  'memory',
  'message',
  'quote',
  'image',
  'countdown',
  'quiz',
  'final',
]);

export const experienceSectionSchema = z.object({
  type: experienceSectionTypeSchema,
  title: shortText(140),
  content: prose(1800),
});

export const giftExperienceSchema = z.object({
  title: shortText(160),
  intro: prose(800),
  sections: z.array(experienceSectionSchema).min(1).max(12),
  final_message: prose(1200),
});

export type GiftExperiencePayload = z.infer<typeof giftExperienceSchema>;
export type ExperienceSection = z.infer<typeof experienceSectionSchema>;

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------
export const storySchema = z.object({
  title: shortText(160),
  paragraphs: z.array(prose(1200)).min(1).max(12),
  closing: prose(600).optional(),
});

export type StoryPayload = z.infer<typeof storySchema>;

// ---------------------------------------------------------------------------
// Vibe / theme suggestion
// ---------------------------------------------------------------------------
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'لازم يكون لون هيكس صحيح')
  .transform((value) => value.toUpperCase());

export const vibeSchema = z.object({
  palette: z.array(hexColor).min(1).max(5),
  mood: z.string().max(80).optional(),
  animation: z.enum(['soft-float', 'aurora', 'confetti', 'none']).optional(),
});

export type VibePayload = z.infer<typeof vibeSchema>;

// ---------------------------------------------------------------------------
// Registry — one place that maps a feature to its schema
// ---------------------------------------------------------------------------
export const AI_SCHEMAS = {
  gift_suggestions: giftSuggestionsSchema,
  message: messageSchema,
  gift_experience: giftExperienceSchema,
  story: storySchema,
  vibe: vibeSchema,
} as const;

export type AiSchemaKey = keyof typeof AI_SCHEMAS;

/**
 * Validates extracted JSON against the feature's schema.
 * Returns a discriminated result instead of throwing, so callers can decide
 * whether to retry, degrade, or surface a friendly Arabic error.
 */
export function validateAiPayload<T extends AiSchemaKey>(
  feature: T,
  value: unknown,
): { ok: true; data: z.infer<(typeof AI_SCHEMAS)[T]> } | { ok: false; issues: string[] } {
  const schema = AI_SCHEMAS[feature];
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return { ok: true, data: parsed.data as z.infer<(typeof AI_SCHEMAS)[T]> };
  }
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}

/**
 * Defence against prompt injection reaching the DB.
 * Even with a valid schema, we strip anything that looks like markup so a model
 * coaxed into emitting `<script>` cannot produce a stored XSS payload.
 */
export function sanitizeAiText(value: string): string {
  return value
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*(iframe|object|embed|link|meta|style)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

/** Recursively sanitizes every string in an AI payload. */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') return sanitizeAiText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeDeep(inner);
    }
    return out as unknown as T;
  }
  return value;
}