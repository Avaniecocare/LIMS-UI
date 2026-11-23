import { zodResolver } from '@hookform/resolvers/zod';
import { WhatsappButton } from '@/features/whatsapp/WhatsappSend';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DocumentButton, EmailLogTable, HistoryList, ReasonDialog, StatusBadge } from '@/components/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
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
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime, humanize } from '@/lib/format';
import { applyServerErrors, toastError, writeError } from '@/lib/forms';
import { DirtyScope, useDirtyScope, useLeaveGuard, useReportDirty } from '@/lib/use-leave-guard';
import { AMOUNT, Money, RecordPaymentDialog, refreshBilling, ReminderDialog } from './billing';
import { EInvoiceBadge, EInvoicePanel, IRN_CANCEL_REASONS } from './EInvoicePanel';

type Invoice = components['schemas']['InvoiceDto'];
type Line = Invoice['lines'][number];

const OPEN = ['ISSUED', 'PARTIALLY_PAID'];
const optionalEmail = z.union([z.literal(''), z.email('Enter a valid email')]);

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between gap-6 border-t border-gray-200 pt-1.5 text-sm font-semibold text-gray-900' : 'flex justify-between gap-6 text-gray-800'}>
      <dt>{label}</dt>
      <dd>
        <Money value={value} />
      </dd>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-600">{label}</dt>
      <dd className="text-[13px] text-gray-900">{children}</dd>
    </div>
  );
}

/** Totals exactly as the server returned them. Nothing here is added up. */
function Totals({ invoice: i }: { invoice: Invoice }) {
  return (
    <div className="space-y-2">
      <dl aria-label="Totals" className="ml-auto max-w-sm space-y-1 text-[13px]">
        <TotalRow label="Subtotal" value={i.subtotal} />
        <TotalRow label="Discount" value={i.discountAmount} />
        <TotalRow label="Taxable amount" value={i.taxableAmount} />
        {i.isInterState ? (
          <TotalRow label={`IGST (GST rate ${i.gstRate}%)`} value={i.igst} />
        ) : (
          <>
            <TotalRow label={`CGST (GST rate ${i.gstRate}%)`} value={i.cgst} />
            <TotalRow label={`SGST (GST rate ${i.gstRate}%)`} value={i.sgst} />
          </>
        )}
        <TotalRow label="Round-off" value={i.roundOff} />
        <TotalRow label="Grand total" value={i.grandTotal} strong />
      </dl>
      <p className="text-right text-[13px] font-medium text-gray-900">{i.amountInWords}</p>
    </div>
  );
}

const rateSchema = z.object({ rate: z.string().trim().regex(AMOUNT, 'Enter a rate, such as 1250.50'), reason: z.string().trim().min(1, 'Give a reason for changing the rate') });
type RateValues = z.infer<typeof rateSchema>;

function RateDialog({ invoice, line, onClose, onSaved }: { invoice: Invoice; line: Line | null; onClose: () => void; onSaved: (i: Invoice) => void }) {
  const form = useForm<RateValues>({ resolver: zodResolver(rateSchema), defaultValues: { rate: '', reason: '' } });
  useEffect(() => {
    if (line) form.reset({ rate: line.rate, reason: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [line?.id]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: RateValues) =>
      unwrap(await api.PATCH('/api/v1/invoices/{id}', { params: { path: { id: invoice.id } }, body: { version: invoice.version, lineRates: [{ lineId: line!.id, rate: v.rate, reason: v.reason }] } })),
    onSuccess: (i) => {
      toast.success('Rate changed');
      onSaved(i);
      onClose();
    },
    onError: (error) => applyServerErrors(error, form.setError, ['rate', 'reason']),
  });
  return (
    <Dialog open={!!line} onOpenChange={(o) => !o && onClose()} title="Change the rate on this line" description={line?.description}>
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="Rate" htmlFor="rate-value" required error={e.rate?.message}>
          <Input id="rate-value" className="tabular-nums" inputMode="decimal" autoComplete="off" autoFocus aria-invalid={!!e.rate} {...form.register('rate')} />
        </Field>
        <Field label="Reason" htmlFor="rate-reason" required error={e.reason?.message}>
          <Textarea id="rate-reason" aria-invalid={!!e.reason} {...form.register('reason')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Save rate
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Lines({ invoice, canChangeRate, onChangeRate }: { invoice: Invoice; canChangeRate: boolean; onChangeRate: (line: Line) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]" aria-label="Invoice lines">
        <thead className="bg-gray-50 text-left text-xs text-gray-700">
          <tr>
            {['#', 'Description', 'SAC', 'Qty', 'Rate', 'Rate source', 'Amount'].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
            {canChangeRate && (
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Change rate</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={l.id} className="border-t border-gray-100">
              <td className="px-3 py-2">{l.seq}</td>
              <td className="px-3 py-2">{l.description}</td>
              <td className="px-3 py-2">{l.sacCode}</td>
              <td className="px-3 py-2">{l.quantity}</td>
              <td className="px-3 py-2">
                <Money value={l.rate} />
              </td>
              <td className="px-3 py-2">{l.rateSource ? humanize(l.rateSource) : '—'}</td>
              <td className="px-3 py-2">
                <Money value={l.amount} />
              </td>
              {canChangeRate && (
                <td className="px-3 py-1 text-right">
                  <Button variant="ghost" size="sm" aria-label={`Change rate of line ${l.seq}`} onClick={() => onChangeRate(l)}>
                    Change rate
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const draftSchema = z.object({
  discountPct: z
    .string()
    .trim()
    .regex(/^$|^\d+(\.\d{1,2})?$/, 'Enter a percentage, such as 5'),
  notes: z.string(),
});
type DraftValues = z.infer<typeof draftSchema>;

function DraftForm({ invoice, onSaved, onConflict }: { invoice: Invoice; onSaved: (i: Invoice) => void; onConflict: () => void }) {
  const form = useForm<DraftValues>({ resolver: zodResolver(draftSchema), defaultValues: { discountPct: '', notes: invoice.notes ?? '' } });
  useReportDirty(form.formState.isDirty);
  useEffect(() => {
    form.reset({ discountPct: '', notes: invoice.notes ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the saved invoice changes
  }, [invoice.version]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: DraftValues) =>
      unwrap(
        await api.PATCH('/api/v1/invoices/{id}', {
          params: { path: { id: invoice.id } },
          body: { version: invoice.version, notes: v.notes.trim() || null, ...(v.discountPct ? { discountPct: v.discountPct } : {}) },
        }),
      ),
    onSuccess: (i) => {
      toast.success('Draft saved');
      onSaved(i);
    },
    onError: (error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) writeError(onConflict)(error);
      else applyServerErrors(error, form.setError, ['discountPct', 'notes']);
    },
  });
  return (
    <form className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 md:grid-cols-[10rem_1fr_auto] md:items-start" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      <Field label="Discount %" htmlFor="draft-discount" error={e.discountPct?.message} hint="Leave empty to keep the current discount.">
        <Input id="draft-discount" className="tabular-nums" inputMode="decimal" autoComplete="off" aria-invalid={!!e.discountPct} {...form.register('discountPct')} />
      </Field>
      <Field label="Notes" htmlFor="draft-notes">
        <Input id="draft-notes" {...form.register('notes')} />
      </Field>
      <Button type="submit" variant="secondary" className="md:mt-6" loading={m.isPending}>
        Save draft
      </Button>
    </form>
  );
}

const issueSchema = z.object({ invoiceDate: z.string(), emailTo: optionalEmail, emailCc: optionalEmail });
type IssueValues = z.infer<typeof issueSchema>;

function useContactEmail(customerId: string, enabled: boolean) {
  const { can } = useSession();
  return useQuery({
    queryKey: ['customer', customerId],
    enabled: enabled && can('customers.view'),
    queryFn: async () => unwrap(await api.GET('/api/v1/customers/{id}', { params: { path: { id: customerId } } })),
    select: (c) => (c.contacts.find((x) => x.isPrimary && x.email) ?? c.contacts.find((x) => x.email))?.email ?? '',
  });
}

function IssueDialog({
  invoice,
  open,
  onOpenChange,
  onSaved,
  onConflict,
}: {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (i: Invoice) => void;
  onConflict: () => void;
}) {
  const form = useForm<IssueValues>({ resolver: zodResolver(issueSchema), defaultValues: { invoiceDate: '', emailTo: '', emailCc: '' } });
  const contact = useContactEmail(invoice.customerId, open);
  useEffect(() => {
    if (open) form.reset({ invoiceDate: '', emailTo: contact.data ?? '', emailCc: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens or the contact arrives
  }, [open, contact.data]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: IssueValues) =>
      unwrap(
        await api.POST('/api/v1/invoices/{id}/issue', {
          params: { path: { id: invoice.id } },
          body: { version: invoice.version, ...(v.invoiceDate ? { invoiceDate: v.invoiceDate } : {}), ...(v.emailTo ? { emailTo: v.emailTo } : {}), ...(v.emailCc ? { emailCc: v.emailCc } : {}) },
        }),
      ),
    onSuccess: (i) => {
      toast.success(`Invoice ${i.invoiceNo} issued`);
      onSaved(i);
      onOpenChange(false);
    },
    onError: (error) => {
      onOpenChange(false);
      writeError(onConflict)(error);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Issue this invoice" description="It gets its number and due date, and can no longer be edited.">
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="Invoice date (optional)" htmlFor="issue-date" hint="Leave empty to use today.">
          <Input id="issue-date" type="date" {...form.register('invoiceDate')} />
        </Field>
        <Field label="Email to (optional)" htmlFor="issue-to" hint="Leave empty to issue without emailing." error={e.emailTo?.message}>
          <Input id="issue-to" type="email" aria-invalid={!!e.emailTo} {...form.register('emailTo')} />
        </Field>
        <Field label="Cc" htmlFor="issue-cc" error={e.emailCc?.message}>
          <Input id="issue-cc" type="email" aria-invalid={!!e.emailCc} {...form.register('emailCc')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Issue invoice
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const emailSchema = z.object({ to: z.email('Enter a valid email'), cc: optionalEmail });
type EmailValues = z.infer<typeof emailSchema>;

function EmailDialog({ invoice, open, onOpenChange, onSent }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void; onSent: () => void }) {
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { to: '', cc: '' } });
  const contact = useContactEmail(invoice.customerId, open);
  useEffect(() => {
    if (open) form.reset({ to: contact.data ?? '', cc: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens or the contact arrives
  }, [open, contact.data]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: EmailValues) => unwrap(await api.POST('/api/v1/invoices/{id}/email', { params: { path: { id: invoice.id } }, body: { to: v.to, ...(v.cc ? { cc: v.cc } : {}) } })),
    onSuccess: () => {
      toast.success('Invoice queued for email');
      onSent();
      onOpenChange(false);
    },
    onError: (error) => applyServerErrors(error, form.setError, ['to', 'cc']),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Email ${invoice.invoiceNo ?? 'invoice'}`}>
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="Email to" htmlFor="email-to" required error={e.to?.message}>
          <Input id="email-to" type="email" aria-invalid={!!e.to} {...form.register('to')} />
        </Field>
        <Field label="Cc" htmlFor="email-cc" error={e.cc?.message}>
          <Input id="email-cc" type="email" aria-invalid={!!e.cc} {...form.register('cc')} />
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

const creditSchema = z.object({ taxableAmount: z.string().trim().regex(AMOUNT, 'Enter an amount, such as 1250.50'), reason: z.string().trim().min(1, 'Give a reason'), issuedOn: z.string() });
type CreditValues = z.infer<typeof creditSchema>;

function CreditNoteDialog({ invoice, open, onOpenChange, onSaved }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (i: Invoice) => void }) {
  const form = useForm<CreditValues>({ resolver: zodResolver(creditSchema), defaultValues: { taxableAmount: '', reason: '', issuedOn: '' } });
  useEffect(() => {
    if (open) form.reset({ taxableAmount: '', reason: '', issuedOn: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [open]);
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: CreditValues) =>
      unwrap(
        await api.POST('/api/v1/invoices/{id}/credit-notes', {
          params: { path: { id: invoice.id } },
          body: { taxableAmount: v.taxableAmount, reason: v.reason, ...(v.issuedOn ? { issuedOn: v.issuedOn } : {}) },
        }),
      ),
    onSuccess: (i) => {
      toast.success('Credit note raised');
      onSaved(i);
      onOpenChange(false);
    },
    onError: (error) => applyServerErrors(error, form.setError, ['taxableAmount', 'reason', 'issuedOn']),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Credit note against ${invoice.invoiceNo}`} description="Enter the amount before tax. GST is worked out the same way as on the invoice.">
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <Field label="Taxable amount" htmlFor="cn-amount" required error={e.taxableAmount?.message}>
          <Input id="cn-amount" className="tabular-nums" inputMode="decimal" autoComplete="off" aria-invalid={!!e.taxableAmount} {...form.register('taxableAmount')} />
        </Field>
        <Field label="Date (optional)" htmlFor="cn-date" hint="Leave empty to use today.">
          <Input id="cn-date" type="date" {...form.register('issuedOn')} />
        </Field>
        <Field label="Reason" htmlFor="cn-reason" required error={e.reason?.message}>
          <Textarea id="cn-reason" aria-invalid={!!e.reason} {...form.register('reason')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Raise credit note
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PlainTable({ label, heads, children }: { label: string; heads: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]" aria-label={label}>
        <thead className="bg-gray-50 text-left text-xs text-gray-700">
          <tr>
            {heads.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const td = 'border-t border-gray-100 px-3 py-2';

/** A credit note's e-invoice state, with a retry when the GST portal has not registered it. */
function CreditNoteIrn({ note, canRetry, onSaved }: { note: Invoice['creditNotes'][number]; canRetry: boolean; onSaved: (i: Invoice) => void }) {
  const retry = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/credit-notes/{id}/einvoice', { params: { path: { id: note.id } } })),
    onSuccess: onSaved,
    onError: toastError,
  });
  const e = note.einvoice;
  return (
    <span className="flex flex-col items-start gap-1">
      <EInvoiceBadge e={e} />
      {e?.status === 'FAILED' && <span className="max-w-60 text-xs text-red-800">{e.lastError}</span>}
      {canRetry && (!e || e.status === 'FAILED') && (
        <Button size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate()} aria-label={`Register ${note.creditNoteNo} at the GST portal`}>
          {e ? 'Try again' : 'Register'}
        </Button>
      )}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { can } = useSession();
  const client = useQueryClient();
  const key = ['invoice', id];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET('/api/v1/invoices/{id}', { params: { path: { id: id! } } })) });
  const [tab, setTab] = useState('details');
  const [dialog, setDialog] = useState<'issue' | 'cancel' | 'email' | 'credit' | 'pay' | 'remind' | null>(null);
  const [rating, setRating] = useState<Line | null>(null);
  const [irnReason, setIrnReason] = useState('');
  const emails = useQuery({
    queryKey: ['invoice-emails', id],
    enabled: tab === 'delivery',
    queryFn: async () => unwrap(await api.GET('/api/v1/invoices/{id}/emails', { params: { path: { id: id! } } })),
  });
  const history = useQuery({
    queryKey: ['invoice-history', id],
    enabled: tab === 'history',
    queryFn: async () => unwrap(await api.GET('/api/v1/invoices/{id}/history', { params: { path: { id: id! } } })),
  });
  const saved = (i: Invoice) => {
    client.setQueryData(key, i);
    refreshBilling(client);
  };
  const cancel = useMutation({
    mutationFn: async ({ version, reason }: { version: number; reason: string }) =>
      unwrap(
        await api.POST('/api/v1/invoices/{id}/cancel', {
          params: { path: { id: id! } },
          body: { version, reason, ...(irnReason ? { irnCancelReason: irnReason as '1' | '2' | '3' | '4' } : {}) },
        }),
      ),
    onSuccess: (i) => {
      toast.success('Invoice cancelled');
      setDialog(null);
      saved(i);
    },
    onError: (e) => {
      setDialog(null);
      writeError(() => void q.refetch())(e);
    },
  });

  // Issuing uses the saved draft, so a discount typed but not saved would be left off the issued invoice.
  const unsaved = useDirtyScope();
  const leave = useLeaveGuard(unsaved.dirty);

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error ?? new Error('This invoice could not be loaded.')} onRetry={q.refetch} />;
  const i = q.data;
  const draft = i.status === 'DRAFT';
  const open = OPEN.includes(i.status);
  const issued = open || i.status === 'PAID';
  const canEdit = can('invoices.edit');
  const canPay = can('payments.edit');
  const canRemind = can('reminders.send');
  // A registered IRN can be cancelled with the invoice only within 24 hours; after that, a credit note.
  const irnActive = i.einvoice?.status === 'GENERATED';
  const irnLocked = irnActive && !i.einvoice?.cancellableUntil;
  // A B2B invoice goes to the customer only once it has its IRN.
  const sendable = !i.einvoiceRequired || irnActive;

  return (
    <>
      {leave.dialog}
      <PageHeader
        breadcrumb={
          <Link to="/invoices?tab=all" className="underline">
            Invoices
          </Link>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {i.invoiceNo ?? (draft ? 'Draft invoice' : 'Invoice without a number')} <StatusBadge status={i.status} />
            {i.overdue && (
              <Badge tone="red">
                Overdue by {i.daysOverdue} {i.daysOverdue === 1 ? 'day' : 'days'}
              </Badge>
            )}
          </span>
        }
        description={
          can('customers.view') ? (
            <Link to={`/customers/${i.customerId}`} className="underline">
              {i.customerName} ({i.crn})
            </Link>
          ) : (
            `${i.customerName} (${i.crn})`
          )
        }
        actions={
          <>
            <DocumentButton kind="invoice-pdf" params={{ invoiceId: i.id }}>
              PDF
            </DocumentButton>
            {issued && canEdit && sendable && (
              <Button variant="secondary" onClick={() => setDialog('email')}>
                Email
              </Button>
            )}
            {issued && sendable && <WhatsappButton kind="invoice" entityId={i.id} title={i.invoiceNo ?? 'invoice'} />}
            {open && canRemind && (
              <Button variant="secondary" onClick={() => setDialog('remind')}>
                Send reminder
              </Button>
            )}
            {open && <WhatsappButton kind="reminder" entityId={i.id} title={`a reminder for ${i.invoiceNo}`} label="Remind on WhatsApp" />}
            {issued && canPay && (
              <Button variant="secondary" onClick={() => setDialog('credit')}>
                Credit note
              </Button>
            )}
            {(draft || issued) && canEdit && i.status !== 'PAID' && !irnLocked && (
              <Button
                variant="secondary"
                onClick={() => {
                  setIrnReason('');
                  setDialog('cancel');
                }}
              >
                Cancel invoice
              </Button>
            )}
            {open && canPay && <Button onClick={() => setDialog('pay')}>Record payment</Button>}
            {draft && canEdit && (
              <Button disabled={unsaved.dirty} title={unsaved.dirty ? 'Save the draft first' : undefined} onClick={() => setDialog('issue')}>
                Issue
              </Button>
            )}
          </>
        }
      />
      {i.cancelReason && (
        <p role="status" className="mb-3 rounded-md border border-gray-300 bg-gray-50 p-3 text-[13px] text-gray-900">
          Cancelled: {i.cancelReason}
        </p>
      )}
      <EInvoicePanel invoice={i} canEdit={canEdit} onSaved={saved} />
      <Card className="mb-3 p-4">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Fact label="Invoice date">{formatDate(i.invoiceDate)}</Fact>
          <Fact label="Due date">{formatDate(i.dueDate)}</Fact>
          <Fact label="Place of supply">
            {i.placeOfSupply} ({i.placeOfSupplyCode})
          </Fact>
          <Fact label="Grand total">
            <Money value={i.grandTotal} />
          </Fact>
          <Fact label="Paid">
            <Money value={i.paidAmount} />
          </Fact>
          <Fact label="Credited">
            <Money value={i.creditedAmount} />
          </Fact>
          <Fact label="Balance">
            <span className="font-semibold">
              <Money value={i.balance} />
            </span>
          </Fact>
        </dl>
      </Card>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">Payments ({i.allocations.length})</TabsTrigger>
          <TabsTrigger value="credit">Credit notes ({i.creditNotes.length})</TabsTrigger>
          <TabsTrigger value="reminders">Reminders ({i.reminders.length})</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-3">
          {draft && canEdit && (
            <Card>
              <CardHeader title="Draft" description="Totals are worked out by the server each time you save." />
              <DirtyScope value={unsaved.report}>
                <DraftForm key={i.id} invoice={i} onSaved={saved} onConflict={() => void q.refetch()} />
              </DirtyScope>
              {unsaved.dirty && (
                <p role="status" className="px-4 pb-4 text-[13px] text-gray-800">
                  Save the draft before issuing it.
                </p>
              )}
            </Card>
          )}
          <Card>
            <Lines invoice={i} canChangeRate={draft && canEdit} onChangeRate={setRating} />
            <div className="border-t border-gray-200 p-4">
              <Totals invoice={i} />
            </div>
          </Card>
          {i.notes && !draft && (
            <Card className="p-4 text-[13px] text-gray-900">
              <h2 className="text-xs font-medium text-gray-600">Notes</h2>
              {i.notes}
            </Card>
          )}
        </TabsContent>
        <TabsContent value="payments">
          <Card>
            {i.allocations.length ? (
              <PlainTable label="Payments on this invoice" heads={['Receipt', 'Date', 'Mode', 'Reference', 'Amount']}>
                {i.allocations.map((a) => (
                  <tr key={a.id}>
                    <td className={td}>{a.paymentNo}</td>
                    <td className={td}>{formatDate(a.paidOn)}</td>
                    <td className={td}>{a.mode}</td>
                    <td className={td}>{a.reference ?? '—'}</td>
                    <td className={td}>
                      <Money value={a.amount} />
                    </td>
                  </tr>
                ))}
              </PlainTable>
            ) : (
              <EmptyState title="No payments yet" />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="credit">
          <Card>
            {i.creditNotes.length ? (
              <PlainTable
                label="Credit notes"
                heads={[
                  'Credit note',
                  'Date',
                  'Reason',
                  'Taxable',
                  'CGST',
                  'SGST',
                  'IGST',
                  'Round-off',
                  'Total',
                  'In words',
                  ...(i.einvoiceRequired || i.creditNotes.some((c) => c.einvoice) ? ['E-invoice'] : []),
                  'PDF',
                ]}
              >
                {i.creditNotes.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.creditNoteNo}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(c.issuedOn)}</td>
                    <td className={td}>{c.reason}</td>
                    {[c.taxableAmount, c.cgst, c.sgst, c.igst, c.roundOff, c.total].map((value, n) => (
                      <td key={n} className={td}>
                        <Money value={value} />
                      </td>
                    ))}
                    <td className={td}>{c.amountInWords}</td>
                    {(i.einvoiceRequired || i.creditNotes.some((x) => x.einvoice)) && (
                      <td className={td}>
                        <CreditNoteIrn note={c} canRetry={canEdit || canPay} onSaved={saved} />
                      </td>
                    )}
                    <td className={td}>
                      <DocumentButton size="sm" kind="credit-note-pdf" params={{ creditNoteId: c.id }} aria-label={`PDF of ${c.creditNoteNo}`}>
                        PDF
                      </DocumentButton>
                    </td>
                  </tr>
                ))}
              </PlainTable>
            ) : (
              <EmptyState title="No credit notes" />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="reminders">
          <Card>
            {i.reminders.length ? (
              <PlainTable label="Reminders" heads={['Sent', 'Kind']}>
                {i.reminders.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{formatDateTime(r.at)}</td>
                    <td className={td}>{humanize(r.kind)}</td>
                  </tr>
                ))}
              </PlainTable>
            ) : (
              <EmptyState title="No reminders sent" />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="delivery">
          <Card className="p-4">
            <EmailLogTable rows={emails.data} loading={emails.isLoading} error={emails.error} onRetry={emails.refetch} />
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card className="p-4">
            {history.isLoading && <Spinner />}
            {history.error && <ErrorState error={history.error} onRetry={history.refetch} />}
            {history.data && <HistoryList entries={history.data} />}
          </Card>
        </TabsContent>
      </Tabs>
      <RateDialog invoice={i} line={rating} onClose={() => setRating(null)} onSaved={saved} />
      <IssueDialog invoice={i} open={dialog === 'issue'} onOpenChange={(o) => setDialog(o ? 'issue' : null)} onSaved={saved} onConflict={() => void q.refetch()} />
      <EmailDialog invoice={i} open={dialog === 'email'} onOpenChange={(o) => setDialog(o ? 'email' : null)} onSent={() => refreshBilling(client)} />
      <CreditNoteDialog invoice={i} open={dialog === 'credit'} onOpenChange={(o) => setDialog(o ? 'credit' : null)} onSaved={saved} />
      <RecordPaymentDialog open={dialog === 'pay'} onOpenChange={(o) => setDialog(o ? 'pay' : null)} invoice={i} />
      <ReminderDialog invoice={dialog === 'remind' ? i : null} onClose={() => setDialog(null)} />
      <ReasonDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => setDialog(o ? 'cancel' : null)}
        title={`Cancel ${i.invoiceNo ?? 'this draft invoice'}`}
        description="This cannot be undone. An invoice with payments or credit notes must have them reversed first."
        confirmLabel="Cancel invoice"
        danger
        loading={cancel.isPending}
        onConfirm={(reason) => {
          if (irnActive && !irnReason) return toast.error('Choose why the IRN is being cancelled');
          cancel.mutate({ version: i.version, reason });
        }}
      >
        {irnActive && (
          <Field label="Reason for the GST portal" htmlFor="irn-reason" hint="The IRN is cancelled at the GST portal first. The invoice number cannot be used again.">
            <Select id="irn-reason" required value={irnReason} onChange={(e) => setIrnReason(e.target.value)}>
              <option value="">Choose…</option>
              {IRN_CANCEL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </ReasonDialog>
    </>
  );
}
