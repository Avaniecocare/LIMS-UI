import { describe, expect, it } from 'vitest';
import { formatDate, formatINR, humanize } from './format';

describe('display formatting', () => {
  it('groups Indian digits without arithmetic', () => {
    expect(formatINR('123456.00')).toBe('1,23,456.00');
    expect(formatINR('15576')).toBe('15,576.00');
    expect(formatINR('-1000.5')).toBe('-1,000.50');
    expect(formatINR(null)).toBe('—');
  });
  it('prints DD-Mon-YYYY', () => {
    expect(formatDate('2026-11-04T00:00:00.000Z')).toBe('04-Nov-2026');
    expect(formatDate('2026-11-04T20:00:00.000Z')).toBe('05-Nov-2026');
  });
  it('humanizes statuses', () => {
    expect(humanize('RESULTS_SUBMITTED')).toBe('Results Submitted');
  });
});
