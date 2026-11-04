/**
 * Dashboard links come from the server, and some point at screens this user's role cannot open, such
 * as a reviewer's rejection rate linking to a report that needs mis.view. Those show as plain numbers
 * rather than links that end on "You do not have access".
 */
type Can = (...permissions: string[]) => boolean;

const PAGE_PERMISSIONS: Record<string, string[]> = {
  '/samples': ['jobs.view'],
  '/planning': ['planning.view'],
  '/quotations': ['quotations.view'],
  '/invoices': ['invoices.view'],
  '/due-invoices': ['invoices.view'],
  '/my-tests': ['tests.work'],
  '/dispatch': ['dispatch.view'],
};

const APPROVAL_TABS: Record<string, string> = { results: 'tests.approve', review: 'reports.review', sign: 'reports.approve', issue: 'reports.issue', issued: 'reports.view' };

/** `reports` is the set of report keys this user may open, or undefined while it loads. */
export function canOpenLink(link: string, can: Can, reports?: ReadonlySet<string>): boolean {
  const url = new URL(link, 'http://local');
  const path = url.pathname;
  if (path.startsWith('/reports/')) {
    if (!can('mis.view', 'mis.commercial')) return false;
    return reports ? reports.has(path.slice('/reports/'.length)) : true;
  }
  if (path === '/approvals') {
    const tab = url.searchParams.get('tab');
    return tab && APPROVAL_TABS[tab] ? can(APPROVAL_TABS[tab]) : can(...Object.values(APPROVAL_TABS));
  }
  const needed = PAGE_PERMISSIONS[path];
  return needed ? can(...needed) : true;
}
