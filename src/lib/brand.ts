/**
 * Hadiya brand assets.
 *
 * Everything the product needs to render a *real* visual is generated here as
 * SVG or CSS — no external image hosts, no broken `<img>` tags, no empty
 * containers. Gift artwork is deterministic per slug, so the same gift always
 * gets the same composition while different gifts look distinct.
 *
 * Kept as plain data + pure functions (no React) so it can be imported by both
 * Server and Client Components without pulling anything into the bundle twice.
 */

export interface GiftTheme {
  /** Stable identifier, also used as the `data-theme` attribute. */
  id: string;
  /** Arabic label shown in the picker. */
  label: string;
  /** Short English name, used in the wordmark/alt text. */
  labelEn: string;
  /** Two-stop gradient used for the card artwork background. */
  from: string;
  to: string;
  /** Accent used for ribbons, confetti and the small motif. */
  accent: string;
  /** Motif drawn on top of the gradient. */
  motif: 'gift' | 'heart' | 'cake' | 'ring' | 'cap' | 'hands' | 'flower' | 'envelope';
}

export const GIFT_THEMES: GiftTheme[] = [
  {
    id: 'birthday',
    label: 'عيد ميلاد',
    labelEn: 'Birthday',
    from: '#FFA552',
    to: '#FF5C8A',
    accent: '#FFD166',
    motif: 'cake',
  },
  {
    id: 'love',
    label: 'حب',
    labelEn: 'Love',
    from: '#FF7BB0',
    to: '#FF5C8A',
    accent: '#FFC4DD',
    motif: 'heart',
  },
  {
    id: 'anniversary',
    label: 'ذكرى سنوية',
    labelEn: 'Anniversary',
    from: '#C9B6FF',
    to: '#7C4DDB',
    accent: '#FFD166',
    motif: 'ring',
  },
  {
    id: 'graduation',
    label: 'تخرج',
    labelEn: 'Graduation',
    from: '#8FD0FF',
    to: '#5C7CFA',
    accent: '#FFD166',
    motif: 'cap',
  },
  {
    id: 'friendship',
    label: 'صداقة',
    labelEn: 'Friendship',
    from: '#FFD166',
    to: '#FFA552',
    accent: '#FFF3D1',
    motif: 'hands',
  },
  {
    id: 'thank-you',
    label: 'شكر',
    labelEn: 'Thank You',
    from: '#7BE8C4',
    to: '#3FB98C',
    accent: '#EAFBF4',
    motif: 'flower',
  },
  {
    id: 'just-because',
    label: 'بدون مناسبة',
    labelEn: 'Just Because',
    from: '#A97BFF',
    to: '#FF7BB0',
    accent: '#FFC4DD',
    motif: 'envelope',
  },
];

/** Emoji shown next to a category name. Kept in sync with GIFT_THEMES. */
export const CATEGORY_EMOJI: Record<string, string> = {
  birthday: '🎂',
  love: '❤️',
  romantic: '❤️',
  anniversary: '💍',
  graduation: '🎓',
  friendship: '🤝',
  friends: '🤝',
  'thank-you': '🙏',
  family: '👨‍👩‍👧',
  professional: '💼',
  funny: '😂',
  'just-because': '🌸',
};

export function categoryEmoji(category: string | null | undefined): string {
  if (!category) return '🎁';
  return CATEGORY_EMOJI[category] ?? '🎁';
}

/** Resolve a theme by category id, with a stable fallback. */
export function themeForCategory(category: string | null | undefined): GiftTheme {
  if (!category) return GIFT_THEMES[6];
  const direct = GIFT_THEMES.find((theme) => theme.id === category);
  if (direct) return direct;
  // Aliases from the older category slugs.
  if (category === 'romantic') return GIFT_THEMES[1];
  if (category === 'friends') return GIFT_THEMES[4];
  if (category === 'family') return GIFT_THEMES[5];
  if (category === 'professional') return GIFT_THEMES[5];
  if (category === 'funny') return GIFT_THEMES[0];
  return GIFT_THEMES[6];
}

/** Deterministic 32-bit hash so a slug always maps to the same artwork. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Rotate a theme's hue slightly so same-category gifts still differ. */
export function artworkVariant(seed: string): number {
  return hashString(seed) % 4;
}

/**
 * A CSS-only artwork background for a gift card / preview.
 *
 * Returns inline style properties rather than a class name because the
 * gradients are data-driven (they depend on the gift's category).
 */
export function giftArtworkStyle(
  category: string | null | undefined,
  seed: string,
): {
  backgroundImage: string;
  backgroundColor: string;
} {
  const theme = themeForCategory(category);
  const variant = artworkVariant(seed);
  // Each variant nudges the light source so a grid of cards never looks tiled.
  const origins = ['18% 22%', '82% 18%', '24% 84%', '78% 78%'];
  const origin = origins[variant];

  return {
    backgroundColor: theme.from,
    backgroundImage: [
      `radial-gradient(circle at ${origin}, ${theme.accent}66 0%, transparent 46%)`,
      `radial-gradient(circle at ${variant % 2 === 0 ? '80%' : '20%'} 90%, ${theme.to}cc 0%, transparent 52%)`,
      `linear-gradient(140deg, ${theme.from} 0%, ${theme.to} 100%)`,
    ].join(', '),
  };
}

/**
 * Digital gift *formats*. These are the concrete experiences a user can send —
 * an envelope, a memory timeline, a mini game — as opposed to a category
 * (birthday, love).
 */
export interface GiftFormat {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  emoji: string;
  /** How the detail page should present it. */
  presentation: 'envelope' | 'box' | 'letter' | 'timeline' | 'celebration' | 'music' | 'quote' | 'game';
}

export const GIFT_FORMATS: GiftFormat[] = [
  {
    id: 'envelope',
    label: 'مظروف تفاعلي',
    labelEn: 'Interactive envelope',
    description: 'مظروف مقفول يفتح لما يضغط عليه، وجواه رسالتك.',
    emoji: '✉️',
    presentation: 'envelope',
  },
  {
    id: 'love-letter',
    label: 'رسالة حب رقمية',
    labelEn: 'Digital love letter',
    description: 'ورقة بتتفتح بهدوء، بخط أنيق وموسيقى خفيفة.',
    emoji: '💌',
    presentation: 'letter',
  },
  {
    id: 'memory-timeline',
    label: 'خط زمني للذكريات',
    labelEn: 'Memory timeline',
    description: 'كروت بتتحرك أفقيًا، كل واحدة فيها ذكرى ومعاها تاريخ.',
    emoji: '📸',
    presentation: 'timeline',
  },
  {
    id: 'birthday-surprise',
    label: 'مفاجأة عيد ميلاد',
    labelEn: 'Birthday surprise',
    description: 'كونفيتي وبالونات وتورتة بتظهر واحدة.',
    emoji: '🎂',
    presentation: 'celebration',
  },
  {
    id: 'gift-box',
    label: 'صندوق هدايا افتراضي',
    labelEn: 'Virtual gift box',
    description: 'الصندوق بيهتز وبعدين يفتح وكونفيتي يطلع.',
    emoji: '🎁',
    presentation: 'box',
  },
  {
    id: 'photo-story',
    label: 'قصة مصوّرة',
    labelEn: 'Photo story',
    description: 'صورك بتتحول لحكاية متسلسلة.',
    emoji: '🖼️',
    presentation: 'timeline',
  },
  {
    id: 'music-card',
    label: 'كارت موسيقى',
    labelEn: 'Music card',
    description: 'أغنية + كلمة صغيرة تقول كل حاجة.',
    emoji: '🎵',
    presentation: 'music',
  },
  {
    id: 'quote-card',
    label: 'كارت كلمة',
    labelEn: 'Quote card',
    description: 'جملة واحدة قوية بتفضل في الدماغ.',
    emoji: '💬',
    presentation: 'quote',
  },
  {
    id: 'mini-game',
    label: 'لعبة صغيرة',
    labelEn: 'Mini game',
    description: 'سؤال أو تحدي صغير قبل ما يوصل للرسالة.',
    emoji: '🎮',
    presentation: 'game',
  },
  {
    id: 'celebration-page',
    label: 'صفحة احتفال',
    labelEn: 'Celebration page',
    description: 'صفحة كاملة بألوان وأنيميشن للاحتفال.',
    emoji: '🎉',
    presentation: 'celebration',
  },
  {
    id: 'greeting',
    label: 'كارت معايدة متحرك',
    labelEn: 'Animated greeting',
    description: 'كارت بأنيميشن ناعم ورسالة قصيرة.',
    emoji: '🌷',
    presentation: 'quote',
  },
];

export function formatById(id: string | null | undefined): GiftFormat | undefined {
  if (!id) return undefined;
  return GIFT_FORMATS.find((format) => format.id === id);
}