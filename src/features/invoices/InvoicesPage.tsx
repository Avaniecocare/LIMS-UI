import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { CustomerPicker } from '@/components/pickers';
import { DateRangeFilter, ReasonDialog, RowActions, SavedFilters, SearchBox, StatusBadge } from '@/components/shared';
import { Badge, Button, ConfirmDialog, PageHeader, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, humanize } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';
import { ApplyAdvanceDialog, Money, RecordPaymentDialog, refreshBilling, type InvoiceSummary, type Payment } from './billing';

type Ready = components['schemas']['ReadyJobDto'];

/** The tab lives in the URL with the filters, but it is not an API parameter. */
function apiQuery(query: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(query).filter(([k]) => k !== 'tab'));
}

function CustomerFilter({ value, onChange }: { value: string; onChange: (v: string | null) => void }) {
  const { can } = useSession();
  if (!can('customers.view')) return null;
  return (
    <div className="w-56">
      <CustomerPicker ariaLabel="Customer filter" placeholder="All customers" value={value} onChange={(v) => onChange(v || null)} />
    </div>
  );
}

function ReadyTab() {
  const { can } = useSession();
  const navigate = useNavigate();
  const client = useQueryClient();
  const list = useListState();
  const query = apiQuery(list.query);
  const q = useQuery({ queryKey: ['invoices-ready', query], queryFn: async () => unwrap(await api.GET('/api/v1/invoices/ready', { params: { query } })) });
  const [selected, setSelected] = useState<Record<string, Ready>>({});
  const [confirm, setConfirm] = useState(false);
  const chosen = Object.values(selected);
  const customerId = chosen[0]?.customerId;
  const selection = useMemo(() => Object.fromEntries(Object.keys(selected).map((id) => [id, true])), [selected]);
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/invoices', { body: { customerId: customerId!, jobIds: chosen.map((j) => j.jobId) } })),
    onSuccess: (invoice) => {
      toast.success('Draft invoice created');
      refreshBilling(client);
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (e) => {
      setConfirm(false);
      toastError(e);
    },
  });
  const columns = useMemo<Col<Ready>[]>(
    () => [
      { accessorKey: 'jobNo', id: 'jobNo', header: 'Job', cell: ({ row }) => <Link to={`/samples/jobs/${row.original.jobId}`} className="underline" onClick={(e) => e.stopPropagation()}>{row.original.jobNo}</Link> },
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      { id: 'reports', header: 'Reports', cell: ({ row }) => row.original.reportNos.join(', ') || '—' },
      { accessorKey: 'testCount', id: 'testCount', header: 'Tests' },
      { id: 'amount', header: 'Amount before tax', cell: ({ row }) => <Money value={row.original.amount} /> },
      {
        id: 'missingRates',
        header: 'Missing rates',
        cell: ({ row }) =>
          row.original.missingRates > 0 ? (
            <Badge tone="amber">
              {row.original.missingRates} {row.original.missingRates === 1 ? 'test has' : 'tests have'} no rate
            </Badge>
          ) : (
            <span className="text-gray-700">None</span>
          ),
      },
      { id: 'receivedAt', header: 'Received', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.receivedAt)}</span> },
    ],
    [],
  );
  const canEdit = can('invoices.edit');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search job or customer" label="Search jobs ready to invoice" />
        <CustomerFilter value={list.filters.customerId ?? ''} onChange={(v) => list.setFilter('customerId', v)} />
        <SavedFilters screen="invoices-ready" current={list.allParams} onApply={list.applyFilters} />
      </div>
      {canEdit && <p className="text-[13px] text-gray-700">Select one job, or several for the same customer, to create a draft invoice.</p>}
      <DataTable
        ariaLabel="Jobs ready to invoice"
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        getRowId={(r) => r.jobId}
        selection={selection}
        isRowSelectable={(r) => !customerId || r.customerId === customerId}
        onSelectionChange={
          canEdit
            ? (next) =>
                setSelected((prev) => {
                  const out: Record<string, Ready> = {};
                  for (const id of Object.keys(next)) {
                    const row = prev[id] ?? q.data?.data.find((r) => r.jobId === id);
                    // "Select all" can reach several customers; an invoice is for one.
                    if (row && (Object.values(out)[0]?.customerId ?? row.customerId) === row.customerId) out[id] = row;
                  }
                  return out;
                })
            : undefined
        }
        bulkActions={
          <>
            <Button size="sm" onClick={() => setConfirm(true)}>
              Create draft invoice
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
              Clear
            </Button>
          </>
        }
        emptyTitle="No jobs are ready to invoice"
      />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Create a draft invoice?" description={chosen[0] && `For ${chosen[0].customerName}, from ${chosen.map((j) => j.jobNo).join(', ')}. Nothing goes to the customer until it is issued.`} confirmLabel="Create draft" loading={create.isPending} onConfirm={() => create.mutate()} />
    </div>
  );
}

function AllTab() {
  const navigate = useNavigate();
  const list = useListState();
  const query = apiQuery(list.query);
  const q = useQuery({ queryKey: ['invoices', query], queryFn: async () => unwrap(await api.GET('/api/v1/invoices', { params: { query } })) });
  const columns = useMemo<Col<InvoiceSummary>[]>(
    () => [
      { id: 'invoiceNo', header: 'Invoice', enableSorting: true, cell: ({ row: { original: i } }) => i.invoiceNo ?? <span className="text-gray-700">{i.status === 'DRAFT' ? 'Draft' : 'No number'}</span> },
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      {
        id: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ row: { original: i } }) => (
          <span className="inline-flex flex-wrap gap-1">
            <StatusBadge status={i.status} />
            {i.overdue && <Badge tone="red">Overdue</Badge>}
          </span>
        ),
      },
      { id: 'invoiceDate', header: 'Date', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.invoiceDate)}</span> },
      { id: 'dueDate', header: 'Due', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.dueDate)}</span> },
      { id: 'grandTotal', header: 'Grand total', enableSorting: true, cell: ({ row }) => <Money value={row.original.grandTotal} /> },
      { id: 'balance', header: 'Balance', cell: ({ row }) => <Money value={row.original.balance} /> },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search invoice or customer" label="Search invoices" />
        <Select aria-label="Status filter" className="w-40" value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || null)}>
          <option value="">All statuses</option>
          {['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <CustomerFilter value={list.filters.customerId ?? ''} onChange={(v) => list.setFilter('customerId', v)} />
        <DateRangeFilter label="Invoice date" from={list.filters.from ?? ''} to={list.filters.to ?? ''} onChange={list.setFilter} />
        <SavedFilters screen="invoices" current={list.allParams} onApply={list.applyFilters} />
      </div>
      <DataTable ariaLabel="Invoices" columns={columns} rows={q.data?.data} meta={q.data?.meta} loading={q.isLoading} error={q.error} onRetry={q.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(r) => navigate(`/invoices/${r.id}`)} getRowId={(r) => r.id} emptyTitle="No invoices found" />
    </div>
  );
}

function PaymentsTab() {
  const { can } = useSession();
  const client = useQueryClient();
  const list = useListState();
  const query = apiQuery(list.query);
  const q = useQuery({ queryKey: ['payments', query], queryFn: async () => unwrap(await api.GET('/api/v1/payments', { params: { query } })) });
  const [recording, setRecording] = useState(false);
  const [applying, setApplying] = useState<Payment | null>(null);
  const [reversing, setReversing] = useState<Payment | null>(null);
  const canEdit = can('payments.edit');
  const reverse = useMutation({
    mutationFn: async ({ payment, reason }: { payment: Payment; reason: string }) => unwrap(await api.POST('/api/v1/payments/{id}/reverse', { params: { path: { id: payment.id } }, body: { reason } })),
    onSuccess: (p) => {
      toast.success(`Payment ${p.paymentNo} reversed`);
      setReversing(null);
      refreshBilling(client);
    },
    onError: (e) => {
      setReversing(null);
      toastError(e);
    },
  });
  const columns = useMemo<Col<Payment>[]>(
    () => [
      { accessorKey: 'paymentNo', id: 'paymentNo', header: 'Receipt', enableSorting: true },
      { id: 'paidOn', header: 'Date', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.paidOn)}</span> },
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      { id: 'mode', header: 'Mode', cell: ({ row }) => row.original.mode },
      { id: 'reference', header: 'Reference', cell: ({ row }) => row.original.reference ?? '—' },
      { id: 'amount', header: 'Amount', enableSorting: true, cell: ({ row }) => <Money value={row.original.amount} /> },
      { id: 'unapplied', header: 'On account', cell: ({ row }) => <Money value={row.original.unapplied} /> },
      {
        id: 'allocations',
        header: 'Allocated to',
        cell: ({ row: { original: p } }) =>
          p.allocations.length ? (
            <ul className="space-y-0.5">
              {p.allocations.map((a, i) => (
                <li key={`${a.invoiceId}-${i}`} className="whitespace-nowrap">
                  <Link to={`/invoices/${a.invoiceId}`} className="underline">
                    {a.invoiceNo ?? 'Invoice'}
                  </Link>{' '}
                  <Money value={a.amount} />
                </li>
              ))}
            </ul>
          ) : (
            '—'
          ),
      },
      {
        id: 'state',
        header: 'State',
        cell: ({ row: { original: p } }) => (p.reversed ? <Badge tone="gray">Reversed</Badge> : p.isAdvance ? <Badge tone="blue">Advance</Badge> : <Badge tone="green">Allocated</Badge>),
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row: { original: p } }) =>
                !p.reversed && (
                  <RowActions>
                    {Number(p.unapplied) > 0 && (
                      <Button variant="secondary" size="sm" aria-label={`Apply advance from ${p.paymentNo}`} onClick={() => setApplying(p)}>
                        Apply
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" aria-label={`Reverse ${p.paymentNo}`} onClick={() => setReversing(p)}>
                      Reverse
                    </Button>
                  </RowActions>
                ),
            } as Col<Payment>,
          ]
        : []),
    ],
    [canEdit],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search receipt, reference or customer" label="Search payments" />
        <CustomerFilter value={list.filters.customerId ?? ''} onChange={(v) => list.setFilter('customerId', v)} />
        <Select aria-label="On account filter" className="w-44" value={list.filters.unapplied ?? ''} onChange={(e) => list.setFilter('unapplied', e.target.value || null)}>
          <option value="">All payments</option>
          <option value="true">With money on account</option>
        </Select>
        <DateRangeFilter label="Payment date" from={list.filters.from ?? ''} to={list.filters.to ?? ''} onChange={list.setFilter} />
        <SavedFilters screen="payments" current={list.allParams} onApply={list.applyFilters} />
        {canEdit && (
          <Button className="ml-auto" onClick={() => setRecording(true)}>
            <Plus aria-hidden />
            Record payment
          </Button>
        )}
      </div>
      <DataTable ariaLabel="Payments" columns={columns} rows={q.data?.data} meta={q.data?.meta} loading={q.isLoading} error={q.error} onRetry={q.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} getRowId={(r) => r.id} renderExpanded={() => null} emptyTitle="No payments found" />
      <RecordPaymentDialog open={recording} onOpenChange={setRecording} />
      <ApplyAdvanceDialog payment={applying} onClose={() => setApplying(null)} />
      <ReasonDialog open={!!reversing} onOpenChange={(o) => !o && setReversing(null)} title={`Reverse ${reversing?.paymentNo ?? ''}`} description="The record stays, and its invoices go back to their earlier balance." confirmLabel="Reverse payment" danger loading={reverse.isPending} onConfirm={(reason) => reversing && reverse.mutate({ payment: reversing, reason })} />
    </div>
  );
}

const TABS = [
  { value: 'ready', label: 'Ready to invoice' },
  { value: 'all', label: 'All invoices' },
  { value: 'payments', label: 'Payments' },
] as const;

export default function InvoicesPage() {
  const list = useListState();
  const tab = TABS.find((t) => t.value === list.filters.tab)?.value ?? 'ready';
  return (
    <>
      <PageHeader title="Invoices" />
      <Tabs value={tab} onValueChange={(v) => list.applyFilters({ tab: v })}>
        <TabsList className="mb-3">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
      {tab === 'ready' && <ReadyTab key="ready" />}
      {tab === 'all' && <AllTab key="all" />}
      {tab === 'payments' && <PaymentsTab key="payments" />}
        </TabsContent>
      </Tabs>
    </>
  );
}
