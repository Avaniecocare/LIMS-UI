import { useSyncExternalStore } from 'react';

/** Whether a media query matches now, kept current as the window changes. False where there is no window. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null;
      m?.addEventListener('change', onChange);
      return () => m?.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}
