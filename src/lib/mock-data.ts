/**
 * Mock data layer.
 *
 * This module is the single source of fallback content used across the public
 * pages when the database is unreachable (or during first run). The data is
 * deliberately realistic — no "lorem ipsum" placeholders — so the product can be
 * experienced end-to-end before any seeding step.
 *
 * When a database IS available, the real data should always win. These shapes
 * are kept compatible with the DB row types so the switch is a one-line change.
 */

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  gradient: string;
  count: number;
}

export interface MockGift {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  /** Optional: when absent the card renders generated SVG artwork instead. */
  image_url?: string;
  category: string;
  match_percentage?: number;
  is_favorite?: boolean;
  reason?: string;
  type: 'رقمية' | 'تفاعلية' | 'رسالة' | 'صورة' | 'قصة' | 'فيديو';
  /** Digital gift format id — see GIFT_FORMATS in src/lib/brand.ts. */
  format?: string;
  /** Mood tag used by the /gifts mood filter. */
  mood?: 'romantic' | 'funny' | 'emotional' | 'cute' | 'elegant';
  /** Budget tier used by the /gifts price filter. */
  budget?: 'small' | 'medium' | 'premium';
  recipient_name?: string;
  occasion?: string;
  author_name?: string;
  published_at?: string;
  views?: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  /** Optional: when absent an initial-based avatar is rendered. */
  avatar?: string;
  content: string;
  rating: number;
}

/**
 * The canonical category list.
 *
 * `slug` is what the API and the filters use; `gradient` is kept for backwards
 * compatibility with anything still reading it, but new UI should use
 * `themeForCategory()` from src/lib/brand.ts instead.
 */
export const CATEGORIES: MockCategory[] = [
  {
    id: 'birthday',
    name: 'عيد ميلاد',
    slug: 'birthday',
    description: 'كونفيتي وبالونات وكارت بيفتح لوحده',
    emoji: '🎂',
    gradient: 'from-[#FF9A8B] to-[#FF6B5E]',
    count: 864,
  },
  {
    id: 'love',
    name: 'حب',
    slug: 'love',
    description: 'رسالة بتتفتح بهدوء وجواها كل اللي مش بتقوله',
    emoji: '❤️',
    gradient: 'from-[#FF7BA0] to-[#E8547D]',
    count: 523,
  },
  {
    id: 'anniversary',
    name: 'ذكرى سنوية',
    slug: 'anniversary',
    description: 'خط زمني لكل سنة عدت وانتو مع بعض',
    emoji: '💍',
    gradient: 'from-[#C4A6F5] to-[#7C5FD3]',
    count: 412,
  },
  {
    id: 'graduation',
    name: 'تخرج',
    slug: 'graduation',
    description: 'احتفال بالمشوار كله من أوله لآخره',
    emoji: '🎓',
    gradient: 'from-[#8FC9E8] to-[#5A9BD3]',
    count: 256,
  },
  {
    id: 'friendship',
    name: 'صداقة',
    slug: 'friendship',
    description: 'مواقفكم المشتركة والضحك اللي محدش فهمه غيركم',
    emoji: '🤝',
    gradient: 'from-[#FFC98B] to-[#E8A44D]',
    count: 398,
  },
  {
    id: 'thank-you',
    name: 'شكر',
    slug: 'thank-you',
    description: 'كلمة تقدير لشخص يستاهل أكتر من كده',
    emoji: '🙏',
    gradient: 'from-[#9FD8B4] to-[#5FB88A]',
    count: 187,
  },
  {
    id: 'just-because',
    name: 'بدون مناسبة',
    slug: 'just-because',
    description: 'أحسن هدايا هي اللي من غير سبب',
    emoji: '🌸',
    gradient: 'from-[#B8A4F0] to-[#E8547D]',
    count: 634,
  },
];

/**
 * Mood + budget taxonomies for the discovery filters.
 * Defined here so the filters, the seed data and the AI assistant all agree.
 */
export const MOODS = [
  { id: 'romantic', label: 'رومانسي', emoji: '🌹' },
  { id: 'emotional', label: 'مؤثر', emoji: '🥹' },
  { id: 'funny', label: 'مضحك', emoji: '😂' },
  { id: 'cute', label: 'لطيف', emoji: '🧸' },
  { id: 'elegant', label: 'أنيق', emoji: '✨' },
] as const;

export const BUDGETS = [
  { id: 'small', label: 'بسيط', hint: 'مجاني — رسالة أو كارت' },
  { id: 'medium', label: 'متوسط', hint: 'تجربة كاملة بأقسام' },
  { id: 'premium', label: 'مميز', hint: 'تجربة مخصصة بالكامل' },
] as const;

export const OCCASIONS = [
  { id: 'birthday', label: 'عيد ميلاد', emoji: '🎂' },
  { id: 'anniversary', label: 'ذكرى سنوية', emoji: '💍' },
  { id: 'graduation', label: 'تخرج', emoji: '🎓' },
  { id: 'thank-you', label: 'شكر', emoji: '🙏' },
  { id: 'valentines', label: 'عيد الحب', emoji: '💘' },
  { id: 'just-because', label: 'من غير مناسبة', emoji: '🌸' },
] as const;

export const RELATIONSHIPS = [
  { id: 'friend', label: 'صديق', emoji: '🤝' },
  { id: 'partner', label: 'شريك', emoji: '💞' },
  { id: 'parent', label: 'والد/والدة', emoji: '👨‍👩‍👧' },
  { id: 'sibling', label: 'أخ/أخت', emoji: '🧑‍🤝‍🧑' },
  { id: 'colleague', label: 'زميل عمل', emoji: '💼' },
] as const;

export const FEATURED_GIFTS: MockGift[] = [
  {
    id: 'gift-1',
    title: 'كل سنة وأنت أجمل 💕',
    slug: 'kull-sana-w-int-ajmall',
    description: 'مفاجأة عيد ميلاد تفاعلية — الصندوق بيهتز، وبعدين يفتح وكونفيتي يطلع.',
    price: 0,
    category: 'birthday',
    match_percentage: 96,
    is_favorite: true,
    type: 'تفاعلية',
    format: 'birthday-surprise',
    mood: 'cute',
    budget: 'medium',
    recipient_name: 'سارة',
    occasion: 'عيد ميلاد',
    author_name: 'مريم ع.',
    published_at: '2026-09-18T10:00:00.000Z',
    views: 1284,
  },
  {
    id: 'gift-2',
    title: 'رسالة حب من القلب ❤️',
    slug: 'rasala-hob-men-alghalb',
    description: 'رسالة بتتفتح بهدوء زي ورقة حقيقية، بخط أنيق وموسيقى خفيفة.',
    price: 0,
    category: 'love',
    match_percentage: 92,
    type: 'رسالة',
    format: 'love-letter',
    mood: 'romantic',
    budget: 'small',
    recipient_name: 'محمد',
    occasion: 'ذكرى',
    author_name: 'نور ح.',
    published_at: '2026-09-16T10:00:00.000Z',
    views: 963,
  },
  {
    id: 'gift-3',
    title: 'ألبوم ذكريات مرتب',
    slug: 'album-dhikrayat-murtab',
    description: 'خط زمني بيمشي بالعرض، كل كارت فيه صورة وموقف وتاريخ.',
    price: 0,
    category: 'anniversary',
    match_percentage: 88,
    type: 'صورة',
    format: 'memory-timeline',
    mood: 'emotional',
    budget: 'medium',
    recipient_name: 'ليلى',
    occasion: 'ذكرى سنوية',
    author_name: 'يوسف ر.',
    published_at: '2026-09-14T10:00:00.000Z',
    views: 741,
  },
  {
    id: 'gift-4',
    title: 'عداد للمناسبة الجاية ⏳',
    slug: 'adad-lilmanasib-laja',
    description: 'مظروف فيه عدّاد تنازلي للمناسبة الجاية، ومعاه أمنية مكتوبة منك.',
    price: 0,
    category: 'graduation',
    match_percentage: 84,
    type: 'تفاعلية',
    format: 'envelope',
    mood: 'elegant',
    budget: 'small',
    recipient_name: 'أحمد',
    occasion: 'تخرج',
    author_name: 'هدى م.',
    published_at: '2026-09-11T10:00:00.000Z',
    views: 512,
  },
  {
    id: 'gift-5',
    title: 'شهادة تقدير للمبدع 🏆',
    slug: 'shahada-taqdir-lilmubdig',
    description: 'كارت تقدير بشكل أنيق، فيه لقب مؤثر وسبب إنه يستاهل.',
    price: 0,
    category: 'thank-you',
    match_percentage: 91,
    type: 'قصة',
    format: 'quote-card',
    mood: 'elegant',
    budget: 'small',
    recipient_name: 'منى',
    occasion: 'تقدير',
    author_name: 'كريم س.',
    published_at: '2026-09-09T10:00:00.000Z',
    views: 688,
  },
  {
    id: 'gift-6',
    title: 'حكاية صداقة 🧑‍🤝‍🧑',
    slug: 'hikaya-sadaqa',
    description: 'مواقفكم المشتركة، الذكريات الحلوة، ورسالة صداقة صادقة.',
    price: 0,
    category: 'friendship',
    match_percentage: 78,
    type: 'تفاعلية',
    format: 'mini-game',
    mood: 'funny',
    budget: 'medium',
    recipient_name: 'يوسف',
    occasion: 'ذكرى صداقة',
    author_name: 'سلمى ف.',
    published_at: '2026-09-06T10:00:00.000Z',
    views: 455,
  },
];

export const ALL_GIFTS: MockGift[] = [
  ...FEATURED_GIFTS,
  {
    id: 'gift-7',
    title: 'مفاجأة عيد ميلاد تفاعلية 🎉',
    slug: 'mafaja-eid-milad',
    description: 'تورتة بتظهر بالتدريج، بالونات، وكونفيتي وقت الفتح.',
    price: 0,
    category: 'birthday',
    match_percentage: 73,
    type: 'تفاعلية',
    format: 'celebration-page',
    mood: 'cute',
    budget: 'medium',
    recipient_name: 'كريم',
    occasion: 'عيد ميلاد',
    author_name: 'دينا ب.',
    published_at: '2026-09-04T10:00:00.000Z',
    views: 392,
  },
  {
    id: 'gift-8',
    title: 'كارت عيد ميلاد أنيق 🎂',
    slug: 'kart-3id-mayyad',
    description: 'كارت معايدة متحرك، بسيط وأنيق، مع رسالة قصيرة وأمنية من القلب.',
    price: 0,
    category: 'birthday',
    match_percentage: 69,
    type: 'رقمية',
    format: 'greeting',
    mood: 'cute',
    budget: 'small',
    recipient_name: 'نور',
    occasion: 'عيد ميلاد',
    author_name: 'أمينة ط.',
    published_at: '2026-09-02T10:00:00.000Z',
    views: 311,
  },
  {
    id: 'gift-9',
    title: 'لأمي… كل حاجة ❤️',
    slug: 'leem-koll-haga',
    description: 'رسالة امتنان لأمي مع ذكريات الطفولة ودعاء من القلب.',
    price: 0,
    category: 'thank-you',
    match_percentage: 95,
    type: 'رسالة',
    format: 'love-letter',
    mood: 'emotional',
    budget: 'small',
    recipient_name: 'أمي',
    occasion: 'عيد الأم',
    author_name: 'عمر خ.',
    published_at: '2026-08-30T10:00:00.000Z',
    views: 1042,
  },
  {
    id: 'gift-10',
    title: 'لأبويا… شكرًا لكل حاجة 👨',
    slug: 'laboua-shokr-lkoll',
    description: 'كلمة تقدير لأبويا، وذكريات الدروس اللي علمني إياها.',
    price: 0,
    category: 'thank-you',
    match_percentage: 87,
    type: 'رسالة',
    format: 'envelope',
    mood: 'emotional',
    budget: 'small',
    recipient_name: 'أبويا',
    occasion: 'شكر',
    author_name: 'ريم ن.',
    published_at: '2026-08-27T10:00:00.000Z',
    views: 578,
  },
  {
    id: 'gift-11',
    title: 'مبروك التخرج 🎓',
    slug: 'mabrouk-al-takharrog',
    description: 'احتفال بالتخرج مع مسيرتك الدراسية كلها في خط زمني.',
    price: 0,
    category: 'graduation',
    match_percentage: 82,
    type: 'قصة',
    format: 'photo-story',
    mood: 'elegant',
    budget: 'medium',
    recipient_name: 'منى',
    occasion: 'تخرج',
    author_name: 'طارق أ.',
    published_at: '2026-08-24T10:00:00.000Z',
    views: 429,
  },
  {
    id: 'gift-12',
    title: 'إفشات على الصاحب 😂',
    slug: 'efshat-ala-s-sahab',
    description: 'لعبة صغيرة على صاحبك — لازم يجاوب صح قبل ما يوصل للرسالة.',
    price: 0,
    category: 'friendship',
    match_percentage: 76,
    type: 'تفاعلية',
    format: 'mini-game',
    mood: 'funny',
    budget: 'small',
    recipient_name: 'أحمد',
    occasion: 'نكتة',
    author_name: 'خالد و.',
    published_at: '2026-08-21T10:00:00.000Z',
    views: 366,
  },
  {
    id: 'gift-13',
    title: 'أغنيتنا 💿',
    slug: 'oghnetna',
    description: 'كارت موسيقى فيه الأغنية اللي بتفكرك بحد، وكلمة صغيرة تحتها.',
    price: 0,
    category: 'love',
    match_percentage: 90,
    type: 'رقمية',
    format: 'music-card',
    mood: 'romantic',
    budget: 'small',
    recipient_name: 'حبيبي',
    occasion: 'عيد الحب',
    author_name: 'سارة م.',
    published_at: '2026-08-18T10:00:00.000Z',
    views: 812,
  },
  {
    id: 'gift-14',
    title: 'صندوق مفاجآت افتراضي 🎁',
    slug: 'sunduq-mafajaat',
    description: 'صندوق هدايا افتراضي بيهتز ويطلع منه كونفيتي، وجواه ٣ حاجات صغيرة.',
    price: 0,
    category: 'just-because',
    match_percentage: 85,
    type: 'تفاعلية',
    format: 'gift-box',
    mood: 'cute',
    budget: 'premium',
    recipient_name: 'مريم',
    occasion: 'من غير مناسبة',
    author_name: 'بسمة ل.',
    published_at: '2026-08-15T10:00:00.000Z',
    views: 634,
  },
  {
    id: 'gift-15',
    title: 'كلمة واحدة تكفي 💬',
    slug: 'kalema-wahda-tekfi',
    description: 'كارت فيه جملة واحدة قوية، بتفضل في الدماغ اليوم كله.',
    price: 0,
    category: 'just-because',
    match_percentage: 71,
    type: 'رقمية',
    format: 'quote-card',
    mood: 'elegant',
    budget: 'small',
    recipient_name: 'صاحبي',
    occasion: 'من غير مناسبة',
    author_name: 'مالك ج.',
    published_at: '2026-08-12T10:00:00.000Z',
    views: 289,
  },
  {
    id: 'gift-16',
    title: 'سنة أولى مع بعض 🥂',
    slug: 'sana-oula-maa-baad',
    description: 'خط زمني لكل شهر عدى وانتو مع بعض، مع كلمة في آخر كل شهر.',
    price: 0,
    category: 'anniversary',
    match_percentage: 94,
    type: 'قصة',
    format: 'memory-timeline',
    mood: 'romantic',
    budget: 'premium',
    recipient_name: 'أحمد',
    occasion: 'ذكرى سنوية',
    author_name: 'جنى ع.',
    published_at: '2026-08-09T10:00:00.000Z',
    views: 903,
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'سارة محمود',
    role: 'مهندسة برمجيات',
    content:
      'ما كنتش عارفة أعمل إيه لحبيبي. الهدية خلتني أبني تجربة كاملة — من أول لقاء لحد المفاجأة الأخيرة. دخل يبكي من الضحك!',
    rating: 5,
  },
  {
    id: 't-2',
    name: 'أحمد الشريف',
    role: 'أخصائي تسويق',
    content:
      'أحسن من أي منصة هدايا جربتها. كل جزء فيه تفاصيل شخصية لدرجة إنه حس إنها معمولة له هو بالذات.',
    rating: 5,
  },
  {
    id: 't-3',
    name: 'منى عبد الله',
    role: 'معلمة',
    content:
      'استخدمتها عشان هدية لأمي في عيد الأم. النظام اختار كلمات ما كنتش هعرف أقولها، بس كانت صح مية في المية.',
    rating: 5,
  },
  {
    id: 't-4',
    name: 'يوسف حمدان',
    role: 'مصمم جرافيك',
    content:
      'مكتشف الهدايا وصلني لـ ٥ أفكار واقعية في دقيقة. وفّر عليّ وقت التفكير الطويل، والتصميم نفسه جميل.',
    rating: 4,
  },
];

export const AI_FEATURES = [
  {
    title: 'مكتشف الهدايا بالذكاء',
    description: 'قول له عن الشخص والمناسبة، والذكاء الاصطناعي يقترح ٥ هدايا مختلفة تمامًا.',
    icon: '🎁' as const,
    href: '/ai-gift',
    theme: 'coral',
  },
  {
    title: 'مولّد الرسائل',
    description: 'محرر ذكاء اصطناعي يكتب لك رسالة بالنبرة والطول اللي أنت تحبه.',
    icon: '💌' as const,
    href: '/ai-message',
    theme: 'rose',
  },
  {
    title: 'تجربة هدية تفاعلية',
    description: 'حوّل الوصف لتجربة سردية كاملة — مقدمة، ذكريات، رسالة، ومفاجأة أخيرة.',
    icon: '✨' as const,
    href: '/create-gift',
    theme: 'lavender',
  },
  {
    title: 'مولّد القصص',
    description: 'كل الحكايا اللي ما كنتش هتكتبها. صِفّ الموقف بكلمة واحدة وستحصل على قصة كاملة.',
    icon: '📖' as const,
    href: '/ai-message',
    theme: 'gold',
  },
  {
    title: 'مصمم صندوق الهدايا بالذكاء',
    description: 'صِف الإحساس، والذكاء يصمم لك صندوق هدية كامل — الشكل، الألوان، الشريط، والرسالة جواه.',
    icon: '🎁' as const,
    href: '/create',
    theme: 'coral',
  },
  {
    title: 'مصمم الهدية الغامضة',
    description: 'هدية بتوصل من غير ما تقول إيه هي. تلميحات، ألغاز، ومفاجأة في الآخر بتتفتح خطوة خطوة.',
    icon: '🕵️' as const,
    href: '/create',
    theme: 'rose',
  },
  {
    title: 'باني عالم الهدية',
    description: 'حوّل هديتك لعالم صغير — مشاهد، ذكريات، وموسيقى، والطرف التاني يمشي جواه خطوة خطوة.',
    icon: '🌌' as const,
    href: '/create',
    theme: 'lavender',
  },
  {
    title: 'مصنع الهدايا بالذكاء',
    description: 'حدّد المناسبة والمزاج، والمصنع يطلع لك مجموعة هدايا كاملة جاهزة تختار منها وتبعتها.',
    icon: '🏭' as const,
    href: '/create',
    theme: 'gold',
  },
];

/**
 * The three-step explainer on the homepage.
 * Kept next to the other marketing copy so wording stays consistent.
 */
export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'اختار',
    description: 'اختار شكل الهدية — مظروف، خط زمني، صندوق مفاجآت، أو لعبة صغيرة.',
    emoji: '🎯',
  },
  {
    step: '02',
    title: 'خصّص',
    description: 'اكتب رسالتك، ضيف ذكرياتك، واختار الألوان والنبرة. الذكاء يساعدك لو محتاج.',
    emoji: '🎨',
  },
  {
    step: '03',
    title: 'ابعت',
    description: 'شارك الرابط في ثانية. الطرف التاني يفتحه من غير ما يحتاج حساب.',
    emoji: '🚀',
  },
] as const;

/** Feature grid for the "Why Hadiya" section. */
export const WHY_HADIYA = [
  {
    title: 'تخصيص بالذكاء الاصطناعي',
    description: 'اقتراحات مبنية على الشخص نفسه، مش على قوائم جاهزة.',
    emoji: '✨',
  },
  {
    title: 'هدايا رقمية مختلفة',
    description: '١١ شكل مختلف — من كارت بسيط لتجربة سردية كاملة.',
    emoji: '🎁',
  },
  {
    title: 'رسائل شخصية',
    description: 'مولّد رسائل بيكتب بنبرتك، مش بنبرة روبوت.',
    emoji: '💌',
  },
  {
    title: 'تسليم فوري',
    description: 'مفيش شحن ومفيش انتظار. الرابط بيوصل في نفس الثانية.',
    emoji: '⚡',
  },
  {
    title: 'تجارب جميلة',
    description: 'أنيميشن مدروس ومش مبالغ فيه، بيفضل في الذاكرة.',
    emoji: '🎨',
  },
  {
    title: 'مشاركة سهلة',
    description: 'رابط واحد يفتح على أي جهاز، من غير تحميل أي تطبيق.',
    emoji: '🔗',
  },
] as const;

export function getGiftsByCategory(category: string): MockGift[] {
  return ALL_GIFTS.filter((gift) => gift.category === category);
}

export function getGiftBySlug(slug: string): MockGift | undefined {
  return ALL_GIFTS.find((gift) => gift.slug === slug);
}
