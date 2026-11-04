import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { CustomerPicker, useTests } from '@/components/pickers';
import { Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { toDateInput } from '@/lib/format';
import { applyServerErrors, toastError } from '@/lib/forms';
import { VersionLines, VersionTotals } from './VersionView';

type Quotation = components['schemas']['QuotationDto'];

const decimal = (message: string) => z.string().trim().regex(/^$|^\d+(\.\d+)?$/, message);

const schema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  orderId: z.string(),
  documentTitle: z.enum(['Quotation', 'Proforma Invoice']),
  validUntil: z.string(),
  estimatedDays: z.string().trim().regex(/^$|^\d+$/, 'Whole days'),
  paymentTerms: z.string().trim().max(1000),
  deliveryAddress: z.string().trim().max(1000),
  contactPerson: z.string().trim().max(200),
  discountPct: decimal('Enter a percentage'),
  lines: z
    .array(
      z.object({
        sampleDescription: z.string().trim().min(1, 'Describe the sample'),
        requiredQuantity: z.string().trim().max(120),
        testId: z.string().min(1, 'Choose a test'),
        quantity: z.coerce.number<number>().int('Whole number').min(1, 'At least 1').max(10000),
        rate: decimal('Enter a rate'),
        overrideReason: z.string().trim().max(500),
        discountPct: decimal('Enter a percentage'),
      }),
    )
    .min(1, 'Add at least one line'),
});
type FormValues = z.infer<typeof schema>;
type LineValues = FormValues['lines'][number];

const emptyLine = (from?: LineValues): LineValues => ({ sampleDescription: from?.sampleDescription ?? '', requiredQuantity: from?.requiredQuantity ?? '', testId: '', quantity: 1, rate: '', overrideReason: '', discountPct: '' });

function toForm(q: Quotation | null, preset: { customerId: string; orderId: string }): FormValues {
  const v = q?.versions.find((x) => x.versionNo === q.currentVersionNo);
  return {
    customerId: q?.customerId ?? preset.customerId,
    orderId: q?.orderId ?? preset.orderId,
    documentTitle: (v?.documentTitle as FormValues['documentTitle']) ?? 'Quotation',
    validUntil: toDateInput(v?.validUntil),
    estimatedDays: v?.estimatedDays === null || v?.estimatedDays === undefined ? '' : String(v.estimatedDays),
    paymentTerms: v?.paymentTerms ?? '',
    deliveryAddress: v?.deliveryAddress ?? '',
    contactPerson: v?.contactPerson ?? '',
    discountPct: v && Number(v.discountPct) !== 0 ? v.discountPct : '',
    lines: v
      ? v.lines.map((l) => ({
          sampleDescription: l.sampleDescription,
          requiredQuantity: l.requiredQuantity ?? '',
          testId: l.testId,
          quantity: l.quantity,
          // A looked-up rate stays empty, so it is refreshed on save. Only an override is carried.
          rate: l.rateSource === 'OVERRIDE' ? l.rate : '',
          overrideReason: l.overrideReason ?? '',
          discountPct: Number(l.discountPct) !== 0 ? l.discountPct : '',
        }))
      : [emptyLine()],
  };
}

function toBody(v: FormValues) {
  return {
    customerId: v.customerId,
    orderId: v.orderId || null,
    documentTitle: v.documentTitle,
    ...(v.validUntil ? { validUntil: v.validUntil } : {}),
    estimatedDays: v.estimatedDays === '' ? null : Number(v.estimatedDays),
    paymentTerms: v.paymentTerms || null,
    deliveryAddress: v.deliveryAddress || null,
    contactPerson: v.contactPerson || null,
    discountPct: v.discountPct || null,
    lines: v.lines.map((l) => ({ sampleDescription: l.sampleDescription, requiredQuantity: l.requiredQuantity || null, testId: l.testId, quantity: l.quantity, rate: l.rate || null, overrideReason: l.overrideReason || null, discountPct: l.discountPct || null })),
  };
}

function Editor({ quotation, preset }: { quotation: Quotation | null; preset: { customerId: string; orderId: string } }) {
  const { can } = useSession();
  const navigate = useNavigate();
  const client = useQueryClient();
  const canOverride = can('quotations.rateOverride');
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(quotation, preset) });
  useEffect(() => form.reset(toForm(quotation, preset)), [quotation, preset, form]);
  const lines = useFieldArray({ control: form.control, name: 'lines' });
  const tests = useTests();
  const customerId = form.watch('customerId');
  const orders = useQuery({
    queryKey: ['order-options', customerId],
    enabled: !!customerId && can('orders.view'),
    queryFn: async () => unwrap(await api.GET('/api/v1/orders', { params: { query: { customerId, pageSize: 100 } } })).data,
  });
  // A native select shows nothing until its option exists, so re-apply the values once they load.
  useEffect(() => {
    if (orders.data) form.setValue('orderId', form.getValues('orderId'));
  }, [orders.data, form]);
  useEffect(() => {
    if (tests.data) form.getValues('lines').forEach((l, i) => form.setValue(`lines.${i}.testId`, l.testId));
  }, [tests.data, form]);
  const e = form.formState.errors;
  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      if (quotation) return unwrap(await api.PATCH('/api/v1/quotations/{id}', { params: { path: { id: quotation.id } }, body: { ...toBody(v), version: quotation.version } }));
      return unwrap(await api.POST('/api/v1/quotations', { body: toBody(v) }));
    },
    onSuccess: (q) => {
      client.setQueryData(['quotation', q.id], q);
      client.invalidateQueries({ queryKey: ['quotations'] });
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: ['orders-pipeline'] });
      toast.success('Draft saved. Totals are updated.');
      if (!quotation) navigate(`/quotations/${q.id}/edit`, { replace: true });
    },
    onError: (err) => {
      // Rate rules report against "lines" as a whole and name the test in the message itself.
      if (err instanceof ApiError && err.fields.some((f) => f.field === 'lines')) toastError(err);
      else applyServerErrors(err, form.setError, ['customerId', 'orderId', 'documentTitle', 'validUntil', 'estimatedDays', 'paymentTerms', 'deliveryAddress', 'contactPerson', 'discountPct', 'lines']);
    },
  });

  const addLine = () => {
    const current = form.getValues('lines');
    lines.append(emptyLine(current[current.length - 1]), { focusName: `lines.${current.length}.${current.length ? 'testId' : 'sampleDescription'}` });
  };
  /** Enter on a line starts the next one, so lines can be keyed without the mouse. */
  const onLineKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'Enter') return;
    const tag = (ev.target as HTMLElement).tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT') return;
    ev.preventDefault();
    addLine();
  };

  const version = quotation?.versions.find((x) => x.versionNo === quotation.currentVersionNo);
  const gridClass = canOverride ? 'lg:grid-cols-[1.4fr_6rem_1.6fr_4.5rem_6rem_1fr_5rem_2rem]' : 'lg:grid-cols-[1.6fr_7rem_2fr_5rem_5rem_2rem]';
  const headings = ['Sample description', 'Required qty', 'Test', 'Qty', ...(canOverride ? ['Rate override', 'Override reason'] : []), 'Disc. %'];
  const linesError = e.lines?.message ?? e.lines?.root?.message;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
      <Card>
        <CardHeader title="Quotation details" />
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Customer" htmlFor="q-customer" required error={e.customerId?.message} className="md:col-span-2">
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <CustomerPicker
                  id="q-customer"
                  value={field.value}
                  invalid={!!e.customerId}
                  onChange={(id) => {
                    if (id !== field.value) form.setValue('orderId', '');
                    field.onChange(id);
                  }}
                />
              )}
            />
          </Field>
          <Field label="Order" htmlFor="q-order" error={e.orderId?.message} hint={customerId ? undefined : 'Choose a customer first'}>
            <Select id="q-order" disabled={!customerId || !can('orders.view')} {...form.register('orderId')}>
              <option value="">No order</option>
              {orders.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNo}
                  {o.reference ? ` — ${o.reference}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Document title" htmlFor="q-title" error={e.documentTitle?.message}>
            <Select id="q-title" {...form.register('documentTitle')}>
              <option value="Quotation">Quotation</option>
              <option value="Proforma Invoice">Proforma Invoice</option>
            </Select>
          </Field>
          <Field label="Valid until" htmlFor="q-valid" error={e.validUntil?.message} hint="Leave empty for the default validity">
            <Input id="q-valid" type="date" {...form.register('validUntil')} />
          </Field>
          <Field label="Estimated days" htmlFor="q-days" error={e.estimatedDays?.message}>
            <Input id="q-days" inputMode="numeric" aria-invalid={!!e.estimatedDays} {...form.register('estimatedDays')} />
          </Field>
          <Field label="Contact person" htmlFor="q-contact" error={e.contactPerson?.message}>
            <Input id="q-contact" {...form.register('contactPerson')} />
          </Field>
          <Field label="Header discount %" htmlFor="q-discount" error={e.discountPct?.message}>
            <Input id="q-discount" inputMode="decimal" aria-invalid={!!e.discountPct} {...form.register('discountPct')} />
          </Field>
          <div className="hidden md:block" />
          <Field label="Payment terms" htmlFor="q-terms" error={e.paymentTerms?.message} className="md:col-span-3 lg:col-span-1">
            <Textarea id="q-terms" rows={2} {...form.register('paymentTerms')} />
          </Field>
          <Field label="Delivery address" htmlFor="q-address" error={e.deliveryAddress?.message} className="md:col-span-3 lg:col-span-2">
            <Textarea id="q-address" rows={2} {...form.register('deliveryAddress')} />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Lines"
          description="Press Enter in a line to add the next one. It keeps the same sample and goes straight to the test."
          actions={
            <Button variant="secondary" size="sm" onClick={addLine}>
              <Plus aria-hidden />
              Add line
            </Button>
          }
        />
        <div className="space-y-2 p-4">
          {linesError && (
            <p className="text-xs text-red-700" role="alert">
              {linesError}
            </p>
          )}
          <div className={`hidden gap-2 text-xs font-semibold text-gray-700 lg:grid ${gridClass}`} aria-hidden>
            {headings.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {lines.fields.map((f, i) => {
            const le = e.lines?.[i];
            const label = (name: string) => `Line ${i + 1} ${name}`;
            return (
              <div key={f.id} role="group" aria-label={`Line ${i + 1}`} className={`grid items-start gap-2 ${gridClass}`} onKeyDown={onLineKeyDown}>
                <Cell error={le?.sampleDescription?.message}>
                  <Input aria-label={label('sample description')} aria-invalid={!!le?.sampleDescription} placeholder="Sample" {...form.register(`lines.${i}.sampleDescription`)} />
                </Cell>
                <Cell error={le?.requiredQuantity?.message}>
                  <Input aria-label={label('required quantity')} {...form.register(`lines.${i}.requiredQuantity`)} />
                </Cell>
                <Cell error={le?.testId?.message}>
                  <Select aria-label={label('test')} aria-invalid={!!le?.testId} {...form.register(`lines.${i}.testId`)}>
                    <option value="">Choose a test</option>
                    {tests.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                  </Select>
                </Cell>
                <Cell error={le?.quantity?.message}>
                  <Input aria-label={label('quantity')} type="number" min={1} aria-invalid={!!le?.quantity} {...form.register(`lines.${i}.quantity`)} />
                </Cell>
                {canOverride && (
                  <>
                    <Cell error={le?.rate?.message}>
                      <Input aria-label={label('rate override')} inputMode="decimal" aria-invalid={!!le?.rate} {...form.register(`lines.${i}.rate`)} />
                    </Cell>
                    <Cell error={le?.overrideReason?.message}>
                      <Input aria-label={label('override reason')} {...form.register(`lines.${i}.overrideReason`)} />
                    </Cell>
                  </>
                )}
                <Cell error={le?.discountPct?.message}>
                  <Input aria-label={label('discount percent')} inputMode="decimal" aria-invalid={!!le?.discountPct} {...form.register(`lines.${i}.discountPct`)} />
                </Cell>
                <Button variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} disabled={lines.fields.length === 1} onClick={() => lines.remove(i)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        {quotation && (
          <Button asChild variant="secondary">
            <Link to={`/quotations/${quotation.id}`}>Open quotation</Link>
          </Button>
        )}
        <Button type="submit" loading={save.isPending}>
          Save draft
        </Button>
      </div>
      {version ? (
        <Card>
          <CardHeader title="Calculated by the server" description={form.formState.isDirty ? 'You have unsaved changes. These totals are from the last save.' : 'Rates and totals as saved.'} />
          <div className="space-y-4 p-4">
            <VersionLines version={version} />
            <VersionTotals version={version} />
          </div>
        </Card>
      ) : (
        <p className="text-right text-[13px] text-gray-600">Rates, tax and totals appear here after you save.</p>
      )}
    </form>
  );
}

function Cell({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div>
      {children}
      {error && (
        <p className="mt-0.5 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function QuotationEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const customerId = params.get('customerId') ?? '';
  const orderId = params.get('orderId') ?? '';
  const preset = useMemo(() => ({ customerId, orderId: customerId ? orderId : '' }), [customerId, orderId]);
  const q = useQuery({ queryKey: ['quotation', id], enabled: !!id, queryFn: async () => unwrap(await api.GET('/api/v1/quotations/{id}', { params: { path: { id: id! } } })) });
  const breadcrumb = (
    <Link to="/quotations" className="underline">
      Quotations
    </Link>
  );
  if (!id) {
    return (
      <>
        <PageHeader title="New quotation" breadcrumb={breadcrumb} />
        <Editor quotation={null} preset={preset} />
      </>
    );
  }
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (q.data.status !== 'DRAFT') {
    return (
      <EmptyState title="Only a draft can be edited">
        <Link to={`/quotations/${q.data.id}`} className="underline">
          Open {q.data.quotationNo}
        </Link>{' '}
        and revise it to make changes.
      </EmptyState>
    );
  }
  return (
    <>
      <PageHeader title={`Edit ${q.data.quotationNo}`} description={`Version ${q.data.currentVersionNo} · ${q.data.customerName}`} breadcrumb={breadcrumb} />
      <Editor quotation={q.data} preset={preset} />
    </>
  );
}
