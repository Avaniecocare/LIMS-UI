import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setErrorReporter } from '@/lib/error-reporting';
import { ErrorBoundary } from './ErrorBoundary';

function Broken(): never {
  throw new Error('render failed for someone@demo.example');
}

afterEach(() => setErrorReporter(null));

describe('ErrorBoundary', () => {
  it('shows a reload button and reports without personal data', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reporter = vi.fn();
    setErrorReporter(reporter);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(reporter).toHaveBeenCalledOnce();
    expect(reporter.mock.calls[0][0].message).toBe('render failed for [email]');
    quiet.mockRestore();
  });
});
