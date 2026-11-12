import { matchPath } from 'react-router-dom';
import { useMediaQuery } from '@/lib/use-media-query';

/**
 * What the app shows on which device, in one place. A phone is narrower than 768px; tablets and up get the full
 * app (with touch-sized controls). Hiding is only about layout: the API enforces permissions the same everywhere.
 */
export const PHONE_QUERY = '(max-width: 767px)';

export const useIsPhone = () => useMediaQuery(PHONE_QUERY);

/** full: works as on desktop. simplified: key fields and main actions. desktop: a "best on a larger screen" page. */
export type MobileSupport = 'full' | 'simplified' | 'desktop';

interface MobileRule {
  path: string;
  support: MobileSupport;
  /** for desktop-only pages: what the page is for, shown on the phone instead */
  summary?: string;
}

// TODO(product-decision): which screens are desktop-only on a phone. Based on what each role does away from a desk.
export const MOBILE_RULES: MobileRule[] = [
  { path: '/samples/new', support: 'desktop', summary: 'Booking takes the customer, every sample, its tests and deviations in one long form.' },
  { path: '/quotations/new', support: 'desktop', summary: 'A quotation is a table of tests, quantities, rates and discounts.' },
  { path: '/quotations/:id/edit', support: 'desktop', summary: 'A quotation is a table of tests, quantities, rates and discounts.' },
  { path: '/planning', support: 'desktop', summary: 'Planning assigns many tests at once against each analyst’s and instrument’s workload.' },
  { path: '/masters', support: 'desktop', summary: 'Masters hold the test catalogue, specifications, rates and imports.' },
  { path: '/masters/:key', support: 'desktop', summary: 'Masters hold the test catalogue, specifications, rates and imports.' },
  { path: '/admin', support: 'desktop', summary: 'Admin covers users, roles, settings, branding, templates and the audit log.' },
  { path: '/setup/lab', support: 'desktop', summary: 'Setting up the laboratory walks through its profile, branding and catalogue.' },
  { path: '/analytics', support: 'desktop', summary: 'Analytics shows charts across operations, quality, people and money.' },
  { path: '/reports', support: 'desktop', summary: 'MIS reports are wide tables with Excel and PDF export.' },
  { path: '/reports/:key', support: 'desktop', summary: 'MIS reports are wide tables with Excel and PDF export.' },
  { path: '/', support: 'full' },
  { path: '/my-tests/*', support: 'full' },
  { path: '/approvals/*', support: 'full' },
  { path: '/account', support: 'full' },
];

export function mobileRule(pathname: string): MobileRule {
  return MOBILE_RULES.find((r) => matchPath({ path: r.path, end: true }, pathname)) ?? { path: pathname, support: 'simplified' };
}

/** Which menu entries belong in the phone's bottom bar, most useful first. The rest go under More. */
export const BOTTOM_NAV_PRIORITY = ['/', '/my-tests', '/approvals', '/samples', '/due-invoices', '/invoices', '/dispatch', '/customers', '/quality', '/orders'];
