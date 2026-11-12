import { zodResolver } from '@hookform/resolvers/zod';
import { WhatsappButton } from '@/features/whatsapp/WhatsappSend';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileStack, Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { CancelDialog, type CancelTarget } from '@/components/CancelDialog';
import { useLookups } from '@/components/pickers';
import { Attachments, DocumentButton, EmailLogTable, HistoryList, pollDocumentJob, ReasonDialog, reserveTab, StatusBadge, toastDocumentError, uploadEntityFile } from '@/components/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui/primitives';
import { PhoneUploadButton } from '@/components/PhoneUpload';
import { ReportProblemButton } from '@/features/quality/ReportProblem';
import { AckPhotoPicker } from './AckPhotoPicker';
import { WebcamCapture } from '@/components/WebcamCapture';
import { api, unwrap } from '@/lib/api';
import { cn, formatDate, formatDateTime, humanize, toDateInput } from '@/lib/format';
import { applyServerErrors, writeError } from '@/lib/forms';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { emptyHeader, HEADER_FIELDS, headerSchema, headerToBody, JobHeaderFields, sampleSchema, sampleShape, SampleFields, type HeaderValues, type SampleValues } from './job-fields';

type Job = components['schemas']['JobDto'];
type Sample = Job['samples'][number];

const toHeader = (j: Job): HeaderValues => ({
  ...emptyHeader,
  letterRef: j.letterRef ?? '',
  letterDate: toDateInput(j.letterDate),
  materialSpec: j.materialSpec ?? '',
  poNumber: j.poNumber ?? '',
  poDate: toDateInput(j.poDate),
  receiptModeId: j.receiptModeId ?? '',
  reportIssueDetails: j.reportIssueDetails ?? '',
  reportIssueAddress: j.reportIssueAddress ?? '',
  kindAttention: j.kindAttention ?? '',
  contactEmail: j.contactEmail ?? '',
  contactPhone: j.contactPhone ?? '',
  urgent: j.urgent,
  sampleDrawnByLab: j.sampleDrawnByLab,
});

function useJobUpdated() {
  const client = useQueryClient();
  return (job: Job) => {
    client.setQueryData(['job', job.id], job);
    client.invalidateQueries({ queryKey: ['jobs'] });
    client.invalidateQueries({ queryKey: ['samples'] });
    client.invalidateQueries({ queryKey: ['job-timeline', job.id] });
    client.invalidateQueries({ queryKey: ['job-history', job.id] });
  };
}

function JobHeaderForm({ job }: { job: Job }) {
  const { can } = useSession();
  const canEdit = can('jobs.edit');
  const updated = useJobUpdated();
  const identity = job.customerName !== null;
  const form = useForm<HeaderValues>({ resolver: zodResolver(headerSchema), defaultValues: toHeader(job) });
  const dirty = form.formState.isDirty;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const guard = useLeaveGuard(dirty, 'The job details have changes that have not been saved. They will be lost if you leave this page.');
  // Other actions on this page (sample edits, deviations, acknowledgement) refresh the job too. Take the
  // fresh values only while nothing has been typed here, so a half-finished edit is never wiped.
  // A different job remounts the page (router key), and a save of this form resets it below.
  useEffect(() => {
    if (!dirtyRef.current) form.reset(toHeader(job));
  }, [job, form]);
  const m = useMutation({
    mutationFn: async (v: HeaderValues) => unwrap(await api.PATCH('/api/v1/jobs/{id}', { params: { path: { id: job.id } }, body: { version: job.version, ...headerToBody(v, identity) } })),
    onSuccess: (j) => {
      form.reset(toHeader(j));
      updated(j);
      toast.success('Job saved');
    },
    onError: (err) => applyServerErrors(err, form.setError, HEADER_FIELDS),
  });
  return (
    <form onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      <Card>
        <CardHeader title="Job details" />
        <fieldset disabled={!canEdit} className="p-4">
          <JobHeaderFields form={form} identity={identity} idPrefix="j" disabled={!canEdit} />
        </fieldset>
        {canEdit && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-4 py-3">
            {dirty && <span className="text-[13px] text-gray-700">You have unsaved changes.</span>}
            <Button type="submit" loading={m.isPending}>
              Save job details
            </Button>
          </div>
        )}
      </Card>
      {guard.dialog}
    </form>
  );
}

function EditSampleDialog({ sample, open, onOpenChange }: { sample: Sample; open: boolean; onOpenChange: (o: boolean) => void }) {
  const updated = useJobUpdated();
  const values = (): SampleValues => ({
    description: sample.description,
    condition: sample.condition ?? '',
    quantity: sample.quantity ?? '',
    size: sample.size ?? '',
    returnable: sample.returnable,
    attributes: sample.attributes.map((a) => ({ label: a.label, value: a.value })),
  });
  const form = useForm<SampleValues>({ resolver: zodResolver(sampleSchema), defaultValues: values() });
  useEffect(() => {
    if (open) form.reset(values());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload the form only when the dialog opens
  }, [open]);
  const m = useMutation({
    mutationFn: async (v: SampleValues) =>
      unwrap(
        await api.PATCH('/api/v1/samples/{id}', {
          params: { path: { id: sample.id } },
          body: {
            version: sample.version,
            description: v.description,
            condition: v.condition || null,
            quantity: v.quantity || null,
            size: v.size || null,
            returnable: v.returnable,
            attributes: v.attributes,
          },
        }),
      ),
    onSuccess: (j) => {
      updated(j);
      toast.success('Sample saved');
      onOpenChange(false);
    },
    onError: (err) => applyServerErrors(err, form.setError, Object.keys(sampleShape)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Edit ${sample.sampleNo}`} wide>
      <form className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <SampleFields form={form} prefix="" idPrefix="es" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Save sample
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const CLOSED_TEST = ['APPROVED', 'CANCELLED'];

function SampleCard({ job, sample, highlighted, onCancel }: { job: Job; sample: Sample; highlighted: boolean; onCancel: (target: CancelTarget) => void }) {
  const { can } = useSession();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const canFiles = can('jobs.create', 'jobs.edit');
  const canCancelTests = can('jobs.cancel', 'planning.edit');
  return (
    <section
      id={`sample-${sample.id}`}
      tabIndex={-1}
      aria-label={`Sample ${sample.sampleNo}`}
      aria-current={highlighted ? 'true' : undefined}
      className={cn('scroll-mt-4 rounded-lg border bg-surface outline-none', highlighted ? 'border-brand-focus ring-2 ring-brand-focus' : 'border-gray-200')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
            {sample.sampleNo}
            <StatusBadge status={sample.status} />
            {sample.returnable && <Badge>Returnable</Badge>}
            {highlighted && <Badge tone="blue">Selected</Badge>}
          </h3>
          <p className="mt-0.5 text-[13px] text-gray-800">{sample.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DocumentButton kind="sample-labels" params={{ jobId: job.id, sampleId: sample.id }} size="sm">
            Label
          </DocumentButton>
          {can('jobs.edit') && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
          )}
          {can('jobs.cancel') && sample.status !== 'CANCELLED' && (
            <Button variant="secondary" size="sm" onClick={() => onCancel({ type: 'sample', id: sample.id, version: sample.version, label: `sample ${sample.sampleNo}` })}>
              Cancel sample
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {(
              [
                ['Condition', sample.condition],
                ['Quantity', sample.quantity],
                ['Size', sample.size],
                ['Retain until', sample.retentionUntil ? formatDate(sample.retentionUntil) : null],
                ...sample.attributes.map((a) => [a.label, a.value]),
              ] as [string, string | null][]
            ).map(([label, value], i) => (
              <div key={`${label}-${i}`}>
                <dt className="text-xs font-medium text-gray-600">{label}</dt>
                <dd className="text-gray-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          <Attachments
            entity="Sample"
            entityId={sample.id}
            category="sample-image"
            title="Sample images"
            canEdit={canFiles}
            accept="image/png,image/jpeg"
            extraActions={
              <>
                <WebcamCapture
                  title={`Sample images for ${sample.sampleNo}`}
                  onSave={async (files) => {
                    for (const file of files) await uploadEntityFile('Sample', sample.id, 'sample-image', file);
                    client.invalidateQueries({ queryKey: ['files', 'Sample', sample.id, 'sample-image'] });
                  }}
                />
                <PhoneUploadButton purpose="sample-image" entityId={sample.id} onReceived={() => void client.invalidateQueries({ queryKey: ['files', 'Sample', sample.id, 'sample-image'] })} />
              </>
            }
          />
        </div>
        <div>
          <h4 className="mb-1 text-[13px] font-semibold text-gray-900">Tests</h4>
          {sample.tests.length === 0 ? (
            <p className="text-[13px] text-gray-600">No tests requested yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" aria-label={`Tests on ${sample.sampleNo}`}>
                <thead className="bg-gray-50 text-left text-xs text-gray-700">
                  <tr>
                    {['Test', 'Status', 'Assigned to', 'Due'].map((h) => (
                      <th key={h} scope="col" className="px-2 py-1.5 font-semibold">
                        {h}
                      </th>
                    ))}
                    {canCancelTests && (
                      <th scope="col" className="px-2 py-1.5">
                        <span className="sr-only">Cancel</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sample.tests.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">
                        {can('tests.viewAll') ? (
                          <Link to={`/my-tests/${t.id}`} className="underline">
                            {t.testCode} — {t.testName}
                          </Link>
                        ) : (
                          <>
                            {t.testCode} — {t.testName}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-1.5">{t.planned || t.status === 'CANCELLED' ? <StatusBadge status={t.status} /> : <Badge>Not planned yet</Badge>}</td>
                      <td className="px-2 py-1.5">{t.assignedToName ?? '—'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(t.dueDate)}</td>
                      {canCancelTests && (
                        <td className="px-2 py-1 text-right">
                          {!CLOSED_TEST.includes(t.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Cancel ${t.testCode} on ${sample.sampleNo}`}
                              onClick={() => onCancel({ type: 'test', id: t.id, version: t.version, label: `${t.testCode} on ${sample.sampleNo}` })}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <EditSampleDialog sample={sample} open={editing} onOpenChange={setEditing} />
    </section>
  );
}

const deviationSchema = z.object({ typeId: z.string().min(1, 'Choose a type'), sampleId: z.string(), remark: z.string().trim().max(1000) });
type DeviationValues = z.infer<typeof deviationSchema>;

function Deviations({ job }: { job: Job }) {
  const { can } = useSession();
  const updated = useJobUpdated();
  const [open, setOpen] = useState(false);
  const types = useLookups('DEVIATION_TYPE');
  const form = useForm<DeviationValues>({ resolver: zodResolver(deviationSchema), defaultValues: { typeId: '', sampleId: '', remark: '' } });
  const m = useMutation({
    mutationFn: async (v: DeviationValues) =>
      unwrap(await api.POST('/api/v1/jobs/{id}/deviations', { params: { path: { id: job.id } }, body: { typeId: v.typeId, sampleId: v.sampleId || null, remark: v.remark || null } })),
    onSuccess: (j) => {
      updated(j);
      form.reset();
      setOpen(false);
    },
    onError: (err) => applyServerErrors(err, form.setError, ['typeId', 'sampleId', 'remark']),
  });
  const sampleNo = (id: string | null) => job.samples.find((s) => s.id === id)?.sampleNo;
  const e = form.formState.errors;
  return (
    <Card>
      <CardHeader
        title={`Deviations (${job.deviations.length})`}
        actions={
          can('jobs.edit', 'jobs.create') && (
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <Plus aria-hidden />
              Add deviation
            </Button>
          )
        }
      />
      <div className="p-4">
        {job.deviations.length === 0 ? (
          <p className="text-[13px] text-gray-600">No deviations recorded.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[13px]">
            {job.deviations.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                <span>
                  <span className="font-medium text-gray-900">{d.typeLabel}</span>
                  <span className="text-gray-700"> · {sampleNo(d.sampleId) ?? 'Whole job'}</span>
                  {d.remark && <span className="text-gray-800"> · {d.remark}</span>}
                </span>
                <span className="text-xs text-gray-600">{formatDateTime(d.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Add a deviation">
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <Field label="Type" htmlFor="dv-type" required error={e.typeId?.message}>
            <Select id="dv-type" aria-invalid={!!e.typeId} {...form.register('typeId')}>
              <option value="">Choose a type</option>
              {types.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Applies to" htmlFor="dv-sample" error={e.sampleId?.message}>
            <Select id="dv-sample" {...form.register('sampleId')}>
              <option value="">Whole job</option>
              {job.samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sampleNo} — {s.description}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Remark" htmlFor="dv-remark" error={e.remark?.message}>
            <Textarea id="dv-remark" rows={2} {...form.register('remark')} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={m.isPending}>
              Add deviation
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

function Timeline({ jobId }: { jobId: string }) {
  const q = useQuery({ queryKey: ['job-timeline', jobId], queryFn: async () => unwrap(await api.GET('/api/v1/jobs/{id}/timeline', { params: { path: { id: jobId } } })) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data?.length) return <EmptyState title="Nothing has happened on this job yet" />;
  return (
    <ol className="space-y-0 border-l-2 border-gray-200 pl-4" aria-label="Job timeline">
      {q.data.map((t) => (
        <li key={`${t.entity}-${t.id}`} className="relative pb-3 text-[13px]">
          <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-brand" aria-hidden />
          <div className="flex flex-wrap justify-between gap-2">
            <span>
              <Badge className="mr-1.5">{humanize(t.entity)}</Badge>
              {t.label && <span className="font-medium text-gray-900">{t.label}: </span>}
              <span className="text-gray-900">
                {t.fromStatus ? `${humanize(t.fromStatus)} → ` : ''}
                {humanize(t.toStatus)}
              </span>
            </span>
            <span className="text-gray-600">
              {formatDateTime(t.at)} · {t.byName ?? 'System'}
            </span>
          </div>
          {t.reason && <p className="mt-0.5 text-gray-800">Reason: {t.reason}</p>}
        </li>
      ))}
    </ol>
  );
}

const ackSchema = z.object({ to: z.email('Enter a valid email'), cc: z.union([z.literal(''), z.email('Enter a valid email')]) });
type AckValues = z.infer<typeof ackSchema>;

function Acknowledgement({ job }: { job: Job }) {
  const { can } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const emails = useQuery({
    queryKey: ['job-emails', job.id],
    // The PDF and email are produced in the background, so the log fills in by itself.
    refetchInterval: (query) => (waiting || query.state.data?.some((r) => r.status === 'QUEUED') ? 2500 : false),
    queryFn: async () => unwrap(await api.GET('/api/v1/jobs/{id}/emails', { params: { path: { id: job.id } } })),
  });
  const before = useRef(0);
  useEffect(() => {
    if (waiting && (emails.data?.length ?? 0) > before.current) setWaiting(false);
  }, [waiting, emails.data]);
  const form = useForm<AckValues>({ resolver: zodResolver(ackSchema), defaultValues: { to: '', cc: '' } });
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const samples = useMemo(() => job.samples.map((s) => ({ id: s.id, sampleNo: s.sampleNo })), [job.samples]);
  const m = useMutation({
    mutationFn: async (v: AckValues) => unwrap(await api.POST('/api/v1/jobs/{id}/acknowledgement', { params: { path: { id: job.id } }, body: { to: v.to, cc: v.cc || null, photoIds } })),
    onSuccess: () => {
      before.current = emails.data?.length ?? 0;
      setWaiting(true);
      setOpen(false);
      toast.success('Acknowledgement queued');
      client.invalidateQueries({ queryKey: ['job-history', job.id] });
    },
    onError: (err) => applyServerErrors(err, form.setError, ['to', 'cc']),
  });
  const e = form.formState.errors;
  return (
    <Card>
      <CardHeader
        title="Acknowledgement emails"
        actions={
          can('jobs.create', 'jobs.edit') && (
            <div className="flex flex-wrap gap-2">
              <WhatsappButton kind="acknowledgement" entityId={job.id} title={`the acknowledgement for ${job.jobNo}`} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  form.reset({ to: job.contactEmail ?? '', cc: '' });
                  setOpen(true);
                }}
              >
                Email acknowledgement
              </Button>
            </div>
          )
        }
      />
      <div className="p-4">
        {emails.data?.length === 0 && !waiting && can('jobs.create', 'jobs.edit') && (
          <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            The customer has not been sent an acknowledgement yet. You can add photos of the samples as received (optional) and send it with <strong>Email acknowledgement</strong>.
          </p>
        )}
        <EmailLogTable rows={emails.data} loading={emails.isLoading} error={emails.error} onRetry={emails.refetch} />
        {waiting && (
          <p role="status" className="mt-2 text-[13px] text-gray-700">
            Preparing the email…
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Email the acknowledgement" wide>
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <Field label="To" htmlFor="ack-to" required error={e.to?.message}>
            <Input id="ack-to" type="email" aria-invalid={!!e.to} {...form.register('to')} />
          </Field>
          <Field label="Cc" htmlFor="ack-cc" error={e.cc?.message}>
            <Input id="ack-cc" type="email" aria-invalid={!!e.cc} {...form.register('cc')} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-gray-900">Photos of the samples as received</legend>
            <AckPhotoPicker samples={samples} value={photoIds} onChange={setPhotoIds} />
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2">
            <DocumentButton variant="secondary" kind="job-acknowledgement" params={{ jobId: job.id, photoIds }}>
              Preview letter
            </DocumentButton>
            <WhatsappButton kind="acknowledgement" entityId={job.id} title={`the acknowledgement for ${job.jobNo}`} label="Use WhatsApp instead" photoIds={photoIds} />
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={m.isPending}>
              Send
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

function CustomerLetter({ jobId }: { jobId: string }) {
  const { can } = useSession();
  const client = useQueryClient();
  const canEdit = can('jobs.create', 'jobs.edit');
  const pagesKey = ['files', 'Job', jobId, 'letter-page'];
  const pages = useQuery({ queryKey: pagesKey, queryFn: async () => unwrap(await api.GET('/api/v1/files', { params: { query: { entity: 'Job', entityId: jobId, category: 'letter-page' } } })) });
  const combine = useMutation({
    mutationFn: async (tab: ReturnType<typeof reserveTab>) => {
      try {
        const doc = await pollDocumentJob(unwrap(await api.POST('/api/v1/jobs/{id}/letter-pdf', { params: { path: { id: jobId } }, body: { fileIds: (pages.data ?? []).map((p) => p.id) } })));
        tab.show(doc.url, 'Customer letter');
      } catch (e) {
        tab.cancel();
        throw e;
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['files', 'Job', jobId] });
      toast.success('Letter combined into a PDF');
    },
    onError: toastDocumentError,
  });
  return (
    <Card>
      <CardHeader title="Customer letter" description="Upload a scanned PDF, or capture the pages and combine them." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 p-4 lg:grid-cols-2">
        <Attachments entity="Job" entityId={jobId} category="letter" title="Scanned letter (PDF)" canEdit={canEdit} accept="application/pdf" />
        <div className="space-y-3">
          <Attachments
            entity="Job"
            entityId={jobId}
            category="letter-page"
            title="Captured pages, in order"
            canEdit={canEdit}
            accept="image/png,image/jpeg"
            extraActions={
              <>
                <WebcamCapture
                  title="Capture letter pages"
                  buttonLabel="Capture pages"
                  onSave={async (files) => {
                    for (const file of files) await uploadEntityFile('Job', jobId, 'letter-page', file);
                    client.invalidateQueries({ queryKey: pagesKey });
                  }}
                />
                <PhoneUploadButton purpose="letter-page" entityId={jobId} onReceived={() => void client.invalidateQueries({ queryKey: pagesKey })} />
              </>
            }
          />
          {canEdit && (
            <Button variant="secondary" size="sm" disabled={!pages.data?.length} loading={combine.isPending} onClick={() => combine.mutate(reserveTab())}>
              <FileStack aria-hidden />
              Combine pages into PDF
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const { can } = useSession();
  const [params] = useSearchParams();
  const selectedSample = params.get('sample');
  const updated = useJobUpdated();
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState<'hold' | 'release' | null>(null);
  const [cancelling, setCancelling] = useState<CancelTarget | null>(null);
  const q = useQuery({ queryKey: ['job', id], queryFn: async () => unwrap(await api.GET('/api/v1/jobs/{id}', { params: { path: { id: id! } } })) });
  const history = useQuery({ queryKey: ['job-history', id], enabled: tab === 'history', queryFn: async () => unwrap(await api.GET('/api/v1/jobs/{id}/history', { params: { path: { id: id! } } })) });
  const hold = useMutation({
    mutationFn: async (b: { version: number; reason: string }) => unwrap(await api.POST('/api/v1/jobs/{id}/hold', { params: { path: { id: id! } }, body: b })),
    onSuccess: (j) => {
      updated(j);
      setDialog(null);
    },
    onError: (e) => {
      setDialog(null);
      writeError(() => void q.refetch())(e);
    },
  });
  const release = useMutation({
    mutationFn: async (version: number) => unwrap(await api.POST('/api/v1/jobs/{id}/release', { params: { path: { id: id! } }, body: { version } })),
    onSuccess: (j) => {
      updated(j);
      setDialog(null);
    },
    onError: (e) => {
      setDialog(null);
      writeError(() => void q.refetch())(e);
    },
  });

  // A search result or scan lands on one sample: show it, bring it into view, once per sample.
  const loaded = !!q.data;
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (selectedSample && shown.current !== selectedSample) setTab('overview');
  }, [selectedSample]);
  useEffect(() => {
    if (!loaded || !selectedSample || tab !== 'overview' || shown.current === selectedSample) return;
    const el = document.getElementById(`sample-${selectedSample}`);
    if (!el) return;
    shown.current = selectedSample;
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
  }, [loaded, selectedSample, tab]);

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const job = q.data;
  const onHold = job.status === 'ON_HOLD';
  const holdable = !onHold && job.status !== 'CANCELLED' && job.status !== 'COMPLETED';
  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {job.jobNo}
            <StatusBadge status={job.status} />
            {job.urgent && <Badge tone="red">Urgent</Badge>}
          </span>
        }
        breadcrumb={
          <Link to="/samples" className="underline">
            Samples
          </Link>
        }
        description={
          <>
            {job.customerName && (
              <>
                {can('customers.view') ? (
                  <Link to={`/customers/${job.customerId}`} className="underline">
                    {job.customerName}
                  </Link>
                ) : (
                  job.customerName
                )}{' '}
                ({job.crn}) ·{' '}
              </>
            )}
            Received {formatDateTime(job.receivedAt)} · {job.sampleCount} {job.sampleCount === 1 ? 'sample' : 'samples'}
          </>
        }
        actions={
          <>
            <ReportProblemButton reference={job.jobNo} context={`job ${job.jobNo}`} />
            {job.quotationId && can('quotations.view') && (
              <Button asChild variant="secondary">
                <Link to={`/quotations/${job.quotationId}`}>Open quotation</Link>
              </Button>
            )}
            {can('planning.view') && (
              <Button asChild variant="secondary">
                <Link to={`/planning?jobId=${job.id}`}>Open in planning</Link>
              </Button>
            )}
            {holdable && can('jobs.hold') && (
              <Button variant="secondary" onClick={() => setDialog('hold')}>
                Put on hold
              </Button>
            )}
            {onHold && can('jobs.hold') && <Button onClick={() => setDialog('release')}>Release hold</Button>}
            {job.status !== 'CANCELLED' && job.status !== 'COMPLETED' && can('jobs.cancel') && (
              <Button variant="secondary" onClick={() => setCancelling({ type: 'job', id: job.id, version: job.version, label: `job ${job.jobNo}` })}>
                Cancel job
              </Button>
            )}
          </>
        }
      />
      {(job.holdReason || job.noQuotationReason || job.cancelReason) && (
        <div className="mb-3 space-y-1 text-[13px] text-gray-800">
          {job.holdReason && (
            <p role="status" className="rounded bg-amber-100 p-2 text-amber-900">
              On hold: {job.holdReason}
            </p>
          )}
          {job.cancelReason && <p>Cancelled: {job.cancelReason}</p>}
          {job.noQuotationReason && <p>Booked without a quotation: {job.noQuotationReason}</p>}
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Samples</TabsTrigger>
          <TabsTrigger value="details">Job details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-4">
            {job.samples.map((s) => (
              <SampleCard key={s.id} job={job} sample={s} highlighted={s.id === selectedSample} onCancel={setCancelling} />
            ))}
            <Deviations job={job} />
          </div>
        </TabsContent>
        <TabsContent value="details">
          <JobHeaderForm job={job} />
        </TabsContent>
        <TabsContent value="documents">
          <div className="space-y-4">
            <Card>
              <CardHeader title="Documents" description="Each is produced in the background, then opens in a new tab." />
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <DocumentButton kind="job-srf" params={{ jobId: job.id }}>
                    Sample request form
                  </DocumentButton>
                  <DocumentButton kind="job-acknowledgement" params={{ jobId: job.id }}>
                    Acknowledgement
                  </DocumentButton>
                  <DocumentButton kind="sample-labels" params={{ jobId: job.id }}>
                    All labels
                  </DocumentButton>
                  {can('planning.view', 'tests.viewAll') && (
                    <DocumentButton kind="job-card" params={{ jobId: job.id }}>
                      Job card
                    </DocumentButton>
                  )}
                </div>
                <Attachments entity="Job" entityId={job.id} category="generated" title="Generated files" canEdit={false} />
              </div>
            </Card>
            <Acknowledgement job={job} />
            <CustomerLetter jobId={job.id} />
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <Card>
            <div className="p-4">
              <Timeline jobId={job.id} />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          {history.isLoading && <Spinner />}
          {history.error && <ErrorState error={history.error} onRetry={history.refetch} />}
          {history.data && <HistoryList entries={history.data} />}
        </TabsContent>
      </Tabs>
      <CancelDialog target={cancelling} onClose={() => setCancelling(null)} />
      <ReasonDialog
        open={dialog === 'hold'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Put this job on hold"
        description="Planning and testing stop until the hold is released."
        confirmLabel="Put on hold"
        loading={hold.isPending}
        onConfirm={(reason) => hold.mutate({ version: job.version, reason })}
      />
      <ConfirmDialog
        open={dialog === 'release'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Release the hold?"
        description="The job returns to the status it had before."
        confirmLabel="Release hold"
        loading={release.isPending}
        onConfirm={() => release.mutate(job.version)}
      />
    </>
  );
}
