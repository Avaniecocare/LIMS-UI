/**
 * A path inside this app that is safe to navigate to, or null.
 * Accepts only same-origin relative paths: one leading slash, not `//host` or `/\host` (which browsers
 * treat as another origin), and no scheme such as `javascript:` or `https:`.
 */
export function safeAppPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  if (!/^\/(?![/\\])/.test(value)) return null;
  // Control characters (tabs, new lines) are stripped by URL parsers and can hide a second slash.
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const base = 'https://app.invalid';
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Where to go after signing in: the page that sent the user to sign in (router state `from`), if it is a path inside this app. */
export function returnPath(state: unknown): string {
  const from = state && typeof state === 'object' && 'from' in state ? (state as { from: unknown }).from : null;
  const path = safeAppPath(from);
  return path && !/^\/(login|setup|forgot-password|reset-password|change-password)(?=$|[/?#])/.test(path) ? path : '/';
}
