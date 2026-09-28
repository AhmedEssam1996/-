'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Gift, Heart, Music, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GiftArtwork } from '@/components/shared/gift-artwork';
import { GiftBox } from '@/components/shared/gift-box';
import { FloatingHearts, StickerField, type StickerSpec } from '@/components/shared/stickers';
import { Logo } from '@/components/layout/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { categoryEmoji, formatById, themeForCategory } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import type { MockGift } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * The gift unwrap experience.
 *
 * This is deliberately NOT a product detail page. It is a short sequence:
 *
 *   1. `sealed`   — the gift floats, unopened. One instruction: tap it.
 *   2. `opening`  — the seal breaks, confetti fires, the box scales away.
 *   3. `content`  — the message and details are revealed one beat at a time.
 *   4. `final`    — a CTA inviting the recipient to send one back.
 *
 * Confetti is imported lazily inside the handler so `canvas-confetti` stays out
 * of the initial bundle on a page that may never be opened.
 *
 * `prefers-reduced-motion` skips straight to the content with no burst.
 */

type Stage = 'sealed' | 'opening' | 'content' | 'final';

/** Stickers scattered around the sealed box, matching the hero language. */
const UNWRAP_STICKERS: StickerSpec[] = [
  { kind: 'star', color: 'yellow', top: '10%', left: '8%', size: 'size-7', delay: 0.3, parallax: 20 },
  { kind: 'heart', color: 'pink', top: '18%', right: '10%', size: 'size-8', delay: 1.1, parallax: 26 },
  { kind: 'flower', color: 'purple', bottom: '22%', left: '6%', size: 'size-9', delay: 1.7, parallax: 22 },
  { kind: 'sparkle', color: 'orange', bottom: '16%', right: '8%', size: 'size-6', delay: 2.2, parallax: 16 },
  { kind: 'bow', color: 'coral', top: '46%', left: '3%', size: 'size-7', delay: 0.7, parallax: 18 },
];

export function GiftUnwrap({ gift }: { gift: MockGift }) {
  const { t } = useLocale();
  const reduceMotion = usePrefersReducedMotion();
  const [stage, setStage] = React.useState<Stage>('sealed');
  const [shared, setShared] = React.useState(false);

  const theme = themeForCategory(gift.category);
  const format = formatById(gift.format);

  /* Record the open, once. Fire-and-forget: analytics must never block the
     experience, and a failure here is not the recipient's problem. */
  React.useEffect(() => {
    const controller = new AbortController();
    fetch('/api/gift-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: gift.slug }),
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [gift.slug]);

  const burst = React.useCallback(async () => {
    if (reduceMotion) return;
    try {
      const { default: confetti } = await import('canvas-confetti');
      confetti({
        particleCount: 110,
        spread: 78,
        startVelocity: 42,
        origin: { y: 0.58 },
        zIndex: 9999,
        colors: ['#FF7BB0', '#FF5C8A', '#A97BFF', '#FFC94D', '#FFA552'],
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 100,
          startVelocity: 30,
          origin: { y: 0.5, x: 0.2 },
          zIndex: 9999,
          colors: ['#FF7BB0', '#FF5C8A', '#A97BFF'],
        });
        confetti({
          particleCount: 60,
          spread: 100,
          startVelocity: 30,
          origin: { y: 0.5, x: 0.8 },
          zIndex: 9999,
          colors: ['#FFC94D', '#FF7BB0', '#A97BFF'],
        });
      }, 220);
    } catch {
      // Confetti is decorative; its absence must not break the reveal.
    }
  }, [reduceMotion]);

  const open = () => {
    if (stage !== 'sealed') return;
    setStage('opening');
    void burst();
    window.setTimeout(() => setStage('content'), reduceMotion ? 0 : 900);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: gift.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <div
      className="dark relative flex min-h-dvh flex-col overflow-hidden bg-[var(--bg)] text-fg"
      style={
        {
          '--gift-from': theme.from,
          '--gift-to': theme.to,
        } as React.CSSProperties
      }
    >
      {/* --------------------------------------------------- ambient stage */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 start-1/4 size-[36rem] rounded-full opacity-40 blur-[130px] transition-opacity duration-1000"
          style={{ background: `radial-gradient(circle, ${theme.from} 0%, transparent 65%)` }}
        />
        <div
          className="absolute -bottom-40 end-1/4 size-[32rem] rounded-full opacity-35 blur-[130px]"
          style={{ background: `radial-gradient(circle, ${theme.to} 0%, transparent 65%)` }}
        />
      </div>

      {/* Cute stickers around the sealed box */}
      {stage === 'sealed' ? <StickerField stickers={UNWRAP_STICKERS} /> : null}

      {/* Drifting particles once the gift is open */}
      {stage !== 'sealed' && !reduceMotion ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="absolute size-1.5 rounded-full"
              style={{
                left: `${6 + ((index * 41) % 88)}%`,
                top: `${40 + ((index * 29) % 55)}%`,
                backgroundColor: ['#FF7BB0', '#FF5C8A', '#A97BFF', '#FFC94D'][index % 4],
                animation: `hd-rise ${6 + (index % 5)}s ease-out ${index * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* --------------------------------------------------------- header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Logo size="sm" />
        <button
          type="button"
          onClick={share}
          className="grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-fg-muted transition-colors hover:text-[var(--primary)]"
          aria-label={t('gift.share')}
        >
          <Share2 className="size-4" />
        </button>
      </header>

      {/* ----------------------------------------------------------- stage */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-20 sm:px-6">
        <AnimatePresence mode="wait">
          {/* ====================================================== sealed */}
          {stage === 'sealed' ? (
            <motion.div
              key="sealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="flex w-full max-w-lg flex-col items-center text-center"
            >
              <Badge variant="gold" className="border-white/20 bg-white/10 text-[var(--hd-gold-soft)]">
                <span aria-hidden>{categoryEmoji(gift.category)}</span>
                {theme.label}
              </Badge>

              <h1 className="mt-6 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                {gift.recipient_name ? (
                  <>
                    هدية لـ <span className="text-gradient-on-dark">{gift.recipient_name}</span>
                  </>
                ) : (
                  <span className="text-gradient-on-dark">وصلتك هدية</span>
                )}
              </h1>

              {gift.author_name ? (
                <p className="mt-3 text-sm text-fg-muted">من {gift.author_name}</p>
              ) : null}

              {/* The sealed box */}
              <motion.button
                type="button"
                onClick={open}
                aria-label={t('hero.openGift')}
                className="group relative mt-12 outline-none"
                animate={reduceMotion ? undefined : { y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <span
                  aria-hidden
                  className="animate-glow-pulse absolute inset-0 -z-10 rounded-[3rem] blur-3xl transition-opacity duration-500 group-hover:opacity-80"
                  style={{
                    background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    opacity: 0.55,
                  }}
                />
                <GiftBox className="size-44 sm:size-56" />
              </motion.button>

              <motion.p
                animate={reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2.4 }}
                className="mt-10 text-sm font-bold text-fg-muted"
              >
                {t('hero.openGiftHint')}
              </motion.p>

              {/* Hearts rising behind the sealed box */}
              <FloatingHearts count={10} className="opacity-80" />
            </motion.div>
          ) : null}

          {/* ===================================================== opening */}
          {stage === 'opening' ? (
            <motion.div
              key="opening"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="grid place-items-center"
            >
              <GiftBox open className="size-44 sm:size-56" />
            </motion.div>
          ) : null}

          {/* ===================================================== content */}
          {stage === 'content' || stage === 'final' ? (
            <motion.article
              key="content"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl"
            >
              {/* Artwork as a hero banner */}
              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="overflow-hidden rounded-4xl border border-[var(--border)] shadow-premium"
              >
                <GiftArtwork
                  category={gift.category}
                  seed={gift.slug}
                  className="aspect-[16/9] w-full"
                />
              </motion.div>

              <div className="mt-8 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="primary">
                    <span aria-hidden>{categoryEmoji(gift.category)}</span>
                    {theme.label}
                  </Badge>
                  {format ? (
                    <Badge variant="lavender">
                      <span aria-hidden>{format.emoji}</span>
                      {format.label}
                    </Badge>
                  ) : null}
                  {gift.occasion ? <Badge variant="default">{gift.occasion}</Badge> : null}
                </div>

                <motion.h1
                  initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.55 }}
                  className="mt-6 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl"
                >
                  {gift.title}
                </motion.h1>

                {/* The message — the emotional payload */}
                <motion.blockquote
                  initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38, duration: 0.55 }}
                  className="relative mx-auto mt-8 max-w-xl rounded-3xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_80%,transparent)] p-6 text-start backdrop-blur-md sm:p-8"
                >
                  <span
                    aria-hidden
                    className="absolute -top-3 start-6 text-4xl leading-none text-[var(--primary)]"
                  >
                    ⬝
                  </span>
                  <p className="leading-[2] whitespace-pre-wrap text-fg">{gift.description}</p>
                  {gift.author_name ? (
                    <footer className="mt-5 border-t border-[var(--border)] pt-4 text-[13px] text-fg-faint">
                      — {gift.author_name}
                    </footer>
                  ) : null}
                </motion.blockquote>

                {/* Small detail row */}
                <motion.dl
                  initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52, duration: 0.55 }}
                  className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3"
                >
                  {gift.recipient_name ? (
                    <Stat label={t('gift.for')} value={gift.recipient_name} />
                  ) : null}
                  <Stat label="الشكل" value={format?.label ?? 'هدية رقمية'} />
                  <Stat
                    label="التاريخ"
                    value={
                      gift.published_at
                        ? new Date(gift.published_at).toLocaleDateString('ar-EG')
                        : 'النهاردة'
                    }
                  />
                </motion.dl>

                {/* Music affordance — present but explicitly not autoplaying. */}
                <motion.div
                  initial={reduceMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.66, duration: 0.5 }}
                  className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[12px] font-semibold text-fg-muted"
                >
                  <Music className="size-3.5" aria-hidden />
                  الموسيقى بتشتغل لما تفتحها بنفسك
                </motion.div>

                {/* -------------------------------------------------- CTA */}
                <motion.div
                  initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.72, duration: 0.55 }}
                  className="mt-10 flex flex-wrap items-center justify-center gap-3"
                >
                  <Button asChild size="lg">
                    <Link href="/create">
                      <Sparkles />
                      ابعت هدية زيها
                    </Link>
                  </Button>
                  <Button size="lg" variant="secondary" onClick={share}>
                    <Heart className={cn(shared && 'fill-[var(--hd-rose)] text-[var(--hd-rose)]')} />
                    {shared ? t('gift.copied') : t('gift.share')}
                  </Button>
                </motion.div>

                <motion.div
                  initial={reduceMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                  className="mt-12"
                >
                  <Link
                    href="/gifts"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-fg-muted transition-colors hover:text-[var(--primary)]"
                  >
                    <ArrowLeft className="size-3.5 ltr:rotate-180" />
                    {t('hero.cta.secondary')}
                  </Link>
                </motion.div>
              </div>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </main>

      {/* --------------------------------------------------------- footer */}
      <footer className="relative z-20 px-4 pb-6 text-center text-[11px] text-fg-faint sm:pb-8">
        <p className="inline-flex items-center gap-1.5">
          <Gift className="size-3.5" aria-hidden />
          هدية رقمية اتعملت بـ Hadiya
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] px-4 py-3 backdrop-blur-md">
      <dt className="text-[10px] font-bold tracking-[0.12em] text-fg-faint uppercase">{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-bold text-fg">{value}</dd>
    </div>
  );
}
