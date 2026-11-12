import { useEffect, useRef, useState } from 'react';

/** Motion tokens for code that animates from script (the CSS tokens are in index.css). */
export const MOTION = { fast: 140, base: 200, slow: 320, enter: 'cubic-bezier(0.16, 1, 0.3, 1)' } as const;

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Each number counts up the first time it appears in a visit, not on every refresh or revisit.
const counted = new Set<string>();

/**
 * Counts from 0 to `target` over about half a second, once per key per visit. Returns null when there is nothing
 * to animate (already shown, reduced motion, not a plain number), so the caller shows the real text as it is.
 */
export function useCountUp(key: string, target: number | null, duration = 600): number | null {
  const animate = useRef(target !== null && Number.isFinite(target) && target > 0 && !counted.has(key) && !prefersReducedMotion());
  const [value, setValue] = useState<number | null>(animate.current ? 0 : null);
  useEffect(() => {
    if (!animate.current || target === null) return;
    counted.add(key);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      if (t >= 1) return setValue(null);
      setValue(target * eased);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, target, duration]);
  return value;
}
