import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { DocumentButton, HistoryList, MobileFilters, SearchBox } from '@/components/shared';
import { Badge, Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { StatePicker } from '@/components/StatePicker';
import { lookupGstin, lookupPincode, useGstStates } from '@/lib/autofill';
import { safeAppPath } from '@/lib/safe-path';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { useListState } from '@/lib/use-list-state';
import { CustomerFiles, CustomerJobs, CustomerMoney, CustomerOverview, CustomerQuotations, CustomerReports, CustomerTests } from './CustomerHistory';

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

/** Tap to call or email a contact: on a phone this is the quickest way to reach the customer. */
function ContactLinks({ name, phone, email }: { name: string; phone: string; email: string }) {
  const tel = (phone ?? '').replace(/[^\d+]/g, '');
  const mail = (email ?? '').trim();
  if (tel.length < 6 && !mail.includes('@')) return null;
  return (
    <div className="flex flex-wrap gap-2 md:col-span-full md:-mt-1">
      {tel.length >= 6 && (
        <Button asChild variant="secondary" size="sm">
          <a href={`tel:${tel}`} aria-label={`Call ${name || 'contact'}`}>
            <Phone aria-hidden />
            Call
          </a>
        </Button>
      )}
      {mail.includes('@') && (
        <Button asChild variant="secondary" size="sm">
          <a href={`mailto:${mail}`} aria-label={`Email ${name || 'contact'}`}>
            <Mail aria-hidden />
            Email
          </a>
        </Button>
      )}
    </div>
  );
}

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

export function CustomerForm({ customer, onSaved, initialName }: { customer: Customer | null; onSaved: (c: Customer) => void; /** a new customer's name, carried from the picker it was started in */ initialName?: string }) {
  const { can } = useSession();
  const client = useQueryClient();
  const canEdit = can('customers.edit');
  const start = useMemo(() => ({ ...toForm(customer), ...(!customer && initialName ? { name: initialName } : {}) }), [customer, initialName]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: start });
  useEffect(() => form.reset(start), [start, form]);
  const contacts = useFieldArray({ control: form.control, name: 'contacts' });
  const addresses = useFieldArray({ control: form.control, name: 'addresses' });
  const states = useGstStates();
  const [filled, setFilled] = useState<string | null>(null);
  const [localities, setLocalities] = useState<Record<number, string[]>>({});
  const guard = useLeaveGuard(form.formState.isDirty && canEdit);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: FormValues) => {
      if (customer) return unwrap(await api.PATCH('/api/v1/customers/{id}', { params: { path: { id: customer.id } }, body: { ...toBody(v), version: customer.version, isActive: v.isActive } }));
      return unwrap(await api.POST('/api/v1/customers', { body: toBody(v) }));
    },
    onSuccess: (c) => {
      client.invalidateQueries({ queryKey: ['customers'] });
      client.invalidateQueries({ queryKey: ['customer', c.id] });
      client.invalidateQueries({ queryKey: ['customer-options'] });
      toast.success('Customer saved');
      form.reset(form.getValues());
      guard.leaveWithoutPrompt(() => onSaved(c));
    },
    onError: (err) => applyServerErrors(err, form.setError, ['name', 'gstin', 'pan', 'stateName', 'stateCode', 'creditDays', 'notes']),
  });

  /** A valid GSTIN tells us the state, its GST code and the PAN: fill whatever is still empty or different. */
  const onGstin = async (value: string) => {
    const info = await lookupGstin(value);
    if (!info) return;
    const opts = { shouldDirty: true, shouldValidate: true };
    if (info.stateName) form.setValue('stateName', info.stateName, opts);
    if (info.stateCode) form.setValue('stateCode', info.stateCode, opts);
    if (info.pan && !form.getValues('pan')) form.setValue('pan', info.pan, opts);
    setFilled(`State ${info.stateName ?? ''} (${info.stateCode}) and PAN filled from the GSTIN.`);
  };
  const setState = (path: 'stateName' | `addresses.${number}.stateName`, codePath: 'stateCode' | `addresses.${number}.stateCode`, name: string) => {
    const match = states.data?.find((s) => s.name === name);
    form.setValue(path, name, { shouldDirty: true, shouldValidate: true });
    if (match) form.setValue(codePath, match.code, { shouldDirty: true, shouldValidate: true });
  };
  /** Six digits in the PIN field fill the city, state and GST code, and offer the post office names as line 2. */
  const onPincode = async (i: number, value: string) => {
    setPinStatus((st) => ({ ...st, [i]: { tone: 'info', text: 'Looking up the PIN code…' } }));
    const info = await lookupPincode(value);
    if (!info) {
      setPinStatus((st) => ({ ...st, [i]: { tone: 'warn', text: 'No details found for this PIN code. Fill in the city and state by hand.' } }));
      return;
    }
    const opts = { shouldDirty: true, shouldValidate: true };
    if (info.city) form.setValue(`addresses.${i}.city`, info.city, opts);
    if (info.stateName) form.setValue(`addresses.${i}.stateName`, info.stateName, opts);
    if (info.stateCode) form.setValue(`addresses.${i}.stateCode`, info.stateCode, opts);
    // The customer's own state is nearly always the address's: fill it too if it is still empty.
    if (info.stateName && info.stateCode && !form.getValues('stateName')) {
      form.setValue('stateName', info.stateName, opts);
      form.setValue('stateCode', info.stateCode, opts);
    }
    setLocalities((l) => ({ ...l, [i]: info.localities }));
    const place = [info.city, info.stateName].filter(Boolean).join(', ');
    const text =
      info.match === 'exact'
        ? `Filled from the PIN code: ${place}${info.localities.length ? '. Pick the area below.' : '.'}`
        : info.match === 'nearby'
          ? `PIN ${value} is not in India Post's list yet, so these come from nearby PIN ${info.nearbyPincode}: ${place}. Check the city and type the area.`
          : `PIN ${value} is not in India Post's list yet. The state (${info.stateName}) comes from the PIN itself; type the city and area.`;
    setPinStatus((st) => ({ ...st, [i]: { tone: info.match === 'exact' ? 'ok' : 'warn', text } }));
  };
  const [pinStatus, setPinStatus] = useState<Record<number, { tone: 'ok' | 'warn' | 'info'; text: string }>>({});
  const copyBilling = () => {
    const billing = form.getValues('addresses').find((a) => a.kind === 'BILLING');
    if (!billing) return;
    addresses.append({ ...billing, id: undefined, kind: 'REPORT' });
  };
  const hasBilling = form.watch('addresses').some((a) => a.kind === 'BILLING');

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      {guard.dialog}
      <fieldset disabled={!canEdit} className="space-y-4">
        <Card>
          <CardHeader title="Customer details" />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 md:grid-cols-3">
            <Field label="Name" htmlFor="c-name" required error={e.name?.message} className="md:col-span-2">
              <Input id="c-name" aria-invalid={!!e.name} {...form.register('name')} />
            </Field>
            <Field label="Credit days" htmlFor="c-credit" error={e.creditDays?.message}>
              <Input id="c-credit" type="number" {...form.register('creditDays')} />
            </Field>
            <Field label="GSTIN" htmlFor="c-gstin" error={e.gstin?.message} hint={filled ?? 'Enter the GSTIN to fill the state and PAN automatically'}>
              <Input id="c-gstin" className="uppercase" aria-invalid={!!e.gstin} {...form.register('gstin', { onChange: (ev) => void onGstin(ev.target.value) })} />
            </Field>
            <Field label="PAN" htmlFor="c-pan" error={e.pan?.message}>
              <Input id="c-pan" className="uppercase" aria-invalid={!!e.pan} {...form.register('pan')} />
            </Field>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <Field label="State" htmlFor="c-state" required error={e.stateName?.message}>
                <Controller control={form.control} name="stateName" render={({ field }) => <StatePicker id="c-state" value={field.value} invalid={!!e.stateName} onChange={(name) => setState('stateName', 'stateCode', name)} />} />
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
              <div key={f.id} className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 md:grid-cols-[1fr_1fr_9rem_1fr_6rem_auto]">
                <Field label="Name" htmlFor={`ct-${i}-name`} required error={e.contacts?.[i]?.name?.message}>
                  <Input id={`ct-${i}-name`} {...form.register(`contacts.${i}.name`)} />
                </Field>
                <Field label="Email" htmlFor={`ct-${i}-email`} error={e.contacts?.[i]?.email?.message}>
                  <Input id={`ct-${i}-email`} type="email" {...form.register(`contacts.${i}.email`)} />
                </Field>
                <Field label="Phone" htmlFor={`ct-${i}-phone`}>
                  <Input id={`ct-${i}-phone`} type="tel" inputMode="tel" autoComplete="tel" {...form.register(`contacts.${i}.phone`)} />
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
                <ContactLinks name={form.watch(`contacts.${i}.name`)} phone={form.watch(`contacts.${i}.phone`)} email={form.watch(`contacts.${i}.email`)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Addresses"
            description="Billing and report addresses. Start with the PIN code: the city, state, GST code and area choices fill in."
            actions={
              <div className="flex gap-2">
                {hasBilling && (
                  <Button variant="secondary" size="sm" onClick={copyBilling}>
                    <Copy aria-hidden />
                    Copy billing address
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => addresses.append({ kind: addresses.fields.length === 0 ? 'BILLING' : 'REPORT', line1: '', line2: '', city: '', stateName: form.getValues('stateName'), stateCode: form.getValues('stateCode'), pincode: '' }, { focusName: `addresses.${addresses.fields.length}.pincode` })}>
                  <Plus aria-hidden />
                  Add address
                </Button>
              </div>
            }
          />
          <div className="space-y-3 p-4">
            {addresses.fields.length === 0 && <p className="text-[13px] text-gray-600">No addresses yet.</p>}
            {addresses.fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-md border border-gray-200 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 md:grid-cols-[7rem_8rem_1fr_1fr_6rem_auto]">
                  <Field label="Type" htmlFor={`ad-${i}-kind`}>
                    <Select id={`ad-${i}-kind`} {...form.register(`addresses.${i}.kind`)}>
                      <option value="BILLING">Billing</option>
                      <option value="REPORT">Report</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </Field>
                  <Field label="PIN code" htmlFor={`ad-${i}-pin`} error={e.addresses?.[i]?.pincode?.message}>
                    <Input
                      id={`ad-${i}-pin`}
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="6 digits"
                      {...form.register(`addresses.${i}.pincode`, { onChange: (ev) => (ev.target.value.length === 6 ? void onPincode(i, ev.target.value) : setPinStatus(({ [i]: _cleared, ...rest }) => rest)) })}
                    />
                  </Field>
                  <Field label="City" htmlFor={`ad-${i}-city`} required error={e.addresses?.[i]?.city?.message}>
                    <Input id={`ad-${i}-city`} {...form.register(`addresses.${i}.city`)} />
                  </Field>
                  <Field label="State" htmlFor={`ad-${i}-state`} required error={e.addresses?.[i]?.stateName?.message}>
                    <Controller control={form.control} name={`addresses.${i}.stateName`} render={({ field }) => <StatePicker id={`ad-${i}-state`} value={field.value} invalid={!!e.addresses?.[i]?.stateName} onChange={(name) => setState(`addresses.${i}.stateName`, `addresses.${i}.stateCode`, name)} />} />
                  </Field>
                  <Field label="GST code" htmlFor={`ad-${i}-code`} required error={e.addresses?.[i]?.stateCode?.message}>
                    <Input id={`ad-${i}-code`} maxLength={2} {...form.register(`addresses.${i}.stateCode`)} />
                  </Field>
                  <Button variant="ghost" size="icon" className="mt-6" aria-label={`Remove address ${i + 1}`} onClick={() => addresses.remove(i)}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                {pinStatus[i] && (
                  <p role="status" className={pinStatus[i].tone === 'ok' ? 'text-xs text-green-800' : pinStatus[i].tone === 'warn' ? 'text-xs text-amber-800' : 'text-xs text-gray-700'}>
                    {pinStatus[i].text}
                  </p>
                )}
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 md:grid-cols-2">
                  <Field label="Address" htmlFor={`ad-${i}-l1`} required error={e.addresses?.[i]?.line1?.message} hint="Building, street, plot or shop number">
                    <Input id={`ad-${i}-l1`} {...form.register(`addresses.${i}.line1`)} />
                  </Field>
                  <Field label="Area / locality" htmlFor={`ad-${i}-l2`}>
                    <Input id={`ad-${i}-l2`} autoComplete="off" {...form.register(`addresses.${i}.line2`)} />
                    {(localities[i]?.length ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={`Localities for PIN ${form.getValues(`addresses.${i}.pincode`)}`}>
                        {localities[i]!.slice(0, 12).map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="rounded-full border border-gray-300 bg-surface px-2 py-0.5 text-xs text-gray-800 hover:border-brand hover:text-brand aria-pressed:border-brand aria-pressed:bg-brand/10"
                            aria-pressed={form.watch(`addresses.${i}.line2`) === name}
                            onClick={() => form.setValue(`addresses.${i}.line2`, name, { shouldDirty: true })}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>
                </div>
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
  const { can, moduleOn } = useSession();
  const isNew = id === 'new';
  const [params] = useSearchParams();
  const returnTo = isNew ? safeAppPath(params.get('returnTo')) : null;
  const q = useQuery({ queryKey: ['customer', id], enabled: !isNew, queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}', { params: { path: { id: id! } } })) });
  const [tab, setTab] = useState('overview');
  const history = useQuery({ queryKey: ['customer-history', id], enabled: !isNew && tab === 'activity', queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}/history', { params: { path: { id: id! } } })) });
  if (!isNew && q.isLoading) return <Spinner />;
  if (!isNew && q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const customer = q.data ?? null;
  // Each tab appears only for people who may see what it lists.
  const tabs: { value: string; label: string; show: boolean; body: () => ReactNode }[] = customer
    ? [
        { value: 'overview', label: 'Overview', show: true, body: () => <CustomerOverview customerId={customer.id} onOpenTab={setTab} /> },
        { value: 'quotations', label: 'Quotations', show: can('quotations.view') && moduleOn('quotations'), body: () => <CustomerQuotations customerId={customer.id} /> },
        { value: 'jobs', label: 'Jobs', show: can('jobs.view'), body: () => <CustomerJobs customerId={customer.id} /> },
        { value: 'tests', label: 'Tests booked', show: true, body: () => <CustomerTests customerId={customer.id} /> },
        { value: 'reports', label: 'Reports', show: can('reports.view'), body: () => <CustomerReports customerId={customer.id} /> },
        { value: 'invoices', label: 'Invoices and payments', show: can('invoices.view') && moduleOn('billing'), body: () => <CustomerMoney customerId={customer.id} /> },
        { value: 'files', label: 'Files', show: can('files.view') && moduleOn('files'), body: () => <CustomerFiles customerId={customer.id} /> },
        { value: 'details', label: 'Details', show: true, body: () => <CustomerForm customer={customer} onSaved={() => undefined} /> },
        { value: 'activity', label: 'Activity', show: true, body: () => (history.isLoading ? <Spinner /> : <HistoryList entries={history.data ?? []} />) },
      ]
    : [];
  return (
    <>
      <PageHeader title={isNew ? 'New customer' : customer!.name} description={customer ? [customer.crn, customer.gstin && `GSTIN ${customer.gstin}`, customer.stateName].filter(Boolean).join(' · ') : undefined} />
      {isNew ? (
        <>
          {returnTo && (
            <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] text-blue-900">
              After saving, you will go back to where you were, with this customer chosen.{' '}
              <Link to={returnTo} className="underline">
                Cancel and go back
              </Link>
            </p>
          )}
          <CustomerForm
            customer={null}
            initialName={params.get('name') ?? undefined}
            onSaved={(c) => {
              if (!returnTo) return navigate(`/customers/${c.id}`, { replace: true });
              // Back to the order, quotation or booking that asked for a new customer, with it chosen.
              const url = new URL(returnTo, 'https://app.invalid');
              url.searchParams.set('customerId', c.id);
              toast.success(`${c.name} added. Carry on where you left off.`);
              navigate(url.pathname + url.search + url.hash, { replace: true });
            }}
          />
        </>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex-wrap">
            {tabs.filter((t) => t.show).map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.filter((t) => t.show).map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {tab === t.value && t.body()}
            </TabsContent>
          ))}
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
          <MobileFilters filters={list.filters} onClear={list.clearFilters}>
          <Select aria-label="Status filter" className="w-32" value={list.filters.active ?? 'true'} onChange={(e) => list.setFilter('active', e.target.value === 'true' ? null : e.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="all">All</option>
          </Select>
          </MobileFilters>
        </div>
        <DataTable ariaLabel="Customers" columns={columns} rows={q.data?.data} meta={q.data?.meta} loading={q.isLoading} error={q.error} onRetry={q.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(c) => navigate(`/customers/${c.id}`)} getRowId={(c) => c.id} emptyTitle="No customers found" />
      </div>
    </>
  );
}
