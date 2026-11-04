/**
 * The hook for an error tracking service. Nothing is sent unless a deployment installs a reporter
 * with setErrorReporter, and whatever is installed only receives what this file lets through.
 */
export interface ErrorReport {
  name: string;
  message: string;
  stack?: string;
  /** Where it happened: the path only, with record ids replaced. Query strings can hold searches. */
  path: string;
  source: 'boundary' | 'window' | 'promise';
}

export type ErrorReporter = (report: ErrorReport) => void;

let reporter: ErrorReporter | null = null;

export const setErrorReporter = (next: ErrorReporter | null) => {
  reporter = next;
};

const EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const QUERY = /\?[^\s)"']*/g;
const SECRET = /\b(password|token|secret|signature|authorization|cookie)\b\s*[:=]\s*[^\s,;&]+/gi;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;

/** Removes anything that could identify a person, a record or a session from free text. */
export function scrub(text: string): string {
  return text.replace(SECRET, '$1=[removed]').replace(EMAIL, '[email]').replace(QUERY, '').replace(UUID, '[id]').replace(LONG_TOKEN, '[removed]');
}

function toReport(error: unknown, source: ErrorReport['source']): ErrorReport {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  return { name: e.name, message: scrub(e.message), stack: e.stack ? scrub(e.stack) : undefined, path: window.location.pathname.replace(UUID, '[id]'), source };
}

/** Never throws: a broken reporter must not make a bad moment worse. */
export function reportError(error: unknown, source: ErrorReport['source'] = 'boundary') {
  if (!reporter) return;
  try {
    reporter(toReport(error, source));
  } catch {
    // nothing more can be done here
  }
}

/** Catches what React cannot: errors in event handlers, timers and promises nobody awaited. */
export function installGlobalErrorHandlers(target: Window = window) {
  const onError = (e: ErrorEvent) => reportError(e.error ?? e.message, 'window');
  const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason, 'promise');
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
