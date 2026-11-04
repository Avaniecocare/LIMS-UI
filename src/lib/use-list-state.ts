import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ListState {
  page: number;
  pageSize: number;
  q: string;
  sort: { id: string; desc: boolean } | null;
  filters: Record<string, string>;
}

/** Keeps pagination, sorting and filters in the URL, so they survive reloads and can be saved. */
export function useListState(defaults: { pageSize?: number } = {}) {
  const [params, setParams] = useSearchParams();

  const state: ListState = useMemo(() => {
    const filters: Record<string, string> = {};
    params.forEach((value, key) => {
      if (!['page', 'pageSize', 'q', 'sort', 'order'].includes(key)) filters[key] = value;
    });
    const sortId = params.get('sort');
    return {
      page: Number(params.get('page') ?? 1),
      pageSize: Number(params.get('pageSize') ?? defaults.pageSize ?? 25),
      q: params.get('q') ?? '',
      sort: sortId ? { id: sortId, desc: params.get('order') === 'desc' } : null,
      filters,
    };
  }, [params, defaults.pageSize]);

  const patch = useCallback(
    (changes: Record<string, string | number | null | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === null || v === undefined || v === '') next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return {
    ...state,
    /** query object to pass straight to the generated API client */
    query: {
      page: state.page,
      pageSize: state.pageSize,
      ...(state.q ? { q: state.q } : {}),
      ...(state.sort ? { sort: state.sort.id, order: state.sort.desc ? ('desc' as const) : ('asc' as const) } : {}),
      ...state.filters,
    },
    setPage: (page: number) => patch({ page }),
    setPageSize: (pageSize: number) => patch({ pageSize, page: 1 }),
    setSearch: (q: string) => patch({ q, page: 1 }),
    setSort: (sort: { id: string; desc: boolean } | null) => patch({ sort: sort?.id ?? null, order: sort ? (sort.desc ? 'desc' : 'asc') : null, page: 1 }),
    setFilter: (key: string, value: string | null) => patch({ [key]: value, page: 1 }),
    applyFilters: (filters: Record<string, string>) => setParams(new URLSearchParams(filters), { replace: true }),
    allParams: Object.fromEntries(params.entries()) as Record<string, string>,
  };
}
