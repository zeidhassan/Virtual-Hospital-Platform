import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook.
 * @param {Function} fetcher - Async function that returns the axios response
 * @param {Object} params - Query params (triggers refetch when changed)
 */
const useFetch = (fetcher, params = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsRef = useRef(JSON.stringify(params));
  // Bumped on every fetch; a resolving request only applies its result if
  // it's still the most recent one. Without this, a slower earlier request
  // (e.g. from a filter the user already changed away from) can resolve
  // after a faster later one and overwrite it with stale data — and a
  // request that resolves after the component unmounted would otherwise
  // call setState on a dead component.
  const requestIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcher(JSON.parse(paramsRef.current));
      if (requestIdRef.current !== requestId) return;
      setData(response.data);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err.userMessage || err.response?.data?.error || 'Failed to load data.');
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    paramsRef.current = JSON.stringify(params);
    fetch();
    return () => {
      // Invalidate this effect's in-flight request so it can't set state
      // after the component unmounts or params change again.
      requestIdRef.current += 1;
    };
  }, [fetch, JSON.stringify(params)]);

  return { data, isLoading, error, refetch: fetch };
};

export default useFetch;
