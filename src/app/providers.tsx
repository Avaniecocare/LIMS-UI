import { QueryCache, QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { components } from '@/api/schema';
import { ApiError, api, setCsrfToken, setUnauthenticatedHandler, unwrap } from '@/lib/api';

export type Branding = components['schemas']['BrandingDto'];
export type SessionUser = components['schemas']['SessionUserDto'];

export const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});

const BrandingContext = createContext<Branding | null>(null);
export const useBranding = () => useContext(BrandingContext);

/** Readable text on the brand colour, for WCAG contrast whichever colour a company picks. */
export function contrastColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return l > 0.4 ? '#111827' : '#ffffff';
}

function applyBranding(b: Branding) {
  const root = document.documentElement.style;
  root.setProperty('--brand-primary', b.primaryColor);
  root.setProperty('--brand-accent', b.accentColor);
  root.setProperty('--brand-primary-fg', contrastColor(b.primaryColor));
  document.title = b.productName;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = b.faviconUrl;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data, error, refetch } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => unwrap(await api.GET('/api/v1/public/branding')),
    staleTime: 3_600_000,
  });
  useEffect(() => {
    if (data) applyBranding(data);
  }, [data]);
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <p className="text-sm text-gray-800">The service could not be reached.</p>
        <button type="button" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return null;
  return <BrandingContext.Provider value={data}>{children}</BrandingContext.Provider>;
}

interface SessionValue {
  user: SessionUser | null;
  loading: boolean;
  can: (...permissions: string[]) => boolean;
  setUser: (user: SessionUser | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export const useSession = () => {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data, isLoading } = useQuery<SessionUser | null>({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return unwrap(await api.GET('/api/v1/auth/me'));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    setCsrfToken(data?.csrfToken ?? null);
  }, [data]);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setCsrfToken(null);
      client.setQueryData(['session'], null);
    });
  }, [client]);

  const value = useMemo<SessionValue>(
    () => ({
      user: data ?? null,
      loading: isLoading,
      can: (...permissions) => permissions.some((p) => data?.permissions.includes(p)),
      setUser: (user) => {
        setCsrfToken(user?.csrfToken ?? null);
        client.setQueryData(['session'], user);
        if (!user) client.removeQueries({ predicate: (q) => !['session', 'branding'].includes(q.queryKey[0] as string) });
      },
    }),
    [data, isLoading, client],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
