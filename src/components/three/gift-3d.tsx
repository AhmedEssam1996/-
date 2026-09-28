'use client';

import { animate } from 'motion/react';
import * as React from 'react';

import { GiftBox } from '@/components/shared/gift-box';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

/**
 * Lazy, resilient wrapper around the WebGL hero scene.
 *
 * Three things this guards against:
 *
 *  1. **Cost.** Three.js is ~150 kB gzipped. It is code-split behind
 *     `next/dynamic` and only mounted once the container is near the viewport,
 *     so it never competes with the hero's first paint.
 *  2. **No WebGL.** If context creation fails (old device, blocked, headless),
 *     we fall back to the existing inline-SVG `GiftBox` — the hero still reads.
 *  3. **Reduced motion.** The 3D scene renders a *static* frame with no idle
 *     animation rather than disappearing.
 *
 * The open/close animation is driven by a Motion `animate()` tween writing into
 * a ref. Three reads that ref every frame, so the box lid animates at full
 * frame rate without a single React re-render.
 */

const GiftScene = React.lazy(() =>
  import('./gift-scene').then((mod) => ({ default: mod.GiftScene })),
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

interface Gift3DProps {
  /** Open state, owned by the parent hero. */
  open: boolean;
  className?: string;
}

export function Gift3D({ open, className }: Gift3DProps) {
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [webglOk, setWebglOk] = React.useState<boolean | null>(null);

  /** 0 → sealed, 1 → open. Read by the scene every frame. */
  const openProgress = React.useRef(0);
  /** Smoothed pointer, -1..1. */
  const pointer = React.useRef({ x: 0, y: 0 });

  /* ---------------------------------------------------- WebGL capability */
  React.useEffect(() => {
    setWebglOk(hasWebGL());
  }, []);

  /* ------------------------------------------------ drive the lid tween */
  React.useEffect(() => {
    const target = open ? 1 : 0;
    if (reduceMotion) {
      openProgress.current = target;
      return;
    }
    const controls = animate(openProgress.current, target, {
      duration: open ? 0.9 : 0.5,
      ease: open ? [0.22, 1, 0.36, 1] : 'easeInOut',
      onUpdate: (value) => {
        openProgress.current = value;
      },
    });
    return () => controls.stop();
  }, [open, reduceMotion]);

  /* ------------------------------------------------------ pointer input */
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const rect = event.currentTarget.getBoundingClientRect();
      pointer.current = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
      };
    },
    [reduceMotion],
  );

  const handlePointerLeave = React.useCallback(() => {
    pointer.current = { x: 0, y: 0 };
  }, []);

  const show3D = webglOk === true;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      /*
       * An explicit size, not `size-full`.
       *
       * `size-full` resolves to `height: 100%`, and the wrapper inside the hero
       * button has no intrinsic height — so the box collapsed to 0px. The
       * IntersectionObserver then saw a zero-area target, never reported an
       * intersection, and the scene never mounted. A concrete height here is
       * what makes the observer (and the canvas) behave.
       *
       * The negative margin pulls the scene up under the copy above it, so the
       * glow floor and halo rings are still visible in the fold instead of
       * being pushed below the visible area. The CTAs sit over the lower part
       * of the scene, which is where the glow reads best anyway.
       */
      className={cn(
        'relative -mt-10 h-[20rem] w-[20rem] sm:-mt-14 sm:h-[26rem] sm:w-[26rem] lg:h-[30rem] lg:w-[30rem]',
        /*
         * The mask MUST live on this wrapper, not on a sibling overlay. A
         * `mask-image` applies to the element it is set on and its descendants;
         * an absolutely-positioned empty span over the canvas would only mask
         * itself, leaving the canvas rectangle fully visible underneath.
         *
         * With it here, the glow, halo rings and particle field all fade out at
         * the canvas edge, so the scene blends into the page instead of ending
         * on a straight line. Purely a CSS mask — the WebGL output is untouched.
         */
        '[mask-image:radial-gradient(circle_at_center,black_62%,transparent_92%)]',
        className,
      )}
    >
      {show3D ? (
        <React.Suspense fallback={<GiftBoxFallback open={open} />}>
          <GiftScene
            openProgress={openProgress}
            pointer={pointer}
            motionScale={reduceMotion ? 0 : 1}
            particleCount={isMobile ? 120 : 260}
          />
        </React.Suspense>
      ) : (
        <GiftBoxFallback open={open} />
      )}
    </div>
  );
}

/**
 * The 2D stand-in, used before the scene mounts and wherever WebGL is
 * unavailable. Reuses the same inline SVG the hero always had, so the visual
 * language does not change — only the depth does.
 */
function GiftBoxFallback({ open }: { open: boolean }) {
  return (
    <div className="grid size-full place-items-center">
      <GiftBox open={open} className="size-full" />
    </div>
  );
}