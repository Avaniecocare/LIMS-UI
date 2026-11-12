import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { useLookups } from '@/components/pickers';
import { DateRangeFilter, DocumentButton, RowActions, SavedFilters, SearchBox, MobileFilters } from '@/components/shared';
import { Badge, Button, Checkbox, ConfirmDialog, Dialog, Field, Input, PageHeader, Select, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, humanize, todayIso } from '@/lib/format';
import { applyServerErrors, writeError } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';

type Pending = components['schemas']['DispatchableJobDto'];
type Dispatch = components['schemas']['DispatchDto'];
type Returnable = components['schemas']['ReturnableRowDto'];

const WITHHELD = 'Withheld: this customer has report release held until payment is received.';

function apiQuery(query: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(query).filter(([k]) => k !== 'tab'));
}

function refresh(client: ReturnType<typeof useQueryClient>) {
  for (const key of ['dispatch-pending', 'dispatches', 'returnables', 'job']) client.invalidateQueries({ queryKey: [key] });
}

const schema = z.object({
  dispatchDate: z.string().min(1, 'Enter the date'),
  modeId: z.string().min(1, 'Choose how it is going'),
  courierName: z.string(),
  docketNo: z.string(),
  carrierName: z.string(),
  carrierContact: z.string(),
  remarks: z.string(),
});
type Values = z.infer<typeof schema>;

function RecordDialog({ job, onClose }: { job: Pending | null; onClose: () => void }) {
  const client = useQueryClient();
  const modes = useLookups('DISPATCH_MODE');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { dispatchDate: '', modeId: '', courierName: '', docketNo: '', carrierName: '', carrierContact: '', remarks: '' } });
  const [reports, setReports] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (!job) return;
    form.reset({ dispatchDate: todayIso(), modeId: '', courierName: '', docketNo: '', carrierName: '', carrierContact: '', remarks: '' });
    setReports(job.reports.filter((r) => !r.withheld).map((r) => r.reportId));
    setSamples([]);
    setProblem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [job?.jobId]);
  const code = modes.data?.find((m) => m.id === form.watch('modeId'))?.code;
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: Values) =>
      unwrap(
        await api.POST('/api/v1/dispatch', {
          body: {
            jobId: job!.jobId,
            dispatchDate: v.dispatchDate,
            modeId: v.modeId,
            remarks: v.remarks.trim() || null,
            ...(code === 'COURIER' ? { courierName: v.courierName.trim() || null, docketNo: v.docketNo.trim() || null } : {}),
            ...(code === 'BY_HAND' ? { carrierName: v.carrierName.trim() || null, carrierContact: v.carrierContact.trim() || null } : {}),
            reportIds: reports,
            sampleIds: samples,
          },
        }),
      ),
    onSuccess: (d) => {
      toast.success(`Dispatch ${d.dispatchNo} recorded`);
      refresh(client);
      onClose();
    },
    onError: (error) => applyServerErrors(error, form.setError, ['dispatchDate', 'modeId', 'courierName', 'docketNo', 'carrierName', 'carrierContact']),
  });
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()} title={`Record dispatch for ${job?.jobNo ?? ''}`} description={job?.customerName ?? undefined} wide>
      {job && (
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((v) => {
            if (!reports.length && !samples.length) setProblem('Choose at least one report or sample.');
            else {
              setProblem(null);
              m.mutate(v);
            }
          })}
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            <fieldset className="space-y-1.5">
              <legend className="text-[13px] font-semibold text-gray-900">Reports</legend>
              {!job.reports.length && <p className="text-[13px] text-gray-700">No issued reports are waiting to go.</p>}
              {job.reports.map((r) => (
                <div key={r.reportId}>
                  <Checkbox
                    id={`d-report-${r.reportId}`}
                    label={`${r.reportNo}${r.revisionNo ? ` (revision ${r.revisionNo})` : ''}`}
                    disabled={r.withheld}
                    checked={reports.includes(r.reportId)}
                    onCheckedChange={(v) => setReports((x) => (v ? [...x, r.reportId] : x.filter((id) => id !== r.reportId)))}
                  />
                  {r.withheld && <p className="ml-6 text-xs text-amber-900">{WITHHELD}</p>}
                </div>
              ))}
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-[13px] font-semibold text-gray-900">Returnable samples</legend>
              {!job.returnableSamples.length && <p className="text-[13px] text-gray-700">No samples are due back on this job.</p>}
              {job.returnableSamples.map((s) => (
                <div key={s.sampleId}>
                  <Checkbox
                    id={`d-sample-${s.sampleId}`}
                    label={`${s.sampleNo} — ${s.description}`}
                    checked={samples.includes(s.sampleId)}
                    onCheckedChange={(v) => setSamples((x) => (v ? [...x, s.sampleId] : x.filter((id) => id !== s.sampleId)))}
                  />
                </div>
              ))}
            </fieldset>
          </div>
          {problem && (
            <p role="alert" className="text-[13px] text-red-800">
              {problem}
            </p>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            <Field label="Dispatch date" htmlFor="d-date" required error={e.dispatchDate?.message}>
              <Input id="d-date" type="date" aria-invalid={!!e.dispatchDate} {...form.register('dispatchDate')} />
            </Field>
            <Field label="Mode" htmlFor="d-mode" required error={e.modeId?.message}>
              <Select id="d-mode" aria-invalid={!!e.modeId} {...form.register('modeId')}>
                <option value="">Choose…</option>
                {modes.data
                  ?.filter((x) => x.isActive)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
              </Select>
            </Field>
            {code === 'COURIER' && (
              <>
                <Field label="Courier name" htmlFor="d-courier" required error={e.courierName?.message}>
                  <Input id="d-courier" aria-invalid={!!e.courierName} {...form.register('courierName')} />
                </Field>
                <Field label="Docket no." htmlFor="d-docket" required error={e.docketNo?.message} hint="The courier's tracking or consignment number.">
                  <Input id="d-docket" aria-invalid={!!e.docketNo} {...form.register('docketNo')} />
                </Field>
              </>
            )}
            {code === 'BY_HAND' && (
              <>
                <Field label="Carrier name" htmlFor="d-carrier" required error={e.carrierName?.message}>
                  <Input id="d-carrier" aria-invalid={!!e.carrierName} {...form.register('carrierName')} />
                </Field>
                <Field label="Carrier contact" htmlFor="d-contact" required error={e.carrierContact?.message}>
                  <Input id="d-contact" aria-invalid={!!e.carrierContact} {...form.register('carrierContact')} />
                </Field>
              </>
            )}
            <Field label="Remarks" htmlFor="d-remarks" className="md:col-span-2">
              <Textarea id="d-remarks" {...form.register('remarks')} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={m.isPending}>
              Save dispatch
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function PendingTab() {
  const { can } = useSession();
  const list = useListState();
  const query = apiQuery(list.query);
  const q = useQuery({ queryKey: ['dispatch-pending', query], queryFn: async () => unwrap(await api.GET('/api/v1/dispatch/pending', { params: { query } })) });
  const [recording, setRecording] = useState<Pending | null>(null);
  const canEdit = can('dispatch.edit');
  const columns = useMemo<Col<Pending>[]>(
    () => [
      {
        id: 'jobNo',
        header: 'Job',
        cell: ({ row: { original: j } }) =>
          can('jobs.view') ? (
            <Link to={`/samples/jobs/${j.jobId}`} className="underline">
              {j.jobNo}
            </Link>
          ) : (
            j.jobNo
          ),
      },
      { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' },
      {
        id: 'reports',
        header: 'Reports',
        cell: ({ row: { original: j } }) =>
          j.reports.length ? (
            <ul className="space-y-0.5">
              {j.reports.map((r) => (
                <li key={r.reportId} className="flex flex-wrap items-center gap-1.5">
                  {r.reportNo}
                  {r.revisionNo > 0 && ` (revision ${r.revisionNo})`}
                  {r.withheld && <Badge tone="amber">Withheld until paid</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            '—'
          ),
      },
      {
        id: 'samples',
        header: 'Returnable samples',
        cell: ({ row: { original: j } }) =>
          j.returnableSamples.length ? (
            <ul className="space-y-0.5">
              {j.returnableSamples.map((s) => (
                <li key={s.sampleId}>{s.sampleNo}</li>
              ))}
            </ul>
          ) : (
            '—'
          ),
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row: { original: j } }) => (
                <Button size="sm" aria-label={`Record dispatch for ${j.jobNo}`} onClick={() => setRecording(j)}>
                  Record dispatch
                </Button>
              ),
            } as Col<Pending>,
          ]
        : []),
    ],
    [canEdit, can],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search job" label="Search jobs waiting to go" />
        <MobileFilters filters={list.filters} onClear={list.clearFilters}>
          <SavedFilters screen="dispatch-pending" current={list.allParams} onApply={list.applyFilters} />
        </MobileFilters>
      </div>
      <DataTable
        ariaLabel="Jobs waiting to go"
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        getRowId={(j) => j.jobId}
        renderExpanded={() => null}
        emptyTitle="Nothing is waiting to go out"
      />
      <RecordDialog job={recording} onClose={() => setRecording(null)} />
    </div>
  );
}

function DispatchesTab() {
  const { can } = useSession();
  const list = useListState();
  const query = apiQuery(list.query);
  const q = useQuery({ queryKey: ['dispatches', query], queryFn: async () => unwrap(await api.GET('/api/v1/dispatch', { params: { query } })) });
  const columns = useMemo<Col<Dispatch>[]>(
    () => [
      { accessorKey: 'dispatchNo', id: 'dispatchNo', header: 'Dispatch', enableSorting: true },
      { id: 'dispatchDate', header: 'Date', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.dispatchDate)}</span> },
      {
        id: 'jobNo',
        header: 'Job',
        cell: ({ row: { original: d } }) =>
          can('jobs.view') ? (
            <Link to={`/samples/jobs/${d.jobId}`} className="underline">
              {d.jobNo}
            </Link>
          ) : (
            d.jobNo
          ),
      },
      { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' },
      { accessorKey: 'modeLabel', id: 'mode', header: 'Mode' },
      {
        id: 'carrier',
        header: 'Courier or carrier',
        cell: ({ row: { original: d } }) => [d.courierName, d.docketNo && `Docket ${d.docketNo}`, d.carrierName, d.carrierContact].filter(Boolean).join(' · ') || '—',
      },
      {
        id: 'items',
        header: 'Items',
        cell: ({ row: { original: d } }) => (
          <ul className="space-y-0.5">
            {d.items.map((it) => (
              <li key={`${it.kind}-${it.id}`}>
                {it.kind}: {it.reference}
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: 'challan',
        header: 'Challan',
        cell: ({ row: { original: d } }) => (
          <DocumentButton size="sm" kind="dispatch-challan" params={{ dispatchId: d.id }} aria-label={`Challan for ${d.dispatchNo}`}>
            Challan
          </DocumentButton>
        ),
      },
    ],
    [can],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search dispatch, docket or job" label="Search dispatches" />
        <MobileFilters filters={list.filters} onClear={list.clearFilters}>
          <DateRangeFilter label="Dispatch date" from={list.filters.from ?? ''} to={list.filters.to ?? ''} onChange={list.setFilter} />
          <SavedFilters screen="dispatches" current={list.allParams} onApply={list.applyFilters} />
        </MobileFilters>
      </div>
      <DataTable
        ariaLabel="Dispatches"
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        sort={list.sort}
        onSortChange={list.setSort}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        getRowId={(d) => d.id}
        renderExpanded={() => null}
        emptyTitle="No dispatches found"
      />
    </div>
  );
}

const returnSchema = z.object({ returnedAt: z.string().min(1, 'Enter the date'), returnStatus: z.string().trim().min(1, 'Say how it went back') });
type ReturnValues = z.infer<typeof returnSchema>;

function ReturnDialog({ sample, onClose }: { sample: Returnable | null; onClose: () => void }) {
  const client = useQueryClient();
  const form = useForm<ReturnValues>({ resolver: zodResolver(returnSchema), defaultValues: { returnedAt: '', returnStatus: '' } });
  useEffect(() => {
    if (sample) form.reset({ returnedAt: todayIso(), returnStatus: 'Returned to customer' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [sample?.id]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: ReturnValues) =>
      unwrap(
        await api.POST('/api/v1/dispatch/samples/{id}/return', { params: { path: { id: sample!.id } }, body: { version: sample!.version, returnedAt: v.returnedAt, returnStatus: v.returnStatus } }),
      ),
    onSuccess: () => {
      toast.success(`${sample?.sampleNo} marked returned`);
      refresh(client);
      onClose();
    },
    onError: (error) => {
      onClose();
      writeError(() => refresh(client))(error);
    },
  });
  return (
    <Dialog open={!!sample} onOpenChange={(o) => !o && onClose()} title={`Mark ${sample?.sampleNo ?? ''} returned`}>
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="Date returned" htmlFor="ret-date" required error={e.returnedAt?.message}>
          <Input id="ret-date" type="date" aria-invalid={!!e.returnedAt} {...form.register('returnedAt')} />
        </Field>
        <Field label="Return status" htmlFor="ret-status" required error={e.returnStatus?.message}>
          <Input id="ret-status" aria-invalid={!!e.returnStatus} {...form.register('returnStatus')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Mark returned
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DisposeDialog({ sample, onClose }: { sample: Returnable | null; onClose: () => void }) {
  const client = useQueryClient();
  const [date, setDate] = useState('');
  useEffect(() => {
    if (sample) setDate(todayIso());
  }, [sample]);
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/dispatch/samples/{id}/dispose', { params: { path: { id: sample!.id } }, body: { version: sample!.version, disposedAt: date } })),
    onSuccess: () => {
      toast.success(`${sample?.sampleNo} marked disposed`);
      refresh(client);
      onClose();
    },
    onError: (error) => {
      onClose();
      writeError(() => refresh(client))(error);
    },
  });
  return (
    <ConfirmDialog
      open={!!sample}
      onOpenChange={(o) => !o && onClose()}
      title={`Mark ${sample?.sampleNo ?? ''} disposed?`}
      description="This cannot be undone. A disposed sample cannot be returned to the customer."
      confirmLabel="Mark disposed"
      danger
      loading={m.isPending}
      onConfirm={() => date && m.mutate()}
    >
      <Field label="Date disposed" htmlFor="disp-date" required>
        <Input id="disp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </ConfirmDialog>
  );
}

const VIEWS = [
  { value: 'pending', label: 'Due back' },
  { value: 'returned', label: 'Returned' },
  { value: 'due-for-disposal', label: 'Due for disposal' },
  { value: 'disposed', label: 'Disposed' },
];

function ReturnablesTab() {
  const { can } = useSession();
  const list = useListState();
  const query = apiQuery(list.query);
  const q = useQuery({ queryKey: ['returnables', query], queryFn: async () => unwrap(await api.GET('/api/v1/dispatch/returnables', { params: { query } })) });
  const [returning, setReturning] = useState<Returnable | null>(null);
  const [disposing, setDisposing] = useState<Returnable | null>(null);
  const canEdit = can('dispatch.edit');
  const columns = useMemo<Col<Returnable>[]>(
    () => [
      { accessorKey: 'sampleNo', id: 'sampleNo', header: 'Sample', enableSorting: true },
      { accessorKey: 'description', id: 'description', header: 'Description' },
      {
        id: 'jobNo',
        header: 'Job',
        cell: ({ row: { original: s } }) =>
          can('jobs.view') ? (
            <Link to={`/samples/jobs/${s.jobId}`} className="underline">
              {s.jobNo}
            </Link>
          ) : (
            s.jobNo
          ),
      },
      { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' },
      {
        id: 'state',
        header: 'State',
        cell: ({ row: { original: s } }) =>
          s.disposedAt ? (
            <Badge>Disposed</Badge>
          ) : s.returnedAt ? (
            <Badge tone="green">{s.returnStatus ?? 'Returned'}</Badge>
          ) : s.dueForDisposal ? (
            <Badge tone="amber">Due for disposal</Badge>
          ) : (
            <Badge tone="blue">{humanize(s.status)}</Badge>
          ),
      },
      { id: 'returnedAt', header: 'Returned', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.returnedAt)}</span> },
      { id: 'retentionUntil', header: 'Keep until', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.retentionUntil)}</span> },
      { id: 'disposedAt', header: 'Disposed', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.disposedAt)}</span> },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row: { original: s } }) =>
                !s.disposedAt &&
                !s.returnedAt && (
                  <RowActions>
                    {s.returnable && (
                      <Button variant="secondary" size="sm" aria-label={`Mark ${s.sampleNo} returned`} onClick={() => setReturning(s)}>
                        Mark returned
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" aria-label={`Mark ${s.sampleNo} disposed`} onClick={() => setDisposing(s)}>
                      Mark disposed
                    </Button>
                  </RowActions>
                ),
            } as Col<Returnable>,
          ]
        : []),
    ],
    [canEdit, can],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search sample or job" label="Search returnable samples" />
        <MobileFilters filters={list.filters} onClear={list.clearFilters}>
          <Select aria-label="Which samples" className="w-44" value={list.filters.view ?? 'pending'} onChange={(e) => list.setFilter('view', e.target.value === 'pending' ? null : e.target.value)}>
            {VIEWS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </Select>
          <SavedFilters screen="dispatch-returnables" current={list.allParams} onApply={list.applyFilters} />
        </MobileFilters>
      </div>
      <DataTable
        ariaLabel="Returnable samples"
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        sort={list.sort}
        onSortChange={list.setSort}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        getRowId={(s) => s.id}
        emptyTitle="No samples here"
      />
      <ReturnDialog sample={returning} onClose={() => setReturning(null)} />
      <DisposeDialog sample={disposing} onClose={() => setDisposing(null)} />
    </div>
  );
}

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'dispatches', label: 'Dispatches' },
  { value: 'returnables', label: 'Returnable samples' },
] as const;

export default function DispatchPage() {
  const list = useListState();
  const tab = TABS.find((t) => t.value === list.filters.tab)?.value ?? 'pending';
  return (
    <>
      <PageHeader title="Dispatch" />
      <Tabs value={tab} onValueChange={(v) => list.applyFilters(v === 'pending' ? {} : { tab: v })}>
        <TabsList className="mb-3">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          {tab === 'pending' && <PendingTab key="pending" />}
          {tab === 'dispatches' && <DispatchesTab key="dispatches" />}
          {tab === 'returnables' && <ReturnablesTab key="returnables" />}
        </TabsContent>
      </Tabs>
    </>
  );
}
