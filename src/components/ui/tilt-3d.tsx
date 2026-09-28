'use client';

import * as React from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Tilt3D — a pointer-driven 3D tilt surface.
 *
 * The wrapper owns the `perspective`; the inner surface reads the pointer,
 * rotates in real 3D (`rotateX`/`rotateY`) and exposes `--px` / `--py`
 * (normalised to -0.5..0.5) so children can pop out of the card with their own
 * `translate`/`translateZ` for real parallax depth. A specular glare is drawn
 * on top and follows the tilt.
 *
 * Design decisions:
 *   • The transform is written straight to a ref — zero React re-renders on
 *     pointer move, so tracking is buttery at any card count.
 *   • While tracking, the transition is disabled for 1:1 following; on leave it
 *     is re-enabled with a springy ease so the card settles instead of snapping.
 *   • On hover the surface also pushes forward along Z (`translateZ`), so the
 *     card visibly lifts off the page plane. This is only possible because the
 *     surface is `preserve-3d`; the matching `perspective` lives on the wrapper.
 *   • `prefers-reduced-motion` short-circuits to a plain wrapper: no listeners,
 *     no transform, no glare.
 */

interface Tilt3DProps {
  children: React.ReactNode;
  /** Applied to the outer (perspective) wrapper — layout, sizing, positioning. */
  className?: string;
  /** Applied to the rotating surface itself, e.g. existing card classes. */
  surfaceClassName?: string;
  /** Max rotation in degrees (default 8). */
  maxTilt?: number;
  /** Perspective distance in px (default 900). */
  perspective?: number;
  /** How far the card lifts toward the viewer on hover, in px. */
  lift?: number;
  /** Show the specular glare that follows the tilt. */
  glare?: boolean;
  /** Extra lifetime for the settle transition, in ms. */
  settleMs?: number;
  /** Radius class for the glare layer when the card corners are rounded. */
  glareClassName?: string;
}

const SETTLE_EASE = 'transform 560ms cubic-bezier(0.22, 1, 0.36, 1)';

export function Tilt3D({
  children,
  className,
  surfaceClassName,
  maxTilt = 8,
  perspective = 900,
  lift = 22,
  glare = true,
  settleMs = 620,
  glareClassName = 'rounded-3xl',
}: Tilt3DProps) {
  const reduceMotion = usePrefersReducedMotion();
  const surfaceRef = React.useRef<HTMLDivElement>(null);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const track = (clientX: number, clientY: number) => {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Normalised -0.5..0.5, so depth children can use `50% + --px * 100%`.
    const px = ((clientX - rect.left) / rect.width) - 0.5;
    const py = ((clientY - rect.top) / rect.height) - 0.5;

    el.classList.add('tilt-hover');
    // Follow the pointer with no lag while hovering…
    el.style.transition = 'none';
    el.style.transform = `translateZ(${lift}px) rotateX(${py * -maxTilt}deg) rotateY(${px * maxTilt}deg)`;
    el.style.setProperty('--px', px.toFixed(3));
    el.style.setProperty('--py', py.toFixed(3));
  };

  const settle = () => {
    const el = surfaceRef.current;
    if (!el) return;
    el.classList.remove('tilt-hover');
    // …then ease back down to the page plane when the pointer leaves.
    el.style.transition = SETTLE_EASE;
    el.style.transform = 'translateZ(0) rotateX(0deg) rotateY(0deg)';
    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
    window.setTimeout(() => {
      el.style.transition = '';
    }, settleMs);
  };

  return (
    <div className={className} style={{ perspective }}>
      <div
        ref={surfaceRef}
        onPointerMove={(event) => track(event.clientX, event.clientY)}
        onPointerEnter={(event) => track(event.clientX, event.clientY)}
        onPointerLeave={settle}
        className={cn('tilt-surface', surfaceClassName)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
        {glare ? <span aria-hidden className={cn('tilt-glare', glareClassName)} /> : null}
      </div>
    </div>
  );
}