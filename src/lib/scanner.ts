import { useEffect, useRef } from 'react';

/** Keyboard-mode scanners type far faster than a person. These gaps separate the two. */
export const SCAN_MAX_GAP_MS = 30;
export const SCAN_MIN_LENGTH = 4;

const IGNORED_KEYS = new Set(['Shift', 'CapsLock', 'NumLock', 'Dead']);

/**
 * Pure burst detector: feed it every keydown with its timestamp. It returns the scanned code when
 * Enter ends a run of at least `minLength` characters that arrived no more than `maxGapMs` apart.
 */
export function createScanDetector({ maxGapMs = SCAN_MAX_GAP_MS, minLength = SCAN_MIN_LENGTH } = {}) {
  let buffer = '';
  let last = Number.NEGATIVE_INFINITY;
  const reset = () => {
    buffer = '';
    last = Number.NEGATIVE_INFINITY;
  };
  return {
    feed(key: string, at: number): string | null {
      if (IGNORED_KEYS.has(key)) return null;
      if (key === 'Enter') {
        const code = buffer.length >= minLength && at - last <= maxGapMs ? buffer : null;
        reset();
        return code;
      }
      if (key.length !== 1) {
        reset();
        return null;
      }
      buffer = at - last <= maxGapMs ? buffer + key : key;
      last = at;
      return null;
    },
    reset,
  };
}

/** Typing in a field belongs to that field; only unfocused input can be a global scan. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.getAttribute('contenteditable') === 'true';
}

/** Calls `onScan` when a scanner fires while no field is focused, from any screen. */
export function useGlobalScanner(onScan: (code: string) => void) {
  const handler = useRef(onScan);
  useEffect(() => {
    handler.current = onScan;
  }, [onScan]);
  useEffect(() => {
    const detector = createScanDetector();
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
        detector.reset();
        return;
      }
      const code = detector.feed(e.key, e.timeStamp);
      if (code) {
        // The terminating Enter must not also press whichever button has focus.
        e.preventDefault();
        e.stopPropagation();
        handler.current(code);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
