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

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcher(JSON.parse(paramsRef.current));
      setData(response.data);
    } catch (err) {
      setError(err.userMessage || err.response?.data?.error || 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    paramsRef.current = JSON.stringify(params);
    fetch();
  }, [fetch, JSON.stringify(params)]);

  return { data, isLoading, error, refetch: fetch };
};

export default useFetch;
