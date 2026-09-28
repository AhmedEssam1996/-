import { runAiRoute } from '@/lib/ai/route';
import { generateGiftSuggestions } from '@/lib/ai/service';
import { aiFeatureDescriptors, AI_FEATURE_LIMITS } from '@/lib/api/features';
import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { giftFinderRequest } from '@/lib/api/schemas';

/**
 * POST /api/ai/gift-finder
 *
 * "I don't know what to give them" → 5 distinct, personalised suggestions.
 *
 * Open to signed-out visitors on purpose: this is the top of the funnel and the
 * single most valuable thing to try before creating an account. Abuse is bounded
 * by the shared per-identity rate limit and by the strict request schema.
 *
 * GET returns the input contract (labels, limits) so the form and the endpoint
 * cannot drift apart.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () =>
  jsonOk({
    feature: aiFeatureDescriptors().find((feature) => feature.key === 'gift_suggestions'),
    limits: {
      interests: AI_FEATURE_LIMITS.giftFinderInterests,
      notes: AI_FEATURE_LIMITS.giftFinderNotes,
    },
  }),
);

export const POST = route(async (context) => {
  const input = await readBody(context.request, giftFinderRequest, 16 * 1024);

  return runAiRoute(context, {
    flag: 'ai_gift_finder',
    bucket: 'gift_suggestions',
    allowGuest: true,
    eventMetadata: { has_occasion: Boolean(input.occasion) },
    run: (ctx) =>
      generateGiftSuggestions(
        {
          relationship: input.relationship,
          occasion: input.occasion,
          age: input.age,
          interests: input.interests,
          budget: input.budget,
          giftType: input.gift_type,
          notes: input.notes,
          recipientName: input.recipient_name,
        },
        ctx,
      ),
  });
});