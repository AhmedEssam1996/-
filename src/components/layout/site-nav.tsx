'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Heart, LogOut, Menu, Search, Sparkles, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { useLocale, LOCALES } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { signOut, useAuth, usePrefersReducedMotion } from '@/hooks';

export interface NavItem {
  href: string;
  /** Translation key from src/lib/i18n.tsx. */
  key: 'nav.home' | 'nav.explore' | 'nav.create' | 'nav.assistant' | 'nav.myGifts';
}

/**
 * Primary navigation.
 *
 * Order follows the product narrative: understand (Home) → browse (Explore) →
 * make (Create) → get help (Assistant) → manage (My Gifts).
 */
export const PUBLIC_NAV: NavItem[] = [
  { href: '/', key: 'nav.home' },
  { href: '/gifts', key: 'nav.explore' },
  { href: '/create', key: 'nav.create' },
  { href: '/ai-gift', key: 'nav.assistant' },
  { href: '/my-gifts', key: 'nav.myGifts' },
];

interface SessionInfo {
  name: string | null;
  isAdmin: boolean;
  avatar?: string | null;
}

export function SiteNav({ session: sessionProp }: { session?: SessionInfo | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const reduceMotion = usePrefersReducedMotion();
  const auth = useAuth();

  // Prefer the live auth state; fall back to whatever the server passed in.
  const session: SessionInfo | null =
    auth.user != null
      ? { name: auth.user.fullName ?? auth.user.email ?? null, isAdmin: auth.user.role === 'ADMIN', avatar: auth.user.avatarUrl }
      : (sessionProp ?? null);

  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [favorites, setFavorites] = React.useState(0);

  /* ---------------------------------------------------------------- scroll */
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ------------------------------------------------------- favourite count */
  React.useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem('hadiya.favorites');
        setFavorites(raw ? (JSON.parse(raw) as string[]).length : 0);
      } catch {
        setFavorites(0);
      }
    };
    read();
    window.addEventListener('hadiya:favorites', read);
    return () => window.removeEventListener('hadiya:favorites', read);
  }, []);

  /* ------------------------------------------------------------ route close */
  React.useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  /* ------------------------------------------------------- body scroll lock */
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* --------------------------------------------------------------- keyboard */
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearchOpen(false);
      }
      // Ctrl/Cmd+K is the conventional "jump to search" shortcut.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    setSearchOpen(false);
    router.push(trimmed ? `/gifts?q=${encodeURIComponent(trimmed)}` : '/gifts');
  };

  return (
    <>
      <motion.header
        initial={reduceMotion ? undefined : { y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled ? 'py-2' : 'py-3 sm:py-4',
        )}
      >
        <nav
          className={cn(
            'mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 transition-all duration-500 sm:px-5',
            scrolled &&
              'mx-3 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_78%,transparent)] shadow-soft backdrop-blur-xl sm:mx-5 lg:mx-auto lg:max-w-6xl',
          )}
          aria-label="Hadiya"
        >
          <div className="flex h-14 items-center sm:h-16">
            <Logo size="sm" />
          </div>

          {/* -------------------------------------------------- desktop links */}
          <ul className="hidden items-center gap-0.5 lg:flex">
            {PUBLIC_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-200',
                      active ? 'text-fg' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {/* Shared-layout pill: one element animates between links. */}
                    {active ? (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]/16 ring-1 ring-inset ring-[var(--primary)]/35"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    ) : null}
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ------------------------------------------------------ actions */}
          <div className="flex items-center gap-1.5">
            {/* Language switch */}
            <div
              className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--card)] p-0.5 sm:flex"
              role="group"
              aria-label={t('nav.language')}
            >
              {LOCALES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setLocale(entry.id)}
                  aria-pressed={locale === entry.id}
                  className={cn(
                    'relative rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-200',
                    locale === entry.id ? 'text-[#160726]' : 'text-fg-faint hover:text-fg',
                  )}
                >
                  {locale === entry.id ? (
                    <motion.span
                      layoutId="lang-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  ) : null}
                  {entry.short}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="grid size-10 place-items-center rounded-full text-fg-muted transition-colors hover:bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] hover:text-fg"
              aria-label={t('nav.search')}
            >
              <Search className="size-4.5" />
            </button>

            <Link
              href="/my-gifts?tab=favorites"
              className="relative hidden size-10 place-items-center rounded-full text-fg-muted transition-colors hover:bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] hover:text-fg sm:grid"
              aria-label={t('nav.favorites')}
            >
              <Heart className="size-4.5" />
              {favorites > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[#160726] tabular">
                  {favorites > 9 ? '9+' : favorites}
                </span>
              ) : null}
            </Link>

            {session ? (
              <div className="hidden items-center gap-2 lg:flex">
                {session.isAdmin ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">{t('nav.admin')}</Link>
                  </Button>
                ) : null}
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard">{t('nav.dashboard')}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/create">
                    <Sparkles />
                    {t('nav.create')}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/create">
                    <Sparkles />
                    {t('nav.create')}
                  </Link>
                </Button>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-fg transition-colors hover:border-[var(--border-strong)] lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t('nav.close') : t('nav.menu')}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* ============================================================ search */}
      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-start justify-center bg-[color-mix(in_oklab,var(--hd-plum-deep)_55%,transparent)] px-4 pt-24 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.form
              initial={reduceMotion ? undefined : { y: -16, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              onSubmit={submitSearch}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-premium"
              role="search"
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <Search className="size-5 shrink-0 text-fg-faint" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('explore.search')}
                  aria-label={t('nav.search')}
                  className="w-full bg-transparent text-base text-fg outline-none placeholder:text-fg-faint"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-fg-faint transition-colors hover:bg-[color-mix(in_oklab,var(--fg)_8%,transparent)] hover:text-fg"
                  aria-label={t('common.close')}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="border-t border-[var(--border)] bg-[var(--card-soft)] px-5 py-3 text-xs text-fg-faint">
                {t('explore.subtitle')}
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ====================================================== mobile sheet */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-[color-mix(in_oklab,var(--hd-plum-deep)_60%,transparent)] backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              key="nav-sheet"
              id="mobile-nav"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              className="fixed inset-y-0 end-0 z-[61] flex w-[min(21rem,90vw)] flex-col border-s border-[var(--border)] bg-[var(--bg)] p-5 shadow-premium lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-fg"
                  aria-label={t('nav.close')}
                >
                  <X className="size-4" />
                </button>
              </div>

              <ul className="mt-7 space-y-1.5">
                {PUBLIC_NAV.map((item, index) => {
                  const active = isActive(item.href);
                  return (
                    <motion.li
                      key={item.href}
                      initial={reduceMotion ? undefined : { opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index + 0.08, duration: 0.32 }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                          active
                            ? 'bg-[var(--primary)]/16 text-[var(--hd-pink-soft)]'
                            : 'text-fg-muted hover:bg-[var(--card)] hover:text-fg',
                        )}
                      >
                        {t(item.key)}
                        {active ? (
                          <span className="size-1.5 rounded-full bg-[var(--primary)]" aria-hidden />
                        ) : null}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>

              {/* Language switch (mobile) */}
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1">
                {LOCALES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setLocale(entry.id)}
                    aria-pressed={locale === entry.id}
                    className={cn(
                      'flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                      locale === entry.id
                        ? 'bg-[var(--primary)] text-[#160726]'
                        : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.34 }}
                className="mt-auto space-y-2.5 border-t border-[var(--border)] pt-5"
              >
                {session ? (
                  <>
                    {session.isAdmin ? (
                      <Button asChild variant="secondary" className="w-full">
                        <Link href="/admin">{t('nav.admin')}</Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="secondary" className="w-full">
                      <Link href="/dashboard">
                        <User />
                        {t('nav.dashboard')}
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/create">
                        <Sparkles />
                        {t('nav.create')}
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        void signOut();
                        setOpen(false);
                      }}
                    >
                      <LogOut />
                      {t('nav.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="secondary" className="w-full">
                      <Link href="/login">{t('nav.login')}</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/create">
                        <Sparkles />
                        {t('nav.create')}
                      </Link>
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
