import { runAiRoute } from '@/lib/ai/route';
import { generateMessage } from '@/lib/ai/service';
import { aiFeatureDescriptors } from '@/lib/api/features';
import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { messageRequest } from '@/lib/api/schemas';

/**
 * POST /api/ai/message
 *
 * The message generator. Open to signed-out visitors (it is the second step of
 * the funnel), gated by the `ai_message_generator` flag and the shared per-
 * identity rate limit.
 *
 * `previous_message` is accepted so "make it better" is a first-class flow; it is
 * length-capped and fenced as data in the prompt, never treated as instructions.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () =>
  jsonOk({
    feature: aiFeatureDescriptors().find((feature) => feature.key === 'message'),
    tones: ['romantic', 'emotional', 'funny', 'light', 'formal', 'casual'],
    lengths: ['short', 'medium', 'long'],
  }),
);

export const POST = route(async (context) => {
  const input = await readBody(context.request, messageRequest, 16 * 1024);

  return runAiRoute(context, {
    flag: 'ai_message_generator',
    bucket: 'message',
    allowGuest: true,
    eventMetadata: { tone: input.tone ?? 'emotional', length: input.length ?? 'medium' },
    run: (ctx) =>
      generateMessage(
        {
          relationship: input.relationship,
          tone: input.tone,
          length: input.length,
          recipientName: input.recipient_name,
          context: input.context,
          previousMessage: input.previous_message,
        },
        ctx,
      ),
  });
});