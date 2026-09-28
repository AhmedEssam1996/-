'use client';

import * as React from 'react';

import { Starfield } from '@/components/layout/starfield';
import { CosmosBackground } from '@/components/three/cosmos-background';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Ambient background layer.
 *
 * Five stacked effects, all purely decorative and `aria-hidden`, layered in Z:
 *   1. The **CSS starfield**, furthest back — three tiers of twinkling stars.
 *   2. The **WebGL cosmos** (nebula, orbit rings, shards) — the real 3D layer.
 *   3. **Aurora blobs** and the faint grid, washing over the cosmos so the 3D
 *      never reads as a hard-edged canvas sitting on a flat page.
 *   4. **Floating gift emoji** with slow, staggered motion, nearest the viewer.
 *
 * Two deliberate constraints:
 *   • Everything is `pointer-events-none` so it never steals a click.
 *   • `prefers-reduced-motion` freezes all animation. This is checked in JS too
 *     because the blobs use inline transform animations.
 *
 * The reduced-motion check comes from `usePrefersReducedMotion`, not Motion's
 * `useReducedMotion`. That hook returns `null` during SSR and a real boolean on
 * the client, so the blobs' `animationPlayState` (and the floaters' existence)
 * differed between the server HTML and the first client render — a hydration
 * mismatch. The local hook starts at `false` on both sides and settles in an
 * effect.
 */

const FLOATERS = [
  { emoji: '🎁', top: '12%', left: '8%', delay: 0, duration: 7, size: 'text-4xl' },
  { emoji: '💌', top: '24%', left: '86%', delay: 1.2, duration: 8, size: 'text-3xl' },
  { emoji: '✨', top: '62%', left: '14%', delay: 0.6, duration: 6, size: 'text-2xl' },
  { emoji: '❤️', top: '72%', left: '78%', delay: 1.8, duration: 9, size: 'text-3xl' },
  { emoji: '🎀', top: '44%', left: '92%', delay: 0.9, duration: 7.5, size: 'text-2xl' },
  { emoji: '🎂', top: '82%', left: '42%', delay: 2.1, duration: 8.5, size: 'text-3xl' },
];
export function AmbientBackground({
  className,
  floaters = true,
  grid = true,
  cosmos = true,
}: {
  className?: string;
  floaters?: boolean;
  grid?: boolean;
  /** Set false on pages with their own heavy WebGL scene. */
  cosmos?: boolean;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
    >
      {/* ------------------------------------------------- 1. CSS starfield */}
      <Starfield className="-z-10" />

      {/* ---------------------------------- 2. the 3D cosmos (WebGL layer) */}
      {cosmos ? <CosmosBackground className="z-0" /> : null}

      {/* ------------------------------- 3. aurora + grid, over the 3D layer */}
      {/*
       * A flat base under the aurora.
       *
       * The aurora blobs are 34-42rem radial gradients at 20-24% opacity. On
       * their own they sit directly on the page, and a glass card that is only
       * `rgba(255,255,255,0.04)` will happily let a bright green blob show
       * through it — which is what made the login form's panel glow unevenly on
       * one side and left its white labels sitting on a moving bright patch.
       *
       * This dark plate goes UNDER the blobs rather than over the content: the
       * blobs still read as colour, but they now blend into a known-dark base
       * instead of into the raw page, so every translucent surface above has a
       * stable value to composite against. Text contrast is no longer at the
       * mercy of wherever a blob happens to be drifting.
       */}
      <div className="absolute inset-0 z-[5] bg-[var(--bg)]/45" />
      <div className="absolute inset-0 z-10 bg-paper opacity-30" />

      {/* Aurora blobs — pink, purple and orange, kept low-opacity so the deep
          purple base still reads as a calm, premium surface. */}
      <div
        className="animate-blob absolute -top-40 right-[-10%] z-10 size-[42rem] rounded-full opacity-[0.24] blur-[120px]"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #FF7BB0 0%, transparent 65%)',
          animationPlayState: reduceMotion ? 'paused' : 'running',
        }}
      />
      <div
        className="animate-blob absolute top-[18%] left-[-14%] z-10 size-[38rem] rounded-full opacity-[0.22] blur-[130px]"
        style={{
          background: 'radial-gradient(circle at 60% 40%, #A97BFF 0%, transparent 65%)',
          animationDelay: '-8s',
          animationPlayState: reduceMotion ? 'paused' : 'running',
        }}
      />
      <div
        className="animate-blob absolute bottom-[-12%] left-[24%] z-10 size-[34rem] rounded-full opacity-[0.20] blur-[140px]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #FFA552 0%, transparent 68%)',
          animationDelay: '-15s',
          animationPlayState: reduceMotion ? 'paused' : 'running',
        }}
      />

      {/* Grid */}
      {grid ? (
        <div className="absolute inset-0 z-10 bg-grid-faint opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]" />
      ) : null}

      {/* --------------------------------------------- 4. floating emoji */}
      {floaters && mounted
        ? FLOATERS.map((item, index) => (
            <span
              key={index}
              className={cn('absolute z-20 select-none opacity-[0.22]', item.size)}
            style={{
              top: item.top,
              left: item.left,
              animation: reduceMotion
                ? undefined
                : `hd-float ${item.duration}s ease-in-out ${item.delay}s infinite`,
            }}
          >
            {item.emoji}
          </span>
        ))
        : null}
    </div>
  );
}

/**
 * A small set of drifting particles. Used on the gift-unwrap page where a
 * richer effect is justified; kept separate from AmbientBackground so pages can
 * opt in individually rather than paying for it everywhere.
 */
export function Particles({ count = 24, className }: { count?: number; className?: string }) {
  const reduceMotion = usePrefersReducedMotion();
  const particles = React.useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        id: index,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 3 + 1.5,
        duration: Math.random() * 8 + 7,
        delay: Math.random() * 6,
        color: ['#FF7BB0', '#A97BFF', '#FF7A5C', '#FFC94D'][index % 4],
      })),
    [count],
  );

  if (reduceMotion) return null;

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: 0.4,
            animation: `hd-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}