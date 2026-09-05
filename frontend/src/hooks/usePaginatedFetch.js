import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Data-fetching hook for endpoints backed by src/utils/pagination.js — the
 * fetcher is called with { ...filters, page, limit } and the response is
 * expected to be the paginate() wrapper: { data, currentPage, totalPages,
 * totalItems, pageSize }. Mirrors useFetch's request-id cancellation guard
 * (see feedback_usefetch_two_arg_limit / stale-response notes) but manages
 * its own `page` state instead of taking a single fixed params object.
 */
const usePaginatedFetch = (fetcher, filters = {}, limit = 10) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, pageSize: limit });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const filtersKey = JSON.stringify(filters);
  const requestIdRef = useRef(0);

  // A fresh filter/search shouldn't leave the view stuck on a page number
  // that may no longer exist in the new result set.
  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const load = useCallback(async (pageToLoad) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcher({ ...JSON.parse(filtersKey), page: pageToLoad, limit });
      if (requestIdRef.current !== requestId) return;
      const body = response.data;
      setData(body?.data || []);
      setMeta({
        currentPage: body?.currentPage || pageToLoad,
        totalPages: body?.totalPages || 1,
        totalItems: body?.totalItems ?? (body?.data?.length || 0),
        pageSize: body?.pageSize || limit,
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err.userMessage || err.response?.data?.error || 'Failed to load data.');
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [fetcher, filtersKey, limit]);

  useEffect(() => {
    load(page);
    return () => {
      requestIdRef.current += 1;
    };
  }, [load, page]);

  return { data, isLoading, error, ...meta, page, setPage, refetch: () => load(page) };
};

export default usePaginatedFetch;
