import { Heart, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/layout/logo';

/**
 * Site footer.
 *
 * Deliberately rendered on the deep-plum surface (`.dark` scope) so the page
 * ends on a warm, grounded note rather than trailing off in cream. This is the
 * one section where the dark tokens are used globally.
 */

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: 'المنتج',
    links: [
      { href: '/gifts', label: 'استكشف الهدايا' },
      { href: '/create', label: 'اصنع هدية' },
      { href: '/ai-gift', label: 'مساعد الهدايا الذكي' },
      { href: '/ai-message', label: 'مولّد الرسائل' },
    ],
  },
  {
    title: 'حسابك',
    links: [
      { href: '/my-gifts', label: 'هداياي' },
      { href: '/dashboard', label: 'لوحتي' },
      { href: '/login', label: 'تسجيل دخول' },
      { href: '/register', label: 'حساب جديد' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="dark relative mt-24 overflow-hidden bg-[var(--bg)] text-fg">
      {/* Warm glow accents — kept subtle so the footer stays calm. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 start-1/4 size-[34rem] rounded-full opacity-30 blur-[130px]"
        style={{ background: 'radial-gradient(circle, #FF7BB0 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 end-1/4 size-[30rem] rounded-full opacity-25 blur-[130px]"
        style={{ background: 'radial-gradient(circle, #A97BFF 0%, transparent 65%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(2,1fr)]">
          <div className="space-y-5">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
              Hadiya بتساعدك تعمل هدايا رقمية شخصية بالذكاء الاصطناعي — رسالة، ذكرى، أو تجربة
              تفاعلية كاملة تبعتها برابط واحد، من غير ما حد يحتاج يسجّل.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <a
                href="mailto:hello@hadiya.app"
                className="grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-fg-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/55 hover:text-[var(--primary)]"
                aria-label="راسلنا"
              >
                <Mail className="size-4" />
              </a>
              <Link
                href="/ai-gift"
                className="grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-fg-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/55 hover:text-[var(--primary)]"
                aria-label="مساعد الهدايا الذكي"
              >
                <Sparkles className="size-4" />
              </Link>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-bold tracking-[0.16em] text-fg-faint uppercase">
                {column.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-muted transition-colors duration-200 hover:text-[var(--primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-6 text-xs text-fg-faint sm:flex-row">
          <p>© {year} Hadiya. كل الحقوق محفوظة.</p>
          <p className="flex items-center gap-1.5">
            اتعمل بـ <Heart className="size-3.5 text-[var(--hd-pink)]" aria-hidden /> للمستخدم العربي
          </p>
        </div>
      </div>
    </footer>
  );
}
