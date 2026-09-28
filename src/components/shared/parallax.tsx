'use client';

import * as React from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Pointer parallax depth layer.
 *
 * Tracks the *window* pointer and writes two CSS variables onto a container:
 *   • `--px` / `--py`, normalised to -0.5..0.5
 *
 * Children translate themselves in Z-space by reading those variables, e.g. via
 * the `depth-1`, `depth-2`, `depth-3` utilities (which use the composable
 * `translate` CSS property, so they never fight Motion's `transform`).
 *
 * A single shared pointer value is what makes the whole page feel like one
 * coherent 3D space: everything inside a `Parallax` reacts to the same cursor,
 * at different scales, like layers of a diorama.
 */

/** Attach a window-level pointer tracker to `ref`. Returns a cleanup fn. */
export function usePointerParallax(
  ref: React.RefObject<HTMLElement | null>,
  {
    enabled = true,
    strength = 1,
  }: { enabled?: boolean; strength?: number } = {},
) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const px = (event.clientX / window.innerWidth - 0.5) * strength;
      const py = (event.clientY / window.innerHeight - 0.5) * strength;
      el.style.setProperty('--px', px.toFixed(4));
      el.style.setProperty('--py', py.toFixed(4));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled, strength, ref]);
}

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  /** How far layers travel, as a multiplier on the depth distance. */
  strength?: number;
  /** Apply a long, soft ease to layer movement (default true). */
  smooth?: boolean;
}

export function Parallax({ children, className, strength = 1, smooth = true }: ParallaxProps) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  usePointerParallax(ref, { enabled: !reduceMotion, strength });

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        smooth && !reduceMotion && 'parallax-smooth',
        className,
      )}
    >
      {children}
    </div>
  );
}