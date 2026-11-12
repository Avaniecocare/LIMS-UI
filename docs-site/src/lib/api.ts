/** The LIMS API, from the same-origin /config.js the UI container writes. Empty means "this origin". */
export function apiUrl(path: string): string {
  const base = (window as unknown as { __LIMS_CONFIG__?: { apiUrl?: string } }).__LIMS_CONFIG__?.apiUrl ?? '';
  return `${base.replace(/\/+$/, '')}/api/v1${path}`;
}
