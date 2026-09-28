'use client';

import { useEffect, useState } from 'react';

/**
 * `prefers-reduced-motion`, safe for server rendering.
 *
 * `motion/react`'s `useReducedMotion` is **not** SSR-safe: it initialises from
 * the shared `prefersReducedMotion.current` module value, which is `null` on the
 * server and a real boolean on the client. Any component that branches on it
 * therefore renders different markup on the server than on the first client
 * render, which is exactly what a hydration mismatch is.
 *
 * This hook always starts at `false` — the same value the server sees — and only
 * reads the media query after mount. The markup is identical through hydration
 * and the preference is applied one commit later.
 *
 * Prefer this over `useReducedMotion` for anything that changes *markup*
 * (rendering an element, branching the tree). Motion's own hook is still fine
 * for choosing between two animation configs on an element that renders either
 * way.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}