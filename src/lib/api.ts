import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '@/api/schema';

declare global {
  interface Window {
    __LIMS_CONFIG__?: { apiUrl: string };
  }
}

export const apiBaseUrl = () => window.__LIMS_CONFIG__?.apiUrl ?? 'http://localhost:3000';

export interface FieldError {
  field: string;
  message: string;
}

/** The backend's single error envelope, thrown by every failed call. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: FieldError[] = [],
    readonly requestId: string | null = null,
  ) {
    super(message);
  }
}

// Held in memory only. Never in browser storage: a reload fetches it again from /auth/me.
let csrfToken: string | null = null;
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

let onUnauthenticated: (() => void) | null = null;
export const setUnauthenticatedHandler = (fn: () => void) => {
  onUnauthenticated = fn;
};

const middleware: Middleware = {
  onRequest({ request }) {
    if (csrfToken && request.method !== 'GET') request.headers.set('X-CSRF-Token', csrfToken);
    return request;
  },
  async onResponse({ response, request }) {
    if (response.ok) return response;
    let body: { error?: { code: string; message: string; fields?: FieldError[]; requestId?: string } } = {};
    try {
      body = await response.clone().json();
    } catch {
      // not JSON: fall through to the generic message
    }
    if (response.status === 401 && !request.url.includes('/auth/')) onUnauthenticated?.();
    throw new ApiError(
      response.status,
      body.error?.code ?? 'ERROR',
      body.error?.message ?? 'Something went wrong. Please try again.',
      body.error?.fields ?? [],
      body.error?.requestId ?? null,
    );
  },
};

export const api = createClient<paths>({ baseUrl: apiBaseUrl(), credentials: 'include' });
api.use(middleware);

/** openapi-fetch returns {data}; middleware has already thrown on errors. */
export function unwrap<T>(result: { data?: T }): T {
  return result.data as T;
}

/** Multipart upload; the generated client does not cover file streams. */
export async function uploadFile(path: string, form: FormData): Promise<unknown> {
  const res = await fetch(`${apiBaseUrl()}/api/v1${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error?.code ?? 'ERROR', body.error?.message ?? 'Upload failed', body.error?.fields ?? []);
  return body;
}
