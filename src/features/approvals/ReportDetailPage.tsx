import { zodResolver } from '@hookform/resolvers/zod';
import { WhatsappButton } from '@/features/whatsapp/WhatsappSend';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { EmailLogTable, HistoryList, reserveTab, ReasonDialog, StatusBadge, toastDocumentError } from '@/components/shared';
import { Badge, Button, Card, CardHeader, Checkbox, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { ReportPhotos } from './ReportPhotos';
import { cn, formatDateTime, humanize } from '@/lib/format';
import { applyServerErrors, isConflict, toastError, writeError } from '@/lib/forms';

type Report = components['schemas']['ReportDetailDto'];
type Revision = Report['revisions'][number];
type Rejection = Revision['rejections'][number];

const REASON_MAX = 2000;

function RejectDialog({ report, revision, open, onOpenChange, onDone, onConflict }: { report: Report; revision: Revision; open: boolean; onOpenChange: (o: boolean) => void; onDone: (r: Report) => void; onConflict: () => void }) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'CORRECT' | 'RETEST'>('CORRECT');
  const [tests, setTests] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      setReason('');
      setAction('CORRECT');
      setTests([]);
    }
  }, [open]);
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/reports/{id}/reject', { params: { path: { id: report.id } }, body: { version: revision.version, reason: reason.trim(), action, ...(action === 'RETEST' ? { sampleTestIds: tests } : {}) } })),
    onSuccess: (r) => {
      toast.success(action === 'RETEST' ? 'Report rejected and tests sent back' : 'Report rejected for correction');
      onDone(r);
      onOpenChange(false);
    },
    onError: (e) => {
      if (isConflict(e)) {
        onOpenChange(false);
        writeError(onConflict)(e);
      } else toastError(e);
    },
  });
  const ready = reason.trim() && (action === 'CORRECT' || tests.length > 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Reject ${report.reportNo}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) m.mutate();
        }}
      >
        <Field label="Reason" htmlFor="reject-reason" required hint="Whoever corrects or re-tests sees this.">
          <Textarea id="reject-reason" autoFocus required maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <fieldset className="space-y-1.5">
          <legend className="text-[13px] font-medium text-gray-700">What needs to happen</legend>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input type="radio" name="reject-action" checked={action === 'CORRECT'} onChange={() => setAction('CORRECT')} />
            Correct the report
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input type="radio" name="reject-action" checked={action === 'RETEST'} onChange={() => setAction('RETEST')} />
            Send tests back for re-testing
          </label>
        </fieldset>
        {action === 'RETEST' && (
          <fieldset className="space-y-1">
            <legend className="text-[13px] font-medium text-gray-700">Tests to send back</legend>
            {report.tests.map((t) => (
              <div key={t.sampleTestId}>
                <Checkbox id={`retest-${t.sampleTestId}`} label={`${t.testName} (${humanize(t.status)})`} checked={tests.includes(t.sampleTestId)} onCheckedChange={(v) => setTests((ids) => (v ? [...ids, t.sampleTestId] : ids.filter((x) => x !== t.sampleTestId)))} />
              </div>
            ))}
            {!tests.length && <p className="text-xs text-gray-600">Choose at least one test.</p>}
          </fieldset>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!ready} loading={m.isPending}>
            Reject
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const correctSchema = z.object({
  reportRemarks: z.string().max(4000),
  sampleDescription: z.string().trim().min(1, 'Enter the sample description').max(2000),
  customerReference: z.string().max(500),
  kindAttention: z.string().max(200),
});
type CorrectValues = z.infer<typeof correctSchema>;

function CorrectDialog({ report, revision, open, onOpenChange, onDone, onConflict }: { report: Report; revision: Revision; open: boolean; onOpenChange: (o: boolean) => void; onDone: (r: Report) => void; onConflict: () => void }) {
  const form = useForm<CorrectValues>({ resolver: zodResolver(correctSchema), defaultValues: { reportRemarks: '', sampleDescription: '', customerReference: '', kindAttention: '' } });
  useEffect(() => {
    if (open) form.reset({ reportRemarks: report.reportRemarks ?? '', sampleDescription: report.sampleDescription, customerReference: report.customerReference ?? '', kindAttention: report.kindAttention ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [open]);
  const m = useMutation({
    mutationFn: async (v: CorrectValues) => unwrap(await api.PATCH('/api/v1/reports/{id}/draft', { params: { path: { id: report.id } }, body: { version: revision.version, reportRemarks: v.reportRemarks.trim() || null, sampleDescription: v.sampleDescription, customerReference: v.customerReference.trim() || null, kindAttention: v.kindAttention.trim() || null } })),
    onSuccess: (r) => {
      toast.success('Draft corrected');
      onDone(r);
      onOpenChange(false);
    },
    onError: (e) => {
      if (isConflict(e)) {
        onOpenChange(false);
        writeError(onConflict)(e);
      } else applyServerErrors(e, form.setError, Object.keys(correctSchema.shape));
    },
  });
  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Correct draft of ${report.reportNo}`} description="Changes apply to this draft only and are recorded in the history." wide>
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="Sample description" htmlFor="c-desc" required error={e.sampleDescription?.message}>
          <Input id="c-desc" aria-invalid={!!e.sampleDescription} {...form.register('sampleDescription')} />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          <Field label="Customer reference" htmlFor="c-ref" error={e.customerReference?.message}>
            <Input id="c-ref" {...form.register('customerReference')} />
          </Field>
          <Field label="Kind attention" htmlFor="c-attn" error={e.kindAttention?.message}>
            <Input id="c-attn" {...form.register('kindAttention')} />
          </Field>
        </div>
        <Field label="Report remarks" htmlFor="c-remarks" error={e.reportRemarks?.message} hint="Printed on the report.">
          <Textarea id="c-remarks" rows={4} {...form.register('reportRemarks')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Save correction
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ApproveDialog({ report, revision, open, onOpenChange, onDone, onConflict }: { report: Report; revision: Revision; open: boolean; onOpenChange: (o: boolean) => void; onDone: (r: Report) => void; onConflict: () => void }) {
  const { user } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setPassword('');
    setError(null);
  }, [open]);
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/reports/{id}/approve', { params: { path: { id: report.id } }, body: { version: revision.version, password } })),
    onSuccess: (r) => {
      toast.success('Report approved and signed');
      onDone(r);
      onOpenChange(false);
    },
    onError: (e) => {
      if (isConflict(e)) {
        onOpenChange(false);
        writeError(onConflict)(e);
      } else setError(e instanceof ApiError ? e.message : 'The report could not be approved. Please try again.');
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Approve and sign ${report.reportNo}`}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (password) m.mutate();
        }}
      >
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-[13px] text-gray-800">
          <p className="font-semibold text-gray-900">This is your electronic signature.</p>
          <p className="mt-1">
            By entering your password you sign this report as {user?.name}
            {user?.designation ? `, ${user.designation}` : ''}. Its content is then frozen. Any later change needs a new revision with a stated reason.
          </p>
        </div>
        <Field label="Your password" htmlFor="approve-password" required error={error ?? undefined}>
          <Input id="approve-password" type="password" autoFocus autoComplete="current-password" aria-invalid={!!error} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!password} loading={m.isPending}>
            Sign and approve
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const emailSchema = z.object({ to: z.union([z.literal(''), z.email('Enter a valid email')]), cc: z.union([z.literal(''), z.email('Enter a valid email')]) });
type EmailValues = z.infer<typeof emailSchema>;

/** Issue with an optional email, or email an issued report again. */
function SendDialog({ report, mode, open, onOpenChange, onSubmit, loading }: { report: Report; mode: 'issue' | 'email'; open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (v: EmailValues) => void; loading: boolean }) {
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { to: '', cc: '' } });
  useEffect(() => {
    if (open) form.reset({ to: report.customerEmail ?? '', cc: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [open]);
  const issue = mode === 'issue';
  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={issue ? `Issue ${report.reportNo}` : `Email ${report.reportNo} again`} description={issue ? 'Once issued, the report can only be changed by a new revision.' : 'The issued PDF is attached.'}>
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit((v) => {
          if (issue || v.to) onSubmit(v);
          else form.setError('to', { message: 'Enter an email' });
        })}
        noValidate
      >
        <Field label={issue ? 'Email to (optional)' : 'Email to'} htmlFor="send-to" required={!issue} hint={issue ? 'Leave empty to issue without emailing.' : undefined} error={e.to?.message}>
          <Input id="send-to" type="email" aria-invalid={!!e.to} {...form.register('to')} />
        </Field>
        <Field label="Cc" htmlFor="send-cc" error={e.cc?.message}>
          <Input id="send-cc" type="email" aria-invalid={!!e.cc} {...form.register('cc')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {issue ? 'Issue report' : 'Send'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-600">{label}</dt>
      <dd className="break-words text-gray-900">{children}</dd>
    </div>
  );
}

function RevisionCard({ report, revision }: { report: Report; revision: Revision }) {
  const pdf = useMutation({
    mutationFn: async (tab: ReturnType<typeof reserveTab>) => {
      try {
        const res = unwrap(await api.GET('/api/v1/reports/revisions/{revisionId}/pdf', { params: { path: { revisionId: revision.id } } }));
        tab.show(res.url, res.filename);
      } catch (e) {
        tab.cancel();
        throw e;
      }
    },
    onError: toastDocumentError,
  });
  const signature = revision.signature as Revision['signature'] | null;
  const testName = (id: string) => report.tests.find((t) => t.sampleTestId === id)?.testName ?? id;
  const rejectionTests = (r: Rejection) => (r.sampleTestIds as string[] | null) ?? [];
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Revision {revision.revisionNo}
            <StatusBadge status={revision.status} />
            {revision.supersededAt && <Badge>Superseded {formatDateTime(revision.supersededAt)}</Badge>}
          </span>
        }
        actions={
          revision.pdfReady ? (
            <Button variant="secondary" size="sm" loading={pdf.isPending} onClick={() => pdf.mutate(reserveTab())}>
              <Download aria-hidden />
              Download revision {revision.revisionNo}
            </Button>
          ) : (
            revision.status === 'APPROVED' ? <RegeneratePdf reportId={report.id} approvedAt={revision.approvedAt} /> : <span className="text-[13px] text-gray-600">No PDF yet</span>
          )
        }
      />
      <div className="space-y-3 p-4 text-[13px]">
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {revision.revisionReason && <Detail label="Reason for revision">{revision.revisionReason}</Detail>}
          <Detail label="ULR">{revision.ulrNumber ?? '—'}</Detail>
          <Detail label="Reviewed by">{revision.reviewedByName ? `${revision.reviewedByName} · ${formatDateTime(revision.reviewedAt)}` : '—'}</Detail>
          <Detail label="Approved by">{revision.approvedByName ? `${revision.approvedByName} · ${formatDateTime(revision.approvedAt)}` : '—'}</Detail>
          <Detail label="Issued">{formatDateTime(revision.issuedAt)}</Detail>
          {revision.pdfSha256 && (
            <Detail label="PDF SHA-256">
              <span className="font-mono text-xs">{revision.pdfSha256}</span>
            </Detail>
          )}
        </dl>
        {signature && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <h3 className="font-semibold text-gray-900">Electronic signature</h3>
            <p className="text-gray-800">
              {signature.name}
              {signature.designation ? `, ${signature.designation}` : ''} · {formatDateTime(signature.signedAt)}
            </p>
            <p className="font-mono text-xs break-all text-gray-700">Content SHA-256: {signature.contentSha256}</p>
          </div>
        )}
        {revision.rejections.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900">Rejections</h3>
            <ul className="mt-1 space-y-1.5">
              {revision.rejections.map((r) => (
                <li key={r.id} className="rounded border border-gray-200 p-2">
                  <p className="text-gray-900">{r.reason}</p>
                  <p className="text-xs text-gray-700">
                    At {humanize(r.stage)} · {r.action === 'RETEST' ? 'Sent for re-testing' : 'To be corrected'} · {r.byName ?? 'System'} · {formatDateTime(r.at)}
                  </p>
                  {rejectionTests(r).length > 0 && <p className="text-xs text-gray-700">Tests: {rejectionTests(r).map(testName).join(', ')}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

type Dialogs = 'reject' | 'correct' | 'approve' | 'issue' | 'email' | 'revise' | null;

export default function ReportDetailPage() {
  const { id } = useParams();
  const { can } = useSession();
  const client = useQueryClient();
  const key = ['report', id];
  const [tab, setTab] = useState('preview');
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [revisionNo, setRevisionNo] = useState<number | null>(null);
  const [emailWaiting, setEmailWaiting] = useState(false);

  const q = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await api.GET('/api/v1/reports/{id}', { params: { path: { id: id! } } })),
    // The worker renders the final PDF after approval, so this fills in by itself.
    refetchInterval: (query) => {
      const latest = query.state.data?.revisions[0];
      return latest?.status === 'APPROVED' && !latest.pdfReady ? 2500 : false;
    },
  });
  const report = q.data;
  const latest = report?.revisions[0];
  const shownNo = revisionNo ?? latest?.revisionNo;
  const preview = useQuery({
    queryKey: ['report-preview', id, shownNo, latest?.version],
    enabled: !!report && shownNo !== undefined,
    queryFn: async () => unwrap(await api.GET('/api/v1/reports/{id}/preview', { params: { path: { id: id! }, query: { revisionNo: shownNo } } })),
  });
  const history = useQuery({ queryKey: ['report-history', id], enabled: tab === 'history', queryFn: async () => unwrap(await api.GET('/api/v1/reports/{id}/history', { params: { path: { id: id! } } })) });
  const emails = useQuery({
    queryKey: ['report-emails', id],
    enabled: tab === 'delivery',
    refetchInterval: (query) => (emailWaiting || query.state.data?.some((r) => r.status === 'QUEUED') ? 2500 : false),
    queryFn: async () => unwrap(await api.GET('/api/v1/reports/{id}/emails', { params: { path: { id: id! } } })),
  });
  useEffect(() => {
    if (emailWaiting && emails.data?.some((r) => r.status !== 'QUEUED')) setEmailWaiting(false);
  }, [emailWaiting, emails.data]);

  const reload = () => void q.refetch();
  const applied = (r: Report) => {
    client.setQueryData(key, r);
    setRevisionNo(null);
    setDialog(null);
    client.invalidateQueries({ queryKey: ['reports'] });
    client.invalidateQueries({ queryKey: ['report-history', id] });
    client.invalidateQueries({ queryKey: ['report-emails', id] });
    client.invalidateQueries({ queryKey: ['report-preview', id] });
  };
  const failed = (e: unknown) => {
    setDialog(null);
    writeError(reload)(e);
  };
  const path = { params: { path: { id: id! } } };
  const submit = useMutation({ mutationFn: async (version: number) => unwrap(await api.POST('/api/v1/reports/{id}/submit', { ...path, body: { version } })), onSuccess: applied, onError: failed });
  const pass = useMutation({ mutationFn: async (version: number) => unwrap(await api.POST('/api/v1/reports/{id}/pass-review', { ...path, body: { version } })), onSuccess: applied, onError: failed });
  const issue = useMutation({
    mutationFn: async (v: EmailValues) => unwrap(await api.POST('/api/v1/reports/{id}/issue', { ...path, body: { version: latest!.version, ...(v.to ? { emailTo: v.to } : {}), ...(v.cc ? { emailCc: v.cc } : {}) } })),
    onSuccess: (r, v) => {
      applied(r);
      toast.success(v.to ? 'Report issued and queued for email' : 'Report issued');
    },
    onError: failed,
  });
  const email = useMutation({
    mutationFn: async (v: EmailValues) => unwrap(await api.POST('/api/v1/reports/{id}/email', { ...path, body: { to: v.to, cc: v.cc || null } })),
    onSuccess: () => {
      setDialog(null);
      setEmailWaiting(true);
      setTab('delivery');
      client.invalidateQueries({ queryKey: ['report-emails', id] });
      client.invalidateQueries({ queryKey: ['report-history', id] });
      toast.success('Email queued');
    },
    onError: failed,
  });
  const revise = useMutation({
    mutationFn: async (reason: string) => unwrap(await api.POST('/api/v1/reports/{id}/revise', { ...path, body: { reason } })),
    onSuccess: (r) => {
      applied(r);
      toast.success('New revision started');
    },
    onError: failed,
  });

  if (q.isLoading) return <Spinner />;
  if (q.error || !report || !latest) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const { status } = latest;
  const canCorrect = status === 'DRAFT' && can('reports.review', 'reports.approve');
  const canReject = (status === 'IN_REVIEW' && can('reports.review')) || (status === 'PENDING_APPROVAL' && can('reports.approve'));
  const preparing = status === 'APPROVED' && !latest.pdfReady;
  const lastRejection = status === 'DRAFT' ? latest.rejections[0] : undefined;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {report.reportNo}
            <span className="text-sm font-normal text-gray-700">Revision {latest.revisionNo}</span>
            <StatusBadge status={status} />
          </span>
        }
        breadcrumb={
          <Link to="/approvals" className="underline">
            Approvals
          </Link>
        }
        description={
          <>
            {report.sampleNo} ·{' '}
            {can('jobs.view') ? (
              <Link to={`/samples/jobs/${report.jobId}?sample=${report.sampleId}`} className="underline">
                {report.jobNo}
              </Link>
            ) : (
              report.jobNo
            )}
            {report.customerName && ` · ${report.customerName}`}
          </>
        }
        actions={
          <>
            {canCorrect && (
              <Button variant="secondary" onClick={() => setDialog('correct')}>
                Correct draft
              </Button>
            )}
            {status === 'DRAFT' && can('reports.review') && (
              <Button loading={submit.isPending} onClick={() => submit.mutate(latest.version)}>
                Submit for review
              </Button>
            )}
            {canReject && (
              <Button variant="secondary" onClick={() => setDialog('reject')}>
                Reject
              </Button>
            )}
            {status === 'IN_REVIEW' && can('reports.review') && (
              <Button loading={pass.isPending} onClick={() => pass.mutate(latest.version)}>
                Pass review
              </Button>
            )}
            {status === 'PENDING_APPROVAL' && can('reports.approve') && (
              <Button disabled={!report.canApprove} onClick={() => setDialog('approve')}>
                Approve and sign
              </Button>
            )}
            {status === 'APPROVED' && can('reports.issue') && (
              <Button disabled={preparing || report.withheld} onClick={() => setDialog('issue')}>
                Issue
              </Button>
            )}
            {status === 'ISSUED' && can('reports.issue') && (
              <Button variant="secondary" onClick={() => setDialog('email')}>
                Email again
              </Button>
            )}
            {status === 'ISSUED' && <WhatsappButton kind="report" entityId={report.id} title={report.reportNo} />}
            {status === 'ISSUED' && can('reports.revise') && (
              <Button variant="secondary" onClick={() => setDialog('revise')}>
                Revise
              </Button>
            )}
          </>
        }
      />
      <div className="mb-3 space-y-2 text-[13px]">
        {lastRejection && (
          <div role="alert" className="rounded-md border-2 border-red-600 bg-red-50 px-3 py-2 text-red-900">
            <p className="font-semibold">
              Rejected at {humanize(lastRejection.stage)} by {lastRejection.byName ?? 'System'}: {lastRejection.action === 'RETEST' ? 'sent for re-testing' : 'to be corrected'}
            </p>
            <p>{lastRejection.reason}</p>
          </div>
        )}
        {status === 'PENDING_APPROVAL' && can('reports.approve') && !report.canApprove && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
            You reviewed this report, and the reviewer and signatory must be different people. Another signatory must approve it.
          </p>
        )}
        {preparing && (
          <p role="status" className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800">
            The final PDF is being prepared. The report can be issued as soon as it is ready.
          </p>
        )}
        {status === 'APPROVED' && report.withheld && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">Release is withheld for this customer until payment is received, so this report cannot be issued yet.</p>
        )}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="photos">Photos ({report.samplePhotos.length})</TabsTrigger>
          <TabsTrigger value="revisions">Revisions and tests ({report.revisions.length})</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <div className="mb-2 flex items-center gap-2">
            <label htmlFor="preview-revision" className="text-[13px] font-medium text-gray-700">
              Revision
            </label>
            <Select id="preview-revision" className="w-56" value={shownNo} onChange={(e) => setRevisionNo(Number(e.target.value))}>
              {report.revisions.map((r) => (
                <option key={r.id} value={r.revisionNo}>
                  {r.revisionNo} ({humanize(r.status)})
                </option>
              ))}
            </Select>
          </div>
          {preview.isLoading && <Spinner label="Preparing the preview" />}
          {preview.error && <ErrorState error={preview.error} onRetry={preview.refetch} />}
          {preview.data && <iframe title={`Preview of ${report.reportNo} revision ${shownNo}`} sandbox="" srcDoc={preview.data.html} className={cn('h-[calc(100dvh-14rem)] min-h-[32rem] w-full rounded-lg border border-gray-200 bg-surface', preview.isFetching && 'opacity-70')} />}
        </TabsContent>
        <TabsContent value="photos">
          <ReportPhotos report={report} version={latest.version} editable={canCorrect} onSaved={applied} onConflict={reload} />
        </TabsContent>
        <TabsContent value="revisions">
          <div className="space-y-4">
            {report.revisions.map((r) => (
              <RevisionCard key={r.id} report={report} revision={r} />
            ))}
            <Card>
              <CardHeader title="Tests on this report" />
              {report.tests.length === 0 ? (
                <EmptyState title="No tests" />
              ) : (
                <ul className="divide-y divide-gray-100 text-[13px]">
                  {report.tests.map((t) => (
                    <li key={t.sampleTestId} className="flex items-center justify-between gap-2 px-4 py-2">
                      {can('tests.viewAll') ? (
                        <Link to={`/my-tests/${t.sampleTestId}`} className="underline">
                          {t.testName}
                        </Link>
                      ) : (
                        t.testName
                      )}
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="delivery">
          <Card>
            <CardHeader title="Email delivery log" />
            <div className="p-4">
              <EmailLogTable rows={emails.data} loading={emails.isLoading} error={emails.error} onRetry={emails.refetch} />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          {history.isLoading && <Spinner />}
          {history.error && <ErrorState error={history.error} onRetry={history.refetch} />}
          {history.data && <HistoryList entries={history.data} />}
        </TabsContent>
      </Tabs>
      <RejectDialog report={report} revision={latest} open={dialog === 'reject'} onOpenChange={(o) => setDialog(o ? 'reject' : null)} onDone={applied} onConflict={reload} />
      <CorrectDialog report={report} revision={latest} open={dialog === 'correct'} onOpenChange={(o) => setDialog(o ? 'correct' : null)} onDone={applied} onConflict={reload} />
      <ApproveDialog report={report} revision={latest} open={dialog === 'approve'} onOpenChange={(o) => setDialog(o ? 'approve' : null)} onDone={applied} onConflict={reload} />
      <SendDialog report={report} mode="issue" open={dialog === 'issue'} onOpenChange={(o) => setDialog(o ? 'issue' : null)} onSubmit={(v) => issue.mutate(v)} loading={issue.isPending} />
      <SendDialog report={report} mode="email" open={dialog === 'email'} onOpenChange={(o) => setDialog(o ? 'email' : null)} onSubmit={(v) => email.mutate(v)} loading={email.isPending} />
      <ReasonDialog open={dialog === 'revise'} onOpenChange={(o) => !o && setDialog(null)} title={`Revise ${report.reportNo}`} description="This starts a new revision, which goes through review and approval again. The issued revision stays valid until the new one is issued." confirmLabel="Start revision" loading={revise.isPending} onConfirm={(reason) => revise.mutate(reason)} />
    </>
  );
}

/**
 * The final PDF renders in the background after signing, normally within seconds. If it has not appeared after
 * a couple of minutes (the worker was down, for example), offer to render it again from the frozen report.
 */
function RegeneratePdf({ reportId, approvedAt }: { reportId: string; approvedAt: string | null }) {
  const client = useQueryClient();
  const { can } = useSession();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/reports/{id}/regenerate-pdf', { params: { path: { id: reportId } } })),
    onSuccess: (r) => {
      client.setQueryData(['report', reportId], r);
      toast.success('The PDF is being prepared again');
    },
    onError: toastError,
  });
  const late = approvedAt !== null && now - new Date(approvedAt).getTime() > 2 * 60_000;
  if (!late || !(can('reports.approve') || can('reports.issue'))) return <span className="text-[13px] text-gray-600">Preparing the PDF…</span>;
  return (
    <span className="flex items-center gap-2 text-[13px] text-amber-800">
      The PDF is taking longer than usual.
      <Button variant="secondary" size="sm" loading={m.isPending} onClick={() => m.mutate()}>
        Prepare it again
      </Button>
    </span>
  );
}
