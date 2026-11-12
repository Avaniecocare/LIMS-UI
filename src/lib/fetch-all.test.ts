import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from './fetch-all';

describe('fetchAllPages', () => {
  it('collects every page', async () => {
    const load = vi.fn(async (page: number) => ({ data: [page * 10, page * 10 + 1], meta: { totalPages: 3 } }));
    expect(await fetchAllPages(load)).toEqual([10, 11, 20, 21, 30, 31]);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('makes one call for a single page', async () => {
    const load = vi.fn(async () => ({ data: ['a'], meta: { totalPages: 1 } }));
    expect(await fetchAllPages(load)).toEqual(['a']);
    expect(load).toHaveBeenCalledOnce();
  });
});
