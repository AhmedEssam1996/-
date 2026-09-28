'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import * as React from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Cute sticker layer.
 *
 * The reference look leans on hand-drawn "sticker" objects — flowers, hearts,
 * stars, gift boxes, sparkles — scattered around the content. Rather than
 * shipping image files (which can 404, ship heavy, or look different on every
 * screen), every sticker here is an inline SVG drawn with the brand palette.
 *
 * Constraints, deliberately:
 *   • all decorative layers are `aria-hidden` and `pointer-events-none`
 *   • `prefers-reduced-motion` freezes every animation
 *   • animations are transform/opacity only, so they stay on the compositor
 *
 * Reduced motion is read through `usePrefersReducedMotion` rather than Motion's
 * `useReducedMotion`. The latter reports `null` on the server and a real boolean
 * on the client, so branching on it produces different markup in each place and
 * React tears the tree down with a hydration mismatch.
 */

/* ==========================================================================
   Sticker glyphs — each fits a 24x24 box and takes a fill colour.
   ========================================================================== */

export type StickerKind =
  | 'gift'
  | 'heart'
  | 'star'
  | 'flower'
  | 'sparkle'
  | 'bow'
  | 'balloon'
  | 'cake'
  | 'envelope';

export const STICKER_COLORS = {
  pink: 'var(--hd-pink)',
  coral: 'var(--hd-coral)',
  purple: 'var(--hd-purple)',
  orange: 'var(--hd-orange)',
  yellow: 'var(--hd-yellow)',
  lavender: 'var(--hd-lavender)',
} as const;

export type StickerColor = keyof typeof STICKER_COLORS;

/**
 * Motion's `style` prop accepts CSS custom properties at runtime but does not
 * type them. This narrow intersection lets us pass `--sticker-drift` without an
 * `any` cast, keeping the component fully type-safe.
 */
type StickerStyle = React.CSSProperties & Record<'--sticker-drift', string>;

export function StickerGlyph({
  kind,
  color = 'pink',
  className,
}: {
  kind: StickerKind;
  color?: StickerColor;
  className?: string;
}) {
  const fill = STICKER_COLORS[color];

  return (
    <svg viewBox="0 0 24 24" className={cn('size-full', className)} aria-hidden focusable="false">
      {glyph(kind, fill)}
    </svg>
  );
}

function glyph(kind: StickerKind, fill: string) {
  switch (kind) {
    case 'heart':
      return (
        <path
          d="M12 20.5c-.4 0-.8-.15-1.1-.43C6.5 16.3 2.5 12.9 2.5 8.9 2.5 6 4.7 4 7.4 4c1.8 0 3.4.9 4.6 2.4C13.2 4.9 14.8 4 16.6 4 19.3 4 21.5 6 21.5 8.9c0 4-4 7.4-8.4 11.17-.3.28-.7.43-1.1.43Z"
          fill={fill}
        />
      );

    case 'star':
      return (
        <path
          d="M12 2.6l2.6 6.1 6.6.55-5 4.3 1.5 6.45L12 16.5 6.3 20l1.5-6.45-5-4.3 6.6-.55L12 2.6Z"
          fill={fill}
        />
      );

    case 'sparkle':
      return (
        <path
          d="M12 2c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7Z"
          fill={fill}
        />
      );

    case 'flower':
      return (
        <g fill={fill}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse key={angle} cx="12" cy="6.6" rx="2.9" ry="4.4" transform={`rotate(${angle} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="2.9" fill="var(--hd-yellow)" />
        </g>
      );

    case 'bow':
      return (
        <g fill={fill}>
          <path d="M12 12C9.6 12 5.4 9.6 5.4 6.8c0-2 1.6-3.2 3.1-2.6C10.3 4.8 11.7 8.4 12 12Z" />
          <path d="M12 12c2.4 0 6.6-2.4 6.6-5.2 0-2-1.6-3.2-3.1-2.6C13.7 4.8 12.3 8.4 12 12Z" />
          <circle cx="12" cy="11.7" r="2.1" fill="var(--hd-yellow)" />
        </g>
      );

    case 'balloon':
      return (
        <g fill={fill}>
          <ellipse cx="12" cy="9" rx="5.6" ry="7" />
          <path d="M11 15.8h2l-1 2.2-1-2.2Z" fill="var(--hd-yellow)" />
          <path d="M12 18v4" stroke={fill} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'cake':
      return (
        <g fill={fill}>
          <rect x="3" y="12.5" width="18" height="8.5" rx="2.4" />
          <rect x="5.5" y="8.5" width="13" height="5" rx="2" opacity="0.85" />
          <rect x="8" y="3.4" width="1.8" height="5" rx="0.9" fill="var(--hd-yellow)" />
          <rect x="14.2" y="3.4" width="1.8" height="5" rx="0.9" fill="var(--hd-yellow)" />
          <circle cx="8.9" cy="2.6" r="1.5" fill="var(--hd-orange)" />
          <circle cx="15.1" cy="2.6" r="1.5" fill="var(--hd-orange)" />
        </g>
      );

    case 'envelope':
      return (
        <g>
          <rect x="2.5" y="5" width="19" height="14" rx="2.6" fill={fill} />
          <path d="M3.5 6.5L12 13l8.5-6.5" stroke="var(--hd-night)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );

    case 'gift':
    default:
      return (
        <g fill={fill}>
          <rect x="3.4" y="10.4" width="17.2" height="10.6" rx="2.2" />
          <rect x="2.4" y="7" width="19.2" height="3.8" rx="1.6" />
          <rect x="10.7" y="7" width="2.6" height="14" rx="0.9" fill="var(--hd-yellow)" />
          <path d="M12 7C10.6 7 7.6 5.6 7.6 3.9c0-1.1.9-1.8 1.7-1.4C10.9 3.1 11.8 5.2 12 7Z" fill="var(--hd-yellow)" />
          <path d="M12 7c1.4 0 4.4-1.4 4.4-3.1 0-1.1-.9-1.8-1.7-1.4C13.1 3.1 12.2 5.2 12 7Z" fill="var(--hd-yellow)" />
        </g>
      );
  }
}

/* ==========================================================================
   A single positioned sticker
   ========================================================================== */

export interface StickerSpec {
  kind: StickerKind;
  color?: StickerColor;
  /** Position in percentages of the container. */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Tailwind sizing class, e.g. `size-12`. */
  size?: string;
  /** Animation delay in seconds. */
  delay?: number;
  /** Degrees of rotation applied to the resting pose. */
  rotate?: number;
  opacity?: number;
  /** How far the sticker drifts on scroll, in pixels. Negative floats up. */
  parallax?: number;
}

/**
 * Scatter of cute stickers.
 *
 * Absolutely positioned inside the nearest `relative` ancestor. Each sticker
 * floats gently on its own delay so the group never looks synchronised, and
 * optionally drifts with scroll for a cheap parallax.
 */
export function StickerField({
  stickers,
  className,
}: {
  stickers: StickerSpec[];
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  /*
   * Parallax without breaking the rules of hooks.
   *
   * Exactly one `useTransform` runs per render, producing a shared drift in the
   * range -1..1. Each sticker scales that via the `--sticker-drift` CSS variable
   * below, so no hook is ever called inside the map and every sticker stays in
   * step with the rest.
   */
  const drift = useTransform(scrollYProgress, [0, 1], [1, -1]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {stickers.map((sticker, index) => (
        <motion.span
          key={`${sticker.kind}-${index}`}
          style={{
            top: sticker.top,
            left: sticker.left,
            right: sticker.right,
            bottom: sticker.bottom,
            opacity: sticker.opacity ?? 1,
            rotate: sticker.rotate ?? 0,
            // One shared value drives every sticker, so they stay in step and
            // no hook is created inside the map. `parallax` scales the travel
            // via the CSS variable the inner span reads.
            y: reduceMotion ? undefined : drift,
            ...({ '--sticker-drift': String(sticker.parallax ?? 0) } as StickerStyle),
          }}
          className={cn('absolute block', sticker.size ?? 'size-10')}
        >
          <span
            className="block size-full"
            style={
              reduceMotion
                ? undefined
                : {
                    animation: `hd-float ${6 + (index % 4)}s ease-in-out ${sticker.delay ?? 0}s infinite`,
                    // Scales the shared -1..1 drift into this sticker's own
                    // pixel distance. Pure CSS, so no extra hook is needed.
                    translate: `0 calc(var(--sticker-drift, 0) * 1px)`,
                  }
            }
          >
            <StickerGlyph kind={sticker.kind} color={sticker.color} />
          </span>
        </motion.span>
      ))}
    </div>
  );
}

/* ==========================================================================
   Floating hearts / stars that rise and fade — used on celebratory pages.
   ========================================================================== */

export function FloatingHearts({
  count = 12,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();

  const items = React.useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        id: index,
        left: 4 + ((index * 61) % 92),
        delay: (index % 6) * 0.7,
        duration: 7 + (index % 5),
        size: 10 + ((index * 7) % 16),
        kind: (index % 3 === 0 ? 'star' : 'heart') as StickerKind,
        color: (['pink', 'coral', 'purple', 'yellow', 'lavender'] as StickerColor[])[index % 5],
      })),
    [count],
  );

  if (reduceMotion) return null;

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {items.map((item) => (
        <span
          key={item.id}
          className="absolute bottom-0"
          style={{
            left: `${item.left}%`,
            width: item.size,
            height: item.size,
            animation: `hd-heart-float ${item.duration}s ease-out ${item.delay}s infinite`,
          }}
        >
          <StickerGlyph kind={item.kind} color={item.color} />
        </span>
      ))}
    </div>
  );
}

/* ==========================================================================
   Rotating stars — a tiny orbit of stars that slowly turns.
   ========================================================================== */

export function RotatingStars({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0',
        !reduceMotion && 'animate-spin-slow',
        className,
      )}
      style={{ transformOrigin: 'center' }}
    >
      {[
        { top: '6%', left: '12%', size: 'size-4', color: 'yellow' as StickerColor },
        { top: '18%', right: '8%', size: 'size-5', color: 'pink' as StickerColor },
        { bottom: '14%', left: '6%', size: 'size-3', color: 'lavender' as StickerColor },
        { bottom: '8%', right: '16%', size: 'size-4', color: 'orange' as StickerColor },
      ].map((star, index) => (
        <span
          key={index}
          className={cn('absolute block', star.size)}
          style={{ top: star.top, left: star.left, right: star.right, bottom: star.bottom }}
        >
          <StickerGlyph kind="star" color={star.color} />
        </span>
      ))}
    </div>
  );
}

/* ==========================================================================
   Sticker chip — a rounded pill with a sticker and a label, used for
   category / occasion chips that should feel hand-placed.
   ========================================================================== */

export function StickerChip({
  kind,
  color = 'pink',
  children,
  className,
}: {
  kind: StickerKind;
  color?: StickerColor;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/80 px-3.5 py-2 text-[13px] font-bold text-fg shadow-soft backdrop-blur-md',
        className,
      )}
    >
      <span className="size-4 shrink-0" aria-hidden>
        <StickerGlyph kind={kind} color={color} />
      </span>
      {children}
    </span>
  );
}