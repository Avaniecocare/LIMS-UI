import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { Badge, Button, Card } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';

type Invoice = components['schemas']['InvoiceDto'];
type EInvoice = components['schemas']['EInvoiceDto'];

/** The IRP's cancellation reasons, in its own order and codes. */
export const IRN_CANCEL_REASONS = [
  { value: '1', label: 'Duplicate' },
  { value: '2', label: 'Data entry mistake' },
  { value: '3', label: 'Order cancelled' },
  { value: '4', label: 'Other' },
] as const;

export function EInvoiceBadge({ e }: { e: EInvoice | null | undefined }) {
  if (!e) return <Badge tone="gray">Not registered</Badge>;
  if (e.status === 'GENERATED') return <Badge tone={e.test ? 'amber' : 'green'}>{e.test ? 'Test IRN' : 'IRN registered'}</Badge>;
  if (e.status === 'FAILED') return <Badge tone="red">Not registered</Badge>;
  if (e.status === 'CANCELLED') return <Badge tone="gray">IRN cancelled</Badge>;
  return <Badge tone="blue">Registering</Badge>;
}

/**
 * The invoice's GST e-invoice: shown when the invoice must carry an IRN (e-invoicing is on and the customer has a
 * GSTIN), or once it has one. What the customer's copy prints, a failure in plain words with a retry, and how long
 * the IRN can still be cancelled.
 */
export function EInvoicePanel({ invoice: i, canEdit, onSaved }: { invoice: Invoice; canEdit: boolean; onSaved: (i: Invoice) => void }) {
  const e = i.einvoice;
  const register = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/invoices/{id}/einvoice', { params: { path: { id: i.id } } })),
    onSuccess: (next) => {
      onSaved(next);
      if (next.einvoice?.status === 'GENERATED') toast.success('Registered at the GST portal');
      else toast.error('The GST portal did not register it', { description: next.einvoice?.lastError ?? undefined });
    },
    onError: toastError,
  });
  if (!i.einvoiceRequired && !e) return null;
  const tone = e?.status === 'GENERATED' ? 'border-green-200' : e?.status === 'FAILED' ? 'border-red-200' : 'border-gray-200';

  return (
    <Card role="region" className={`mb-3 p-4 ${tone}`} aria-labelledby="einvoice-title">
      <div className="flex flex-wrap items-start gap-4">
        {e?.status === 'GENERATED' && e.qrDataUri && <img src={e.qrDataUri} alt="Signed QR code of the e-invoice" className="size-28 shrink-0 rounded border border-gray-200 bg-white p-1" />}
        <div className="min-w-0 flex-1 space-y-2 text-[13px]">
          <h2 id="einvoice-title" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
            {e?.status === 'GENERATED' ? (
              <CheckCircle2 className="size-4 text-green-700" aria-hidden />
            ) : e?.status === 'FAILED' ? (
              <XCircle className="size-4 text-red-700" aria-hidden />
            ) : e?.status === 'PENDING' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <AlertTriangle className="size-4 text-amber-700" aria-hidden />
            )}
            GST e-invoice
            <EInvoiceBadge e={e} />
          </h2>

          {e?.status === 'GENERATED' && (
            <>
              {e.test && (
                <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                  A test IRN{e.provider === 'mock' ? ' made on this server' : ' from the GST sandbox'}. It is not valid for GST; the PDF says so.
                </p>
              )}
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-gray-600">IRN</dt>
                <dd className="flex min-w-0 items-center gap-1">
                  <code className="min-w-0 font-mono text-xs break-all">{e.irn}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy IRN"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(e.irn ?? '')
                        .then(() => toast.success('IRN copied'))
                        .catch(() => undefined)
                    }
                  >
                    <Copy aria-hidden />
                  </Button>
                </dd>
                <dt className="text-gray-600">Ack no.</dt>
                <dd>{e.ackNo}</dd>
                <dt className="text-gray-600">Ack date</dt>
                <dd>{formatDateTime(e.ackDate)}</dd>
              </dl>
              <p className="text-xs text-gray-600">
                {e.cancellableUntil
                  ? `The IRN can be cancelled with the invoice until ${formatDateTime(e.cancellableUntil)}. After that, correct it with a credit note.`
                  : 'More than 24 hours have passed, so the IRN can no longer be cancelled. Correct this invoice with a credit note.'}
              </p>
            </>
          )}

          {e?.status === 'FAILED' && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-red-900">
              <p className="font-medium">The GST portal has not registered this invoice{e.attempts > 1 ? ` (tried ${e.attempts} times)` : ''}.</p>
              <p className="mt-0.5">{e.lastError}</p>
              <p className="mt-1 text-xs">Fix what it names (for example the customer's address in Customers), then try again. The invoice is not emailed or sent until it has its IRN.</p>
            </div>
          )}

          {e?.status === 'PENDING' && <p>Being registered at the GST portal now. Refresh in a moment.</p>}
          {e?.status === 'CANCELLED' && (
            <p>
              The IRN was cancelled at the GST portal on {formatDateTime(e.cancelledAt)}
              {e.cancelReason ? ` (${e.cancelReason})` : ''}. The number cannot be registered again.
            </p>
          )}
          {!e && <p>This invoice is to a GST-registered customer, so it must be registered at the GST portal before it is sent.</p>}
        </div>

        {canEdit && i.status !== 'CANCELLED' && (!e || e.status === 'FAILED' || e.status === 'PENDING') && (
          <Button onClick={() => register.mutate()} loading={register.isPending} className="shrink-0">
            <RefreshCw aria-hidden />
            {e ? 'Try again' : 'Register at the GST portal'}
          </Button>
        )}
      </div>
    </Card>
  );
}
