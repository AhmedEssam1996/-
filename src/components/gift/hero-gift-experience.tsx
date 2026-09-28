'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Gift, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { FloatingHearts, StickerField, type StickerSpec } from '@/components/shared/stickers';
import { Gift3D } from '@/components/three/gift-3d';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The hero centrepiece: a floating digital gift box the visitor can open.
 *
 * Three layered effects, all of which can be switched off independently:
 *
 *   1. **Idle** â€” the box bobs, the ribbon sways, stickers drift around it.
 *   2. **Hover** â€” the box tilts toward the pointer (a real 3D transform, not a
 *      scale) and the glow intensifies.
 *   3. **Open** â€” a click drives a lid-lift + burst sequence, then reveals the
 *      message card inside with a "create yours" CTA.
 *
 * The box itself is a real WebGL scene (`Gift3D`): the 3D gift floats in space
 * with neon rim lighting, orbiting objects and a particle field, and leans
 * toward the pointer. When WebGL is unavailable, or before the scene lazy-loads,
 * the same inline-SVG box is drawn instead, so the hero never renders empty.
 *
 * Reduced motion comes from `usePrefersReducedMotion`, not Motion's
 * `useReducedMotion`: the latter is `null` during SSR and a real boolean on the
 * client, so the sparkle layer and the box's idle animation rendered differently
 * on each side and hydration failed.
 */

/** Cute stickers that orbit the box. */
const HERO_STICKERS: StickerSpec[] = [
  { kind: 'star', color: 'yellow', top: '4%', left: '10%', size: 'size-8', delay: 0, parallax: 18 },
  { kind: 'heart', color: 'pink', top: '14%', right: '8%', size: 'size-9', delay: 0.8, parallax: 26 },
  { kind: 'flower', color: 'purple', bottom: '16%', left: '4%', size: 'size-10', delay: 1.4, parallax: 22 },
  { kind: 'sparkle', color: 'orange', top: '44%', left: '2%', size: 'size-6', delay: 2, parallax: 14 },
  { kind: 'star', color: 'lavender', bottom: '8%', right: '12%', size: 'size-6', delay: 2.4, parallax: 20 },
  { kind: 'bow', color: 'coral', top: '2%', right: '30%', size: 'size-7', delay: 1.1, parallax: 12 },
];

export function HeroGiftExperience({ className }: { className?: string }) {
  const { t } = useLocale();
  const reduceMotion = usePrefersReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [burst, setBurst] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (open) return;
    setOpen(true);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 1400);
  };

  const handleReset = () => setOpen(false);

  return (
    <div
      ref={containerRef}
      className={cn('relative mx-auto flex w-full max-w-lg items-center justify-center', className)}
      style={{ perspective: 1200 }}
    >
      {/* ------------------------------------------------------- glow floor */}
      <div
        aria-hidden
        className={cn(
          'animate-glow-pulse absolute bottom-6 h-12 w-3/5 rounded-[100%] blur-2xl transition-opacity duration-500',
          'bg-gradient-to-r from-[var(--hd-pink)] via-[var(--hd-purple)] to-[var(--hd-orange)]',
          open ? 'opacity-60' : 'opacity-35',
        )}
      />

      {/* ---------------------------------------------------------- stickers */}
      <StickerField stickers={HERO_STICKERS} />

      {/* --------------------------------------------------------- sparkles */}
      {!reduceMotion ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 14 }).map((_, index) => (
            <span
              key={index}
              className="absolute size-1.5 rounded-full"
              style={{
                left: `${8 + ((index * 37) % 84)}%`,
                top: `${30 + ((index * 53) % 60)}%`,
                backgroundColor: ['#FF7BB0', '#FF5C8A', '#A97BFF', '#FFC94D'][index % 4],
                animation: `hd-rise ${5 + (index % 4)}s ease-out ${index * 0.42}s infinite`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* ------------------------------------------------------------ the box */}
      <motion.div
        animate={
          reduceMotion
            ? undefined
            : { y: [0, -14, 0] }
        }
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="relative z-10"
      >
        <motion.button
          type="button"
          onClick={open ? handleReset : handleOpen}
          aria-expanded={open}
          aria-label={open ? t('common.close') : t('hero.openGift')}
          className="group relative block cursor-pointer outline-none"
          animate={{ scale: open ? 1.03 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/*
           * The decorative CSS glow that used to sit here has been removed.
           *
           * It was a blurred gradient on a `rounded-[2.5rem]` span at `inset-0`,
           * which was the stand-in for depth before the scene had one. Now that
           * the 3D scene provides a real glow floor, halo rings and a particle
           * field, this layer only contributed a hard-edged lavender rectangle
           * sitting on the page — the gradient spans the full box and the blur
           * cannot hide an edge that is itself the full width of the element.
           * The depth glow is now inside the scene, where it has no edge.
           */}

          {/* The WebGL scene owns its own pointer parallax and idle motion, so
              the 2D tilt above is no longer applied to the canvas itself.
              The span is `block` so the canvas has a real box to fill. */}
          <span className="relative block">
            <Gift3D open={open} />
          </span>
        </motion.button>
      </motion.div>

      {/* --------------------------------------------------------- open card */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.15 }}
            className="absolute -bottom-4 z-20 w-[min(20rem,88vw)] rounded-3xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-5 text-center shadow-premium backdrop-blur-xl"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 18 }}
              className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-[var(--primary)]/16 text-[var(--primary)]"
            >
              <Heart className="size-4 fill-current" aria-hidden />
            </motion.span>
            <p className="text-sm leading-relaxed font-semibold text-fg">
              Â«ÙƒÙ„ Ø³Ù†Ø© ÙˆØ£Ù†Øª Ø£Ø¬Ù…Ù„ØŒ ÙˆÙƒÙ„ ÙŠÙˆÙ… Ù…Ø¹Ø§Ùƒ Ø£Ø­Ù„Ù‰ Ù…Ù† Ø§Ù„Ù„ÙŠ Ù‚Ø¨Ù„Ù‡.Â»
            </p>
            <p className="mt-1 text-[11px] text-fg-faint">â€” Ù‡Ø¯ÙŠØ© Ù…Ù† Ø§Ù„Ù‚Ù„Ø¨</p>
            <Button asChild size="sm" className="mt-4 w-full">
              <Link href="/create">
                <Sparkles />
                {t('hero.createYours')}
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute -bottom-4 z-20"
          >
            <span className="pointer-events-none flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_85%,transparent)] px-3.5 py-1.5 text-[11px] font-bold text-fg-muted shadow-soft backdrop-blur-md">
              <Gift className="size-3.5" aria-hidden />
              {t('hero.openGiftHint')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------ burst confetti */}
      {burst && !reduceMotion ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-30">
          {Array.from({ length: 26 }).map((_, index) => {
            const angle = (index / 26) * Math.PI * 2;
            const distance = 90 + (index % 5) * 34;
            return (
              <motion.span
                key={index}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance - 30,
                  scale: 0.4,
                }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 size-2 rounded-full"
                style={{
                  backgroundColor: ['#FF7BB0', '#FF5C8A', '#A97BFF', '#FFC94D', '#FFA552'][index % 5],
                }}
              />
            );
          })}
        </div>
      ) : null}

      {/* Floating hearts rising behind the box */}
      <FloatingHearts count={8} className="opacity-70" />
    </div>
  );
}

