'use client';

import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncStateWithRefetch<T> extends AsyncState<T> {
  refetch: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncStateWithRefetch<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  const execute = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fn()
      .then((data) => {
        setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        setState({ data: null, loading: false, error: error as Error });
      });
  }, [fn]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await fn();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setState({ data: null, loading: false, error: error as Error });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { ...state, refetch };
}
