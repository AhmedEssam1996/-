'use client';

import { AnimatePresence, motion } from 'motion/react';
import {
  Copy,
  Heart,
  Inbox,
  Link2,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { GiftArtwork } from '@/components/shared/gift-artwork';
import { useFavorites } from '@/components/shared/gift-card';
import { PageShell } from '@/components/shared/page-shell';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatById } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import { ALL_GIFTS } from '@/lib/mock-data';
import type { MockGift } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * My Gifts.
 *
 * Four tabs over the same collection: created, received, drafts, favourites.
 *
 * Signed-in users get their real gifts from `/api/gifts`; the local sample
 * catalogue is used for the "received" and "favourites" views so the page is
 * never empty while the account is still new. Drafts are kept in localStorage
 * because they are explicitly not server state yet.
 */

type Tab = 'created' | 'received' | 'drafts' | 'favorites';

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'created', label: 'هدايا صنعتها', icon: Send },
  { id: 'received', label: 'هدايا وصلتك', icon: Inbox },
  { id: 'drafts', label: 'المسودات', icon: Pencil },
  { id: 'favorites', label: 'المفضلة', icon: Heart },
];

const DRAFTS_KEY = 'hadiya.drafts';

interface Draft {
  id: string;
  title: string;
  category: string;
  recipient: string;
  updatedAt: string;
}

function readDrafts(): Draft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Draft[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: Draft[]): void {
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Storage unavailable — the list still renders from state.
  }
}

function MyGiftsPageInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();

  const [tab, setTab] = React.useState<Tab>(() => {
    const requested = searchParams.get('tab');
    return TABS.some((entry) => entry.id === requested) ? (requested as Tab) : 'created';
  });

  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [createdGifts, setCreatedGifts] = React.useState<MockGift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sharedId, setSharedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDrafts(readDrafts());
  }, []);

  /* ---------------------------------------------------------- created gifts */
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/gifts', { credentials: 'include' });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          gifts?: Array<{
            id: string;
            slug: string;
            title: string;
            category: string;
            status: string;
            recipient_name: string | null;
            created_at: string;
          }>;
        };
        if (cancelled || !payload.gifts?.length) return;

        setCreatedGifts(
          payload.gifts.map((row) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.recipient_name ? `${t('gift.for')} ${row.recipient_name}` : '',
            price: 0,
            category: row.category,
            type: 'رقمية',
            recipient_name: row.recipient_name ?? undefined,
            published_at: row.created_at,
            match_percentage: undefined,
          })),
        );
      } catch {
        // Signed out or API unavailable — the empty state handles it.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const favoriteGifts = React.useMemo(
    () => ALL_GIFTS.filter((gift) => favoriteIds.includes(gift.id)),
    [favoriteIds],
  );

  const items: Array<{ gift: MockGift; status?: string }> = React.useMemo(() => {
    switch (tab) {
      case 'favorites':
        return favoriteGifts.map((gift) => ({ gift, status: 'PUBLISHED' }));
      case 'received':
        return ALL_GIFTS.slice(4, 10).map((gift) => ({ gift, status: 'PUBLISHED' }));
      case 'created':
      default:
        return createdGifts.map((gift) => ({ gift, status: 'PUBLISHED' }));
    }
  }, [tab, favoriteGifts, createdGifts]);

  const handleShare = async (gift: MockGift) => {
    const url = `${window.location.origin}/gift/${gift.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setSharedId(gift.id);
      window.setTimeout(() => setSharedId(null), 1800);
    } catch {
      // Clipboard blocked.
    }
  };

  const removeDraft = (id: string) => {
    const next = drafts.filter((draft) => draft.id !== id);
    setDrafts(next);
    writeDrafts(next);
  };

  const duplicateDraft = (draft: Draft) => {
    const next = [
      ...drafts,
      { ...draft, id: `${Date.now()}`, title: `${draft.title} (نسخة)` },
    ];
    setDrafts(next);
    writeDrafts(next);
  };

  return (
    <PageShell>
      {/* ============================================================ header */}
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase">
            مساحتك
          </span>
          <h1 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-fg sm:text-4xl">
            هداياي
          </h1>
          <p className="mt-3 max-w-lg leading-relaxed text-fg-muted">
            كل اللي صنعته، وكل اللي وصلك، وكل اللي حفظته للمرة الجاية.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/create">
            <Sparkles />
            هدية جديدة
          </Link>
        </Button>
      </header>

      {/* ============================================================= tabs */}
      <div
        role="tablist"
        aria-label="هداياي"
        className="mt-9 flex gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--card)]/80 p-1 no-scrollbar backdrop-blur-md"
      >
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          const count =
            entry.id === 'favorites'
              ? favoriteGifts.length
              : entry.id === 'drafts'
                ? drafts.length
                : entry.id === 'created'
                  ? createdGifts.length
                  : undefined;

          return (
            <button
              key={entry.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(entry.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors duration-200',
                active ? 'text-[#160726]' : 'text-fg-muted hover:text-fg',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="mygifts-tab"
                  className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              ) : null}
              <Icon className="size-4" />
              {entry.label}
              {typeof count === 'number' && count > 0 ? (
                <span
                  className={cn(
                    'grid min-w-5 place-items-center rounded-full px-1 text-[10px] tabular',
                    active ? 'bg-[#160726]/25 text-[#160726]' : 'bg-[var(--card-soft)] text-fg-faint',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ========================================================== content */}
      <div className="mt-8" role="tabpanel">
        <AnimatePresence mode="wait">
          {tab === 'drafts' ? (
            <motion.div
              key="drafts"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {drafts.length === 0 ? (
                <EmptyState
                  emoji="📝"
                  title="مفيش مسودات"
                  body="أي هدية تبدأها وتسييها هتلاقيها هنا لحد ما تكمّلها."
                  action={{ href: '/create', label: 'ابدأ هدية' }}
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {drafts.map((draft) => (
                    <motion.li
                      key={draft.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 shadow-soft backdrop-blur-md"
                    >
                      <GiftArtwork
                        category={draft.category}
                        seed={draft.id}
                        className="aspect-[16/9] w-full"
                        showConfetti={false}
                      />
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-bold text-fg">{draft.title}</h3>
                          <StatusBadge value="DRAFT" />
                        </div>
                        <p className="mt-1.5 text-[13px] text-fg-muted">
                          {draft.recipient ? `${t('gift.for')} ${draft.recipient}` : 'بدون مستلم'}
                        </p>
                        <p className="mt-1 text-[11px] text-fg-faint">
                          آخر تعديل {new Date(draft.updatedAt).toLocaleDateString('ar-EG')}
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                          <Button asChild size="sm" className="flex-1">
                            <Link href="/create">كمّل</Link>
                          </Button>
                          <IconAction label="انسخ" onClick={() => duplicateDraft(draft)}>
                            <Copy className="size-4" />
                          </IconAction>
                          <IconAction
                            label="احذف"
                            danger
                            onClick={() => removeDraft(draft.id)}
                          >
                            <Trash2 className="size-4" />
                          </IconAction>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {loading && tab === 'created' ? (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <li
                      key={index}
                      className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)]"
                    />
                  ))}
                </ul>
              ) : items.length === 0 ? (
                <EmptyState
                  emoji={tab === 'favorites' ? '💖' : tab === 'received' ? '📬' : '🎁'}
                  title={
                    tab === 'favorites'
                      ? 'لسه مفيش مفضلة'
                      : tab === 'received'
                        ? 'لسه محدش بعتلك هدية'
                        : 'لسه مفيش هدايا صنعتها'
                  }
                  body={
                    tab === 'favorites'
                      ? 'دوس على القلب في أي هدية تعجبك وهتلاقيها هنا.'
                      : 'ابدأ بأول هدية — دقايق معدودة وتبعت الرابط.'
                  }
                  action={{ href: tab === 'favorites' ? '/gifts' : '/create', label: tab === 'favorites' ? 'استكشف الهدايا' : 'اصنع هدية' }}
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(({ gift, status }, index) => {
                    const format = formatById(gift.format);
                    const favorite = favoriteIds.includes(gift.id);

                    return (
                      <motion.li
                        key={gift.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.35) }}
                        className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 shadow-soft backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary)]/45 hover:shadow-lift"
                      >
                        <div className="relative">
                          <GiftArtwork
                            category={gift.category}
                            seed={gift.slug}
                            className="aspect-[16/9] w-full"
                          />
                          {status ? (
                            <span className="absolute end-3 top-3">
                              <StatusBadge value={status} />
                            </span>
                          ) : null}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-fg">{gift.title}</h3>
                            {format ? (
                              <Badge variant="lavender" className="shrink-0">
                                {format.emoji}
                              </Badge>
                            ) : null}
                          </div>

                          <dl className="mt-3 space-y-1 text-[12px] text-fg-muted">
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-fg-faint">{t('gift.for')}</dt>
                              <dd className="truncate font-semibold">
                                {gift.recipient_name ?? '—'}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-fg-faint">المناسبة</dt>
                              <dd className="truncate font-semibold">{gift.occasion ?? '—'}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-fg-faint">التاريخ</dt>
                              <dd className="font-semibold">
                                {gift.published_at
                                  ? new Date(gift.published_at).toLocaleDateString('ar-EG')
                                  : '—'}
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-4 flex items-center gap-2">
                            <Button asChild size="sm" className="flex-1">
                              <Link href={`/gift/${gift.slug}`}>افتح</Link>
                            </Button>
                            <IconAction label="عدّل" asLink="/create">
                              <Pencil className="size-4" />
                            </IconAction>
                            <IconAction label="شارك" onClick={() => handleShare(gift)}>
                              {sharedId === gift.id ? (
                                <Link2 className="size-4 text-[var(--primary)]" />
                              ) : (
                                <Send className="size-4" />
                              )}
                            </IconAction>
                            <IconAction
                              label={favorite ? t('gift.unfavorite') : t('gift.favorite')}
                              onClick={() => toggleFavorite(gift.id)}
                            >
                              <Heart
                                className={cn('size-4', favorite && 'fill-[var(--hd-rose)] text-[var(--hd-rose)]')}
                              />
                            </IconAction>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

/* ==========================================================================
   Primitives
   ========================================================================== */

function IconAction({
  label,
  onClick,
  asLink,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  asLink?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    'grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-200',
    danger
      ? 'border-[var(--hd-rose)]/40 text-[var(--hd-rose)] hover:bg-[var(--hd-rose)]/12'
      : 'border-[var(--border)] text-fg-faint hover:border-[var(--border-strong)] hover:text-fg',
  );

  if (asLink) {
    return (
      <Link href={asLink} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {children}
    </button>
  );
}

function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="rounded-4xl border border-dashed border-[var(--border-strong)] px-6 py-20 text-center">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-fg">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">{body}</p>
      <Button asChild className="mt-7">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </div>
  );
}

export default function MyGiftsPage() {
  return (
    <React.Suspense fallback={null}>
      <MyGiftsPageInner />
    </React.Suspense>
  );
}