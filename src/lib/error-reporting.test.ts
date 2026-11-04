import { afterEach, describe, expect, it, vi } from 'vitest';
import { installGlobalErrorHandlers, reportError, scrub, setErrorReporter } from './error-reporting';

afterEach(() => setErrorReporter(null));

describe('error reporting', () => {
  it('removes people, records and secrets from messages', () => {
    const text = scrub('Failed for asha@demo.example on /api/v1/invoices/01a1a808-fefe-718b-a971-d2efcbb20f93?q=Contoso password=hunter2 token: abcdef');
    expect(text).not.toContain('asha@demo.example');
    expect(text).not.toContain('01a1a808');
    expect(text).not.toContain('Contoso');
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('abcdef');
  });

  it('sends a scrubbed report, and the path without its query or ids', () => {
    window.history.pushState({}, '', '/invoices/01a1a808-fefe-718b-a971-d2efcbb20f93?tab=all&q=secret');
    const reporter = vi.fn();
    setErrorReporter(reporter);
    reportError(new TypeError('boom for a@b.example'));
    expect(reporter).toHaveBeenCalledOnce();
    const report = reporter.mock.calls[0][0];
    expect(report).toMatchObject({ name: 'TypeError', message: 'boom for [email]', path: '/invoices/[id]', source: 'boundary' });
  });

  it('does nothing without a reporter, and survives a reporter that throws', () => {
    expect(() => reportError(new Error('x'))).not.toThrow();
    setErrorReporter(() => {
      throw new Error('reporter down');
    });
    expect(() => reportError(new Error('x'))).not.toThrow();
  });

  it('reports window errors and unhandled rejections until uninstalled', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);
    // A plain target: the test runner treats error events on the real window as failures.
    const target = new EventTarget();
    const uninstall = installGlobalErrorHandlers(target as unknown as Window);
    target.dispatchEvent(new ErrorEvent('error', { error: new Error('from a handler') }));
    const rejection = new Event('unhandledrejection') as Event & { reason: unknown };
    rejection.reason = new Error('from a promise');
    target.dispatchEvent(rejection);
    expect(reporter.mock.calls.map((c) => c[0].source)).toEqual(['window', 'promise']);
    uninstall();
    target.dispatchEvent(new ErrorEvent('error', { error: new Error('later') }));
    expect(reporter).toHaveBeenCalledTimes(2);
  });
});
