import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isUnauthorized } from './api';

export interface QueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Wall-clock time of the last successful fetch; pages use it as "now" so render stays pure. */
  fetchedAt: number;
  reload: () => void;
  /** Replace the cached value locally (after a mutation) without refetching. */
  setData: (updater: T | ((prev: T | null) => T | null)) => void;
}

/**
 * Minimal fetch-on-mount hook for admin pages. A 401 from any call bounces to
 * the login screen with `next` set so the user lands back where they were.
 */
export function useAdminQuery<T>(fetcher: () => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setFetchedAt(Date.now());
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (isUnauthorized(err)) {
          navigate(`/admin?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's cache key
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const set = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater));
  }, []);

  return { data, error, loading, fetchedAt, reload, setData: set };
}

/** Runs a mutation, surfacing 401 as a redirect and other errors as a message. */
export function useAdminMutation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        if (isUnauthorized(err)) {
          navigate(`/admin?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return null;
        }
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [navigate, location.pathname],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
