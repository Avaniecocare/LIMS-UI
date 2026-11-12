import { useSyncExternalStore } from 'react';

/** The person's choice. "system" follows the operating system's light or dark setting. */
export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

// A display preference only: never anything about the session or the person's data.
const KEY = 'lims.theme';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function themePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolvedTheme(pref = themePreference()): Theme {
  return pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref;
}

/** Puts the theme on <html>, where the tokens in index.css pick it up. */
export function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Private browsing without storage: the choice lasts until the page is reloaded.
  }
  applyTheme();
}

/** Called once, before the first render, so the page never flashes the wrong theme. */
export function installTheme() {
  applyTheme();
  media?.addEventListener('change', () => themePreference() === 'system' && applyTheme());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The choice and what it resolves to, kept current for components (the theme menu, the toaster). */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, themePreference, () => 'system' as const);
  const theme = useSyncExternalStore(
    subscribe,
    () => resolvedTheme(),
    () => 'light' as const,
  );
  return { preference, theme, setPreference: setThemePreference };
}
