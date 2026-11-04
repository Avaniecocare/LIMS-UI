import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { CustomerPicker } from '@/components/pickers';
import { DocumentButton, RowActions, SavedFilters, SearchBox } from '@/components/shared';
import { Badge, Button, Card, CardHeader, Dialog, ErrorState, Field, Input, PageHeader, Select, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn, formatDate, formatINR } from '@/lib/format';
import { useListState } from '@/lib/use-list-state';
import { Money, RecordPaymentDialog, ReminderDialog, useBillingActions, type InvoiceSummary } from './billing';

const BUCKETS = ['Not Due', '0-30', '31-60', '61-90', '90+'];

function Chip({ label, amount, count, active, onClick }: { label: string; amount: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn('min-w-32 rounded-lg border px-3 py-2 text-left hover:bg-gray-50', active ? 'border-brand bg-white ring-2 ring-brand' : 'border-gray-200 bg-white')}>
      <span className="block text-xs font-medium text-gray-700">{label}</span>
      <span className="block text-base font-semibold text-gray-900 tabular-nums">{formatINR(amount)}</span>
      {count !== undefined && (
        <span className="block text-xs text-gray-700">
          {count} {count === 1 ? 'invoice' : 'invoices'}
        </span>
      )}
    </button>
  );
}

/** Statement of Account for one customer, with an optional period. */
function StatementDialog({ customer, onClose }: { customer: { id: string; name: string } | null; onClose: () => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()} title={`Statement of account: ${customer?.name ?? ''}`} description="Leave the dates empty for the whole account up to today.">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" htmlFor="soa-from">
            <Input id="soa-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="soa-to">
            <Input id="soa-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {customer && (
            <DocumentButton variant="primary" kind="statement-of-account" params={{ customerId: customer.id, ...(from ? { from } : {}), ...(to ? { to } : {}) }}>
              Produce statement
            </DocumentButton>
          )}
        </div>
      </div>
    </Dialog>
  );
}

export default function DueInvoicesPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const list = useListState();
  const { canPay, canRemind } = useBillingActions();
  const q = useQuery({ queryKey: ['due-invoices', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/invoices/due', { params: { query: list.query } })) });
  const customerId = list.filters.customerId;
  const summary = useQuery({ queryKey: ['due-summary', customerId ?? ''], queryFn: async () => unwrap(await api.GET('/api/v1/invoices/due/summary', { params: { query: customerId ? { customerId } : {} } })) });
  const [paying, setPaying] = useState<InvoiceSummary | null>(null);
  const [reminding, setReminding] = useState<InvoiceSummary | null>(null);
  const [statement, setStatement] = useState<{ id: string; name: string } | null>(null);
  const bucket = list.filters.bucket ?? '';

  const columns = useMemo<Col<InvoiceSummary>[]>(
    () => [
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      { id: 'invoiceNo', header: 'Invoice', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{row.original.invoiceNo}</span> },
      { id: 'invoiceDate', header: 'Date', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.invoiceDate)}</span> },
      { id: 'dueDate', header: 'Due', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.dueDate)}</span> },
      { id: 'grandTotal', header: 'Amount', enableSorting: true, cell: ({ row }) => <Money value={row.original.grandTotal} /> },
      { id: 'paid', header: 'Paid', cell: ({ row }) => <Money value={row.original.paidAmount} /> },
      { id: 'balance', header: 'Balance', cell: ({ row }) => <Money value={row.original.balance} /> },
      { id: 'daysOverdue', header: 'Days overdue', cell: ({ row }) => (row.original.overdue ? row.original.daysOverdue : <span className="text-gray-700">—</span>) },
      { id: 'ageing', header: 'Ageing', cell: ({ row: { original: i } }) => <Badge tone={i.overdue ? 'red' : 'gray'}>{i.ageingBucket ?? '—'}</Badge> },
      ...(canPay || canRemind
        ? [
            {
              id: 'actions',
              header: 'Actions',
              cell: ({ row: { original: i } }) => (
                <RowActions stack>
                  {canPay && (
                    <Button variant="secondary" size="sm" aria-label={`Record payment for ${i.invoiceNo}`} onClick={() => setPaying(i)}>
                      Record payment
                    </Button>
                  )}
                  {canRemind && (
                    <Button variant="ghost" size="sm" aria-label={`Send reminder for ${i.invoiceNo}`} onClick={() => setReminding(i)}>
                      Remind
                    </Button>
                  )}
                </RowActions>
              ),
            } as Col<InvoiceSummary>,
          ]
        : []),
    ],
    [canPay, canRemind],
  );

  // Exactly what the table is showing, without its paging.
  const exportParams = Object.fromEntries(Object.entries({ customerId, bucket, overdue: list.filters.overdue, q: list.q }).filter(([, v]) => v));

  return (
    <>
      <PageHeader
        title="Due Invoices"
        description="Everything unpaid, with ageing worked out from the due date."
        actions={
          <DocumentButton kind="due-invoices-export" params={exportParams}>
            Excel
          </DocumentButton>
        }
      />
      <div className="space-y-3">
        <section aria-label="Ageing totals" className="flex flex-wrap gap-2">
          {summary.isLoading && <Spinner />}
          {summary.error && <ErrorState error={summary.error} onRetry={summary.refetch} />}
          {summary.data && (
            <>
              <Chip label="All outstanding" amount={summary.data.total} active={!bucket} onClick={() => list.setFilter('bucket', null)} />
              {BUCKETS.map((b) => {
                const a = summary.data.ageing.find((x) => x.bucket === b);
                return <Chip key={b} label={b} amount={a?.amount ?? '0.00'} count={a?.count ?? 0} active={bucket === b} onClick={() => list.setFilter('bucket', bucket === b ? null : b)} />;
              })}
            </>
          )}
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search invoice or customer" label="Search due invoices" />
          {can('customers.view') && (
            <div className="w-56">
              <CustomerPicker ariaLabel="Customer filter" placeholder="All customers" value={customerId ?? ''} onChange={(v) => list.setFilter('customerId', v || null)} />
            </div>
          )}
          <Select aria-label="Ageing filter" className="w-32" value={bucket} onChange={(e) => list.setFilter('bucket', e.target.value || null)}>
            <option value="">All ageing</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select aria-label="Overdue filter" className="w-36" value={list.filters.overdue ?? ''} onChange={(e) => list.setFilter('overdue', e.target.value || null)}>
            <option value="">Overdue or not</option>
            <option value="true">Overdue only</option>
            <option value="false">Not overdue</option>
          </Select>
          <SavedFilters screen="due-invoices" current={list.allParams} onApply={list.applyFilters} />
        </div>
        <DataTable ariaLabel="Due invoices" columns={columns} rows={q.data?.data} meta={q.data?.meta} loading={q.isLoading} error={q.error} onRetry={q.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(r) => navigate(`/invoices/${r.id}`)} getRowId={(r) => r.id} emptyTitle="No invoices are due" emptyHint={bucket || list.filters.overdue || customerId || list.q ? 'Try clearing the filters.' : undefined} maxHeightClass="max-h-[60vh]" />
        <Card>
          <CardHeader title="Outstanding by customer" />
          {summary.data?.customers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" aria-label="Outstanding by customer">
                <thead className="bg-gray-50 text-left text-xs text-gray-700">
                  <tr>
                    {['Customer', 'CRN', 'Invoices', 'Outstanding', 'Overdue', 'Statement'].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.data.customers.map((c) => (
                    <tr key={c.customerId} className="border-t border-gray-100">
                      <td className="px-3 py-1.5">
                        <button type="button" className="text-left underline" aria-label={`Show due invoices of ${c.customerName}`} onClick={() => list.setFilter('customerId', c.customerId)}>
                          {c.customerName}
                        </button>
                      </td>
                      <td className="px-3 py-1.5">{c.crn}</td>
                      <td className="px-3 py-1.5">{c.invoiceCount}</td>
                      <td className="px-3 py-1.5">
                        <Money value={c.outstanding} />
                      </td>
                      <td className="px-3 py-1.5">
                        <Money value={c.overdue} />
                      </td>
                      <td className="px-3 py-1">
                        <Button variant="secondary" size="sm" aria-label={`Statement of account for ${c.customerName}`} onClick={() => setStatement({ id: c.customerId, name: c.customerName })}>
                          Statement
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-[13px] text-gray-700">{summary.isLoading ? 'Loading…' : 'No customer has anything outstanding.'}</p>
          )}
        </Card>
      </div>
      <RecordPaymentDialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)} invoice={paying} />
      <ReminderDialog invoice={reminding} onClose={() => setReminding(null)} />
      <StatementDialog customer={statement} onClose={() => setStatement(null)} />
    </>
  );
}
