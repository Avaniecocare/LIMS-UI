import { useQuery } from '@tanstack/react-query';
import { FileText, FlaskConical, IndianRupee, ReceiptText, ScrollText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { SearchBox, StatusBadge } from '@/components/shared';
import { Badge, Card, CardHeader, ErrorState, Spinner } from '@/components/ui/primitives';
import { LibraryFiles } from '@/features/files/FilesPage';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';

/**
 * One customer's whole history with the lab: what was quoted, booked, tested, reported, invoiced and paid,
 * plus the documents on file. Each tab loads only when opened, and money only for people who may see it.
 */
type Summary = components['schemas']['CustomerSummaryDto'];

function Stat({ icon, label, value, hint, to }: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode; to?: string }) {
  const body = (
    <div className="flex h-full items-start gap-3 rounded-lg border border-gray-200 bg-surface p-3">
      <span className="mt-0.5 text-brand [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        {hint && <p className="text-xs text-gray-600">{hint}</p>}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-brand">
      {body}
    </Link>
  ) : (
    body
  );
}

export function CustomerOverview({ customerId, onOpenTab }: { customerId: string; onOpenTab: (tab: string) => void }) {
  const q = useQuery({ queryKey: ['customer-summary', customerId], queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}/summary', { params: { path: { id: customerId } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const s: Summary = q.data;
  const tile = (tab: string, node: ReactNode) => (
    <button type="button" className="text-left" onClick={() => onOpenTab(tab)}>
      {node}
    </button>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.quotations && tile('quotations', <Stat icon={<ScrollText />} label="Quotations" value={s.quotations.total} hint={`${s.quotations.accepted} accepted · ${s.quotations.open} open`} />)}
        {tile('jobs', <Stat icon={<FlaskConical />} label="Jobs" value={s.jobs.total} hint={`${s.jobs.open} open · ${s.jobs.completed} completed${s.jobs.cancelled ? ` · ${s.jobs.cancelled} cancelled` : ''}`} />)}
        {tile('tests', <Stat icon={<FlaskConical />} label="Tests booked" value={s.tests.booked} hint={`${s.samples} samples · ${s.tests.approved} approved`} />)}
        {tile('reports', <Stat icon={<FileText />} label="Reports issued" value={s.reportsIssued} />)}
        {s.money && tile('invoices', <Stat icon={<ReceiptText />} label="Invoiced" value={formatINR(s.money.invoiced)} hint={`Paid ${formatINR(s.money.paid)}`} />)}
        {s.money && tile('invoices', <Stat icon={<IndianRupee />} label="Outstanding" value={formatINR(s.money.outstanding)} hint={Number(s.money.overdue) ? <span className="text-red-700">Overdue {formatINR(s.money.overdue)}</span> : 'Nothing overdue'} />)}
        {s.quotations && Number(s.quotations.acceptedValue) > 0 && <Stat icon={<ScrollText />} label="Accepted quotation value" value={formatINR(s.quotations.acceptedValue)} />}
        <Stat icon={<FileText />} label="Customer since" value={s.firstJobAt ? formatDate(s.firstJobAt) : '—'} hint={s.lastActivityAt ? `Last activity ${formatDate(s.lastActivityAt)}` : 'No jobs yet'} />
      </div>
      <Card>
        <CardHeader title="Most booked tests" description="Across all of this customer's samples." />
        <div className="p-4">
          {s.topTests.length === 0 ? (
            <p className="text-[13px] text-gray-600">No tests booked yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {s.topTests.map((t) => (
                <li key={t.testName} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{t.testName}</span>
                  <Badge>{t.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

const PAGE = { page: 1, pageSize: 25 };

/** A paged, searchable list that loads one tab's data. */
function usePaged<T>(key: string, customerId: string, fetcher: (query: { page: number; pageSize: number; q?: string }) => Promise<{ data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }>) {
  const [paging, setPaging] = useState(PAGE);
  const [search, setSearch] = useState('');
  const query = { ...paging, ...(search ? { q: search } : {}) };
  const q = useQuery({ queryKey: [key, customerId, query], queryFn: () => fetcher(query) });
  return {
    q,
    search,
    setSearch: (v: string) => {
      setSearch(v);
      setPaging((p) => ({ ...p, page: 1 }));
    },
    table: {
      rows: q.data?.data,
      meta: q.data?.meta,
      loading: q.isLoading,
      error: q.error,
      onRetry: q.refetch,
      onPageChange: (page: number) => setPaging((p) => ({ ...p, page })),
      onPageSizeChange: (pageSize: number) => setPaging({ page: 1, pageSize }),
    },
  };
}

type QuotationRow = components['schemas']['QuotationSummaryDto'];
export function CustomerQuotations({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const p = usePaged<QuotationRow>('customer-quotations', customerId, async (query) => unwrap(await api.GET('/api/v1/quotations', { params: { query: { ...query, customerId } } })));
  const cols: Col<QuotationRow>[] = [
    { id: 'no', header: 'Quotation', cell: ({ row }) => <span className="font-medium">{row.original.quotationNo}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'date', header: 'Created', cell: ({ row }) => formatDate(row.original.createdAt) },
    { id: 'valid', header: 'Valid until', cell: ({ row }) => formatDate(row.original.validUntil) },
    { id: 'total', header: 'Total', cell: ({ row }) => <span className="whitespace-nowrap">{formatINR(row.original.grandTotal)}</span> },
  ];
  return (
    <Section search={p.search} onSearch={p.setSearch} placeholder="Search quotation number">
      <DataTable columns={cols} {...p.table} ariaLabel="Customer quotations" emptyTitle="No quotations for this customer yet" onRowClick={(r) => navigate(`/quotations/${r.id}`)} />
    </Section>
  );
}

type JobRow = components['schemas']['JobSummaryDto'];
export function CustomerJobs({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const p = usePaged<JobRow>('customer-jobs', customerId, async (query) => unwrap(await api.GET('/api/v1/jobs', { params: { query: { ...query, customerId } } })));
  const cols: Col<JobRow>[] = [
    { id: 'no', header: 'Job', cell: ({ row }) => <span className="font-medium">{row.original.jobNo}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'received', header: 'Received', cell: ({ row }) => formatDate(row.original.receivedAt) },
    { id: 'samples', header: 'Samples', cell: ({ row }) => row.original.sampleCount },
    { id: 'urgent', header: '', cell: ({ row }) => (row.original.urgent ? <Badge tone="red">Urgent</Badge> : null) },
  ];
  return (
    <Section search={p.search} onSearch={p.setSearch} placeholder="Search job number">
      <DataTable columns={cols} {...p.table} ariaLabel="Customer jobs" emptyTitle="No jobs for this customer yet" onRowClick={(r) => navigate(`/samples/jobs/${r.id}`)} />
    </Section>
  );
}

type TestRow = components['schemas']['CustomerTestRowDto'];
export function CustomerTests({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const p = usePaged<TestRow>('customer-tests', customerId, async (query) => unwrap(await api.GET('/api/v1/customers/{id}/tests', { params: { path: { id: customerId }, query } })));
  const cols: Col<TestRow>[] = [
    { id: 'test', header: 'Test', cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.testName}</span>
        <span className="block text-xs text-gray-600">{row.original.testCode}</span>
      </div>
    ) },
    { id: 'sample', header: 'Sample', cell: ({ row }) => (
      <div>
        <span>{row.original.sampleNo}</span>
        <span className="block text-xs text-gray-600">{row.original.sampleDescription}</span>
      </div>
    ) },
    { id: 'job', header: 'Job', cell: ({ row }) => row.original.jobNo },
    { id: 'booked', header: 'Booked', cell: ({ row }) => formatDate(row.original.bookedAt) },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'report', header: 'Report', cell: ({ row }) => (row.original.reportNo ? <span className="whitespace-nowrap">{row.original.reportNo}</span> : '—') },
  ];
  return (
    <Section search={p.search} onSearch={p.setSearch} placeholder="Search test, sample or job">
      <DataTable columns={cols} {...p.table} ariaLabel="Tests booked" emptyTitle="No tests booked for this customer yet" onRowClick={(r) => navigate(`/samples/jobs/${r.jobId}?sample=${r.sampleId}`)} />
    </Section>
  );
}

type ReportRow = components['schemas']['ReportRowDto'];
export function CustomerReports({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const p = usePaged<ReportRow>('customer-reports', customerId, async (query) => unwrap(await api.GET('/api/v1/reports', { params: { query: { ...query, customerId } } })));
  const cols: Col<ReportRow>[] = [
    { id: 'no', header: 'Report', cell: ({ row }) => <span className="font-medium">{row.original.reportNo}</span> },
    { id: 'rev', header: 'Revision', cell: ({ row }) => row.original.revisionNo },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'sample', header: 'Sample', cell: ({ row }) => row.original.sampleNo },
    { id: 'issued', header: 'Issued', cell: ({ row }) => formatDate(row.original.issuedAt) },
  ];
  return (
    <Section search={p.search} onSearch={p.setSearch} placeholder="Search report or sample number">
      <DataTable columns={cols} {...p.table} ariaLabel="Customer reports" emptyTitle="No reports for this customer yet" onRowClick={(r) => navigate(`/approvals/reports/${r.id}`)} />
    </Section>
  );
}

type InvoiceRow = components['schemas']['InvoiceSummaryDto'];
type PaymentRow = components['schemas']['PaymentDto'];
export function CustomerMoney({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const inv = usePaged<InvoiceRow>('customer-invoices', customerId, async (query) => unwrap(await api.GET('/api/v1/invoices', { params: { query: { ...query, customerId } } })));
  const pay = usePaged<PaymentRow>('customer-payments', customerId, async (query) => unwrap(await api.GET('/api/v1/payments', { params: { query: { ...query, customerId } } })));
  const invCols: Col<InvoiceRow>[] = [
    { id: 'no', header: 'Invoice', cell: ({ row }) => <span className="font-medium">{row.original.invoiceNo ?? 'Draft'}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.invoiceDate) },
    { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.grandTotal) },
    { id: 'balance', header: 'Balance', cell: ({ row }) => <span className={row.original.overdue ? 'font-medium text-red-700' : undefined}>{formatINR(row.original.balance)}</span> },
  ];
  const payCols: Col<PaymentRow>[] = [
    { id: 'no', header: 'Payment', cell: ({ row }) => <span className="font-medium">{row.original.paymentNo}</span> },
    { id: 'date', header: 'Paid on', cell: ({ row }) => formatDate(row.original.paidOn) },
    { id: 'mode', header: 'Mode', cell: ({ row }) => row.original.mode },
    { id: 'ref', header: 'Reference', cell: ({ row }) => row.original.reference ?? '—' },
    { id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amount) },
    { id: 'unapplied', header: 'Advance left', cell: ({ row }) => (Number(row.original.unapplied) ? formatINR(row.original.unapplied) : '—') },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Invoices" />
        <div className="p-4">
          <DataTable columns={invCols} {...inv.table} ariaLabel="Customer invoices" emptyTitle="No invoices for this customer yet" onRowClick={(r) => navigate(`/invoices/${r.id}`)} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Payments" />
        <div className="p-4">
          <DataTable columns={payCols} {...pay.table} ariaLabel="Customer payments" emptyTitle="No payments recorded for this customer yet" />
        </div>
      </Card>
    </div>
  );
}

export function CustomerFiles({ customerId }: { customerId: string }) {
  const { can } = useSession();
  if (!can('files.view')) return <p className="text-[13px] text-gray-600">You do not have access to the file library.</p>;
  return <LibraryFiles fixedLink={{ entity: 'Customer', entityId: customerId }} />;
}

function Section({ search, onSearch, placeholder, children }: { search: string; onSearch: (v: string) => void; placeholder: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="max-w-sm">
        <SearchBox value={search} onChange={onSearch} placeholder={placeholder} label={placeholder} />
      </div>
      {children}
    </div>
  );
}
