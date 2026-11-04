import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { DocumentButton, HistoryList, SearchBox } from '@/components/shared';
import { Badge, Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';

type Customer = components['schemas']['CustomerDto'];

// Client-side checks give instant feedback; the backend validates the same rules, including the GSTIN check digit.
const schema = z.object({
  name: z.string().trim().min(2, 'Enter the customer name'),
  gstin: z.string().trim().toUpperCase().regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'That does not look like a GSTIN'),
  pan: z.string().trim().toUpperCase().regex(/^$|^[A-Z]{5}[0-9]{4}[A-Z]$/, 'That does not look like a PAN'),
  stateName: z.string().trim().min(1, 'Enter the state'),
  stateCode: z.string().trim().regex(/^[0-9]{2}$/, 'Two digits'),
  creditDays: z.coerce.number<number>().int().min(0, 'Cannot be negative').max(365),
  withholdReportUntilPaid: z.boolean(),
  notes: z.string(),
  isActive: z.boolean(),
  contacts: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1, 'Enter a name'),
      email: z.string().trim().regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
      phone: z.string(),
      designation: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
  addresses: z.array(
    z.object({
      id: z.string().optional(),
      kind: z.enum(['BILLING', 'REPORT', 'OTHER']),
      line1: z.string().trim().min(1, 'Enter the address'),
      line2: z.string(),
      city: z.string().trim().min(1, 'Enter the city'),
      stateName: z.string().trim().min(1, 'Enter the state'),
      stateCode: z.string().trim().regex(/^[0-9]{2}$/, 'Two digits'),
      pincode: z.string().trim().regex(/^$|^[0-9]{6}$/, 'Six digits'),
    }),
  ),
});
type FormValues = z.infer<typeof schema>;

function toForm(c: Customer | null): FormValues {
  return {
    name: c?.name ?? '',
    gstin: c?.gstin ?? '',
    pan: c?.pan ?? '',
    stateName: c?.stateName ?? '',
    stateCode: c?.stateCode ?? '',
    creditDays: c?.creditDays ?? 30,
    withholdReportUntilPaid: c?.withholdReportUntilPaid ?? false,
    notes: c?.notes ?? '',
    isActive: c?.isActive ?? true,
    contacts: c?.contacts.map((x) => ({ id: x.id, name: x.name, email: x.email ?? '', phone: x.phone ?? '', designation: x.designation ?? '', isPrimary: x.isPrimary })) ?? [],
    addresses: c?.addresses.map((x) => ({ id: x.id, kind: x.kind, line1: x.line1, line2: x.line2 ?? '', city: x.city, stateName: x.stateName, stateCode: x.stateCode, pincode: x.pincode ?? '' })) ?? [],
  };
}

function toBody(v: FormValues) {
  return {
    name: v.name,
    gstin: v.gstin || null,
    pan: v.pan || null,
    stateName: v.stateName,
    stateCode: v.stateCode,
    creditDays: v.creditDays,
    withholdReportUntilPaid: v.withholdReportUntilPaid,
    notes: v.notes || null,
    contacts: v.contacts.map((c) => ({ ...c, email: c.email || null, phone: c.phone || null, designation: c.designation || null })),
    addresses: v.addresses.map((a) => ({ ...a, line2: a.line2 || null, pincode: a.pincode || null })),
  };
}

export function CustomerForm({ customer, onSaved }: { customer: Customer | null; onSaved: (c: Customer) => void }) {
  const { can } = useSession();
  const client = useQueryClient();
  const canEdit = can('customers.edit');
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(customer) });
  useEffect(() => form.reset(toForm(customer)), [customer, form]);
  const contacts = useFieldArray({ control: form.control, name: 'contacts' });
  const addresses = useFieldArray({ control: form.control, name: 'addresses' });
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: FormValues) => {
      if (customer) return unwrap(await api.PATCH('/api/v1/customers/{id}', { params: { path: { id: customer.id } }, body: { ...toBody(v), version: customer.version, isActive: v.isActive } as never }));
      return unwrap(await api.POST('/api/v1/customers', { body: toBody(v) as never }));
    },
    onSuccess: (c) => {
      client.invalidateQueries({ queryKey: ['customers'] });
      client.invalidateQueries({ queryKey: ['customer', c.id] });
      client.invalidateQueries({ queryKey: ['customer-options'] });
      toast.success('Customer saved');
      onSaved(c);
    },
    onError: (err) => applyServerErrors(err, form.setError, ['name', 'gstin', 'pan', 'stateName', 'stateCode', 'creditDays', 'notes']),
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      <fieldset disabled={!canEdit} className="space-y-4">
        <Card>
          <CardHeader title="Customer details" />
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <Field label="Name" htmlFor="c-name" required error={e.name?.message} className="md:col-span-2">
              <Input id="c-name" aria-invalid={!!e.name} {...form.register('name')} />
            </Field>
            <Field label="Credit days" htmlFor="c-credit" error={e.creditDays?.message}>
              <Input id="c-credit" type="number" {...form.register('creditDays')} />
            </Field>
            <Field label="GSTIN" htmlFor="c-gstin" error={e.gstin?.message}>
              <Input id="c-gstin" className="uppercase" aria-invalid={!!e.gstin} {...form.register('gstin')} />
            </Field>
            <Field label="PAN" htmlFor="c-pan" error={e.pan?.message}>
              <Input id="c-pan" className="uppercase" aria-invalid={!!e.pan} {...form.register('pan')} />
            </Field>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <Field label="State" htmlFor="c-state" required error={e.stateName?.message}>
                <Input id="c-state" aria-invalid={!!e.stateName} {...form.register('stateName')} />
              </Field>
              <Field label="GST code" htmlFor="c-statecode" required error={e.stateCode?.message}>
                <Input id="c-statecode" inputMode="numeric" maxLength={2} aria-invalid={!!e.stateCode} {...form.register('stateCode')} />
              </Field>
            </div>
            <Field label="Notes" htmlFor="c-notes" className="md:col-span-3">
              <Textarea id="c-notes" rows={2} {...form.register('notes')} />
            </Field>
            <Checkbox id="c-withhold" label="Withhold report release until payment is received" checked={form.watch('withholdReportUntilPaid')} onCheckedChange={(v) => form.setValue('withholdReportUntilPaid', !!v)} />
            {customer && <Checkbox id="c-active" label="Active" checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', !!v)} />}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Contacts"
            actions={
              <Button variant="secondary" size="sm" onClick={() => contacts.append({ name: '', email: '', phone: '', designation: '', isPrimary: contacts.fields.length === 0 })}>
                <Plus aria-hidden />
                Add contact
              </Button>
            }
          />
          <div className="space-y-3 p-4">
            {contacts.fields.length === 0 && <p className="text-[13px] text-gray-600">No contacts yet.</p>}
            {contacts.fields.map((f, i) => (
              <div key={f.id} className="grid items-start gap-2 md:grid-cols-[1fr_1fr_9rem_1fr_6rem_auto]">
                <Field label="Name" htmlFor={`ct-${i}-name`} required error={e.contacts?.[i]?.name?.message}>
                  <Input id={`ct-${i}-name`} {...form.register(`contacts.${i}.name`)} />
                </Field>
                <Field label="Email" htmlFor={`ct-${i}-email`} error={e.contacts?.[i]?.email?.message}>
                  <Input id={`ct-${i}-email`} type="email" {...form.register(`contacts.${i}.email`)} />
                </Field>
                <Field label="Phone" htmlFor={`ct-${i}-phone`}>
                  <Input id={`ct-${i}-phone`} {...form.register(`contacts.${i}.phone`)} />
                </Field>
                <Field label="Designation" htmlFor={`ct-${i}-des`}>
                  <Input id={`ct-${i}-des`} {...form.register(`contacts.${i}.designation`)} />
                </Field>
                <div className="pt-7">
                  <Checkbox
                    id={`ct-${i}-primary`}
                    label="Primary"
                    checked={form.watch(`contacts.${i}.isPrimary`)}
                    onCheckedChange={(v) => {
                      contacts.fields.forEach((_, n) => form.setValue(`contacts.${n}.isPrimary`, n === i && !!v));
                    }}
                  />
                </div>
                <Button variant="ghost" size="icon" className="mt-6" aria-label={`Remove contact ${i + 1}`} onClick={() => contacts.remove(i)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Addresses"
            description="Billing and report addresses."
            actions={
              <Button variant="secondary" size="sm" onClick={() => addresses.append({ kind: addresses.fields.length === 0 ? 'BILLING' : 'REPORT', line1: '', line2: '', city: '', stateName: form.getValues('stateName'), stateCode: form.getValues('stateCode'), pincode: '' })}>
                <Plus aria-hidden />
                Add address
              </Button>
            }
          />
          <div className="space-y-3 p-4">
            {addresses.fields.length === 0 && <p className="text-[13px] text-gray-600">No addresses yet.</p>}
            {addresses.fields.map((f, i) => (
              <div key={f.id} className="grid items-start gap-2 md:grid-cols-[7rem_1fr_1fr_8rem_8rem_5rem_6rem_auto]">
                <Field label="Type" htmlFor={`ad-${i}-kind`}>
                  <Select id={`ad-${i}-kind`} {...form.register(`addresses.${i}.kind`)}>
                    <option value="BILLING">Billing</option>
                    <option value="REPORT">Report</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </Field>
                <Field label="Address" htmlFor={`ad-${i}-l1`} required error={e.addresses?.[i]?.line1?.message}>
                  <Input id={`ad-${i}-l1`} {...form.register(`addresses.${i}.line1`)} />
                </Field>
                <Field label="Line 2" htmlFor={`ad-${i}-l2`}>
                  <Input id={`ad-${i}-l2`} {...form.register(`addresses.${i}.line2`)} />
                </Field>
                <Field label="City" htmlFor={`ad-${i}-city`} required error={e.addresses?.[i]?.city?.message}>
                  <Input id={`ad-${i}-city`} {...form.register(`addresses.${i}.city`)} />
                </Field>
                <Field label="State" htmlFor={`ad-${i}-state`} required error={e.addresses?.[i]?.stateName?.message}>
                  <Input id={`ad-${i}-state`} {...form.register(`addresses.${i}.stateName`)} />
                </Field>
                <Field label="Code" htmlFor={`ad-${i}-code`} required error={e.addresses?.[i]?.stateCode?.message}>
                  <Input id={`ad-${i}-code`} maxLength={2} {...form.register(`addresses.${i}.stateCode`)} />
                </Field>
                <Field label="PIN" htmlFor={`ad-${i}-pin`} error={e.addresses?.[i]?.pincode?.message}>
                  <Input id={`ad-${i}-pin`} maxLength={6} {...form.register(`addresses.${i}.pincode`)} />
                </Field>
                <Button variant="ghost" size="icon" className="mt-6" aria-label={`Remove address ${i + 1}`} onClick={() => addresses.remove(i)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={m.isPending}>
            Save customer
          </Button>
        </div>
      )}
    </form>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const q = useQuery({ queryKey: ['customer', id], enabled: !isNew, queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}', { params: { path: { id: id! } } })) });
  const [tab, setTab] = useState('details');
  const history = useQuery({ queryKey: ['customer-history', id], enabled: !isNew && tab === 'history', queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}/history', { params: { path: { id: id! } } })) });
  if (!isNew && q.isLoading) return <Spinner />;
  if (!isNew && q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const customer = q.data ?? null;
  return (
    <>
      <PageHeader title={isNew ? 'New customer' : customer!.name} description={customer?.crn} />
      {isNew ? (
        <CustomerForm customer={null} onSaved={(c) => navigate(`/customers/${c.id}`, { replace: true })} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <CustomerForm customer={customer} onSaved={() => undefined} />
          </TabsContent>
          <TabsContent value="history">{history.isLoading ? <Spinner /> : <HistoryList entries={(history.data ?? []) as never} />}</TabsContent>
        </Tabs>
      )}
    </>
  );
}

export default function CustomersPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const list = useListState();
  const q = useQuery({ queryKey: ['customers', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/customers', { params: { query: list.query } })) });
  const columns = useMemo<Col<Customer>[]>(
    () => [
      { accessorKey: 'crn', id: 'crn', header: 'CRN', enableSorting: true },
      { accessorKey: 'name', id: 'name', header: 'Customer', enableSorting: true },
      { id: 'gstin', header: 'GSTIN', cell: ({ row }) => row.original.gstin ?? '—' },
      { accessorKey: 'stateName', id: 'stateName', header: 'State', enableSorting: true },
      { accessorKey: 'creditDays', id: 'creditDays', header: 'Credit days', enableSorting: true },
      { id: 'contact', header: 'Primary contact', cell: ({ row }) => row.original.contacts.find((c) => c.isPrimary)?.name ?? row.original.contacts[0]?.name ?? '—' },
      { id: 'isActive', header: 'Status', cell: ({ row }) => <Badge tone={row.original.isActive ? 'green' : 'gray'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    ],
    [],
  );
  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          <>
            <DocumentButton kind="customer-export">Export Excel</DocumentButton>
            {can('customers.edit') && (
              <Button onClick={() => navigate('/customers/new')}>
                <Plus aria-hidden />
                New customer
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search name, CRN or GSTIN" label="Search customers" />
          <Select aria-label="Status filter" className="w-32" value={list.filters.active ?? 'true'} onChange={(e) => list.setFilter('active', e.target.value === 'true' ? null : e.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="all">All</option>
          </Select>
        </div>
        <DataTable ariaLabel="Customers" columns={columns} rows={q.data?.data} meta={q.data?.meta} loading={q.isLoading} error={q.error} onRetry={q.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(c) => navigate(`/customers/${c.id}`)} getRowId={(c) => c.id} emptyTitle="No customers found" />
      </div>
    </>
  );
}
