'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Heart, LayoutGrid, List, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { GiftPreviewModal } from '@/components/gift/gift-preview-modal';
import { GiftArtwork } from '@/components/shared/gift-artwork';
import { GiftCard, useFavorites } from '@/components/shared/gift-card';
import { PageShell } from '@/components/shared/page-shell';
import { StickerField, type StickerSpec } from '@/components/shared/stickers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GIFT_FORMATS, themeForCategory } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import { ALL_GIFTS, BUDGETS, CATEGORIES, MOODS, OCCASIONS } from '@/lib/mock-data';
import type { MockGift } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/** Cute stickers framing the explore hero. */
const EXPLORE_STICKERS: StickerSpec[] = [
  { kind: 'flower', color: 'purple', top: '0%', left: '6%', size: 'size-11', delay: 0.4, rotate: -10, parallax: 22 },
  { kind: 'star', color: 'yellow', top: '10%', right: '8%', size: 'size-7', delay: 1.2, parallax: 18 },
  { kind: 'heart', color: 'pink', bottom: '4%', left: '16%', size: 'size-8', delay: 1.8, rotate: 12, parallax: 26 },
  { kind: 'sparkle', color: 'orange', bottom: '0%', right: '14%', size: 'size-6', delay: 0.9, parallax: 14 },
];

/**
 * Gift discovery.
 *
 * The strongest page in the product, so it gets the most capable filtering:
 * free-text search, plus category / occasion / mood / budget facets, sorting,
 * a favourites-only view and grid/list layouts.
 *
 * All filtering happens client-side against `ALL_GIFTS` because the public API
 * only supports a `category` param today. The fetch below still runs so that
 * real published gifts replace the sample set the moment the database has any —
 * see `mergeGifts`.
 *
 * Filters are mirrored into the URL so a filtered view is shareable and the
 * back button behaves.
 */

type SortKey = 'popular' | 'newest' | 'match' | 'az';
type ViewMode = 'grid' | 'list';

interface PublicGiftRow {
  slug: string;
  title: string;
  category: string;
  type: string;
  recipient_name: string | null;
  published_at: string | null;
  author_name: string | null;
}

function GiftsPageInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const { ids: favoriteIds } = useFavorites();

  const [query, setQuery] = React.useState(() => searchParams.get('q') ?? '');
  const [category, setCategory] = React.useState(() => searchParams.get('category') ?? 'all');
  const [occasion, setOccasion] = React.useState(() => searchParams.get('occasion') ?? 'all');
  const [mood, setMood] = React.useState(() => searchParams.get('mood') ?? 'all');
  const [budget, setBudget] = React.useState(() => searchParams.get('budget') ?? 'all');
  const [format, setFormat] = React.useState(() => searchParams.get('format') ?? 'all');
  const [sort, setSort] = React.useState<SortKey>('popular');
  const [view, setView] = React.useState<ViewMode>('grid');
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<MockGift | null>(null);

  /* -------------------------------------------------- live published gifts */
  const [liveGifts, setLiveGifts] = React.useState<MockGift[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/public/gifts?limit=48');
        if (!response.ok) return;
        const payload = (await response.json()) as { gifts?: PublicGiftRow[] };
        if (cancelled || !payload.gifts?.length) return;

        // Real rows are mapped onto the local shape. Fields the public endpoint
        // intentionally does not expose (description, artwork seed) are filled
        // with safe defaults rather than left undefined.
        setLiveGifts(
          payload.gifts.map((row, index) => ({
            id: `live-${row.slug}-${index}`,
            slug: row.slug,
            title: row.title,
            description: row.recipient_name ? `${t('gift.for')} ${row.recipient_name}` : row.type,
            price: 0,
            category: row.category,
            type: (row.type as MockGift['type']) ?? 'رقمية',
            recipient_name: row.recipient_name ?? undefined,
            author_name: row.author_name ?? undefined,
            published_at: row.published_at ?? undefined,
            match_percentage: 70 + ((index * 7) % 30),
          })),
        );
      } catch {
        // Offline or API unavailable: the sample catalogue still renders.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const catalogue = React.useMemo(
    () => [...liveGifts, ...ALL_GIFTS.filter((gift) => !liveGifts.some((live) => live.slug === gift.slug))],
    [liveGifts],
  );

  /* ---------------------------------------------------------- filtering */
  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = catalogue.filter((gift) => {
      if (favoritesOnly && !favoriteIds.includes(gift.id)) return false;
      if (category !== 'all' && gift.category !== category) return false;
      if (mood !== 'all' && gift.mood !== mood) return false;
      if (budget !== 'all' && gift.budget !== budget) return false;
      if (format !== 'all' && gift.format !== format) return false;
      if (occasion !== 'all') {
        // Occasions map loosely onto categories; match either the explicit
        // occasion field or the category when the ids line up.
        const occasionLabel = OCCASIONS.find((entry) => entry.id === occasion)?.label;
        const matchesOccasion =
          gift.occasion === occasionLabel ||
          gift.category === occasion ||
          gift.occasion === occasion;
        if (!matchesOccasion) return false;
      }
      if (needle) {
        const haystack = `${gift.title} ${gift.description} ${gift.recipient_name ?? ''} ${
          gift.occasion ?? ''
        }`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
        break;
      case 'match':
        sorted.sort((a, b) => (b.match_percentage ?? 0) - (a.match_percentage ?? 0));
        break;
      case 'az':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
        break;
      case 'popular':
      default:
        sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
    }

    return sorted;
  }, [catalogue, query, category, occasion, mood, budget, format, sort, favoritesOnly, favoriteIds]);

  const activeFilterCount = [
    category !== 'all',
    occasion !== 'all',
    mood !== 'all',
    budget !== 'all',
    format !== 'all',
  ].filter(Boolean).length;

  const clearAll = () => {
    setQuery('');
    setCategory('all');
    setOccasion('all');
    setMood('all');
    setBudget('all');
    setFormat('all');
    setFavoritesOnly(false);
  };

  return (
    <PageShell>
      {/* ============================================================ hero */}
      <section className="relative text-center">
        <StickerField stickers={EXPLORE_STICKERS} className="-z-0" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/80 px-4 py-1.5 text-[12px] font-bold text-fg-muted shadow-soft backdrop-blur-md"
        >
          <Sparkles className="size-3.5 text-[var(--primary)]" aria-hidden />
          {results.length} {t('explore.results')}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="mx-auto mt-5 max-w-2xl font-display text-3xl leading-[1.15] font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl"
        >
          {t('explore.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mx-auto mt-4 max-w-xl leading-relaxed text-fg-muted"
        >
          {t('explore.subtitle')}
        </motion.p>
      </section>

      {/* ========================================================== search */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-fg-faint"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('explore.search')}
            aria-label={t('explore.search')}
            className="h-12 w-full rounded-full border border-[var(--border)] bg-[var(--card)]/80 ps-11 pe-11 text-sm text-fg shadow-soft outline-none backdrop-blur-md transition-colors placeholder:text-fg-faint focus:border-[var(--primary)]/55"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute end-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-fg-faint transition-colors hover:bg-[var(--card-soft)] hover:text-fg"
              aria-label={t('explore.clear')}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Mobile filter trigger */}
        <Button
          variant="secondary"
          className="sm:hidden"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal />
          {t('explore.filters')}
          {activeFilterCount > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-ink)] tabular">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* ========================================================= filters */}
      <div
        className={cn(
          'mt-5 space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-5 shadow-soft backdrop-blur-md',
          !filtersOpen && 'hidden sm:block',
        )}
      >
        <FilterRow label={t('explore.category')}>
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            {t('explore.all')}
          </Chip>
          {CATEGORIES.map((entry) => (
            <Chip
              key={entry.id}
              active={category === entry.slug}
              onClick={() => setCategory(entry.slug)}
            >
              <span aria-hidden>{entry.emoji}</span>
              {entry.name}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t('explore.occasion')}>
          <Chip active={occasion === 'all'} onClick={() => setOccasion('all')}>
            {t('explore.all')}
          </Chip>
          {OCCASIONS.map((entry) => (
            <Chip
              key={entry.id}
              active={occasion === entry.id}
              onClick={() => setOccasion(entry.id)}
            >
              <span aria-hidden>{entry.emoji}</span>
              {entry.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t('explore.mood')}>
          <Chip active={mood === 'all'} onClick={() => setMood('all')}>
            {t('explore.all')}
          </Chip>
          {MOODS.map((entry) => (
            <Chip key={entry.id} active={mood === entry.id} onClick={() => setMood(entry.id)}>
              <span aria-hidden>{entry.emoji}</span>
              {entry.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t('explore.budget')}>
          <Chip active={budget === 'all'} onClick={() => setBudget('all')}>
            {t('explore.all')}
          </Chip>
          {BUDGETS.map((entry) => (
            <Chip key={entry.id} active={budget === entry.id} onClick={() => setBudget(entry.id)}>
              {entry.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="الشكل">
          <Chip active={format === 'all'} onClick={() => setFormat('all')}>
            {t('explore.all')}
          </Chip>
          {GIFT_FORMATS.slice(0, 6).map((entry) => (
            <Chip key={entry.id} active={format === entry.id} onClick={() => setFormat(entry.id)}>
              <span aria-hidden>{entry.emoji}</span>
              {entry.label}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {/* ==================================================== results bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={favoritesOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFavoritesOnly((value) => !value)}
            aria-pressed={favoritesOnly}
          >
            <Heart className={cn(favoritesOnly && 'fill-current')} />
            {t('explore.favoritesOnly')}
            {favoriteIds.length > 0 ? (
              <span className="tabular">({favoriteIds.length})</span>
            ) : null}
          </Button>

          {activeFilterCount > 0 || favoritesOnly ? (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X />
              {t('explore.clear')}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <label className="sr-only" htmlFor="sort-select">
            {t('explore.sort')}
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--card)]/80 px-3.5 text-[13px] font-semibold text-fg outline-none backdrop-blur-md transition-colors focus:border-[var(--primary)]/55"
          >
            <option value="popular">{t('explore.sort.popular')}</option>
            <option value="newest">{t('explore.sort.newest')}</option>
            <option value="match">{t('explore.sort.match')}</option>
            <option value="az">{t('explore.sort.az')}</option>
          </select>

          {/* View toggle */}
          <div className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--card)] p-0.5 sm:flex">
            {(
              [
                { id: 'grid' as const, Icon: LayoutGrid, label: 'شبكة' },
                { id: 'list' as const, Icon: List, label: 'قائمة' },
              ]
            ).map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                aria-label={label}
                className={cn(
                  'relative grid size-8 place-items-center rounded-full transition-colors',
                  view === id ? 'text-[var(--primary-ink)]' : 'text-fg-faint hover:text-fg',
                )}
              >
                {view === id ? (
                  <motion.span
                    layoutId="view-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================== results */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {results.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-4xl border border-dashed border-[var(--border-strong)] px-6 py-20 text-center"
            >
              <span className="text-5xl" aria-hidden>
                🎁
              </span>
              <h2 className="mt-5 text-xl font-extrabold text-fg">{t('explore.empty.title')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
                {t('explore.empty.body')}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button onClick={clearAll} variant="secondary">
                  {t('explore.clear')}
                </Button>
                <Button asChild>
                  <Link href="/ai-gift">
                    <Sparkles />
                    {t('nav.assistant')}
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : view === 'grid' ? (
            <motion.ul
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {results.map((gift, index) => (
                <motion.li
                  key={gift.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
                >
                  <GiftCard gift={gift} onPreview={setPreview} />
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <motion.ul
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {results.map((gift, index) => (
                <motion.li
                  key={gift.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
                >
                  <div className="group flex items-center gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-3 shadow-soft backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary)]/45 hover:shadow-lift">
                    <GiftArtwork
                      category={gift.category}
                      seed={gift.slug}
                      className="size-20 shrink-0 rounded-2xl"
                      showConfetti={false}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-fg">{gift.title}</h3>
                      <p className="mt-0.5 truncate text-[13px] text-fg-muted">
                        {gift.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="primary">
                          <span aria-hidden>{themeForCategory(gift.category).label}</span>
                        </Badge>
                        {gift.recipient_name ? (
                          <Badge variant="default">
                            {t('gift.for')} {gift.recipient_name}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setPreview(gift)}>
                        {t('gift.preview')}
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/gift/${gift.slug}`}>{t('gift.open')}</Link>
                      </Button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <GiftPreviewModal gift={preview} onClose={() => setPreview(null)} />
    </PageShell>
  );
}

/* ==========================================================================
   Filter primitives
   ========================================================================== */

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="shrink-0 pt-1.5 text-[11px] font-bold tracking-[0.12em] text-fg-faint uppercase sm:w-24">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-200',
        active
          ? 'border-transparent bg-[var(--primary)] text-[var(--primary-ink)] shadow-[0_8px_20px_-10px_rgba(255,107,94,0.9)]'
          : 'border-[var(--border)] bg-[var(--card-soft)] text-fg-muted hover:border-[var(--border-strong)] hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export default function GiftsPage() {
  return (
    <React.Suspense fallback={null}>
      <GiftsPageInner />
    </React.Suspense>
  );
}