import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { DataTable, type Col } from '@/components/DataTable';
import { reserveTab, SearchBox, StatusBadge } from '@/components/shared';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, Field, Select, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';

type Check = components['schemas']['CheckDto'];
type Email = components['schemas']['EmailDto'];
type DataExport = components['schemas']['DataExportDto'];

// ---------------------------------------------------------------- status
const STATES = {
  OK: { label: 'Working', tone: 'green' },
  WARNING: { label: 'Needs a look', tone: 'amber' },
  PROBLEM: { label: 'Not working', tone: 'red' },
  OFF: { label: 'Off', tone: 'gray' },
} as const;

const summary = (checks: Check[]) => {
  const problems = checks.filter((c) => c.state === 'PROBLEM').length;
  const warnings = checks.filter((c) => c.state === 'WARNING').length;
  if (problems) return `${problems} not working${warnings ? `, ${warnings} to look at` : ''}`;
  return warnings ? `Working, with ${warnings} to look at` : 'Everything is working';
};

/** How this installation is, measured when the page opens and every minute after. */
export function StatusTab() {
  const q = useQuery({ queryKey: ['system-status'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/status')), refetchInterval: 60_000 });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const { checks, checkedAt, version } = q.data;
  return (
    <Card>
      <CardHeader
        title={summary(checks)}
        description={`Checked ${formatDateTime(checkedAt)}${version ? ` · Version ${version}` : ''}`}
        actions={
          <Button variant="secondary" size="sm" loading={q.isFetching} onClick={() => q.refetch()}>
            <RefreshCw aria-hidden />
            Check again
          </Button>
        }
      />
      <ul aria-label="System checks" className="divide-y divide-gray-100">
        {checks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
            <span className="w-52 font-medium text-gray-900">{c.label}</span>
            <Badge tone={STATES[c.state].tone}>{STATES[c.state].label}</Badge>
            <span className="text-gray-700">{c.detail}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- emails
const KINDS: Record<string, string> = {
  report: 'Report',
  invoice: 'Invoice',
  quotation: 'Quotation',
  acknowledgement: 'Acknowledgement',
  reminder: 'Payment reminder',
  'password-reset': 'Password reset',
  'account-email-changed': 'Account notice',
};
const kindOf = (template: string) => KINDS[template] ?? (template.startsWith('notification:') ? 'Notification' : template);

/** Everything the system emailed, and what it could not. */
export function OutboxTab() {
  const list = useListState();
  const client = useQueryClient();
  const [asking, setAsking] = useState<Email | null>(null);
  const q = useQuery({
    queryKey: ['outbox', list.query],
    queryFn: async () => unwrap(await api.GET('/api/v1/admin/emails', { params: { query: list.query as { status?: Email['status'] } } })),
    // Something may be on its way: show what became of it.
    refetchInterval: (query) => (query.state.data?.data.some((e) => e.status === 'QUEUED' || e.retrying) ? 5_000 : false),
  });
  const resend = useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST('/api/v1/admin/emails/{id}/resend', { params: { path: { id } } })),
    onSuccess: async () => {
      setAsking(null);
      toast.success('On its way');
      await client.invalidateQueries({ queryKey: ['outbox'] });
    },
    onError: toastError,
  });
  const columns = useMemo<Col<Email>[]>(
    () => [
      { id: 'createdAt', header: 'When', cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.sentAt ?? row.original.createdAt)}</span> },
      {
        id: 'to',
        header: 'To',
        cell: ({ row }) => (
          <span className="break-all">
            {row.original.toAddress}
            {row.original.ccAddress && <span className="block text-xs text-gray-600">Cc {row.original.ccAddress}</span>}
          </span>
        ),
      },
      { accessorKey: 'subject', header: 'Subject' },
      { id: 'kind', header: 'Kind', cell: ({ row }) => kindOf(row.original.template) },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span>
            <StatusBadge status={row.original.status} />
            {row.original.retrying && <span className="ml-1.5 text-xs text-gray-700">will be tried again</span>}
            {row.original.lastError && <span className="mt-0.5 block text-xs break-words text-red-800">{row.original.lastError}</span>}
          </span>
        ),
      },
      { id: 'sentBy', header: 'Sent by', cell: ({ row }) => row.original.sentBy ?? 'System' },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.canResend && (
            <Button variant="secondary" size="sm" onClick={() => setAsking(row.original)}>
              <Send aria-hidden />
              {row.original.status === 'FAILED' ? 'Try again' : 'Send again'}
            </Button>
          ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <SearchBox label="Search emails" placeholder="Search address or subject" value={list.q} onChange={list.setSearch} />
        <Field label="Status" htmlFor="o-status">
          <Select id="o-status" value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value)}>
            <option value="">All</option>
            <option value="FAILED">Failed</option>
            <option value="QUEUED">Waiting</option>
            <option value="SENT">Sent</option>
          </Select>
        </Field>
      </div>
      <DataTable
        ariaLabel="Emails"
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        getRowId={(r) => r.id}
        emptyTitle="No emails match"
      />
      <ConfirmDialog
        open={!!asking}
        onOpenChange={(o) => !o && setAsking(null)}
        title={asking?.status === 'FAILED' ? 'Try this email again?' : 'Send this email again?'}
        description={asking ? `“${asking.subject}” goes to ${[asking.toAddress, asking.ccAddress].filter(Boolean).join(' and ')}, as it was. To use another address, send it from its own record.` : ''}
        confirmLabel={asking?.status === 'FAILED' ? 'Try again' : 'Send again'}
        loading={resend.isPending}
        onConfirm={() => asking && resend.mutate(asking.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------- data export
const UNFINISHED = ['QUEUED', 'RUNNING'];
const EXPORT_STATE = {
  QUEUED: { label: 'Waiting', tone: 'gray' },
  RUNNING: { label: 'Being made', tone: 'blue' },
  DONE: { label: 'Ready', tone: 'green' },
  FAILED: { label: 'Failed', tone: 'red' },
} as const;

/** All the lab's data and files, to keep or to move elsewhere. */
export function DataExportTab() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ['data-exports'],
    queryFn: async () => unwrap(await api.GET('/api/v1/admin/data-exports')),
    refetchInterval: (query) => (query.state.data?.some((e) => UNFINISHED.includes(e.status)) ? 3_000 : false),
  });
  const start = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/data-exports')),
    onSuccess: async () => {
      toast.success('The export has started. You will be notified when it is ready.');
      await client.invalidateQueries({ queryKey: ['data-exports'] });
    },
    onError: toastError,
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <Card>
      <CardHeader
        title="Export all data"
        description="Every record and every file, as ZIP files with tables for Excel and for loading into another system. It holds personal data and customers’ results: your password is confirmed first, administrators are told, and each download is recorded."
        actions={
          <Button loading={start.isPending} disabled={q.data.some((e) => UNFINISHED.includes(e.status))} onClick={() => start.mutate()}>
            Make an export
          </Button>
        }
      />
      {q.data.length === 0 ? (
        <p className="p-4 text-[13px] text-gray-700">No exports yet.</p>
      ) : (
        <ul aria-label="Data exports" className="divide-y divide-gray-100">
          {q.data.map((e) => (
            <ExportRow key={e.id} row={e} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ExportRow({ row }: { row: DataExport }) {
  const state = EXPORT_STATE[row.status];
  const count = (n: number, what: string) => `${n.toLocaleString('en-IN')} ${what}${n === 1 ? '' : 's'}`;
  return (
    <li className="space-y-2 px-4 py-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={row.removedAt ? 'gray' : state.tone}>{row.removedAt ? 'Removed' : state.label}</Badge>
        <span className="text-gray-900">
          {formatDateTime(row.createdAt)}, asked for by {row.requestedByName}
        </span>
        {row.status === 'DONE' && (
          <span className="text-gray-700">
            {count(row.rows, 'record')}, {count(row.files, 'file')}
            {row.removedAt ? '' : row.expiresAt ? ` · removed on ${formatDate(row.expiresAt)}` : ''}
          </span>
        )}
      </div>
      {row.error && <p className="text-red-800">{row.error}</p>}
      {row.missingFiles > 0 && <p className="text-amber-900">{count(row.missingFiles, 'file')} could not be found in the store; missing-files.csv in the export lists them.</p>}
      {!row.removedAt && row.parts.length > 0 && (
        <ul className="space-y-1">
          {row.parts.map((p, i) => (
            <li key={p.name} className="flex flex-wrap items-center gap-2">
              <DownloadPart id={row.id} part={i + 1} name={p.name} />
              <span className="text-gray-700">{formatBytes(p.sizeBytes)}</span>
              <span className="font-mono text-xs break-all text-gray-600">SHA-256 {p.sha256}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function DownloadPart({ id, part, name }: { id: string; part: number; name: string }) {
  const m = useMutation({
    mutationFn: async (tab: ReturnType<typeof reserveTab>) => {
      try {
        const { url } = unwrap(await api.POST('/api/v1/admin/data-exports/{id}/parts/{part}/download', { params: { path: { id, part } } }));
        tab.show(url, name);
      } catch (e) {
        tab.cancel();
        throw e;
      }
    },
    onError: toastError,
  });
  return (
    <Button variant="secondary" size="sm" loading={m.isPending} onClick={() => m.mutate(reserveTab())}>
      <Download aria-hidden />
      {name}
    </Button>
  );
}
