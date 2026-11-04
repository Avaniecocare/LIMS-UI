import { Component, useEffect, type ReactNode } from 'react';
import { useRouteError } from 'react-router-dom';
import { reportError } from '@/lib/error-reporting';

/** Plain elements only: this must still render when the rest of the app cannot. */
export function CrashMessage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
      <h1 className="text-lg font-semibold text-gray-900">Something went wrong on this page</h1>
      <p className="max-w-md text-sm text-gray-800">Your saved work is safe. Reload the page to carry on. If this keeps happening, tell your administrator what you were doing.</p>
      <button type="button" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50" onClick={() => window.location.reload()}>
        Reload page
      </button>
    </div>
  );
}

/** Top-level boundary, for anything that fails outside the router's own handling. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    return this.state.failed ? <CrashMessage /> : this.props.children;
  }
}

/** The router catches errors in its routes before a React boundary can, so routes report here. */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => reportError(error), [error]);
  return <CrashMessage />;
}
