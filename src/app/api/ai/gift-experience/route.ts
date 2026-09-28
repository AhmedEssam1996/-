import { runAiRoute } from '@/lib/ai/route';
import { generateGiftExperience } from '@/lib/ai/service';
import { aiFeatureDescriptors, AI_FEATURE_LIMITS } from '@/lib/api/features';
import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { experienceRequest } from '@/lib/api/schemas';

/**
 * POST /api/ai/gift-experience
 *
 * Turns a free-text description into a full narrative experience: an intro, four
 * to seven ordered sections (`story → memory → message → final`), and a closing
 * line. The section types the model may emit are a closed enum in the AI schema,
 * so a hallucinated type cannot reach the database or the renderer.
 *
 * Signed-in only: this is the expensive call (a large completion) and it is the
 * one that ends up persisted as a real gift.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () =>
  jsonOk({
    feature: aiFeatureDescriptors().find((feature) => feature.key === 'gift_experience'),
    limits: { description: AI_FEATURE_LIMITS.experienceDescription },
  }),
);

export const POST = route(async (context) => {
  const input = await readBody(context.request, experienceRequest, 24 * 1024);

  return runAiRoute(context, {
    flag: 'ai_gift_finder',
    bucket: 'gift_experience',
    allowGuest: false,
    eventMetadata: {
      has_recipient: Boolean(input.recipient_name),
      template: input.template_slug ?? null,
    },
    run: (ctx) =>
      generateGiftExperience(
        {
          description: input.description,
          recipientName: input.recipient_name,
          occasion: input.occasion,
        },
        ctx,
      ),
  });
});