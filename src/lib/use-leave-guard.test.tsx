import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useLeaveGuard } from './use-leave-guard';

function Editor() {
  const [text, setText] = useState('');
  const navigate = useNavigate();
  const guard = useLeaveGuard(text !== '');
  return (
    <>
      <label htmlFor="t">Text</label>
      <input id="t" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={() => guard.leaveWithoutPrompt(() => navigate('/saved'))}>
        Save
      </button>
      {guard.dialog}
    </>
  );
}

const setup = () => {
  const router = createMemoryRouter(
    [
      { path: '/edit', element: <Editor /> },
      { path: '/other', element: <p>Other page</p> },
      { path: '/saved', element: <p>Saved page</p> },
    ],
    { initialEntries: ['/edit'] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe('useLeaveGuard', () => {
  it('lets a clean page go without asking', async () => {
    const router = setup();
    await act(() => router.navigate('/other'));
    expect(screen.getByText('Other page')).toBeInTheDocument();
  });

  it('asks before unsaved changes are lost, and stays on Cancel', async () => {
    const router = setup();
    await userEvent.type(screen.getByLabelText('Text'), 'abc');
    await act(() => router.navigate('/other'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Leave without saving?');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Text')).toHaveValue('abc');
    await act(() => router.navigate('/other'));
    await userEvent.click(screen.getByRole('button', { name: 'Leave anyway' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
  });

  it('lets the navigation after a save through', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Text'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved page')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks the browser before the tab closes with unsaved changes', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Text'), 'abc');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
