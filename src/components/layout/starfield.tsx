'use client';

import * as React from 'react';

import { usePointerParallax } from '@/components/shared/parallax';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Starfield — a CSS-only, three-tier starfield behind everything.
 *
 * Three depth layers (far / mid / near) share one window pointer value via
 * `--px` / `--py` and translate at different scales, so the background feels
 * like a volume of space rather than a flat wallpaper. Near stars twinkle with
 * a warmer glow; far ones are barely-there specks. Pure CSS transforms and
 * opacity — nothing re-renders, nothing touches the GPU budget that the WebGL
 * hero scene needs.
 *
 * Deterministic PRNG keeps the sky identical between server HTML and client.
 */

const TIERS = [
  {
    key: 'far',
    count: 48,
    min: 1,
    max: 1.5,
    opacity: 0.55,
    parallax: [10, 6],
    drift: 13,
  },
  {
    key: 'mid',
    count: 26,
    min: 1.2,
    max: 2,
    opacity: 0.75,
    parallax: [20, 12],
    drift: 9,
  },
  {
    key: 'near',
    count: 12,
    min: 1.6,
    max: 2.6,
    opacity: 0.9,
    parallax: [34, 20],
    drift: 6,
  },
] as const;

const GLOW = ['#FFFFFF', '#FFD9A8', '#CBB3FF', '#FFB7D5'];

interface StarfieldProps {
  className?: string;
}

export function Starfield({ className }: StarfieldProps) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  usePointerParallax(ref, { enabled: !reduceMotion });

  // Deterministic stars: same sky on server and client, no hydration shift.
  const tiers = React.useMemo(() => {
    let seed = 0x5EED;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    return TIERS.map((tier) => ({
      ...tier,
      stars: Array.from({ length: tier.count }).map(() => ({
        left: rand() * 100,
        top: rand() * 100,
        size: tier.min + rand() * (tier.max - tier.min),
        color: GLOW[Math.floor(rand() * GLOW.length)],
        delay: rand() * 8,
        duration: 3 + rand() * 5,
        rise: rand() * 0.5 + 0.5,
      })),
    }));
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        !reduceMotion && 'parallax-smooth',
        className,
      )}
    >
      {tiers.map((tier) => (
        <div
          key={tier.key}
          className="absolute inset-0"
          style={
            reduceMotion
              ? undefined
              : {
                  // Each tier drifts at its own depth — near layers move more.
                  translate: `calc(var(--px, 0) * ${tier.parallax[0]}px) calc(var(--py, 0) * ${tier.parallax[1]}px)`,
                }
          }
        >
          {tier.stars.map((star, index) => (
            <span
              key={index}
              className="absolute rounded-full"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                backgroundColor: star.color,
                opacity: tier.opacity * 0.5,
                boxShadow: `0 0 ${star.size * 2.2}px ${star.color}`,
                animation: reduceMotion
                  ? undefined
                  : `hd-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}