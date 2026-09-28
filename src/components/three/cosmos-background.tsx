'use client';

import * as React from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

/**
 * The site-wide 3D background layer.
 *
 * This wraps the WebGL cosmos so *no* page has to know about three.js. It
 * handles the three things every consumer would otherwise repeat:
 *
 *   1. **Cost.** The whole scene is code-split behind `next/dynamic` and only
 *     mounted once the browser is idle, so three.js never competes with the
 *     first paint of the page content sitting on top of it.
 *   2. **No WebGL.** If a context cannot be created (old device, headless, GPU
 *     blocklisted), the component renders `null` and the CSS ambient background
 *     that is already in the page carries the visuals on its own.
 *   3. **Reduced motion.** The scene renders a single static frame rather than
 *     disappearing, so the background is still there — just still.
 *
 * The smoothed pointer is owned here and written to a ref: the scene reads it
 * every frame, so pointer movement never triggers a React render anywhere in
 * the app.
 */

const CosmosScene = React.lazy(() =>
  import('./cosmos-scene').then((mod) => ({ default: mod.CosmosScene })),
);

/** Does this browser give us a usable WebGL context? */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

export function CosmosBackground({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  // `null` until we have actually checked, so the server HTML and the first
  // client render agree and nothing pops.
  const [webglOk, setWebglOk] = React.useState<boolean | null>(null);
  const [deferred, setDeferred] = React.useState(false);

  /** Smoothed pointer, -1..1 on each axis. Read by the scene every frame. */
  const pointer = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    setWebglOk(hasWebGL());
  }, []);

  /*
   * Wait for the browser to go idle before pulling in three.js. `requestIdleCallback`
   * is not in every browser, so a timeout is the fallback. Either way the scene
   * never blocks the page's first meaningful paint.
   */
  React.useEffect(() => {
    if (webglOk !== true) return;

    let cancelled = false;
    const start = () => {
      if (!cancelled) setDeferred(true);
    };

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback;
    const cancelIdle = (window as Window & { cancelIdleCallback?: (id: number) => void })
      .cancelIdleCallback;

    if (typeof idle === 'function') {
      const handle = idle(start, { timeout: 1200 });
      return () => {
        cancelled = true;
        cancelIdle?.(handle);
      };
    }

    const timer = window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [webglOk]);

  /* ------------------------------------------------------ pointer tracking */
  React.useEffect(() => {
    if (reduceMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let frame = 0;
    const target = { x: 0, y: 0 };

    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = -((event.clientY / window.innerHeight) * 2 - 1);

      // Coalesce to one write per animation frame. A 1000 Hz mouse fires far
      // more pointermove events than the display can show.
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        // Light easing, so a flick of the mouse does not snap the cosmos.
        pointer.current.x += (target.x - pointer.current.x) * 0.08;
        pointer.current.y += (target.y - pointer.current.y) * 0.08;
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduceMotion]);

  if (webglOk !== true || !deferred) return null;

  return (
    <div aria-hidden className={cn('pointer-events-none fixed inset-0 -z-10', className)}>
      <React.Suspense fallback={null}>
        <CosmosScene
          pointer={pointer}
          motionScale={reduceMotion ? 0 : 1}
          particleCount={isMobile ? 380 : 900}
        />
      </React.Suspense>
    </div>
  );
}
