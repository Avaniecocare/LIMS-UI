import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebcamCapture } from './WebcamCapture';

const setDevices = (getUserMedia?: unknown) => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: getUserMedia ? { getUserMedia } : undefined });

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => setDevices(undefined));

const image = new File(['x'], 'page.png', { type: 'image/png' });

describe('WebcamCapture', () => {
  it('starts the camera from the button press and stops every track on close', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }, { stop }] });
    setDevices(getUserMedia);
    const user = userEvent.setup();
    render(<WebcamCapture title="Capture pages" onSave={vi.fn()} />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Use camera' }));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Capture' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('stops tracks when unmounted while open', async () => {
    const stop = vi.fn();
    setDevices(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
    const user = userEvent.setup();
    const { unmount } = render(<WebcamCapture title="Capture pages" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Use camera' }));
    await screen.findByRole('button', { name: 'Capture' });
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops a camera that finishes starting after the dialog closed', async () => {
    const stop = vi.fn();
    let resolve: (s: unknown) => void = () => undefined;
    setDevices(vi.fn(() => new Promise((r) => (resolve = r))));
    const user = userEvent.setup();
    render(<WebcamCapture title="Capture pages" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Use camera' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    resolve({ getTracks: () => [{ stop }] });
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  it('explains a denied camera and still accepts uploaded files', async () => {
    setDevices(vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')));
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WebcamCapture title="Capture pages" onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Use camera' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('denied');
    expect(screen.queryByRole('button', { name: 'Capture' })).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText('Choose image files for Capture pages'), image);
    expect(screen.getByRole('status')).toHaveTextContent('1 image ready');
    await user.click(screen.getByRole('button', { name: /Save 1 image/ }));
    expect(onSave).toHaveBeenCalledWith([image]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('falls back when the browser has no camera API', async () => {
    setDevices(undefined);
    const user = userEvent.setup();
    render(<WebcamCapture title="Capture pages" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Use camera' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No camera is available');
  });

  it('keeps the dialog and the images when saving fails', async () => {
    setDevices(undefined);
    const onSave = vi.fn().mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    render(<WebcamCapture title="Capture pages" onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Use camera' }));
    await user.upload(screen.getByLabelText('Choose image files for Capture pages'), image);
    await user.click(screen.getByRole('button', { name: /Save 1 image/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 image ready');
  });
});
