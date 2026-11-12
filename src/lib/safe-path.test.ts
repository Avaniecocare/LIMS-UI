import { describe, expect, it } from 'vitest';
import { returnPath, safeAppPath } from './safe-path';

describe('safeAppPath', () => {
  it.each(['/my-tests/abc', '/approvals?tab=review', '/invoices/1#pay', '/'])('keeps the app path %s', (p) => {
    expect(safeAppPath(p)).toBe(p);
  });

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example/x', 'javascript:alert(1)', 'my-tests', '', '/\t/evil.example', null, undefined, 42])('rejects %s', (p) => {
    expect(safeAppPath(p)).toBeNull();
  });
});

describe('returnPath', () => {
  it('returns to the page that asked for sign-in', () => {
    expect(returnPath({ from: '/approvals/reports/r1?tab=history' })).toBe('/approvals/reports/r1?tab=history');
  });

  it.each([null, undefined, {}, { from: '//evil.example' }, { from: 'https://evil.example' }, { from: '/login' }, { from: '/setup?x=1' }])('falls back to the dashboard for %j', (state) => {
    expect(returnPath(state)).toBe('/');
  });
});
