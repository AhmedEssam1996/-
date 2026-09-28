'use client';

import { motion } from 'motion/react';
import { Eye, Heart, Link2, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GiftArtwork } from '@/components/shared/gift-artwork';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tilt3D } from '@/components/ui/tilt-3d';
import { categoryEmoji, formatById, themeForCategory } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MockGift } from '@/lib/mock-data';

/* ==========================================================================
   Favourites — a tiny shared store backed by localStorage.
   Kept here (rather than in a context) because it is a single flat list with no
   server counterpart yet; when favourites are persisted this is the one file
   that needs to change.
   ========================================================================== */

const FAVORITES_KEY = 'hadiya.favorites';

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeFavorites(ids: string[]): void {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    // Notify the navbar badge and any other listener on the page.
    window.dispatchEvent(new Event('hadiya:favorites'));
  } catch {
    // Storage unavailable (private mode) — the UI still updates optimistically.
  }
}

/** Subscribe to the favourites list. Re-renders on any change. */
export function useFavorites() {
  const [ids, setIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const sync = () => setIds(readFavorites());
    sync();
    window.addEventListener('hadiya:favorites', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('hadiya:favorites', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = React.useCallback((id: string) => {
    const current = readFavorites();
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
    writeFavorites(next);
    setIds(next);
  }, []);

  return { ids, toggle, isFavorite: (id: string) => ids.includes(id) };
}

/* ==========================================================================
   Card
   ========================================================================== */

interface GiftCardProps {
  gift: MockGift;
  /** Show the AI match percentage badge. */
  showMatch?: boolean;
  /** Show the favourite toggle. */
  showFavorite?: boolean;
  /** Called instead of navigating, when the parent wants a modal preview. */
  onPreview?: (gift: MockGift) => void;
  className?: string;
}

export function GiftCard({
  gift,
  showMatch = true,
  showFavorite = true,
  onPreview,
  className,
}: GiftCardProps) {
  const { t } = useLocale();
  const { isFavorite, toggle } = useFavorites();
  const [shared, setShared] = React.useState(false);

  const favorite = isFavorite(gift.id);
  const theme = themeForCategory(gift.category);
  const format = formatById(gift.format);

  const handleShare = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}/gift/${gift.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: gift.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // The user dismissed the share sheet — nothing to do.
    }
  };

  return (
    <Tilt3D
      className={cn('group relative h-full', className)}
      surfaceClassName="block h-full"
      glareClassName="rounded-3xl"
    >
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md',
          'shadow-soft transition-shadow duration-500 group-hover:border-[var(--primary)]/40 group-hover:shadow-lift',
        )}
      >
        {/* ------------------------------------------------------- artwork */}
        <button
          type="button"
          onClick={() => onPreview?.(gift)}
          className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden text-start"
          aria-label={`${t('gift.preview')}: ${gift.title}`}
        >
          {/* The artwork sits slightly proud of the card face, so it visibly
              lags the text when the surface tilts — real intra-card depth. */}
          <GiftArtwork
            category={gift.category}
            seed={gift.slug}
            className="size-full transition-transform duration-700 group-hover:scale-[1.06]"
          />

          {/* Match badge — a light pill, so the ink is deep brown, not gold.
              Gold-on-white only reached 2.97:1, which is below the AA floor. */}
          {showMatch && gift.match_percentage ? (
            <Badge
              variant="gold"
              className="absolute top-3 end-3 border-white/25 bg-white/90 text-[#4a3308] backdrop-blur-sm"
            >
              <Sparkles className="size-3" aria-hidden />
              {gift.match_percentage}%
            </Badge>
          ) : null}

          {/* Category chip */}
          <span className="absolute top-3 start-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            <span aria-hidden>{categoryEmoji(gift.category)}</span>
            {theme.label}
          </span>

          {/* Hover reveal */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 flex translate-y-3 items-center justify-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent py-3 text-[11px] font-bold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Eye className="size-3.5" />
            {t('gift.preview')}
          </span>
        </button>

        {/* -------------------------------------------------------- content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-[15px] leading-snug font-bold text-fg">{gift.title}</h3>
          <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-fg-muted">
            {gift.description}
          </p>

          {/* Meta */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {format ? (
              <Badge variant="default">
                <span aria-hidden>{format.emoji}</span>
                {format.label}
              </Badge>
            ) : null}
            {gift.recipient_name ? (
              <Badge variant="primary">
                {t('gift.for')} {gift.recipient_name}
              </Badge>
            ) : null}
          </div>

          {/* ------------------------------------------------------ actions */}
          <div className="mt-4 flex items-center gap-2">
            {onPreview ? (
              <Button size="sm" className="flex-1" onClick={() => onPreview(gift)}>
                <Eye />
                {t('gift.preview')}
              </Button>
            ) : (
              <Button asChild size="sm" className="flex-1">
                <Link href={`/gift/${gift.slug}`}>{t('gift.open')}</Link>
              </Button>
            )}

            {showFavorite ? (
              <button
                type="button"
                onClick={() => toggle(gift.id)}
                aria-pressed={favorite}
                aria-label={favorite ? t('gift.unfavorite') : t('gift.favorite')}
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-200',
                  favorite
                    ? 'border-[var(--hd-pink)]/45 bg-[var(--hd-pink)]/15 text-[var(--hd-pink)]'
                    : 'border-[var(--border)] text-fg-faint hover:border-[var(--hd-pink)]/45 hover:text-[var(--hd-pink)]',
                )}
              >
                <Heart className={cn('size-4', favorite && 'fill-current')} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleShare}
              aria-label={t('gift.share')}
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-200',
                shared
                  ? 'border-[var(--primary)]/45 bg-[var(--primary)]/15 text-[var(--primary)]'
                  : 'border-[var(--border)] text-fg-faint hover:border-[var(--primary)]/45 hover:text-[var(--primary)]',
              )}
            >
              {shared ? <Link2 className="size-4" /> : <Share2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Copied-to-clipboard confirmation */}
      {shared ? (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-2 start-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-bold text-[#160726] shadow-lift"
          role="status"
        >
          {t('gift.copied')}
        </motion.span>
      ) : null}
    </Tilt3D>
  );
}
