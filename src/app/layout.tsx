import type { Metadata, Viewport } from 'next';
import { Cairo, Fraunces, IBM_Plex_Sans_Arabic } from 'next/font/google';

import { LocaleProvider } from '@/lib/i18n';

import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-arabic',
  display: 'swap',
  preload: true,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

/**
 * The display face for large headlines.
 *
 * The reference uses a warm, high-contrast serif for the hero line — that is
 * what gives it the "elegant but playful" feel. Fraunces matches it closely and
 * still pairs acceptably with the Arabic stack for Latin text.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  style: ['normal'],
  variable: '--font-serif',
  display: 'swap',
});

const APP_NAME = 'هدية';
const APP_TAGLINE = 'هدايا رقمية بالذكاء الاصطناعي محدش هينساها';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'مش عارف تهدي إيه؟ خلّي الذكاء الاصطناعي يساعدك تعمل هدية شخصية، تفاعلية، ومحدش هينساها. رسائل، قصص، وألبومات ذكريات في رابط واحد تبعته لأي حد.',
  applicationName: APP_NAME,
  keywords: [
    'هدية',
    'هدايا رقمية',
    'هدية عيد ميلاد',
    'رسالة حب',
    'هدية بالذكاء الاصطناعي',
    'مفاجأة',
    'digital gift',
    'AI gift',
    'Hadiya',
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: ['en_US'],
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      'اعمل هدية شخصية بالذكاء الاصطناعي في دقايق: رسالة، قصة، أو تجربة تفاعلية كاملة — وابعت الرابط لأي حد من غير ما يحتاج حساب.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: 'هدايا رقمية شخصية بالذكاء الاصطناعي. اعملها في دقايق وابعت الرابط.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: '/',
    languages: {
      'ar-EG': '/',
      en: '/?lang=en',
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#0B0614',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${plexArabic.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        {/* Accessible skip link — the first tab stop on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:end-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--primary)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-[#0b0614]"
        >
          تخطَّ إلى المحتوى
        </a>
        {/* LocaleProvider owns <html lang/dir> so EN/AR + RTL/LTR are applied
            consistently, including after a reload. */}
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}