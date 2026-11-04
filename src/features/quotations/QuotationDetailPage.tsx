import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DocumentButton, EmailLogTable, ReasonDialog, StatusBadge } from '@/components/shared';
import { Button, Card, CardHeader, ConfirmDialog, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime, formatINR, humanize } from '@/lib/format';
import { applyServerErrors, toastError } from '@/lib/forms';
import { VersionLines, VersionTerms, VersionTotals } from './VersionView';

type Quotation = components['schemas']['QuotationDto'];

const sendSchema = z.object({
  to: z.email('Enter a valid email'),
  cc: z.union([z.literal(''), z.email('Enter a valid email')]),
  message: z.string().max(4000),
});
type SendValues = z.infer<typeof sendSchema>;

function SendDialog({ quotation, open, onOpenChange, onSent }: { quotation: Quotation; open: boolean; onOpenChange: (o: boolean) => void; onSent: (q: Quotation) => void }) {
  const { can } = useSession();
  const customer = useQuery({
    queryKey: ['customer', quotation.customerId],
    enabled: open && can('customers.view'),
    queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}', { params: { path: { id: quotation.customerId } } })),
  });
  const contact = customer.data?.contacts.find((c) => c.isPrimary && c.email) ?? customer.data?.contacts.find((c) => c.email);
  const form = useForm<SendValues>({ resolver: zodResolver(sendSchema), defaultValues: { to: '', cc: '', message: '' } });
  useEffect(() => {
    if (open) form.reset({ to: contact?.email ?? '', cc: '', message: '' });
  }, [open, contact?.email, form]);
  const m = useMutation({
    mutationFn: async (v: SendValues) => unwrap(await api.POST('/api/v1/quotations/{id}/send', { params: { path: { id: quotation.id } }, body: { version: quotation.version, to: v.to, cc: v.cc || null, message: v.message || null } })),
    onSuccess: (q) => {
      toast.success('Quotation queued for sending');
      onSent(q);
      onOpenChange(false);
    },
    onError: (err) => applyServerErrors(err, form.setError, ['to', 'cc', 'message']),
  });
  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Send ${quotation.quotationNo}`} description="The PDF of the current version is attached.">
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="To" htmlFor="send-to" required error={e.to?.message}>
          <Input id="send-to" type="email" aria-invalid={!!e.to} {...form.register('to')} />
        </Field>
        <Field label="Cc" htmlFor="send-cc" error={e.cc?.message}>
          <Input id="send-cc" type="email" aria-invalid={!!e.cc} {...form.register('cc')} />
        </Field>
        <Field label="Message" htmlFor="send-message" error={e.message?.message}>
          <Textarea id="send-message" rows={4} {...form.register('message')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Send
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function VersionCard({ quotation, version }: { quotation: Quotation; version: Quotation['versions'][number] }) {
  return (
    <Card>
      <CardHeader
        title={`Version ${version.versionNo}${version.versionNo === quotation.currentVersionNo ? ' (current)' : ''}`}
        description={`Created ${formatDateTime(version.createdAt)}`}
        actions={
          <DocumentButton kind="quotation-pdf" params={{ versionId: version.id }} size="sm">
            PDF
          </DocumentButton>
        }
      />
      <div className="space-y-4 p-4">
        {version.revisionNote && (
          <p className="rounded bg-gray-100 p-2 text-[13px] text-gray-800">
            <span className="font-medium">Revision note: </span>
            {version.revisionNote}
          </p>
        )}
        <VersionTerms version={version} />
        <VersionLines version={version} />
        <VersionTotals version={version} />
      </div>
    </Card>
  );
}

type Dialogs = 'send' | 'accept' | 'reject' | 'revise' | 'convert' | null;

export default function QuotationDetailPage() {
  const { id } = useParams();
  const { can } = useSession();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [tab, setTab] = useState('current');
  const q = useQuery({ queryKey: ['quotation', id], queryFn: async () => unwrap(await api.GET('/api/v1/quotations/{id}', { params: { path: { id: id! } } })) });
  const emails = useQuery({
    queryKey: ['quotation-emails', id],
    enabled: tab === 'sent',
    // Sending happens in the background, so the log fills in by itself.
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === 'QUEUED') ? 3000 : false),
    queryFn: async () => unwrap(await api.GET('/api/v1/quotations/{id}/emails', { params: { path: { id: id! } } })),
  });
  const history = useQuery({ queryKey: ['quotation-history', id], enabled: tab === 'history', queryFn: async () => unwrap(await api.GET('/api/v1/quotations/{id}/history', { params: { path: { id: id! } } })) });

  const applied = (updated: Quotation) => {
    client.setQueryData(['quotation', updated.id], updated);
    client.invalidateQueries({ queryKey: ['quotations'] });
    client.invalidateQueries({ queryKey: ['quotation-emails', updated.id] });
    client.invalidateQueries({ queryKey: ['quotation-history', updated.id] });
    client.invalidateQueries({ queryKey: ['orders'] });
    client.invalidateQueries({ queryKey: ['orders-pipeline'] });
    setDialog(null);
  };
  const path = { path: { id: id! } };
  const accept = useMutation({ mutationFn: async (version: number) => unwrap(await api.POST('/api/v1/quotations/{id}/accept', { params: path, body: { version } })), onSuccess: applied, onError: toastError });
  const reject = useMutation({ mutationFn: async (b: { version: number; reason: string }) => unwrap(await api.POST('/api/v1/quotations/{id}/reject', { params: path, body: b })), onSuccess: applied, onError: toastError });
  const revise = useMutation({ mutationFn: async (b: { version: number; reason: string }) => unwrap(await api.POST('/api/v1/quotations/{id}/revise', { params: path, body: b })), onSuccess: applied, onError: toastError });
  const convert = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/quotations/{id}/convert', { params: path })),
    onSuccess: (res) => {
      client.invalidateQueries({ queryKey: ['quotation', id] });
      client.invalidateQueries({ queryKey: ['quotations'] });
      client.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`Job ${res.jobNo} created`);
      navigate(`/samples/jobs/${res.jobId}`);
    },
    onError: toastError,
  });

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const quotation = q.data;
  const current = quotation.versions.find((v) => v.versionNo === quotation.currentVersionNo);
  const earlier = quotation.versions.filter((v) => v.versionNo !== quotation.currentVersionNo).sort((a, b) => b.versionNo - a.versionNo);
  const { status } = quotation;

  return (
    <>
      <PageHeader
        title={quotation.quotationNo}
        breadcrumb={
          <Link to="/quotations" className="underline">
            Quotations
          </Link>
        }
        description={
          <>
            {quotation.customerName} ({quotation.crn}) · Grand total {formatINR(quotation.grandTotal)} · Valid until {formatDate(quotation.validUntil)}
          </>
        }
        actions={
          <>
            <StatusBadge status={status} />
            <span className="text-[13px] text-gray-700">Version {quotation.currentVersionNo}</span>
            {status === 'DRAFT' && can('quotations.edit') && (
              <Button asChild variant="secondary">
                <Link to={`/quotations/${quotation.id}/edit`}>Edit</Link>
              </Button>
            )}
            {(status === 'DRAFT' || status === 'SENT') && can('quotations.send') && <Button variant={status === 'DRAFT' ? 'primary' : 'secondary'} onClick={() => setDialog('send')}>{status === 'DRAFT' ? 'Send' : 'Send again'}</Button>}
            {status === 'SENT' && can('quotations.decide') && (
              <>
                <Button onClick={() => setDialog('accept')}>Accept</Button>
                <Button variant="secondary" onClick={() => setDialog('reject')}>
                  Reject
                </Button>
              </>
            )}
            {(status === 'SENT' || status === 'REJECTED' || status === 'EXPIRED') && can('quotations.edit') && (
              <Button variant="secondary" onClick={() => setDialog('revise')}>
                Revise
              </Button>
            )}
            {status === 'ACCEPTED' && !quotation.jobId && can('quotations.convert') && <Button onClick={() => setDialog('convert')}>Convert to job</Button>}
            {quotation.jobId && can('jobs.view') && (
              <Button asChild variant="secondary">
                <Link to={`/samples/jobs/${quotation.jobId}`}>Open job</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-700">
        {quotation.orderId && can('orders.view') && (
          <Link to={`/orders/${quotation.orderId}`} className="underline">
            Open order
          </Link>
        )}
        {quotation.sentAt && <span>Sent {formatDateTime(quotation.sentAt)}</span>}
        {quotation.acceptedAt && <span>Accepted {formatDateTime(quotation.acceptedAt)}</span>}
        {quotation.rejectReason && <span>Rejected: {quotation.rejectReason}</span>}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="current">Current version</TabsTrigger>
          <TabsTrigger value="versions">Version history ({quotation.versions.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="history">Status history</TabsTrigger>
        </TabsList>
        <TabsContent value="current">{current && <VersionCard quotation={quotation} version={current} />}</TabsContent>
        <TabsContent value="versions">
          <div className="space-y-4">
            {earlier.length === 0 && <EmptyState title="This is the first version" />}
            {earlier.map((v) => (
              <VersionCard key={v.id} quotation={quotation} version={v} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="sent">
          <Card>
            <div className="p-4">
              <EmailLogTable rows={emails.data} loading={emails.isLoading} error={emails.error} onRetry={emails.refetch} />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          {history.isLoading && <Spinner />}
          {history.error && <ErrorState error={history.error} onRetry={history.refetch} />}
          {history.data?.length === 0 && <EmptyState title="No status changes yet" />}
          <ol className="space-y-2">
            {history.data?.map((h) => (
              <li key={h.id} className="rounded border border-gray-200 bg-white p-2 text-[13px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {h.fromStatus ? `${humanize(h.fromStatus)} → ` : ''}
                    {humanize(h.toStatus)}
                  </span>
                  <span className="text-gray-600">
                    {formatDateTime(h.at)} · {h.byName ?? 'System'}
                  </span>
                </div>
                {h.reason && <p className="mt-1 text-gray-800">Reason: {h.reason}</p>}
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
      <SendDialog quotation={quotation} open={dialog === 'send'} onOpenChange={(o) => setDialog(o ? 'send' : null)} onSent={applied} />
      <ConfirmDialog open={dialog === 'accept'} onOpenChange={(o) => !o && setDialog(null)} title="Accept this quotation?" description="Record that the customer accepted the current version." confirmLabel="Accept" loading={accept.isPending} onConfirm={() => accept.mutate(quotation.version)} />
      <ConfirmDialog open={dialog === 'convert'} onOpenChange={(o) => !o && setDialog(null)} title="Convert to a job?" description="This creates a job with the samples and tests on this quotation. It can only be done once." confirmLabel="Convert to job" loading={convert.isPending} onConfirm={() => convert.mutate()} />
      <ReasonDialog open={dialog === 'reject'} onOpenChange={(o) => !o && setDialog(null)} title="Reject this quotation" confirmLabel="Reject" danger loading={reject.isPending} onConfirm={(reason) => reject.mutate({ version: quotation.version, reason })} />
      <ReasonDialog open={dialog === 'revise'} onOpenChange={(o) => !o && setDialog(null)} title="Revise this quotation" description="Creates a new draft version. Earlier versions stay as they were." confirmLabel="Revise" loading={revise.isPending} onConfirm={(reason) => revise.mutate({ version: quotation.version, reason })} />
    </>
  );
}
