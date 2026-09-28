'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { usePageView } from '@/lib/analytics/client';

function PageViewReporter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  usePageView(pathname, searchParams.toString());
  return null;
}

/**
 * Mounted once in the root layout.
 *
 * `useSearchParams` needs a Suspense boundary during static rendering, so the
 * reporter is isolated inside one and the boundary itself renders nothing —
 * meaning the shell never blocks on it.
 */
export function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewReporter />
    </Suspense>
  );
}