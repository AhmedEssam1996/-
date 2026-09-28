import { z } from 'zod';

/**
 * Request-body schemas for the API layer.
 *
 * Every route validates its input here before anything touches the database or
 * the AI provider. Two rules applied throughout:
 *
 *  • `.strict()` — unknown keys are rejected instead of silently dropped, so a
 *    client cannot smuggle a field (`user_id`, `is_demo`, `status`) past a route
 *    that builds its SQL from named fields.
 *  • Length caps on every free-text field — these strings end up in prompts, in
 *    the database, and on a page, so each one has a ceiling.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const giftFinderRequest = z
  .object({
    relationship: trimmed(40).optional(),
    occasion: trimmed(40).optional(),
    age: trimmed(20).optional(),
    interests: trimmed(400).optional(),
    budget: trimmed(20).optional(),
    gift_type: trimmed(40).optional(),
    notes: trimmed(600).optional(),
    recipient_name: trimmed(60).optional(),
  })
  .strict();

export const messageRequest = z
  .object({
    relationship: trimmed(40).optional(),
    tone: trimmed(40).optional(),
    length: z.enum(['short', 'medium', 'long']).optional(),
    recipient_name: trimmed(60).optional(),
    context: trimmed(600).optional(),
    previous_message: trimmed(1200).optional(),
  })
  .strict();

export const experienceRequest = z
  .object({
    description: z.string().trim().min(10, 'اكتب وصف للهدية (١٠ حروف على الأقل).').max(1500),
    recipient_name: trimmed(60).optional(),
    occasion: trimmed(40).optional(),
    /** Optional template slug the experience is based on. */
    template_slug: trimmed(80).optional(),
  })
  .strict();

export const storyRequest = z
  .object({
    topic: z.string().trim().min(5, 'اكتب موضوع القصة (٥ حروف على الأقل).').max(1200),
    recipient_name: trimmed(60).optional(),
    tone: trimmed(40).optional(),
    length: z.enum(['short', 'medium', 'long']).optional(),
  })
  .strict();

export const vibeRequest = z
  .object({
    description: z.string().trim().min(3, 'اكتب وصف بسيط للهدية.').max(600),
  })
  .strict();

export const sectionSchema = z
  .object({
    type: z.enum([
      'cover',
      'message',
      'image',
      'story',
      'memory',
      'quote',
      'button',
      'countdown',
      'quiz',
      'final',
    ]),
    title: trimmed(140).optional(),
    content: trimmed(4000).optional(),
    url: trimmed(1000).optional(),
    label: trimmed(60).optional(),
    href: trimmed(1000).optional(),
    targetDate: trimmed(40).optional(),
    question: trimmed(300).optional(),
    options: z.array(trimmed(120)).max(6).optional(),
    answerIndex: z.number().int().min(0).max(5).optional(),
  })
  .strict();

export const createGiftRequest = z
  .object({
    title: trimmed(200).optional(),
    category: trimmed(40).optional(),
    type: z.enum(['experience', 'message', 'image', 'story', 'video', 'quiz', 'generic']).optional(),
    template_id: z.string().uuid().nullable().optional(),
    recipient_name: trimmed(80).nullable().optional(),
    occasion: trimmed(80).nullable().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    theme: z.record(z.string(), z.unknown()).optional(),
    cover_image: trimmed(1000).nullable().optional(),
    visibility: z.enum(['public', 'unlisted']).optional(),
    source: trimmed(40).optional(),
    sections: z.array(sectionSchema).max(40).optional(),
  })
  .strict();

export const updateGiftRequest = z
  .object({
    title: trimmed(200).optional(),
    category: trimmed(40).optional(),
    type: z.enum(['experience', 'message', 'image', 'story', 'video', 'quiz', 'generic']).optional(),
    recipient_name: trimmed(80).nullable().optional(),
    occasion: trimmed(80).nullable().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    theme: z.record(z.string(), z.unknown()).optional(),
    cover_image: trimmed(1000).nullable().optional(),
    visibility: z.enum(['public', 'unlisted']).optional(),
    slug: trimmed(60).optional(),
  })
  .strict();

export const sectionsRequest = z
  .object({
    sections: z.array(sectionSchema).max(40),
  })
  .strict();

export const publishRequest = z
  .object({
    status: z.enum(['DRAFT', 'PUBLISHED', 'DISABLED']),
  })
  .strict();

export const giftOpenRequest = z
  .object({
    slug: z.string().trim().min(1).max(120),
  })
  .strict();

export const giftDurationRequest = z
  .object({
    slug: z.string().trim().min(1).max(120),
    seconds: z.number().int().min(0).max(24 * 60 * 60),
  })
  .strict();

/**
 * Admin boundary — the single place the shape of a privileged request is defined.
 * Anything not listed here is rejected, which is what keeps a compromised admin
 * UI from widening its own permissions.
 */
export const adminUserUpdateRequest = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('set_role'), user_id: z.string().uuid(), role: z.enum(['USER', 'ADMIN']) }).strict(),
    z.object({ action: z.literal('set_status'), user_id: z.string().uuid(), status: z.enum(['ACTIVE', 'DISABLED']) }).strict(),
    z.object({ action: z.literal('delete'), user_id: z.string().uuid() }).strict(),
  ]);

export const adminGiftUpdateRequest = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('set_disabled'), gift_id: z.string().uuid(), disabled: z.boolean() }).strict(),
    z.object({ action: z.literal('delete'), gift_id: z.string().uuid() }).strict(),
  ]);

export const adminSettingsRequest = z
  .object({
    site_name: trimmed(80).optional(),
    site_name_en: trimmed(80).optional(),
    ai_model: trimmed(120).nullable().optional(),
    ai_daily_limit: z.number().int().min(0).max(1000).optional(),
    ai_monthly_limit: z.number().int().min(0).max(100_000).optional(),
    default_gift_visibility: z.enum(['public', 'unlisted']).optional(),
    maintenance_mode: z.boolean().optional(),
    feature_flags: z.record(z.string(), z.boolean()).optional(),
  })
  .strict();

export const bootstrapRequest = z
  .object({
    token: z.string().min(16).max(200),
  })
  .strict();

/**
 * Shared validation helper: turns a Zod failure into a 422 with field paths.
 * Raw values are never echoed back, so a validation error cannot leak an input.
 */
export function formatIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(body)',
    message: issue.message,
  }));
}