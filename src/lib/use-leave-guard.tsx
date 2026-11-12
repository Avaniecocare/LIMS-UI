import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/primitives';

/**
 * Warns before unsaved changes are lost: in-app navigation to another page asks first, and closing or
 * reloading the tab gets the browser's own prompt. The same pattern as result entry (TestDetailPage),
 * without its autosave flush.
 *
 * Render `dialog` somewhere in the page. Wrap a navigation that follows a successful save in
 * `leaveWithoutPrompt(() => navigate(...))`; the router checks blockers synchronously, so this lets
 * exactly that navigation through.
 *
 * React Router honours one blocker at a time, so use this once per screen.
 */
export function useLeaveGuard(dirty: boolean, description = 'Your changes have not been saved. They will be lost if you leave this page.'): { dialog: ReactNode; leaveWithoutPrompt: (go: () => void) => void } {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const skip = useRef(false);

  const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => !skip.current && dirtyRef.current && currentLocation.pathname !== nextLocation.pathname, []);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && !skip.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const leaveWithoutPrompt = useCallback((go: () => void) => {
    skip.current = true;
    try {
      go();
    } finally {
      skip.current = false;
    }
  }, []);

  const dialog = (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(o) => {
        if (!o) blocker.reset?.();
      }}
      title="Leave without saving?"
      description={description}
      confirmLabel="Leave anyway"
      danger
      onConfirm={() => blocker.proceed?.()}
    />
  );
  return { dialog, leaveWithoutPrompt };
}

/**
 * For a dialog holding a form: closing it with unsaved changes (Escape, the X, Cancel) asks first.
 * Pass `requestClose` to the dialog's onOpenChange(false) and render `dialog`.
 */
export function useCloseGuard(dirty: boolean, close: () => void): { requestClose: () => void; dialog: ReactNode } {
  const [asking, setAsking] = useState(false);
  const requestClose = () => (dirty ? setAsking(true) : close());
  const dialog = (
    <ConfirmDialog
      open={asking}
      onOpenChange={setAsking}
      title="Discard your changes?"
      description="What you have entered here has not been saved."
      confirmLabel="Discard changes"
      danger
      onConfirm={() => {
        setAsking(false);
        close();
      }}
    />
  );
  return { requestClose, dialog };
}

type Report = (key: string, dirty: boolean) => void;
const DirtyContext = createContext<Report | null>(null);

/**
 * Collects the unsaved state of many small forms under one screen (settings rows, terms, a dialog), so
 * the screen can use a single useLeaveGuard. Scopes nest: a report also reaches every enclosing scope.
 * Provide `report` with <DirtyScope value={scope.report}>.
 */
export function useDirtyScope(): { dirty: boolean; report: Report } {
  const parent = useContext(DirtyContext);
  const [keys, setKeys] = useState<ReadonlySet<string>>(() => new Set());
  const report = useCallback<Report>(
    (key, dirty) => {
      parent?.(key, dirty);
      setKeys((prev) => {
        if (prev.has(key) === dirty) return prev;
        const next = new Set(prev);
        if (dirty) next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [parent],
  );
  return { dirty: keys.size > 0, report };
}

export const DirtyScope = DirtyContext.Provider;

/** Tells the enclosing DirtyScope whether this form has unsaved changes; cleared when it unmounts. */
export function useReportDirty(dirty: boolean) {
  const report = useContext(DirtyContext);
  const key = useId();
  useEffect(() => {
    if (!report) return;
    report(key, dirty);
    return () => report(key, false);
  }, [report, key, dirty]);
}
