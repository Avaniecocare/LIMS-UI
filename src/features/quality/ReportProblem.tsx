import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/app/providers';
import { Badge, Button, Card, CardHeader, Dialog, Field, Input, Select, Spinner, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { toastError } from '@/lib/forms';

const SOURCES = ['Routine work', 'Complaint', 'Customer feedback', 'Other'];
const canRaise = (can: (...p: string[]) => boolean) => can('quality.view', 'tests.work', 'jobs.view');

/**
 * "Report a problem": anyone at the bench or the front desk raises a non-conformance in a few words, with the
 * record it concerns filled in. The quality team takes it from there; the person sees its progress on their account.
 */
export function ReportProblemButton({ reference, context }: { reference: string; context: string }) {
  const { can, moduleOn } = useSession();
  const [open, setOpen] = useState(false);
  if (!moduleOn('quality') || !canRaise(can)) return null;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <TriangleAlert aria-hidden />
        Report a problem
      </Button>
      {open && <ReportProblemDialog reference={reference} context={context} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportProblemDialog({ reference, context, onClose }: { reference: string; context: string; onClose: () => void }) {
  const client = useQueryClient();
  const [v, setV] = useState({ title: '', description: '', severity: 'MINOR', source: 'Routine work', reference });
  const m = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/api/v1/quality/nc', { body: { source: v.source as 'Other', title: v.title, description: v.description, severity: v.severity as 'MINOR', reference: v.reference || null } }),
      ),
    onSuccess: (nc) => {
      void client.invalidateQueries({ queryKey: ['my-problems'] });
      toast.success(`Reported as ${nc.ncNo}. The quality team will take it from here.`);
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Report a problem"
      description={`Something wrong with ${context}: equipment, a reagent, the sample, the method, or anything else. It goes to the quality team as a non-conformance.`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="In a few words" htmlFor="rp-title" className="sm:col-span-2">
          <Input id="rp-title" maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="e.g. Balance reading drifts during weighing" />
        </Field>
        <Field label="What happened" htmlFor="rp-desc" className="sm:col-span-2" hint="What you saw, when, and anything you did about it">
          <Textarea id="rp-desc" rows={4} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <Field label="How serious" htmlFor="rp-sev">
          <Select id="rp-sev" value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value })}>
            <option value="MINOR">Minor: worth fixing</option>
            <option value="MAJOR">Major: results may be affected</option>
            <option value="CRITICAL">Critical: stop and check now</option>
          </Select>
        </Field>
        <Field label="Where it came from" htmlFor="rp-source">
          <Select id="rp-source" value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })}>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Concerns" htmlFor="rp-ref" className="sm:col-span-2">
          <Input id="rp-ref" maxLength={100} value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.title.trim() || !v.description.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Report
        </Button>
      </div>
    </Dialog>
  );
}

const STATUS: Record<string, { label: string; tone: 'red' | 'amber' | 'blue' | 'green' }> = {
  OPEN: { label: 'Received', tone: 'amber' },
  ACTION: { label: 'Being fixed', tone: 'blue' },
  VERIFICATION: { label: 'Being checked', tone: 'blue' },
  CLOSED: { label: 'Closed', tone: 'green' },
};

/** On the account page: the problems this person reported, and how far each has got. */
export function MyProblemsCard() {
  const { can, moduleOn } = useSession();
  const enabled = moduleOn('quality') && canRaise(can);
  const q = useQuery({ queryKey: ['my-problems'], enabled, queryFn: async () => unwrap(await api.GET('/api/v1/quality/nc/mine')) });
  if (!enabled) return null;
  return (
    <Card className="md:col-span-2">
      <CardHeader title="Problems I reported" description="Raised with Report a problem on a test or job page." />
      <div className="p-4">
        {q.isLoading && <Spinner />}
        {q.data?.length === 0 && <p className="text-[13px] text-gray-600">Nothing reported.</p>}
        <ul className="divide-y divide-gray-100 text-[13px]">
          {q.data?.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span>
                <span className="font-medium">{n.ncNo}</span> {n.title}
                <span className="block text-xs text-gray-600">
                  {formatDate(n.createdAt)}
                  {n.reference ? ` · ${n.reference}` : ''}
                </span>
              </span>
              <Badge tone={STATUS[n.status].tone}>{STATUS[n.status].label}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
