/**
 * Autosave for result entry, as plain logic with no React in it.
 *
 * Saves run one at a time, because each one sends the version the previous one returned. Edits made
 * while a save is running wait for the next one, so a version never races and nothing is lost.
 */
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'failed';

export interface AutosaveOptions<P, R> {
  version: number;
  /** Quiet time after the last edit before saving. */
  delayMs?: number;
  /** Time before a failed save that can be retried runs again. */
  retryMs?: number;
  /** Combines two unsaved patches; values in `newer` win. */
  merge: (older: P, newer: P) => P;
  save: (patch: P, version: number) => Promise<R>;
  versionOf: (result: R) => number;
  onSaved?: (result: R, patch: P) => void;
  /** What to keep for another attempt; null drops it. Keeps everything when omitted. */
  onFailed?: (error: unknown, patch: P) => P | null;
  shouldRetry?: (error: unknown) => boolean;
  onStatus?: (status: SaveStatus) => void;
}

export class AutosaveQueue<P, R> {
  private pending: P | null = null;
  private running: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private currentVersion: number;
  private currentStatus: SaveStatus = 'idle';

  constructor(private readonly options: AutosaveOptions<P, R>) {
    this.currentVersion = options.version;
  }

  get version() {
    return this.currentVersion;
  }

  get status() {
    return this.currentStatus;
  }

  /** Edits waiting for a save. The one being sent right now is not included. */
  get unsent(): P | null {
    return this.pending;
  }

  hasUnsaved() {
    return this.pending !== null || this.running !== null;
  }

  /** Takes a version seen elsewhere, such as after a stage action. Versions only ever go up. */
  observeVersion(version: number) {
    if (version > this.currentVersion) this.currentVersion = version;
  }

  edit(patch: P) {
    this.pending = this.pending === null ? patch : this.options.merge(this.pending, patch);
    if (!this.running) this.setStatus('pending');
    this.arm(this.options.delayMs ?? 800);
  }

  /** Saves everything now. Resolves true once nothing is left unsaved, false if a save failed. */
  async flush(): Promise<boolean> {
    this.disarm();
    for (;;) {
      if (this.running) {
        if (!(await this.running)) return false;
      } else if (this.pending !== null) {
        if (!(await this.run())) return false;
      } else {
        return true;
      }
    }
  }

  dispose() {
    this.disarm();
  }

  private run(): Promise<boolean> {
    const patch = this.pending as P;
    this.pending = null;
    this.setStatus('saving');
    this.running = this.options.save(patch, this.currentVersion).then(
      (result) => {
        this.observeVersion(this.options.versionOf(result));
        this.running = null;
        this.options.onSaved?.(result, patch);
        this.setStatus(this.pending === null ? 'saved' : 'pending');
        return true;
      },
      (error: unknown) => {
        this.running = null;
        const keep = this.options.onFailed ? this.options.onFailed(error, patch) : patch;
        if (keep !== null) this.pending = this.pending === null ? keep : this.options.merge(keep, this.pending);
        this.setStatus('failed');
        // Newer edits made while this save ran still need sending, even if this patch was dropped.
        if (this.pending !== null && (this.options.shouldRetry?.(error) ?? true)) this.arm(this.options.retryMs ?? 5000);
        return false;
      },
    );
    return this.running;
  }

  private arm(ms: number) {
    this.disarm();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  private disarm() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private setStatus(status: SaveStatus) {
    if (status === this.currentStatus) return;
    this.currentStatus = status;
    this.options.onStatus?.(status);
  }
}

/** What result entry saves: parameter values by id, and the fields around them. */
export interface EntryPatch {
  values?: Record<string, string | null>;
  instrumentId?: string | null;
  remarks?: string | null;
  observations?: string | null;
  notes?: string | null;
}

export function mergeEntryPatch(older: EntryPatch, newer: EntryPatch): EntryPatch {
  const merged: EntryPatch = { ...older, ...newer };
  if (older.values || newer.values) merged.values = { ...older.values, ...newer.values };
  return merged;
}

/** The fields a patch holds, named the same way as the drafts on screen. */
export function patchKeys(patch: EntryPatch | null): string[] {
  if (!patch) return [];
  const { values, ...rest } = patch;
  return [...Object.keys(values ?? {}), ...Object.keys(rest)];
}

/**
 * Applies what the server returned to the fields on screen. A field being typed in, or holding an
 * edit not yet sent, keeps what the user has; every other field shows the server's value.
 */
export function reconcileDrafts(drafts: Record<string, string>, server: Record<string, string>, keep: ReadonlySet<string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(server)) next[key] = keep.has(key) && key in drafts ? drafts[key] : value;
  return next;
}

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/** Format check only, so half-typed text is not sent. The server does all the arithmetic. */
export const isNumberText = (text: string) => NUMBER.test(text.trim());
/** A numeric result as an analyst may type it: a number, or "<0.005" / ">250" when it is below or above what the method can measure. */
export const isResultText = (text: string) => isNumberText(text.trim().replace(/^[<>]\s*/, ''));
