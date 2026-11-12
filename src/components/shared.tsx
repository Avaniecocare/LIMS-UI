import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsPhone } from '@/app/device';
import { Download, Paperclip, Trash2, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, ErrorState, Field, Input, Spinner, Textarea, type ButtonProps } from '@/components/ui/primitives';
import { ApiError, api, uploadFile, unwrap } from '@/lib/api';
import { formatDateTime, humanize } from '@/lib/format';
import { PHOTO_CATEGORIES, shrinkImage } from '@/lib/shrink-image';
import { toastError } from '@/lib/forms';

type DocJob = components['schemas']['DocumentJobDto'];

/** Queues a PDF or Excel job on the server, waits for the worker, then opens the signed link. */
export async function produceDocument(kind: string, params: Record<string, unknown> = {}): Promise<DocJob> {
  return pollDocumentJob(unwrap(await api.POST('/api/v1/documents', { body: { kind, params } })));
}

/** Waits for a queued document job, whichever endpoint started it. */
export async function pollDocumentJob(started: DocJob): Promise<DocJob> {
  let job = started;
  const deadline = Date.now() + 120_000;
  while (job.status === 'QUEUED' || job.status === 'RUNNING') {
    if (Date.now() > deadline) throw new Error('This is taking longer than expected. Please try again shortly.');
    await new Promise((r) => setTimeout(r, 700));
    job = unwrap(await api.GET('/api/v1/documents/{id}', { params: { path: { id: job.id } } }));
  }
  if (job.status === 'FAILED') throw new Error(job.error ?? 'The document could not be produced');
  return job;
}

/**
 * Browsers block a tab opened long after the click, and documents can take a while. So the tab is
 * opened during the click and pointed at the signed link when it is ready.
 */
export function reserveTab() {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.opener = null;
    tab.document.title = 'Preparing the document…';
    tab.document.body.textContent = 'Preparing the document…';
  }
  return {
    show(url: string | null | undefined, name = 'Document') {
      if (!url) tab?.close();
      else if (tab) tab.location.href = url;
      else toast.success(`${name} is ready`, { action: { label: 'Open', onClick: () => window.open(url, '_blank', 'noopener') }, duration: 30_000 });
    },
    cancel: () => tab?.close(),
  };
}

/** Failures from the document worker carry their own message; show it rather than a generic one. */
export function toastDocumentError(error: unknown) {
  if (error instanceof Error && !(error instanceof ApiError)) toast.error(error.message);
  else toastError(error);
}

export function DocumentButton({ kind, params, children, ...props }: { kind: string; params?: Record<string, unknown> } & ButtonProps) {
  const client = useQueryClient();
  const m = useMutation({
    mutationFn: async (tab: ReturnType<typeof reserveTab>) => {
      try {
        const job = await produceDocument(kind, params);
        tab.show(job.url, job.filename ?? undefined);
        return job;
      } catch (e) {
        tab.cancel();
        throw e;
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['files'] }),
    onError: toastDocumentError,
  });
  return (
    <Button variant="secondary" {...props} loading={m.isPending} onClick={() => m.mutate(reserveTab())}>
      <Download aria-hidden />
      {children}
    </Button>
  );
}

const STATUS_TONE: Record<string, 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple'> = {
  DRAFT: 'gray',
  SENT: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  EXPIRED: 'gray',
  NEW: 'blue',
  QUOTED: 'purple',
  WON: 'green',
  LOST: 'gray',
  RECEIVED: 'blue',
  PLANNED: 'purple',
  ASSIGNED: 'purple',
  IN_TESTING: 'amber',
  IN_PROGRESS: 'amber',
  RESULTS_SUBMITTED: 'blue',
  REPORTING: 'purple',
  COMPLETED: 'green',
  APPROVED: 'green',
  ON_HOLD: 'amber',
  CANCELLED: 'gray',
  IN_REVIEW: 'blue',
  PENDING_APPROVAL: 'purple',
  ISSUED: 'green',
  SUPERSEDED: 'gray',
  PARTIALLY_PAID: 'amber',
  PAID: 'green',
  OVERDUE: 'red',
  QUEUED: 'gray',
  FAILED: 'red',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'gray'}>{humanize(status)}</Badge>;
}

type History = { id: string; at: string; userName: string | null; action: string; before: unknown; after: unknown; reason: string | null };

export function HistoryList({ entries }: { entries: History[] }) {
  if (!entries.length) return <EmptyState title="No history yet" />;
  return (
    <ol className="space-y-2">
      {entries.map((h) => (
        <li key={h.id} className="rounded border border-gray-200 p-2 text-[13px]">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-gray-900">{h.action}</span>
            <span className="text-gray-600">
              {formatDateTime(h.at)} · {h.userName ?? 'System'}
            </span>
          </div>
          {h.reason && <p className="mt-1 text-gray-800">Reason: {h.reason}</p>}
          <details className="mt-1">
            <summary className="cursor-pointer text-gray-600">Changes</summary>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
              <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-2 text-xs">{JSON.stringify(h.before, null, 2)}</pre>
              <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-2 text-xs">{JSON.stringify(h.after, null, 2)}</pre>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}

/** Asks for the mandatory reason before an irreversible or audited action. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onConfirm(reason.trim());
        }}
      >
        {description && <div className="text-sm text-gray-800">{description}</div>}
        {children}
        <Field label="Reason" htmlFor="reason-input" required>
          <Textarea id="reason-input" required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={!reason.trim()} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type FileRow = components['schemas']['FileDto'];

/** Stores one file against a record. */
export async function uploadEntityFile(entity: string, entityId: string, category: string, file: File): Promise<FileRow> {
  const form = new FormData();
  form.set('entity', entity);
  form.set('entityId', entityId);
  form.set('category', category);
  form.set('file', PHOTO_CATEGORIES.has(category) ? await shrinkImage(file) : file);
  return (await uploadFile('/files', form)) as FileRow;
}

/** Attachments on any record: private storage, opened through short-lived signed links. */
export function Attachments({
  entity,
  entityId,
  category,
  title = 'Attachments',
  canEdit,
  withPrintSize,
  accept = 'image/png,image/jpeg,image/webp,application/pdf',
  extraActions,
}: {
  entity: string;
  entityId: string;
  category: string;
  title?: string;
  canEdit: boolean;
  withPrintSize?: boolean;
  accept?: string;
  extraActions?: ReactNode;
}) {
  const client = useQueryClient();
  const key = ['files', entity, entityId, category];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET('/api/v1/files', { params: { query: { entity, entityId, category } } })) });
  const input = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState('80');
  const [height, setHeight] = useState('60');
  const [confirm, setConfirm] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set('entity', entity);
      form.set('entityId', entityId);
      form.set('category', category);
      if (withPrintSize) {
        form.set('printWidthMm', width);
        form.set('printHeightMm', height);
      }
      form.set('file', PHOTO_CATEGORIES.has(category) ? await shrinkImage(file) : file);
      return uploadFile('/files', form);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/files/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      setConfirm(null);
      client.invalidateQueries({ queryKey: key });
    },
    onError: toastError,
  });
  const open = async (id: string) => {
    try {
      const res = unwrap(await api.GET('/api/v1/files/{id}/url', { params: { path: { id } } }));
      window.open(res.url, '_blank', 'noopener');
    } catch (e) {
      toastError(e);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
        {canEdit && (
          <div className="flex flex-wrap items-end gap-2">
            {withPrintSize && (
              <>
                <Field label="Print width (mm)" htmlFor={`${category}-w`}>
                  <Input id={`${category}-w`} className="h-8 w-20" type="number" min={1} max={400} value={width} onChange={(e) => setWidth(e.target.value)} />
                </Field>
                <Field label="Print height (mm)" htmlFor={`${category}-h`}>
                  <Input id={`${category}-h`} className="h-8 w-20" type="number" min={1} max={400} value={height} onChange={(e) => setHeight(e.target.value)} />
                </Field>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept={accept}
              className="sr-only"
              aria-label={`Upload to ${title}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" size="sm" loading={upload.isPending} onClick={() => input.current?.click()}>
              <Paperclip aria-hidden />
              Add file
            </Button>
            {extraActions}
          </div>
        )}
      </div>
      {q.isLoading && <Spinner />}
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
      {q.data?.length === 0 && <p className="text-[13px] text-gray-600">None yet.</p>}
      <ul className="divide-y divide-gray-100">
        {q.data?.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
            <button type="button" className="truncate text-left underline" onClick={() => open(f.id)}>
              {f.originalName}
            </button>
            <span className="flex shrink-0 items-center gap-2 text-gray-600">
              {f.printWidthMm && (
                <span>
                  {f.printWidthMm}×{f.printHeightMm} mm
                </span>
              )}
              {canEdit && (
                <Button variant="ghost" size="icon" aria-label={`Remove ${f.originalName}`} onClick={() => setConfirm(f.id)}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Remove this file?"
        description="It stays in the audit history."
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onConfirm={() => confirm && remove.mutate(confirm)}
      />
    </div>
  );
}

type EmailRow = components['schemas']['EmailLogDto'];

/** Delivery log for anything the system emailed. */
export function EmailLogTable({ rows, loading, error, onRetry }: { rows: EmailRow[] | undefined; loading?: boolean; error?: unknown; onRetry?: () => void }) {
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows?.length) return <p className="text-[13px] text-gray-600">Nothing sent yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]" aria-label="Email delivery log">
        <thead className="bg-gray-50 text-left text-xs text-gray-700">
          <tr>
            <th scope="col" className="px-2 py-1.5 font-semibold">
              To
            </th>
            <th scope="col" className="px-2 py-1.5 font-semibold">
              Cc
            </th>
            <th scope="col" className="px-2 py-1.5 font-semibold">
              Subject
            </th>
            <th scope="col" className="px-2 py-1.5 font-semibold">
              Status
            </th>
            <th scope="col" className="px-2 py-1.5 font-semibold">
              Attempts
            </th>
            <th scope="col" className="px-2 py-1.5 font-semibold">
              Sent or queued
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100 align-top">
              <td className="px-2 py-1.5">{r.toAddress}</td>
              <td className="px-2 py-1.5">{r.ccAddress ?? '—'}</td>
              <td className="px-2 py-1.5">{r.subject}</td>
              <td className="px-2 py-1.5">
                <StatusBadge status={r.status} />
                {r.lastError && <p className="mt-0.5 text-xs text-red-800">{r.lastError}</p>}
              </td>
              <td className="px-2 py-1.5">{r.attempts}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{formatDateTime(r.sentAt ?? r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** From and to dates of a list filter, kept in the list's URL state. */
export function DateRangeFilter({ from, to, onChange, label = 'Date' }: { from: string; to: string; onChange: (key: 'from' | 'to', value: string | null) => void; label?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 max-sm:w-full">
      <Input className="w-36 max-sm:min-w-0 max-sm:flex-1" type="date" aria-label={`${label} from`} value={from} onChange={(e) => onChange('from', e.target.value || null)} />
      <span className="text-[13px] text-gray-600">to</span>
      <Input className="w-36 max-sm:min-w-0 max-sm:flex-1" type="date" aria-label={`${label} to`} value={to} onChange={(e) => onChange('to', e.target.value || null)} />
    </div>
  );
}

/** Saved filters: stores the list's current URL parameters under a name. */
export function SavedFilters({ screen, current, onApply }: { screen: string; current: Record<string, string>; onApply: (filters: Record<string, string>) => void }) {
  const client = useQueryClient();
  const key = ['saved-filters', screen];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET('/api/v1/me/saved-filters', { params: { query: { screen } } })) });
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const save = useMutation({
    mutationFn: () => api.POST('/api/v1/me/saved-filters', { body: { screen, name, filters: current as never } }),
    onSuccess: () => {
      setNaming(false);
      setName('');
      client.invalidateQueries({ queryKey: key });
      toast.success('Filter saved');
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/me/saved-filters/{id}', { params: { path: { id } } }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: toastError,
  });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {q.data?.map((f) => (
        <span key={f.id} className="inline-flex items-center rounded-md border border-gray-300 bg-surface text-[13px]">
          <button type="button" className="px-2 py-1 hover:bg-gray-50" onClick={() => onApply(f.filters as Record<string, string>)}>
            {f.name}
          </button>
          <button type="button" aria-label={`Delete saved filter ${f.name}`} className="border-l border-gray-300 px-1.5 py-1 text-gray-600 hover:bg-gray-50" onClick={() => remove.mutate(f.id)}>
            ×
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setNaming(true)}>
        Save filter
      </Button>
      <Dialog open={naming} onOpenChange={setNaming} title="Save this filter">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Name" htmlFor="filter-name">
            <Input id="filter-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={!name.trim()} loading={save.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

/** Search box that writes to the list's URL state after a short pause. */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const id = setTimeout(() => onChange(text), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <Input
      className="w-full max-w-xs max-md:max-w-none max-md:min-w-0 max-md:flex-1"
      type="search"
      placeholder={placeholder}
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
}

/** Address parameters that are not filters: paging, sorting, search and the page's tab. */
const NOT_FILTERS = ['tab', 'view'];

/**
 * A list's filters. On a computer they sit in the row next to the search box. On a phone they move behind a
 * "Filters" button that opens a sheet, and the button counts the ones in use; changes apply as they are made.
 */
export function MobileFilters({ filters, onClear, children }: { filters: Record<string, string>; onClear?: () => void; children: ReactNode }) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  if (!phone) return <>{children}</>;
  const active = Object.keys(filters).filter((k) => !NOT_FILTERS.includes(k)).length;
  return (
    <>
      <Button variant="secondary" className="shrink-0" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <SlidersHorizontal aria-hidden />
        Filters
        {active > 0 && (
          <span className="ml-0.5 rounded-full bg-brand px-1.5 text-[11px] text-brand-fg tabular-nums" aria-label={`${active} in use`}>
            {active}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Filters">
        <div className="flex flex-col gap-3 [&_input]:w-full [&_input]:max-w-none [&_select]:w-full">{children}</div>
        <div className="mt-5 flex gap-2">
          {onClear && active > 0 && (
            <Button variant="secondary" className="flex-1" onClick={onClear}>
              Clear filters
            </Button>
          )}
          <Button className="flex-1" onClick={() => setOpen(false)}>
            Show results
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/** Buttons inside a clickable row: pressing one must not also open the row. */
export function RowActions({ children, stack }: { children: ReactNode; stack?: boolean }) {
  return (
    <div className={stack ? 'flex flex-col items-start gap-1' : 'flex items-center gap-1.5'} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
