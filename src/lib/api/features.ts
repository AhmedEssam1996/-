import { AI_SCHEMAS } from '@/lib/ai/schemas';

export type AiFeatureKey = keyof typeof AI_SCHEMAS;

export const AI_FEATURES = Object.keys(AI_SCHEMAS) as AiFeatureKey[];

export interface AiFeatureDescriptor {
  key: AiFeatureKey;
  /** Arabic label used by the builder UI. */
  label: string;
  description: string;
  /** Route that generates this feature. */
  endpoint: string;
  /** Every field name the validated payload contains. */
  fields: string[];
}

const FEATURE_COPY: Record<AiFeatureKey, { label: string; description: string; endpoint: string }> = {
  gift_suggestions: {
    label: 'مكتشف الهدايا',
    description: 'اقتراحات هدايا مخصصة لشخص معيّن ومناسبة معيّنة.',
    endpoint: '/api/ai/gift-finder',
  },
  message: {
    label: 'مولّد الرسائل',
    description: 'رسالة شخصية بنبرة وطول يختارهما المستخدم، مع نسخ بديلة.',
    endpoint: '/api/ai/message',
  },
  gift_experience: {
    label: 'تجربة الهدية',
    description: 'تجربة سردية كاملة تتفتح سيكشن ورا سيكشن حتى الخاتمة.',
    endpoint: '/api/ai/gift-experience',
  },
  story: {
    label: 'مولّد القصص',
    description: 'قصة قصيرة بالعربي من موضوع يكتبه المستخدم.',
    endpoint: '/api/ai/story',
  },
  vibe: {
    label: 'مزاج الهدية',
    description: 'باليتة ألوان وأنيميشن مناسبين لمزاج الهدية.',
    endpoint: '/api/ai/vibe',
  },
};

function fieldNames(feature: AiFeatureKey): string[] {
  const schema = AI_SCHEMAS[feature];
  if (schema instanceof Object && 'shape' in schema) {
    const shape = (schema as unknown as { shape: Record<string, unknown> }).shape;
    return Object.keys(shape);
  }
  return [];
}

export function aiFeatureDescriptors(): AiFeatureDescriptor[] {
  return AI_FEATURES.map((key) => ({
    key,
    ...FEATURE_COPY[key],
    fields: fieldNames(key),
  }));
}

/** Longest edit distance the schemas allow, surfaced for input maxlength hints. */
export const AI_FEATURE_LIMITS = {
  giftFinderInterests: 400,
  giftFinderNotes: 600,
  messageContext: 600,
  experienceDescription: 1500,
  storyTopic: 1200,
  vibeDescription: 600,
} as const;

export const AI_STATUS_COPY = {
  dailyLimit: 'الحد اليومي لاستخدام الذكاء الاصطناعي',
  monthlyLimit: 'الحد الشهري لاستخدام الذكاء الاصطناعي',
} as const;
