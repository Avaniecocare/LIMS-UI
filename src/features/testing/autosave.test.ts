import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveQueue, isNumberText, mergeEntryPatch, patchKeys, reconcileDrafts, type EntryPatch, type SaveStatus } from './autosave';

interface Saved {
  version: number;
  patch: EntryPatch;
}

function setup(overrides: Partial<ConstructorParameters<typeof AutosaveQueue<EntryPatch, Saved>>[0]> = {}) {
  const calls: { patch: EntryPatch; version: number; finish: () => void; fail: (e: unknown) => void }[] = [];
  const statuses: SaveStatus[] = [];
  const queue = new AutosaveQueue<EntryPatch, Saved>({
    version: 1,
    delayMs: 800,
    retryMs: 5000,
    merge: mergeEntryPatch,
    versionOf: (r) => r.version,
    onStatus: (s) => statuses.push(s),
    save: (patch, version) =>
      new Promise((resolve, reject) => {
        calls.push({ patch, version, finish: () => resolve({ version: version + 1, patch }), fail: reject });
      }),
    ...overrides,
  });
  return { queue, calls, statuses };
}

const settle = () => vi.advanceTimersByTimeAsync(0);

describe('AutosaveQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('still sends an edit made during a save whose own patch was refused and dropped', async () => {
    const { queue, calls } = setup({ onFailed: () => null, shouldRetry: () => true });
    queue.edit({ values: { a: 'bad' } });
    await vi.advanceTimersByTimeAsync(800);
    queue.edit({ values: { b: '2' } });
    calls[0].fail(new Error('refused'));
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(2);
    expect(calls[1].patch).toEqual({ values: { b: '2' } });
  });

  it('does not retry when nothing is left to send', async () => {
    const { queue, calls } = setup({ onFailed: () => null, shouldRetry: () => true });
    queue.edit({ values: { a: 'bad' } });
    await vi.advanceTimersByTimeAsync(800);
    calls[0].fail(new Error('refused'));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(1);
  });

  it('waits for a pause in typing, then saves the latest values together', async () => {
    const { queue, calls } = setup();
    queue.edit({ values: { a: '1' } });
    await vi.advanceTimersByTimeAsync(500);
    queue.edit({ values: { a: '12', b: '3' } });
    await vi.advanceTimersByTimeAsync(500);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(300);
    expect(calls).toHaveLength(1);
    expect(calls[0].patch).toEqual({ values: { a: '12', b: '3' } });
  });

  it('never runs two saves at once, and each uses the version the last one returned', async () => {
    const { queue, calls } = setup();
    queue.edit({ values: { a: '1' } });
    await vi.advanceTimersByTimeAsync(800);
    queue.edit({ values: { a: '2' } });
    await vi.advanceTimersByTimeAsync(800);
    queue.edit({ values: { a: '3' } });
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(1);
    calls[0].finish();
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1].version).toBe(2);
    expect(calls[1].patch).toEqual({ values: { a: '3' } });
    calls[1].finish();
    await settle();
    expect(queue.version).toBe(3);
    expect(queue.hasUnsaved()).toBe(false);
  });

  it('flush saves at once, waits for the save in flight, and reports success', async () => {
    const { queue, calls } = setup();
    queue.edit({ notes: 'x' });
    const first = queue.flush();
    await settle();
    expect(calls).toHaveLength(1);
    queue.edit({ notes: 'y' });
    let done = false;
    const second = queue.flush().then((ok) => {
      done = ok;
      return ok;
    });
    calls[0].finish();
    await settle();
    expect(calls).toHaveLength(2);
    expect(done).toBe(false);
    calls[1].finish();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(queue.status).toBe('saved');
  });

  it('flush with nothing to save resolves straight away', async () => {
    const { queue, calls } = setup();
    expect(await queue.flush()).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('keeps a failed patch, merges newer edits over it, and retries', async () => {
    const { queue, calls, statuses } = setup();
    queue.edit({ values: { a: '1', b: '1' } });
    const flushed = queue.flush();
    await settle();
    queue.edit({ values: { a: '2' } });
    calls[0].fail(new Error('network'));
    expect(await flushed).toBe(false);
    expect(queue.status).toBe('failed');
    expect(queue.hasUnsaved()).toBe(true);
    expect(queue.unsent).toEqual({ values: { a: '2', b: '1' } });
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(2);
    expect(calls[1].version).toBe(1);
    expect(calls[1].patch).toEqual({ values: { a: '2', b: '1' } });
    calls[1].finish();
    await settle();
    expect(statuses.at(-1)).toBe('saved');
  });

  it('does not retry an error that needs a person, and drops what onFailed drops', async () => {
    const { queue, calls } = setup({ onFailed: () => null, shouldRetry: () => false });
    queue.edit({ notes: 'x' });
    const flushed = queue.flush();
    await settle();
    calls[0].fail(new Error('conflict'));
    expect(await flushed).toBe(false);
    expect(queue.hasUnsaved()).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(1);
  });

  it('can keep part of a patch when only part of it was refused', async () => {
    const { queue, calls } = setup({
      onFailed: (_e, patch) => ({ ...patch, instrumentId: undefined }),
    });
    queue.edit({ instrumentId: 'blocked', values: { a: '1' } });
    const flushed = queue.flush();
    await settle();
    calls[0].fail(new Error('blocked'));
    await flushed;
    expect(queue.unsent).toEqual({ values: { a: '1' }, instrumentId: undefined });
  });

  it('calls onSaved with unsent edits still visible, so fields being edited can be kept', async () => {
    let unsentAtResponse: EntryPatch | null = null;
    const holder: { q?: AutosaveQueue<EntryPatch, Saved> } = {};
    const made = setup({ onSaved: () => (unsentAtResponse = holder.q!.unsent) });
    holder.q = made.queue;
    made.queue.edit({ values: { a: '1' } });
    const flushed = made.queue.flush();
    await settle();
    made.queue.edit({ values: { a: '12' } });
    made.calls[0].finish();
    await settle();
    expect(unsentAtResponse).toEqual({ values: { a: '12' } });
    made.calls[1].finish();
    await flushed;
  });

  it('only moves the version forward', () => {
    const { queue } = setup();
    queue.observeVersion(5);
    queue.observeVersion(3);
    expect(queue.version).toBe(5);
  });
});

describe('patches', () => {
  it('merges values by parameter and keeps other fields', () => {
    expect(mergeEntryPatch({ values: { a: '1' }, remarks: 'r' }, { values: { b: '2' }, notes: 'n' })).toEqual({ values: { a: '1', b: '2' }, remarks: 'r', notes: 'n' });
    expect(mergeEntryPatch({ remarks: 'r' }, { remarks: null })).toEqual({ remarks: null });
  });

  it('names the fields a patch holds', () => {
    expect(patchKeys({ values: { a: '1' }, instrumentId: null })).toEqual(['a', 'instrumentId']);
    expect(patchKeys(null)).toEqual([]);
  });
});

describe('reconcileDrafts', () => {
  it('shows server values except in fields that are being edited', () => {
    expect(reconcileDrafts({ a: '12', b: '3', c: 'old' }, { a: '1.00', b: '3.00', c: 'new', d: '' }, new Set(['a']))).toEqual({ a: '12', b: '3.00', c: 'new', d: '' });
  });

  it('takes the server value for a kept field that has no draft yet', () => {
    expect(reconcileDrafts({}, { a: '1.00' }, new Set(['a']))).toEqual({ a: '1.00' });
  });
});

describe('isNumberText', () => {
  it.each(['1', '1.5', '.5', '5.', '-2', '+2', '1e3'])('accepts %s', (t) => expect(isNumberText(t)).toBe(true));
  it.each(['', '-', '.', 'abc', '1.2.3', '12a'])('refuses %s', (t) => expect(isNumberText(t)).toBe(false));
});
