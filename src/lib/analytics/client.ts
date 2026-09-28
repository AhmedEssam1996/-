'use client';

import { useEffect, useRef } from 'react';

import type { AnalyticsEventName } from '@/lib/analytics/track';

/**
 * Client-side event tracker.
 *
 * Design decisions:
 *  • `sendBeacon` when available, `fetch(keepalive)` otherwise, so a navigation
 *    or tab close does not lose the last event.
 *  • The request carries NO identifying data. The session id lives in an
 *    httpOnly cookie set by the server; the client never sees or invents it.
 *  • Failures are swallowed — analytics must never surface an error to a user.
 *  • Events are queued for a microtask so a burst during hydration does not
 *    produce a flurry of requests.
 */

const ENDPOINT = '/api/analytics/events';

let queue: Array<{ eventName: AnalyticsEventName; page: string; metadata: Record<string, unknown> }> = [];
let flushScheduled = false;

function flush() {
  flushScheduled = false;
  const batch = queue;
  queue = [];
  if (batch.length === 0) return;

  for (const event of batch) {
    const body = JSON.stringify({
      event_name: event.eventName,
      page: event.page,
      metadata: event.metadata,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    });

    try {
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) continue;
      }
    } catch {
      /* fall through to fetch */
    }

    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics failures are never user-visible */
    });
  }
}

export function track(
  eventName: AnalyticsEventName,
  metadata: Record<string, unknown> = {},
  page?: string,
): void {
  if (typeof window === 'undefined') return;

  queue.push({
    eventName,
    page: page ?? window.location.pathname,
    metadata,
  });

  if (!flushScheduled) {
    flushScheduled = true;
    // Coalesce same-tick events into one flush.
    void Promise.resolve().then(flush);
  }
}

/**
 * Records a page_view for the given path once per mount.
 * Mounted from the root layout's client shell so navigation is covered.
 */
export function usePageView(pathname: string, searchParams?: string | null): void {
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const key = `${pathname}${searchParams ?? ''}`;
    if (lastPath.current === key) return;
    lastPath.current = key;

    track('page_view', searchParams ? { query: searchParams.slice(0, 200) } : {}, pathname);
  }, [pathname, searchParams]);
}

/** Reports how long a visitor stayed on the page, once, on hide/unload. */
export function useDwellTime(onLeave: (seconds: number) => void): void {
  const startedAt = useRef<number>(Date.now());
  const sent = useRef(false);

  useEffect(() => {
    const report = () => {
      if (sent.current) return;
      sent.current = true;
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (seconds > 1) onLeave(seconds);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') report();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', report);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', report);
      report();
    };
  }, [onLeave]);
}