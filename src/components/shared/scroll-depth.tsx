'use client';

import * as React from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * ScrollDepth — makes an entire page of content behave like a stack of glass
 * cards suspended in a 3D volume.
 *
 * This is the CSS-side counterpart to the WebGL cosmos. The background is
 * genuinely three-dimensional; without help, the content on top of it reads as
 * a flat layer pasted over a picture. This component closes that gap by placing
 * the page's content inside the *same* 3D context and leaning that context
 * away from the cursor, so the whole page drifts as one solid volume sitting
 * inside the cosmos rather than a card floating on a flat picture.
 *
 * Per-card depth comes from `Tilt3D`, which owns its own transform. A
 * stylesheet `translateZ` was deliberately not used here: Motion writes
 * `transform` inline on every animated element, and an inline transform always
 * wins over a stylesheet one, so any depth applied to a section would be
 * silently dropped on the ones that animate.
 *
 * Everything is driven by two CSS custom properties written to a single
 * element — no React state, no re-render, one `requestAnimationFrame` for the
 * whole page.
 *
 * Reduced motion short-circuits to a plain wrapper: no listeners, no transform.
 */

interface ScrollDepthProps {
  children: React.ReactNode;
  className?: string;
  /** Max page rotation in degrees. Small on purpose — it is felt, not seen. */
  maxTilt?: number;
}

export function ScrollDepth({
  children,
  className,
  maxTilt = 2.2,
}: ScrollDepthProps) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (reduceMotion) return;
    const root = ref.current;
    if (!root) return;

    /* ---------------------------------------------------- pointer tilt */
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let pointerFrame = 0;

    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * 2;
      target.y = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(stepPointer);
    };

    const stepPointer = () => {
      pointerFrame = 0;
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;

      const deg = maxTilt;
      // The units matter: these custom properties are consumed by
      // `rotateX(var(--page-rx))` in globals.css, and a bare number is not a
      // valid <angle>, which makes the whole `transform` declaration invalid and
      // silently collapses to `none`.
      root.style.setProperty('--page-ry', `${(current.x * deg).toFixed(3)}deg`);
      root.style.setProperty('--page-rx', `${(-current.y * deg).toFixed(3)}deg`);

      // Keep easing while the pointer is off-centre, so the page settles rather
      // than freezing mid-rotation when the mouse stops moving.
      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
        pointerFrame = window.requestAnimationFrame(stepPointer);
      } else {
        pointerFrame = 0;
      }
    };

    /* --------------------------------------------------------- scroll */
    let scrollFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        // Exposed so children can key off overall scroll progress.
        root.style.setProperty('--scroll', ratio.toFixed(4));
        root.style.setProperty('--scroll-px', `${window.scrollY}`);
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, [maxTilt, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={cn('page-depth', className)}>
      {children}
    </div>
  );
}
