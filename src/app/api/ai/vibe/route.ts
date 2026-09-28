import { runAiRoute } from '@/lib/ai/route';
import { generateVibe } from '@/lib/ai/service';
import { aiFeatureDescriptors } from '@/lib/api/features';
import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { vibeRequest } from '@/lib/api/schemas';

/**
 * POST /api/ai/vibe
 *
 * Colour palette + animation suggestion for a gift's theme.
 *
 * The response is the most constrained payload in the app: the schema accepts
 * only `#RRGGBB` strings (normalised to upper case) and a fixed animation enum.
 * That matters because the palette is written into the gift's theme and used in
 * inline styles — anything else would be a styling injection.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () =>
  jsonOk({
    feature: aiFeatureDescriptors().find((feature) => feature.key === 'vibe'),
    animations: ['soft-float', 'aurora', 'confetti', 'none'],
  }),
);

export const POST = route(async (context) => {
  const input = await readBody(context.request, vibeRequest, 8 * 1024);

  return runAiRoute(context, {
    flag: 'ai_gift_finder',
    bucket: 'vibe',
    allowGuest: false,
    run: (ctx) => generateVibe({ description: input.description }, ctx),
  });
});