'use client';

import { useEffect, useRef } from 'react';

import { SiteNav } from '@/components/layout/site-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { AmbientBackground } from '@/components/layout/ambient-background';
import { ScrollDepth } from '@/components/shared/scroll-depth';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  narrow?: boolean;
  showAmbient?: boolean;
  /** Set false on full-bleed pages (e.g. the gift detail experience). */
  showFooter?: boolean;
  /** Set false to opt a page out of the 3D page-depth treatment. */
  depth?: boolean;
}

/**
 * Standard page chrome: ambient background + fixed navbar + main + footer.
 *
 * The top padding compensates for the fixed navbar. It is a touch larger on the
 * homepage because the hero is designed to sit under the transparent navbar.
 *
 * `ScrollDepth` wraps `<main>` so every page's content is suspended in the same
 * 3D volume as the WebGL cosmos behind it, rather than sitting on a flat plane.
 * Pages that need to control their own transforms pass `depth={false}`.
 */
export function PageShell({ children, narrow = false, showFooter = true, depth = true }: PageShellProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isMobile]);

  const main = (
    <main
      id="main"
      ref={scrollRef}
      className={cn(
        'relative mx-auto w-full flex-1',
        narrow
          ? 'max-w-3xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32'
          : 'max-w-7xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32 lg:pt-36',
      )}
    >
      {children}
    </main>
  );

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AmbientBackground />
      <SiteNav />
      {depth ? <ScrollDepth className="flex-1">{main}</ScrollDepth> : main}
      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}
