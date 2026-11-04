import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createScanDetector, isEditableTarget, useGlobalScanner } from './scanner';

function feedAll(detector: ReturnType<typeof createScanDetector>, keys: string[], gap: number, start = 1000) {
  let result: string | null = null;
  keys.forEach((key, i) => {
    result = detector.feed(key, start + i * gap);
  });
  return result;
}

describe('createScanDetector', () => {
  it('returns the code for a fast burst ending in Enter', () => {
    expect(feedAll(createScanDetector(), [...'S-0042', 'Enter'], 10)).toBe('S-0042');
  });
  it('ignores human-speed typing', () => {
    expect(feedAll(createScanDetector(), [...'S-0042', 'Enter'], 120)).toBeNull();
  });
  it('ignores bursts shorter than the minimum', () => {
    expect(feedAll(createScanDetector(), [...'abc', 'Enter'], 5)).toBeNull();
  });
  it('accepts the gap limit and rejects just past it', () => {
    expect(feedAll(createScanDetector(), [...'ABCD', 'Enter'], 30)).toBe('ABCD');
    expect(feedAll(createScanDetector(), [...'ABCD', 'Enter'], 31)).toBeNull();
  });
  it('starts over after a slow character, so a pause splits the code', () => {
    const d = createScanDetector();
    d.feed('x', 0);
    expect(feedAll(d, [...'ABCD', 'Enter'], 5, 500)).toBe('ABCD');
  });
  it('does not treat a late Enter as the end of a scan', () => {
    const d = createScanDetector();
    feedAll(d, [...'ABCD'], 5);
    expect(d.feed('Enter', 5000)).toBeNull();
  });
  it('lets Shift through, because scanners use it for capitals', () => {
    expect(feedAll(createScanDetector(), ['Shift', 'A', 'Shift', 'B', 'C', 'D', 'Enter'], 5)).toBe('ABCD');
  });
  it('resets on navigation keys', () => {
    expect(feedAll(createScanDetector(), ['A', 'B', 'Tab', 'C', 'D', 'Enter'], 5)).toBeNull();
  });
  it('does not reuse a buffer once Enter has consumed it', () => {
    const d = createScanDetector();
    expect(feedAll(d, [...'ABCD', 'Enter'], 5)).toBe('ABCD');
    expect(d.feed('Enter', 1030)).toBeNull();
  });
});

function Harness({ onScan }: { onScan: (c: string) => void }) {
  useGlobalScanner(onScan);
  return (
    <>
      <input aria-label="field" />
      <button type="button">action</button>
    </>
  );
}

function keydown(target: Element, key: string, timeStamp: number) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe('useGlobalScanner', () => {
  it('fires for a burst on the page and swallows the Enter', () => {
    const onScan = vi.fn();
    render(<Harness onScan={onScan} />);
    [...'S-01'].forEach((k, i) => keydown(document.body, k, 100 + i * 5));
    const enter = keydown(document.body, 'Enter', 125);
    expect(onScan).toHaveBeenCalledWith('S-01');
    expect(enter.defaultPrevented).toBe(true);
  });
  it('fires when a button has focus', () => {
    const onScan = vi.fn();
    render(<Harness onScan={onScan} />);
    const button = screen.getByRole('button');
    [...'S-01'].forEach((k, i) => keydown(button, k, 100 + i * 5));
    keydown(button, 'Enter', 125);
    expect(onScan).toHaveBeenCalledWith('S-01');
  });
  it('never intercepts typing in a field', () => {
    const onScan = vi.fn();
    render(<Harness onScan={onScan} />);
    const input = screen.getByLabelText('field');
    [...'S-01'].forEach((k, i) => keydown(input, k, 100 + i * 5));
    const enter = keydown(input, 'Enter', 125);
    expect(onScan).not.toHaveBeenCalled();
    expect(enter.defaultPrevented).toBe(false);
  });
  it('leaves slow typing and keyboard shortcuts alone', () => {
    const onScan = vi.fn();
    render(<Harness onScan={onScan} />);
    [...'S-01'].forEach((k, i) => keydown(document.body, k, 100 + i * 200));
    const enter = keydown(document.body, 'Enter', 1000);
    expect(onScan).not.toHaveBeenCalled();
    expect(enter.defaultPrevented).toBe(false);
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true });
    expect(onScan).not.toHaveBeenCalled();
  });
  it('removes its listener on unmount', () => {
    const onScan = vi.fn();
    const { unmount } = render(<Harness onScan={onScan} />);
    unmount();
    [...'S-01'].forEach((k, i) => keydown(document.body, k, 100 + i * 5));
    keydown(document.body, 'Enter', 125);
    expect(onScan).not.toHaveBeenCalled();
  });
});

describe('isEditableTarget', () => {
  it('recognises fields only', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
