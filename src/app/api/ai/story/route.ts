import { runAiRoute } from '@/lib/ai/route';
import { generateStory } from '@/lib/ai/service';
import { aiFeatureDescriptors, AI_FEATURE_LIMITS } from '@/lib/api/features';
import { jsonOk, readBody, route } from '@/lib/api/route-helpers';
import { storyRequest } from '@/lib/api/schemas';

/**
 * POST /api/ai/story
 *
 * Short personal story from a topic the user writes. Gated by the
 * `ai_story_generator` flag so the story tool can be switched off independently
 * of the message tool.
 */

export const dynamic = 'force-dynamic';

export const GET = route(async () =>
  jsonOk({
    feature: aiFeatureDescriptors().find((feature) => feature.key === 'story'),
    limits: { topic: AI_FEATURE_LIMITS.storyTopic },
    lengths: ['short', 'medium', 'long'],
  }),
);

export const POST = route(async (context) => {
  const input = await readBody(context.request, storyRequest, 20 * 1024);

  return runAiRoute(context, {
    flag: 'ai_story_generator',
    bucket: 'story',
    allowGuest: false,
    eventMetadata: { tone: input.tone ?? 'emotional', length: input.length ?? 'medium' },
    run: (ctx) =>
      generateStory(
        {
          topic: input.topic,
          recipientName: input.recipient_name,
          tone: input.tone,
          length: input.length,
        },
        ctx,
      ),
  });
});