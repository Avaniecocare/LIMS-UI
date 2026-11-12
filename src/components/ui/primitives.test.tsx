import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Field, Input, PageHeader } from './primitives';

describe('Field', () => {
  it('links the hint to its input', () => {
    render(
      <Field label="Email" htmlFor="email" hint="We send reports here" required>
        <Input id="email" />
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAccessibleDescription('We send reports here');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('links the error to its input and marks it invalid', () => {
    render(
      <Field label="Email" htmlFor="email" hint="We send reports here" error="Enter a valid email">
        <Input id="email" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it("keeps the control's own aria-invalid", () => {
    render(
      <Field label="Code" htmlFor="code" error="Taken">
        <Input id="code" aria-invalid={false} />
      </Field>,
    );
    expect(screen.getByLabelText('Code')).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('PageHeader', () => {
  it('names the browser tab after the heading', () => {
    render(
      <MemoryRouter>
        <PageHeader title={<span>Invoice INV-1</span>} />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Invoice INV-1');
  });
});

describe('focus on navigation', () => {
  it('moves focus to the new page heading', async () => {
    const router = createMemoryRouter(
      [
        { path: '/first', element: <PageHeader title="First page" /> },
        { path: '/second', element: <PageHeader title="Second page" /> },
      ],
      { initialEntries: ['/first'] },
    );
    render(<RouterProvider router={router} />);
    await act(() => router.navigate('/second'));
    expect(screen.getByRole('heading', { level: 1, name: 'Second page' })).toHaveFocus();
    expect(document.title).toBe('Second page');
  });
});
