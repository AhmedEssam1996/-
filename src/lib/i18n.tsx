'use client';

import * as React from 'react';

/**
 * Minimal locale layer.
 *
 * The product is Arabic-first, so Arabic is the default and the source of
 * truth. English exists as a real second locale (including LTR layout), which
 * is what the navbar language switcher toggles.
 *
 * Deliberately *not* a full i18n framework: the copy that changes per locale is
 * UI chrome (navigation, buttons, section headings). User-generated content —
 * gift titles, messages, AI output — is never translated. A dictionary of the
 * chrome is all that is required, and a dependency would be overkill.
 *
 * The choice is persisted in `localStorage` and mirrored onto
 * `<html lang dir>`, so RTL/LTR is correct on the very first paint after a
 * reload.
 */

export type Locale = 'ar' | 'en';

export const LOCALES: Array<{ id: Locale; label: string; short: string }> = [
  { id: 'ar', label: 'العربية', short: 'ع' },
  { id: 'en', label: 'English', short: 'EN' },
];

const STORAGE_KEY = 'hadiya.locale';

const DICTIONARY = {
  // Navigation
  'nav.home': { ar: 'الرئيسية', en: 'Home' },
  'nav.explore': { ar: 'استكشف الهدايا', en: 'Explore Gifts' },
  'nav.create': { ar: 'اصنع هدية', en: 'Create Gift' },
  'nav.assistant': { ar: 'مساعد الهدايا الذكي', en: 'AI Gift Assistant' },
  'nav.myGifts': { ar: 'هداياي', en: 'My Gifts' },
  'nav.search': { ar: 'ابحث', en: 'Search' },
  'nav.favorites': { ar: 'المفضلة', en: 'Favorites' },
  'nav.profile': { ar: 'حسابي', en: 'Profile' },
  'nav.login': { ar: 'تسجيل دخول', en: 'Log in' },
  'nav.register': { ar: 'ابدأ مجانًا', en: 'Start free' },
  'nav.dashboard': { ar: 'لوحتي', en: 'Dashboard' },
  'nav.admin': { ar: 'لوحة الإدارة', en: 'Admin' },
  'nav.logout': { ar: 'خروج', en: 'Log out' },
  'nav.menu': { ar: 'القائمة', en: 'Menu' },
  'nav.close': { ar: 'إغلاق', en: 'Close' },
  'nav.language': { ar: 'اللغة', en: 'Language' },

  // Hero
  'hero.eyebrow': { ar: 'هدايا رقمية بالذكاء الاصطناعي', en: 'AI-powered digital gifts' },
  'hero.brand': { ar: 'Hadiya', en: 'Hadiya' },
  'hero.title1': { ar: 'خلّي حد', en: 'Make someone' },
  'hero.title2': { ar: 'يبتسم', en: 'smile.' },
  'hero.subtitle': {
    ar: 'Hadiya بتخليك تعمل وتبعت هدايا رقمية جميلة — رسالة، ذكرى، أو تجربة كاملة بتتفتح برابط واحد.',
    en: 'Hadiya lets you create and send beautiful digital gifts — a message, a memory, or a whole experience that opens from one link.',
  },
  'hero.cta.primary': { ar: 'اصنع هدية', en: 'Create a Gift' },
  'hero.cta.secondary': { ar: 'استكشف الهدايا', en: 'Explore Gifts' },
  'hero.openGift': { ar: 'افتح الهدية', en: 'Open the Gift' },
  'hero.openGiftHint': { ar: 'دوس على الصندوق', en: 'Tap the box' },
  'hero.createYours': { ar: 'اعمل واحدة زيّها', en: 'Create Yours' },
  'hero.trust': { ar: 'من غير تسجيل · من غير تحميل', en: 'No signup · no download' },

  // AI assistant
  'ai.eyebrow': { ar: 'مساعد الهدايا الذكي', en: 'AI Gift Assistant' },
  'ai.title': { ar: 'مش عارف تهدي إيه؟', en: 'Not sure what to give?' },
  'ai.subtitle': {
    ar: 'قول لهدية عن الشخص اللي بتفكر فيه، وإحنا نساعدك تعمل حاجة ليها معنى.',
    en: "Tell Hadiya who you're gifting and we'll help you create something meaningful.",
  },
  'ai.relationship': { ar: 'علاقتك بيه', en: 'Relationship' },
  'ai.occasion': { ar: 'المناسبة', en: 'Occasion' },
  'ai.budget': { ar: 'الميزانية', en: 'Budget' },
  'ai.mood': { ar: 'المزاج', en: 'Mood' },
  'ai.interests': { ar: 'اهتماماته', en: 'Their interests' },
  'ai.interestsPlaceholder': {
    ar: 'مثال: بيحب التصوير والسفر',
    en: 'e.g. loves photography and travel',
  },
  'ai.submit': { ar: 'اعملي هدية', en: 'Find My Gift' },
  'ai.thinking': { ar: 'بفكر في حاجة مناسبة…', en: 'Thinking of something fitting…' },
  'ai.results': { ar: 'اقتراحات مخصصة', en: 'Personalized ideas' },
  'ai.retry': { ar: 'جرّب تاني', en: 'Try again' },
  'ai.error': { ar: 'مش قادر أوصل للمساعد دلوقتي.', en: 'Could not reach the assistant right now.' },
  'ai.empty': {
    ar: 'اختار العلاقة والمناسبة وهنجهّز لك أفكار.',
    en: 'Pick a relationship and occasion and we will prepare ideas.',
  },

  // Discovery
  'explore.title': { ar: 'لاقي هدية شبهه', en: 'Find a gift that feels like them' },
  'explore.subtitle': {
    ar: 'اتفرج على الهدايا، فلتر حسب المناسبة والمزاج، واحفظ اللي يعجبك.',
    en: 'Browse gifts, filter by occasion and mood, and save your favourites.',
  },
  'explore.search': { ar: 'ابحث باسم الهدية…', en: 'Search gifts…' },
  'explore.category': { ar: 'الفئة', en: 'Category' },
  'explore.occasion': { ar: 'المناسبة', en: 'Occasion' },
  'explore.mood': { ar: 'المزاج', en: 'Mood' },
  'explore.budget': { ar: 'الميزانية', en: 'Budget' },
  'explore.sort': { ar: 'ترتيب', en: 'Sort' },
  'explore.sort.popular': { ar: 'الأكثر شعبية', en: 'Most popular' },
  'explore.sort.newest': { ar: 'الأحدث', en: 'Newest' },
  'explore.sort.match': { ar: 'أعلى توافق', en: 'Best match' },
  'explore.sort.az': { ar: 'أبجديًا', en: 'A–Z' },
  'explore.all': { ar: 'الكل', en: 'All' },
  'explore.results': { ar: 'هدية', en: 'gifts' },
  'explore.clear': { ar: 'امسح الفلاتر', en: 'Clear filters' },
  'explore.filters': { ar: 'الفلاتر', en: 'Filters' },
  'explore.empty.title': { ar: 'مفيش نتايج للفلاتر دي', en: 'Nothing matches those filters' },
  'explore.empty.body': {
    ar: 'جرّب تشيل فلتر أو اتنين، أو خلّي الذكاء يقترح عليك.',
    en: 'Try removing a filter, or let the AI suggest something.',
  },
  'explore.favoritesOnly': { ar: 'المفضلة بس', en: 'Favourites only' },

  // Gift card actions
  'gift.preview': { ar: 'معاينة', en: 'Preview' },
  'gift.open': { ar: 'افتح', en: 'Open' },
  'gift.favorite': { ar: 'ضيف للمفضلة', en: 'Add to favourites' },
  'gift.unfavorite': { ar: 'شيل من المفضلة', en: 'Remove from favourites' },
  'gift.share': { ar: 'شارك', en: 'Share' },
  'gift.copied': { ar: 'اتنسخ الرابط', en: 'Link copied' },
  'gift.for': { ar: 'لـ', en: 'for' },
  'gift.by': { ar: 'من', en: 'by' },

  // Common
  'common.viewAll': { ar: 'شوف الكل', en: 'View all' },
  'common.next': { ar: 'التالي', en: 'Next' },
  'common.back': { ar: 'رجوع', en: 'Back' },
  'common.skip': { ar: 'تخطّى', en: 'Skip' },
  'common.loading': { ar: 'لحظة…', en: 'Loading…' },
  'common.close': { ar: 'إغلاق', en: 'Close' },
} as const;

export type TranslationKey = keyof typeof DICTIONARY;

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  /** Translate a chrome key. Falls back to Arabic, then to the key itself. */
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>('ar');

  // Read the stored choice once on mount. Doing it in an effect (rather than
  // during render) keeps the server HTML and the first client render identical,
  // which is what avoids a hydration mismatch on `lang`/`dir`.
  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') {
      setLocaleState(stored);
    }
  }, []);

  // Mirror onto <html> so CSS logical properties and screen readers agree.
  React.useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled: the switch still works for this
      // session, it just will not be remembered.
    }
  }, []);

  const value = React.useMemo<LocaleContextValue>(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    return {
      locale,
      dir,
      setLocale,
      toggleLocale: () => setLocale(locale === 'ar' ? 'en' : 'ar'),
      t: (key) => {
        const entry = DICTIONARY[key];
        if (!entry) return key;
        return entry[locale] ?? entry.ar;
      },
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Read the locale context.
 *
 * Returns a safe Arabic/RTL default when used outside a provider so a component
 * can never crash just because it was rendered in isolation (e.g. a test or a
 * storybook-style preview).
 */
export function useLocale(): LocaleContextValue {
  const context = React.useContext(LocaleContext);
  if (context) return context;

  return {
    locale: 'ar',
    dir: 'rtl',
    setLocale: () => {},
    toggleLocale: () => {},
    t: (key) => DICTIONARY[key]?.ar ?? key,
  };
}