import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { CustomerPicker, TestMultiPicker, useLookups } from '@/components/pickers';
import { DataTable, type Col } from '@/components/DataTable';
import { uploadEntityFile } from '@/components/shared';
import { Button, Card, CardHeader, Checkbox, ConfirmDialog, EmptyState, Field, Input, PageHeader, Select, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { applyServerErrors, toastError } from '@/lib/forms';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { MAX_ACK_PHOTOS } from './AckPhotoPicker';
import { emptyHeader, HEADER_FIELDS, headerShape, headerToBody, JobHeaderFields, sampleShape, SampleFields } from './job-fields';
import { PendingPhotos, type PendingPhoto } from './PendingPhotos';

const schema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  noQuotationReason: z.string().trim().min(1, 'Say why there is no quotation').max(500),
  ...headerShape,
  samples: z.array(z.object({ ...sampleShape, testIds: z.array(z.string()) })).min(1, 'Add at least one sample'),
  deviations: z.array(z.object({ typeId: z.string().min(1, 'Choose a type'), sample: z.string(), remark: z.string().trim().max(1000) })),
});
type FormValues = z.infer<typeof schema>;

const emptySample = (): FormValues['samples'][number] => ({ description: '', condition: '', quantity: '', size: '', returnable: false, attributes: [], testIds: [] });

type Convertible = components['schemas']['ConvertibleQuotationDto'];

/**
 * Deviations name their sample by position ('' for the whole job). After removing sample `removed`, the
 * later samples move up one place, and a deviation on the removed sample applies to the whole job.
 */
export function shiftDeviationSamples(samples: string[], removed: number): string[] {
  return samples.map((s) => {
    if (s === '') return s;
    const n = Number(s);
    if (n === removed) return '';
    return n > removed ? String(n - 1) : s;
  });
}

type BookedJob = components['schemas']['JobDto'];

/**
 * After a booking: stores each sample's photos (in order, shrunk on the way), then emails the acknowledgement with
 * them if asked. Returns what happened, so a failure here never hides that the job itself was booked.
 */
export async function afterBooking(job: Pick<BookedJob, 'id' | 'samples'>, photosBySample: PendingPhoto[][], emailTo: string | null) {
  const ids: string[] = [];
  let failed = 0;
  for (const [i, items] of photosBySample.entries()) {
    const sample = job.samples[i];
    if (!sample || !items.length) continue;
    // Photos sent from a phone are already stored: move them onto the new sample in one go.
    const fromPhone = items.flatMap((p) => (p.kind === 'phone' ? [p.fileId] : []));
    let claimed = false;
    if (fromPhone.length) {
      try {
        unwrap(await api.POST('/api/v1/phone-uploads/claim', { body: { sampleId: sample.id, fileIds: fromPhone } }));
        claimed = true;
      } catch {
        failed += fromPhone.length;
      }
    }
    // Then the ones from this computer, keeping the order they were added in for the acknowledgement.
    for (const p of items) {
      if (p.kind === 'phone') {
        if (claimed) ids.push(p.fileId);
        continue;
      }
      try {
        ids.push((await uploadEntityFile('Sample', sample.id, 'sample-image', p.file)).id);
      } catch {
        failed++;
      }
    }
  }
  let emailed: string | null = null;
  if (emailTo) {
    try {
      unwrap(await api.POST('/api/v1/jobs/{id}/acknowledgement', { params: { path: { id: job.id } }, body: { to: emailTo, photoIds: ids.slice(0, MAX_ACK_PHOTOS) } }));
      emailed = emailTo;
    } catch {
      failed++;
    }
  }
  return { uploaded: ids.length, failed, emailed };
}

function BookFromQuotation() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const q = useQuery({ queryKey: ['quotations-convertible'], queryFn: async () => unwrap(await api.GET('/api/v1/quotations/convertible')) });
  const [chosen, setChosen] = useState<Convertible | null>(null);
  const convert = useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST('/api/v1/quotations/{id}/convert', { params: { path: { id } } })),
    onSuccess: (res) => {
      client.invalidateQueries({ queryKey: ['quotations-convertible'] });
      client.invalidateQueries({ queryKey: ['quotations'] });
      client.invalidateQueries({ queryKey: ['jobs'] });
      client.invalidateQueries({ queryKey: ['samples'] });
      toast.success(`Job ${res.jobNo} booked`);
      navigate(`/samples/jobs/${res.jobId}`, { replace: true });
    },
    onError: (e) => {
      setChosen(null);
      toastError(e);
    },
  });
  const columns = useMemo<Col<Convertible>[]>(
    () => [
      { accessorKey: 'quotationNo', id: 'quotationNo', header: 'Quotation' },
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      { id: 'acceptedAt', header: 'Accepted', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.acceptedAt)}</span> },
      { id: 'samples', header: 'Samples', cell: ({ row }) => row.original.samples.join(', ') || '—' },
      { accessorKey: 'testCount', id: 'testCount', header: 'Tests' },
      {
        id: 'book',
        header: () => <span className="sr-only">Book</span>,
        cell: ({ row }) => (
          <Button size="sm" aria-label={`Book job from ${row.original.quotationNo}`} onClick={() => setChosen(row.original)}>
            Book job
          </Button>
        ),
      },
    ],
    [],
  );
  return (
    <section aria-label="Book from an accepted quotation">
      <h2 className="mb-2 text-base font-semibold text-gray-900">Book from an accepted quotation</h2>
      <DataTable
        ariaLabel="Accepted quotations ready to book"
        columns={columns}
        rows={q.data}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        getRowId={(r) => r.id}
        emptyTitle="No accepted quotations are waiting to be booked"
        maxHeightClass="max-h-72"
      />
      <ConfirmDialog
        open={!!chosen}
        onOpenChange={(o) => !o && setChosen(null)}
        title={`Book a job from ${chosen?.quotationNo ?? 'this quotation'}?`}
        description="This creates a job with the samples and tests on the quotation. It can only be done once."
        confirmLabel="Book job"
        loading={convert.isPending}
        onConfirm={() => chosen && convert.mutate(chosen.id)}
      />
    </section>
  );
}

function BookWithoutQuotation() {
  const navigate = useNavigate();
  const client = useQueryClient();
  // A customer just created from the picker comes back as ?customerId=.
  const [params] = useSearchParams();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: params.get('customerId') ?? '', noQuotationReason: '', ...emptyHeader, samples: [emptySample()], deviations: [] },
  });
  const samples = useFieldArray({ control: form.control, name: 'samples' });
  const deviations = useFieldArray({ control: form.control, name: 'deviations' });
  const deviationTypes = useLookups('DEVIATION_TYPE');
  // Optional photos per sample (by the sample's row id) and whether to email the acknowledgement once booked.
  const [photos, setPhotos] = useState<Record<string, PendingPhoto[]>>({});
  const [emailAck, setEmailAck] = useState(true);
  const customerId = form.watch('customerId');
  const customer = useQuery({
    queryKey: ['customer', customerId],
    enabled: !!customerId,
    queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}', { params: { path: { id: customerId } } })),
  });
  const guard = useLeaveGuard(form.formState.isDirty, 'This booking has not been saved. What you have entered will be lost if you leave this page.');

  const removeSample = (i: number) => {
    const before = form.getValues('deviations').map((d) => d.sample);
    shiftDeviationSamples(before, i).forEach((sample, k) => {
      if (sample !== before[k]) form.setValue(`deviations.${k}.sample`, sample, { shouldDirty: true });
    });
    samples.remove(i);
  };

  // Prefill contact details from the chosen customer, leaving anything the user has typed.
  useEffect(() => {
    const c = customer.data;
    if (!c || c.id !== customerId) return;
    const contact = c.contacts.find((x) => x.isPrimary) ?? c.contacts[0];
    const address = c.addresses.find((a) => a.kind === 'REPORT') ?? c.addresses.find((a) => a.kind === 'BILLING');
    const prefill = {
      kindAttention: contact?.name ?? '',
      contactEmail: contact?.email ?? '',
      contactPhone: contact?.phone ?? '',
      reportIssueAddress: address ? [address.line1, address.line2, address.city, address.stateName, address.pincode].filter(Boolean).join(', ') : '',
    };
    for (const [name, value] of Object.entries(prefill) as [keyof typeof prefill, string][]) {
      if (!form.getFieldState(name).isDirty) form.setValue(name, value);
    }
  }, [customer.data, customerId, form]);

  const e = form.formState.errors;
  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const job = unwrap(
        await api.POST('/api/v1/jobs', {
          body: {
            customerId: v.customerId,
            noQuotationReason: v.noQuotationReason,
            ...headerToBody(v, true),
            samples: v.samples.map((s) => ({
              description: s.description,
              condition: s.condition || null,
              quantity: s.quantity || null,
              size: s.size || null,
              returnable: s.returnable,
              attributes: s.attributes,
              testIds: s.testIds,
            })),
            deviations: v.deviations.map((d) => ({ typeId: d.typeId, sampleIndex: d.sample === '' ? null : Number(d.sample), remark: d.remark || null })),
          },
        }),
      );
      // The job is booked now. Photos and the email follow; a failure there is reported, not a lost booking.
      return {
        job,
        ...(await afterBooking(
          job,
          samples.fields.map((f) => photos[f.id] ?? []),
          emailAck && v.contactEmail ? v.contactEmail : null,
        )),
      };
    },
    onSuccess: ({ job, uploaded, failed, emailed }) => {
      client.invalidateQueries({ queryKey: ['jobs'] });
      client.invalidateQueries({ queryKey: ['samples'] });
      client.invalidateQueries({ queryKey: ['job', job.id] });
      const extras = [uploaded ? `${uploaded} photo(s) saved` : '', emailed ? `acknowledgement emailed to ${emailed}` : ''].filter(Boolean).join(', ');
      toast.success(`Job ${job.jobNo} booked${extras ? `; ${extras}` : ''}`);
      if (failed) toast.error(`${failed} photo(s) or the acknowledgement could not be sent. Add or send them on the job page.`);
      guard.leaveWithoutPrompt(() => navigate(`/samples/jobs/${job.id}`, { replace: true }));
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fields.some((f) => f.field === 'deviations' || f.field === 'samples')) toastError(err);
      else applyServerErrors(err, form.setError, ['customerId', 'noQuotationReason', 'samples', 'deviations', ...HEADER_FIELDS]);
    },
  });

  const sampleValues = form.watch('samples');
  const contactEmail = form.watch('contactEmail');
  const photoCount = samples.fields.reduce((n, f) => n + (photos[f.id]?.length ?? 0), 0);
  return (
    <section aria-label="Book without a quotation">
      <h2 className="mb-2 text-base font-semibold text-gray-900">Book without a quotation</h2>
      <form className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
        <Card>
          <CardHeader title="Job details" />
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
              <Field label="Customer" htmlFor="b-customer" required error={e.customerId?.message}>
                <Controller
                  control={form.control}
                  name="customerId"
                  render={({ field }) => <CustomerPicker id="b-customer" value={field.value} onChange={field.onChange} invalid={!!e.customerId} />}
                />
              </Field>
              <Field label="Reason for no quotation" htmlFor="b-reason" required error={e.noQuotationReason?.message} className="md:col-span-2">
                <Textarea id="b-reason" rows={1} className="min-h-9" aria-invalid={!!e.noQuotationReason} {...form.register('noQuotationReason')} />
              </Field>
            </div>
            <JobHeaderFields form={form} identity idPrefix="b" />
          </div>
        </Card>
        <Card>
          <CardHeader
            title={`Samples (${samples.fields.length})`}
            actions={
              <Button variant="secondary" size="sm" onClick={() => samples.append(emptySample(), { focusName: `samples.${samples.fields.length}.description` })}>
                <Plus aria-hidden />
                Add sample
              </Button>
            }
          />
          <div className="divide-y divide-gray-200">
            {samples.fields.map((f, i) => (
              <section key={f.id} aria-label={`Sample ${i + 1}`} className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-gray-900">Sample {i + 1}</h3>
                    <Button variant="ghost" size="icon" aria-label={`Remove sample ${i + 1}`} disabled={samples.fields.length === 1} onClick={() => removeSample(i)}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  <SampleFields form={form} prefix={`samples.${i}.`} idPrefix={`b-s${i}`} />
                  <PendingPhotos label={`sample ${i + 1}`} items={photos[f.id] ?? []} onChange={(items) => setPhotos((all) => ({ ...all, [f.id]: items }))} />
                </div>
                <Controller
                  control={form.control}
                  name={`samples.${i}.testIds`}
                  render={({ field }) => <TestMultiPicker id={`b-s${i}-tests`} label="Requested tests" value={field.value} onChange={field.onChange} />}
                />
              </section>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Deviations"
            description="Anything about the samples that departs from what was expected."
            actions={
              <Button variant="secondary" size="sm" onClick={() => deviations.append({ typeId: '', sample: '', remark: '' })}>
                <Plus aria-hidden />
                Add deviation
              </Button>
            }
          />
          <div className="space-y-2 p-4">
            {deviations.fields.length === 0 && <p className="text-[13px] text-gray-600">No deviations.</p>}
            {deviations.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 md:grid-cols-[1fr_1fr_2fr_auto]">
                <Field label="Type" htmlFor={`b-d${i}-type`} required error={e.deviations?.[i]?.typeId?.message}>
                  <Select id={`b-d${i}-type`} aria-invalid={!!e.deviations?.[i]?.typeId} {...form.register(`deviations.${i}.typeId`)}>
                    <option value="">Choose a type</option>
                    {deviationTypes.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Applies to" htmlFor={`b-d${i}-sample`} hint="Leave as Whole job unless one sample is affected.">
                  <Select id={`b-d${i}-sample`} {...form.register(`deviations.${i}.sample`)}>
                    <option value="">Whole job</option>
                    {sampleValues.map((s, n) => (
                      <option key={n} value={String(n)}>
                        Sample {n + 1}
                        {s.description ? ` — ${s.description}` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Remark" htmlFor={`b-d${i}-remark`} error={e.deviations?.[i]?.remark?.message}>
                  <Input id={`b-d${i}-remark`} {...form.register(`deviations.${i}.remark`)} />
                </Field>
                <Button variant="ghost" size="icon" className="mt-6" aria-label={`Remove deviation ${i + 1}`} onClick={() => deviations.remove(i)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="After booking" />
          <div className="space-y-1 p-4">
            <Checkbox
              id="b-email-ack"
              label={contactEmail ? `Email the acknowledgement to ${contactEmail}` : 'Email the acknowledgement to the customer'}
              checked={emailAck && !!contactEmail}
              disabled={!contactEmail}
              onCheckedChange={(v) => setEmailAck(v === true)}
            />
            <p className="pl-6 text-xs text-gray-600">
              {!contactEmail
                ? 'Add a contact email above to send it. You can also send it later from the job page.'
                : photoCount
                  ? `The ${photoCount} photo(s) added above go with it.`
                  : 'Untick to send it later from the job page, for example after taking photos there.'}
            </p>
          </div>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            Book job
          </Button>
        </div>
      </form>
      {guard.dialog}
    </section>
  );
}

export default function BookingPage() {
  const { can, moduleOn } = useSession();
  const fromQuotation = can('quotations.convert') && moduleOn('quotations');
  const without = can('jobs.createWithoutQuotation');
  return (
    <>
      <PageHeader
        title="Book samples"
        breadcrumb={
          <Link to="/samples" className="underline">
            Samples
          </Link>
        }
      />
      <div className="space-y-6">
        {fromQuotation && <BookFromQuotation />}
        {without && <BookWithoutQuotation />}
        {!fromQuotation && !without && <EmptyState title="You do not have permission to book from a quotation or without one" />}
      </div>
    </>
  );
}
