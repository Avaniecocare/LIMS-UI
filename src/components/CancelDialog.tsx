import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared';
import { Button, Dialog, ErrorState, Field, Spinner, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { isConflict, toastError } from '@/lib/forms';

export type CancelTarget = {
  type: 'job' | 'sample' | 'test';
  id: string;
  /** Name shown in the dialog title. */
  label: string;
  /** The version the user saw. A test on a job page has none in its row, so it is looked up on opening. */
  version?: number;
};

function Effect({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900">
        {title} ({count})
      </h3>
      <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-[13px] text-gray-800">{children}</ul>
    </section>
  );
}

/** Shows everything a cancellation touches first; only then asks for the reason and confirmation. */
export function CancelDialog({ target, onClose, onCancelled }: { target: CancelTarget | null; onClose: () => void; onCancelled?: () => void }) {
  const client = useQueryClient();
  const open = !!target;
  const [step, setStep] = useState<'effect' | 'reason'>('effect');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) {
      setStep('effect');
      setReason('');
    }
  }, [open, target?.id]);

  const impact = useQuery({
    queryKey: ['cancel-preview', target?.type, target?.id],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => unwrap(await api.POST('/api/v1/cancellations/preview', { body: { type: target!.type, id: target!.id } })),
  });
  const version = useQuery({
    queryKey: ['cancel-version', target?.id],
    enabled: open && target?.type === 'test' && target.version === undefined,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => unwrap(await api.GET('/api/v1/tests/{id}', { params: { path: { id: target!.id } } })).version,
  });
  const currentVersion = target?.version ?? version.data;

  const refresh = () => {
    for (const k of ['job', 'jobs', 'samples', 'planning', 'planning-workload', 'test', 'my-tests', 'test-approvals', 'reports', 'report']) client.invalidateQueries({ queryKey: [k] });
  };
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/cancellations', { body: { type: target!.type, id: target!.id, version: currentVersion!, reason: reason.trim() } })),
    onSuccess: () => {
      toast.success(`${target?.label} cancelled`);
      refresh();
      onCancelled?.();
      onClose();
    },
    onError: (error) => {
      if (isConflict(error)) {
        toast.error('This record was changed by someone else. The latest version has been loaded; check the effect again.');
        refresh();
        onClose();
      } else {
        toastError(error);
      }
    },
  });

  const d = impact.data;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={`Cancel ${target?.label ?? ''}`} description={step === 'effect' ? 'Check what this affects before going on.' : 'This cannot be undone.'} wide>
      {impact.isLoading && <Spinner label="Working out the effect" />}
      {impact.error && <ErrorState error={impact.error} onRetry={impact.refetch} />}
      {version.error && <ErrorState error={version.error} onRetry={version.refetch} />}
      {d && step === 'effect' && (
        <div className="space-y-4">
          {d.blockers.length > 0 && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-[13px] text-red-900">
              <p className="font-semibold">This cannot be cancelled</p>
              <ul className="mt-1 list-disc pl-5">
                {d.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Effect title="Samples" count={d.samples.length}>
              {d.samples.map((s) => (
                <li key={s.id}>{s.sampleNo}</li>
              ))}
            </Effect>
            <Effect title="Tests" count={d.tests.length}>
              {d.tests.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-1.5">
                  {t.sampleNo} · {t.testName} <StatusBadge status={t.status} />
                </li>
              ))}
            </Effect>
            <Effect title="Reports" count={d.reports.length}>
              {d.reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-1.5">
                  {r.reportNo} <StatusBadge status={r.status} />
                </li>
              ))}
            </Effect>
            <Effect title="Lines on draft invoices" count={d.draftInvoiceLines.length}>
              {d.draftInvoiceLines.map((l, i) => (
                <li key={`${l.invoiceId}-${i}`}>{l.description}</li>
              ))}
            </Effect>
            <Effect title="Lines on issued invoices" count={d.issuedInvoiceLines.length}>
              {d.issuedInvoiceLines.map((l, i) => (
                <li key={`${l.invoiceId}-${i}`}>
                  {l.invoiceNo ?? 'Invoice'}: {l.description}
                </li>
              ))}
            </Effect>
          </div>
          {d.canCancel && d.samples.length + d.tests.length + d.reports.length + d.draftInvoiceLines.length + d.issuedInvoiceLines.length === 0 && <p className="text-[13px] text-gray-700">Nothing else is affected.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Keep it
            </Button>
            <Button variant="danger" disabled={!d.canCancel || currentVersion === undefined} onClick={() => setStep('reason')}>
              Continue
            </Button>
          </div>
        </div>
      )}
      {d && step === 'reason' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim()) m.mutate();
          }}
        >
          <Field label="Reason for cancelling" htmlFor="cancel-reason" required>
            <Textarea id="cancel-reason" autoFocus required value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep('effect')}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Keep it
              </Button>
              <Button type="submit" variant="danger" disabled={!reason.trim()} loading={m.isPending}>
                Confirm cancellation
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
