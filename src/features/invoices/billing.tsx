import { zodResolver } from '@hookform/resolvers/zod';
import { useCanWhatsapp, WhatsappDialog } from '@/features/whatsapp/WhatsappSend';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, type FieldValues, type Path, type UseFormRegister } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { CustomerPicker } from '@/components/pickers';
import { Button, ConfirmDialog, Dialog, ErrorState, Field, Input, Select, Spinner } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { formatDate, formatINR, humanize, todayIso } from '@/lib/format';
import { applyServerErrors, toastError } from '@/lib/forms';

export type InvoiceSummary = components['schemas']['InvoiceSummaryDto'];
export type Payment = components['schemas']['PaymentDto'];

export const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH', 'CARD', 'OTHER'] as const;

/** Format check only; the amount itself is the server's to judge. */
export const AMOUNT = /^\d+(\.\d{1,2})?$/;
const amount = z.string().trim().regex(AMOUNT, 'Enter an amount, such as 1250.50');
const optionalAmount = z.string().trim().regex(/^$|^\d+(\.\d{1,2})?$/, 'Enter an amount, such as 1250.50');

export function refreshBilling(client: QueryClient) {
  for (const key of ['invoice', 'invoices', 'invoices-ready', 'invoice-history', 'invoice-emails', 'due-invoices', 'due-summary', 'due-open', 'payments', 'dashboard']) client.invalidateQueries({ queryKey: [key] });
}

export function Money({ value }: { value: string | number | null | undefined }) {
  return <span className="whitespace-nowrap tabular-nums">{formatINR(value)}</span>;
}

function dueOpenQuery(customerId: string) {
  return { queryKey: ['due-open', customerId], enabled: !!customerId, queryFn: async () => unwrap(await api.GET('/api/v1/invoices/due', { params: { query: { customerId, pageSize: 200, sort: 'dueDate', order: 'asc' as const } } })).data };
}

/** The customer's open invoices with an amount box for each. All totals stay on the server. */
function AllocationTable<T extends FieldValues>({ customerId, register, error }: { customerId: string; register: UseFormRegister<T>; error?: string }) {
  const q = useQuery(dueOpenQuery(customerId));
  if (q.isLoading) return <Spinner label="Loading open invoices" />;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data?.length) return <p className="text-[13px] text-gray-700">This customer has no open invoices.</p>;
  return (
    <div>
      <div className="max-h-56 overflow-auto rounded-md border border-gray-200">
        <table className="w-full text-[13px]" aria-label="Allocate to open invoices">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-700">
            <tr>
              {['Invoice', 'Due', 'Balance', 'Allocate'].map((h) => (
                <th key={h} scope="col" className="px-2 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.data.map((i) => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className="px-2 py-1">{i.invoiceNo}</td>
                <td className="px-2 py-1 whitespace-nowrap">{formatDate(i.dueDate)}</td>
                <td className="px-2 py-1">
                  <Money value={i.balance} />
                </td>
                <td className="w-32 px-2 py-1">
                  <Input className="h-8 tabular-nums" inputMode="decimal" autoComplete="off" aria-label={`Allocate to ${i.invoiceNo}`} {...register(`allocations.${i.id}` as Path<T>)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const toAllocations = (values: Record<string, string> | undefined) =>
  Object.entries(values ?? {})
    .filter(([, v]) => v.trim() !== '')
    .map(([invoiceId, v]) => ({ invoiceId, amount: v.trim() }));

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  paidOn: z.string().min(1, 'Enter the date'),
  mode: z.enum(PAYMENT_MODES),
  reference: z.string(),
  amount,
  notes: z.string(),
  allocations: z.record(z.string(), optionalAmount),
});
type PaymentValues = z.infer<typeof paymentSchema>;

/** Records a payment. Opened from an invoice, it starts with that invoice's balance allocated. */
export function RecordPaymentDialog({ open, onOpenChange, invoice, customerId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; invoice?: { id: string; customerId: string; balance: string } | null; customerId?: string; onSaved?: () => void }) {
  const client = useQueryClient();
  const fixedCustomer = invoice?.customerId ?? customerId ?? '';
  const form = useForm<PaymentValues>({ resolver: zodResolver(paymentSchema), defaultValues: { customerId: '', paidOn: '', mode: 'NEFT', reference: '', amount: '', notes: '', allocations: {} } });
  useEffect(() => {
    if (open) form.reset({ customerId: fixedCustomer, paidOn: todayIso(), mode: 'NEFT', reference: '', amount: invoice?.balance ?? '', notes: '', allocations: invoice ? { [invoice.id]: invoice.balance } : {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [open, invoice?.id, fixedCustomer]);
  const chosen = form.watch('customerId');
  const e = form.formState.errors;
  const m = useMutation({
    mutationFn: async (v: PaymentValues) => unwrap(await api.POST('/api/v1/payments', { body: { customerId: v.customerId, paidOn: v.paidOn, mode: v.mode, reference: v.reference.trim() || null, amount: v.amount.trim(), notes: v.notes.trim() || null, allocations: toAllocations(v.allocations) } })),
    onSuccess: (p) => {
      toast.success(`Payment ${p.paymentNo} recorded${Number(p.unapplied) > 0 ? `, ${formatINR(p.unapplied)} kept as an advance` : ''}`);
      refreshBilling(client);
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error) => applyServerErrors(error, form.setError, ['customerId', 'paidOn', 'mode', 'reference', 'amount', 'allocations']),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Record payment" wide>
      <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
          {!fixedCustomer && (
            <Field label="Customer" htmlFor="pay-customer" required error={e.customerId?.message} className="md:col-span-3">
              <CustomerPicker allowCreate={false} id="pay-customer" value={chosen} invalid={!!e.customerId} onChange={(v) => form.setValue('customerId', v, { shouldValidate: true })} />
            </Field>
          )}
          <Field label="Date" htmlFor="pay-date" required error={e.paidOn?.message}>
            <Input id="pay-date" type="date" aria-invalid={!!e.paidOn} {...form.register('paidOn')} />
          </Field>
          <Field label="Mode" htmlFor="pay-mode" required error={e.mode?.message}>
            <Select id="pay-mode" {...form.register('mode')}>
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.length <= 4 && mode !== 'CASH' && mode !== 'CARD' ? mode : humanize(mode)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference" htmlFor="pay-ref" error={e.reference?.message} hint="Cheque, UTR or transaction number.">
            <Input id="pay-ref" {...form.register('reference')} />
          </Field>
          <Field label="Amount" htmlFor="pay-amount" required error={e.amount?.message}>
            <Input id="pay-amount" className="tabular-nums" inputMode="decimal" autoComplete="off" aria-invalid={!!e.amount} {...form.register('amount')} />
          </Field>
          <Field label="Notes" htmlFor="pay-notes" className="md:col-span-2">
            <Input id="pay-notes" {...form.register('notes')} />
          </Field>
        </div>
        {chosen && (
          <section className="space-y-1.5" aria-label="Allocation">
            <h3 className="text-[13px] font-semibold text-gray-900">Allocate to invoices</h3>
            <p className="text-xs text-gray-700">Anything you do not allocate stays on account as an advance, which you can apply later.</p>
            <AllocationTable customerId={chosen} register={form.register} error={(e.allocations as { message?: string } | undefined)?.message ?? (e.allocations && 'Enter amounts such as 1250.50') ?? undefined} />
          </section>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={m.isPending}>
            Record payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const applySchema = z.object({ allocations: z.record(z.string(), optionalAmount) });
type ApplyValues = z.infer<typeof applySchema>;

/** Puts money held on account against invoices. */
export function ApplyAdvanceDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const client = useQueryClient();
  const form = useForm<ApplyValues>({ resolver: zodResolver(applySchema), defaultValues: { allocations: {} } });
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (payment) {
      form.reset({ allocations: {} });
      setProblem(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the form when the dialog opens
  }, [payment?.id]);
  const m = useMutation({
    mutationFn: async (v: ApplyValues) => unwrap(await api.POST('/api/v1/payments/{id}/apply', { params: { path: { id: payment!.id } }, body: { allocations: toAllocations(v.allocations) } })),
    onSuccess: (p) => {
      toast.success(`Advance applied, ${formatINR(p.unapplied)} left on account`);
      refreshBilling(client);
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) setProblem(error.message);
      else toastError(error);
    },
  });
  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()} title={`Apply advance from ${payment?.paymentNo ?? ''}`} description={payment ? `${formatINR(payment.unapplied)} is on account for ${payment.customerName}.` : undefined} wide>
      {payment && (
        <form
          className="space-y-3"
          noValidate
          onSubmit={form.handleSubmit((v) => {
            if (toAllocations(v.allocations).length) m.mutate(v);
            else setProblem('Enter an amount against at least one invoice.');
          })}
        >
          <AllocationTable customerId={payment.customerId} register={form.register} error={form.formState.errors.allocations ? 'Enter amounts such as 1250.50' : undefined} />
          {problem && (
            <p role="alert" className="text-[13px] text-red-800">
              {problem}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={m.isPending}>
              Apply advance
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Sends a logged reminder to the customer's contact. */
export function ReminderDialog({ invoice, onClose }: { invoice: { id: string; invoiceNo: string | null; customerName: string } | null; onClose: () => void }) {
  const client = useQueryClient();
  const [to, setTo] = useState('');
  const [whatsappFor, setWhatsappFor] = useState<{ id: string; invoiceNo: string | null } | null>(null);
  const whatsapp = useCanWhatsapp('reminder');
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/invoices/{id}/remind', { params: { path: { id: invoice!.id } }, body: to.trim() ? { to: to.trim() } : {} })),
    onSuccess: () => {
      toast.success('Reminder sent');
      refreshBilling(client);
      onClose();
    },
    onError: (error) => {
      onClose();
      toastError(error);
    },
  });
  if (whatsappFor) return <WhatsappDialog kind="reminder" entityId={whatsappFor.id} title={`a reminder for ${whatsappFor.invoiceNo ?? 'this invoice'}`} onClose={() => setWhatsappFor(null)} />;
  return (
    <ConfirmDialog open={!!invoice} onOpenChange={(o) => !o && onClose()} title={`Send a reminder for ${invoice?.invoiceNo ?? ''}?`} description={`${invoice?.customerName ?? 'The customer'}'s contact receives it by email, and it is logged on the invoice.`} confirmLabel="Send reminder" loading={m.isPending} onConfirm={() => m.mutate()} >
      <Field label="Send to" htmlFor="reminder-to" hint="Leave empty to use the customer's contact email.">
        <Input id="reminder-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      {whatsapp && invoice && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => {
            setWhatsappFor(invoice);
            onClose();
          }}
        >
          Send it on WhatsApp instead
        </Button>
      )}
    </ConfirmDialog>
  );
}

/** Whether this user may record money or send reminders on an invoice in this state. */
export function useBillingActions() {
  const { can } = useSession();
  return { canPay: can('payments.edit'), canRemind: can('reminders.send'), canEdit: can('invoices.edit') };
}

