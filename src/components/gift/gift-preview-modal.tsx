'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Heart, Link2, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GiftArtwork } from '@/components/shared/gift-artwork';
import { useFavorites } from '@/components/shared/gift-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { formatById, themeForCategory } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MockGift } from '@/lib/mock-data';

/**
 * Full-screen gift preview.
 *
 * Opened from a gift card so the visitor can see what a gift actually *is*
 * before committing. Implemented as a focus-trapped dialog with Escape-to-close
 * and a backdrop click, matching the expectations of `role="dialog"`.
 */
export function GiftPreviewModal({
  gift,
  onClose,
}: {
  gift: MockGift | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const reduceMotion = usePrefersReducedMotion();
  const { isFavorite, toggle } = useFavorites();
  const closeRef = React.useRef<HTMLButtonElement>(null);

  /* Lock scroll + focus the close button while open, and restore focus after. */
  React.useEffect(() => {
    if (!gift) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [gift, onClose]);

  return (
    <AnimatePresence>
      {gift ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[color-mix(in_oklab,var(--hd-plum-deep)_68%,transparent)] p-4 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={gift.title}
        >
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-4xl border border-[var(--border)] bg-[var(--card)] shadow-premium no-scrollbar"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="absolute end-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50"
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>

            {/* Artwork */}
            <GiftArtwork
              category={gift.category}
              seed={gift.slug}
              className="aspect-[16/9] w-full"
            />

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">
                  <span aria-hidden>{themeForCategory(gift.category).label}</span>
                </Badge>
                {formatById(gift.format) ? (
                  <Badge variant="lavender">
                    <span aria-hidden>{formatById(gift.format)?.emoji}</span>
                    {formatById(gift.format)?.label}
                  </Badge>
                ) : null}
                {gift.match_percentage ? (
                  <Badge variant="gold">
                    <Sparkles className="size-3" aria-hidden />
                    {gift.match_percentage}% {t('explore.sort.match')}
                  </Badge>
                ) : null}
              </div>

              <h2 className="mt-4 text-2xl leading-tight font-extrabold text-fg">{gift.title}</h2>
              <p className="mt-3 leading-relaxed text-fg-muted">{gift.description}</p>

              {/* Details */}
              <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 sm:grid-cols-3">
                {gift.recipient_name ? (
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-fg-faint uppercase">
                      {t('gift.for')}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-fg">{gift.recipient_name}</dd>
                  </div>
                ) : null}
                {gift.occasion ? (
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-fg-faint uppercase">
                      المناسبة
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-fg">{gift.occasion}</dd>
                  </div>
                ) : null}
                {gift.author_name ? (
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-fg-faint uppercase">
                      {t('gift.by')}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-fg">{gift.author_name}</dd>
                  </div>
                ) : null}
              </dl>

              {/* Actions */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="flex-1 sm:flex-none">
                  <Link href={`/gift/${gift.slug}`}>
                    <ExternalLink />
                    {t('gift.open')}
                  </Link>
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => toggle(gift.id)}
                  aria-pressed={isFavorite(gift.id)}
                  className={cn(isFavorite(gift.id) && 'border-[var(--hd-rose)]/45 text-[var(--hd-rose)]')}
                >
                  <Heart className={cn(isFavorite(gift.id) && 'fill-current')} />
                  {isFavorite(gift.id) ? t('gift.unfavorite') : t('gift.favorite')}
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={async () => {
                    const url = `${window.location.origin}/gift/${gift.slug}`;
                    try {
                      await navigator.clipboard.writeText(url);
                    } catch {
                      // Clipboard blocked — the link is still visible in the URL bar.
                    }
                  }}
                >
                  <Link2 />
                  {t('gift.share')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}