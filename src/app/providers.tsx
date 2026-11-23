import { QueryCache, QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

const DARK_TEXT = '#111827';

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Readable text on the brand colour: whichever of white or near-black gives the higher WCAG contrast. */
export function contrastColor(hex: string): string {
  return contrastRatio(hex, DARK_TEXT) >= contrastRatio(hex, '#ffffff') ? DARK_TEXT : '#ffffff';
}

/** Mixes a colour towards black until it reaches `min`:1 against `against` (WCAG 1.4.11 for focus rings). */
export function focusColor(hex: string, against = '#ffffff', min = 3): string {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let k = 0; k <= 20; k++) {
    const f = 1 - k / 20;
    const c =
      '#' +
      rgb
        .map((v) =>
          Math.round(v * f)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    if (contrastRatio(c, against) >= min) return c;
  }
  return DARK_TEXT;
}

/** Mixes a colour towards white until it reaches `min`:1 against a dark `against` (the dark theme's brand colour). */
export function lightenToContrast(hex: string, against: string, min: number): string {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let k = 0; k <= 20; k++) {
    const f = k / 20;
    const c =
      '#' +
      rgb
        .map((v) =>
          Math.round(v + (255 - v) * f)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    if (contrastRatio(c, against) >= min) return c;
  }
  return '#ffffff';
}

/** The dark theme's surface (index.css --surface), which brand colours are measured against there. */
export const DARK_SURFACE = '#161a21';
const DARK_NAV = '#11151b';

/** `color-mix(in srgb, hex share, white)` as a #rrggbb colour, matching the body background in index.css. */
function mixWithWhite(hex: string, share: number): string {
  const n = parseInt(hex.slice(1), 16);
  return (
    '#' +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) =>
        Math.round(v * share + 255 * (1 - share))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

export function applyBranding(b: Branding) {
  const root = document.documentElement.style;
  root.setProperty('--brand-primary', b.primaryColor);
  root.setProperty('--brand-accent', b.accentColor);
  root.setProperty('--brand-surface', b.surfaceColor);
  root.setProperty('--brand-nav', b.navColor);
  root.setProperty('--brand-nav-fg', contrastColor(b.navColor));
  root.setProperty('--brand-primary-fg', contrastColor(b.primaryColor));
  // The page background is a near-white tint of the surface colour; the ring must stay >= 3:1 on it.
  root.setProperty('--brand-focus', focusColor(b.primaryColor, mixWithWhite(b.surfaceColor, 0.5)));
  // Dark theme: the brand colour lightened until it reads as text on dark surfaces (4.5:1), and a menu that stays dark.
  const primaryDark = lightenToContrast(b.primaryColor, DARK_SURFACE, 4.5);
  root.setProperty('--brand-primary-dark', primaryDark);
  root.setProperty('--brand-primary-dark-fg', contrastColor(primaryDark));
  root.setProperty('--brand-focus-dark', lightenToContrast(b.primaryColor, '#0e1116', 3));
  const navDark = luminance(b.navColor) <= luminance('#2a3140') ? b.navColor : DARK_NAV;
  root.setProperty('--brand-nav-dark', navDark);
  root.setProperty('--brand-nav-dark-fg', contrastColor(navDark));
  // The phone's status bar and the installed app's title bar take the lab's menu colour.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', b.navColor);
  // Pages add their own name in front (usePageTitle); keep it when it is already there.
  if (!document.title.endsWith(b.productName)) document.title = b.productName;
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
    // Branding is edited in the admin panel while people are working: pick changes up within minutes, and on return to the tab.
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (data) applyBranding(data);
  }, [data]);
  // Only before the first answer: a later refresh that fails must not take away what people are working on.
  if (error && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <p className="text-sm text-gray-800">The service could not be reached.</p>
        <button type="button" className="rounded-md border border-gray-300 bg-surface px-3 py-1.5 text-sm" onClick={() => refetch()}>
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
  /** whether the laboratory has this module turned on (Admin, Modules) */
  moduleOn: (module: string) => boolean;
  setUser: (user: SessionUser | null) => void;
  /** set while an admin previews the interface as another role */
  preview: { role: string; permissions: string[] } | null;
  setPreview: (preview: { role: string; permissions: string[] } | null) => void;
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

  // "Preview as role": an admin sees the screens as a role would. Only the interface changes; the server keeps
  // checking the admin's own permissions, and the preview is never stored, so a reload ends it.
  const [preview, setPreview] = useState<{ role: string; permissions: string[] } | null>(null);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setCsrfToken(null);
      client.setQueryData(['session'], null);
      // Whoever signs in next must not see this person's screens while theirs load.
      client.removeQueries({ predicate: (q) => !['session', 'branding'].includes(q.queryKey[0] as string) });
      setPreview(null);
    });
  }, [client]);

  const value = useMemo<SessionValue>(
    () => ({
      user: data ?? null,
      loading: isLoading,
      can: (...permissions) => permissions.some((p) => data?.permissions.includes(p) && (!preview || preview.permissions.includes(p))),
      moduleOn: (module) => !data?.modules || data.modules.includes(module),
      preview,
      setPreview,
      setUser: (user) => {
        setCsrfToken(user?.csrfToken ?? null);
        client.setQueryData(['session'], user);
        setPreview(null);
        if (!user) client.removeQueries({ predicate: (q) => !['session', 'branding'].includes(q.queryKey[0] as string) });
      },
    }),
    [data, isLoading, client, preview],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
