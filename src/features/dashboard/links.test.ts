import { describe, expect, it } from 'vitest';
import { canOpenLink } from './links';

const holding = (...held: string[]) => (...wanted: string[]) => wanted.some((w) => held.includes(w));

describe('canOpenLink', () => {
  it('needs the permission for the page linked to', () => {
    expect(canOpenLink('/samples?urgent=true', holding('jobs.view'))).toBe(true);
    expect(canOpenLink('/samples?urgent=true', holding('tests.approve'))).toBe(false);
    expect(canOpenLink('/due-invoices?bucket=90%2B', holding('invoices.view'))).toBe(true);
  });
  it('needs the permission for the approvals tab, since the page falls back to another tab', () => {
    expect(canOpenLink('/approvals?tab=review', holding('reports.review'))).toBe(true);
    expect(canOpenLink('/approvals?tab=review', holding('tests.approve'))).toBe(false);
  });
  it('checks reports against the catalog once it is known', () => {
    const can = holding('mis.view');
    expect(canOpenLink('/reports/tat-crossed', can)).toBe(true);
    expect(canOpenLink('/reports/tat-crossed', can, new Set(['tat-crossed']))).toBe(true);
    expect(canOpenLink('/reports/invoice-register?from=2026-11-01', can, new Set(['tat-crossed']))).toBe(false);
    expect(canOpenLink('/reports/tat-crossed', holding('reports.review'))).toBe(false);
  });
});
