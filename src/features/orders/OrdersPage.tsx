import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { CustomerPicker } from '@/components/pickers';
import { Attachments, DateRangeFilter, SavedFilters, SearchBox, StatusBadge, MobileFilters } from '@/components/shared';
import { Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn, formatDate, formatINR, humanize, toDateInput, todayIso } from '@/lib/format';
import { applyServerErrors } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';

type Order = components['schemas']['OrderDto'];

const SOURCES = ['EMAIL', 'PHONE', 'LETTER', 'WALK_IN'] as const;
const STAGES = ['NEW', 'QUOTED', 'WON', 'LOST'] as const;

const schema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  source: z.enum(SOURCES),
  reference: z.string().trim().max(200),
  description: z.string().trim().max(2000),
  receivedOn: z.string().min(1, 'Enter the date received'),
  ownerId: z.string(),
  stage: z.enum(STAGES),
});
type FormValues = z.infer<typeof schema>;

const toForm = (o: Order | null, presetCustomerId = ''): FormValues => ({
  customerId: o?.customerId ?? presetCustomerId,
  source: o?.source ?? 'EMAIL',
  reference: o?.reference ?? '',
  description: o?.description ?? '',
  receivedOn: o ? toDateInput(o.receivedOn) : todayIso(),
  ownerId: o?.ownerId ?? '',
  stage: o?.stage ?? 'NEW',
});

function OrderForm({ order, onSaved }: { order: Order | null; onSaved: (o: Order) => void }) {
  const { can } = useSession();
  const client = useQueryClient();
  const canEdit = can('orders.edit');
  // A customer just created from the picker comes back as ?customerId=.
  const [params] = useSearchParams();
  const preset = order ? '' : (params.get('customerId') ?? '');
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(order, preset) });
  useEffect(() => form.reset(toForm(order, preset)), [order, preset, form]);
  const owners = useQuery({ queryKey: ['order-owners'], staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/orders/owners')) });
  // A native select shows nothing until its option exists, so re-apply the value once they load.
  useEffect(() => {
    if (owners.data) form.setValue('ownerId', form.getValues('ownerId'));
  }, [owners.data, form]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: FormValues) => {
      const body = { customerId: v.customerId, source: v.source, reference: v.reference || null, description: v.description || null, receivedOn: v.receivedOn, ownerId: v.ownerId || null };
      if (order) return unwrap(await api.PATCH('/api/v1/orders/{id}', { params: { path: { id: order.id } }, body: { ...body, version: order.version, stage: v.stage } }));
      return unwrap(await api.POST('/api/v1/orders', { body }));
    },
    onSuccess: (o) => {
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: ['orders-pipeline'] });
      client.setQueryData(['order', o.id], o);
      toast.success('Order saved');
      onSaved(o);
    },
    onError: (err) => applyServerErrors(err, form.setError, ['customerId', 'source', 'reference', 'description', 'receivedOn', 'ownerId', 'stage']),
  });
  return (
    <form onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      <Card>
        <CardHeader title="Order details" />
        <fieldset disabled={!canEdit} className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 md:grid-cols-3">
          <Field label="Customer" htmlFor="o-customer" required error={e.customerId?.message} className="md:col-span-2">
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => <CustomerPicker id="o-customer" value={field.value} onChange={field.onChange} disabled={!canEdit} invalid={!!e.customerId} />}
            />
          </Field>
          <Field label="Received on" htmlFor="o-received" required error={e.receivedOn?.message}>
            <Input id="o-received" type="date" aria-invalid={!!e.receivedOn} {...form.register('receivedOn')} />
          </Field>
          <Field label="Source" htmlFor="o-source" required error={e.source?.message}>
            <Select id="o-source" {...form.register('source')}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference" htmlFor="o-reference" error={e.reference?.message}>
            <Input id="o-reference" {...form.register('reference')} />
          </Field>
          <Field label="Owner" htmlFor="o-owner" error={e.ownerId?.message}>
            <Select id="o-owner" {...form.register('ownerId')}>
              <option value="">Unassigned</option>
              {owners.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          {order && (
            <Field label="Stage" htmlFor="o-stage" error={e.stage?.message}>
              <Select id="o-stage" {...form.register('stage')}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Description" htmlFor="o-description" error={e.description?.message} className="md:col-span-3">
            <Textarea id="o-description" rows={3} {...form.register('description')} />
          </Field>
        </fieldset>
        {canEdit && (
          <div className="flex justify-end border-t border-gray-200 px-4 py-3">
            <Button type="submit" loading={m.isPending}>
              Save order
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}

function OrderQuotations({ order }: { order: Order }) {
  const { can } = useSession();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['quotations', { orderId: order.id }],
    queryFn: async () => unwrap(await api.GET('/api/v1/quotations', { params: { query: { orderId: order.id, pageSize: 100 } } })),
  });
  const columns = useMemo<Col<components['schemas']['QuotationSummaryDto']>[]>(
    () => [
      { accessorKey: 'quotationNo', id: 'quotationNo', header: 'Quotation' },
      { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: 'version', header: 'Version', cell: ({ row }) => `v${row.original.currentVersionNo}` },
      { id: 'validUntil', header: 'Valid until', cell: ({ row }) => formatDate(row.original.validUntil) },
      { id: 'grandTotal', header: 'Grand total', cell: ({ row }) => formatINR(row.original.grandTotal) },
    ],
    [],
  );
  return (
    <Card>
      <CardHeader
        title="Quotations"
        actions={
          can('quotations.edit') && (
            <Button asChild variant="secondary" size="sm">
              <Link to={`/quotations/new?orderId=${order.id}&customerId=${order.customerId}`}>
                <Plus aria-hidden />
                Create quotation
              </Link>
            </Button>
          )
        }
      />
      <div className="p-4">
        <DataTable
          ariaLabel="Quotations for this order"
          columns={columns}
          rows={q.data?.data}
          loading={q.isLoading}
          error={q.error}
          onRetry={q.refetch}
          onRowClick={(r) => navigate(`/quotations/${r.id}`)}
          getRowId={(r) => r.id}
          emptyTitle="No quotations for this order yet"
          maxHeightClass="max-h-72"
        />
      </div>
    </Card>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const { can } = useSession();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const q = useQuery({ queryKey: ['order', id], enabled: !isNew, queryFn: async () => unwrap(await api.GET('/api/v1/orders/{id}', { params: { path: { id: id! } } })) });
  const breadcrumb = (
    <Link to="/orders" className="underline">
      Orders
    </Link>
  );
  if (isNew) {
    if (!can('orders.edit')) return <ErrorState error={new Error('You do not have permission to create orders.')} />;
    return (
      <>
        <PageHeader title="New order" breadcrumb={breadcrumb} />
        <OrderForm order={null} onSaved={(o) => navigate(`/orders/${o.id}`, { replace: true })} />
      </>
    );
  }
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const order = q.data;
  return (
    <>
      <PageHeader title={order.orderNo} description={order.customerName} breadcrumb={breadcrumb} actions={<StatusBadge status={order.stage} />} />
      <div className="space-y-4">
        <OrderForm order={order} onSaved={() => undefined} />
        {can('quotations.view') && <OrderQuotations order={order} />}
        <Card>
          <div className="p-4">
            <Attachments entity="Order" entityId={order.id} category="attachment" canEdit={can('orders.edit')} />
          </div>
        </Card>
      </div>
    </>
  );
}

export default function OrdersPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const list = useListState();
  const q = useQuery({ queryKey: ['orders', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/orders', { params: { query: list.query } })) });
  const pipeline = useQuery({ queryKey: ['orders-pipeline'], queryFn: async () => unwrap(await api.GET('/api/v1/orders/pipeline')) });
  const columns = useMemo<Col<Order>[]>(
    () => [
      { accessorKey: 'orderNo', id: 'orderNo', header: 'Order', enableSorting: true },
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      { id: 'source', header: 'Source', cell: ({ row }) => humanize(row.original.source) },
      { id: 'reference', header: 'Reference', cell: ({ row }) => row.original.reference ?? '—' },
      { id: 'receivedOn', header: 'Received', enableSorting: true, cell: ({ row }) => formatDate(row.original.receivedOn) },
      { id: 'stage', header: 'Stage', enableSorting: true, cell: ({ row }) => <StatusBadge status={row.original.stage} /> },
      { id: 'ownerName', header: 'Owner', cell: ({ row }) => row.original.ownerName ?? '—' },
      { accessorKey: 'quotationCount', id: 'quotationCount', header: 'Quotations' },
    ],
    [],
  );
  const stage = list.filters.stage ?? '';
  return (
    <>
      <PageHeader
        title="Orders"
        actions={
          can('orders.edit') && (
            <Button onClick={() => navigate('/orders/new')}>
              <Plus aria-hidden />
              New order
            </Button>
          )
        }
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by stage">
          <StageChip label="All" pressed={!stage} onClick={() => list.setFilter('stage', null)} />
          {pipeline.data?.map((p) => (
            <StageChip key={p.stage} label={humanize(p.stage)} count={p.count} pressed={stage === p.stage} onClick={() => list.setFilter('stage', stage === p.stage ? null : p.stage)} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search order, customer or reference" label="Search orders" />
          <MobileFilters filters={list.filters} onClear={list.clearFilters}>
            <DateRangeFilter label="Received" from={list.filters.from ?? ''} to={list.filters.to ?? ''} onChange={list.setFilter} />
            <SavedFilters screen="orders" current={list.allParams} onApply={list.applyFilters} />
          </MobileFilters>
        </div>
        <DataTable
          ariaLabel="Orders"
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
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          getRowId={(o) => o.id}
          emptyTitle="No orders found"
        />
      </div>
    </>
  );
}

function StageChip({ label, count, pressed, onClick }: { label: string; count?: number; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium',
        pressed ? 'border-brand bg-brand text-brand-fg' : 'border-gray-300 bg-surface text-gray-800 hover:bg-gray-50',
      )}
    >
      {label}
      {count !== undefined && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
