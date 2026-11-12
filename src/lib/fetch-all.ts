/**
 * Loads every page of a list endpoint, for pickers that must offer the whole list (a lab can have more
 * than one page of tests). Stops at `maxPages` as a guard against a runaway loop.
 */
export async function fetchAllPages<T>(load: (page: number) => Promise<{ data: T[]; meta: { totalPages: number } }>, maxPages = 50): Promise<T[]> {
  const first = await load(1);
  const rows = [...first.data];
  const last = Math.min(first.meta.totalPages, maxPages);
  for (let page = 2; page <= last; page++) rows.push(...(await load(page)).data);
  return rows;
}
