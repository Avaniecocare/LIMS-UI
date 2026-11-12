import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { useTests } from '@/components/pickers';
import { Badge, Button, Dialog, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { toastError } from '@/lib/forms';

type Equipment = components['schemas']['EquipmentRowDto'];
type Nc = components['schemas']['NcDto'];
type Authorisation = components['schemas']['AuthorisationDto'];
type Training = components['schemas']['TrainingDto'];

const today = () => new Date().toISOString().slice(0, 10);
const EQUIPMENT_TONE = { OVERDUE: 'red', DUE_SOON: 'amber', OK: 'green', NOT_SCHEDULED: 'gray' } as const;
const EQUIPMENT_LABEL = { OVERDUE: 'Overdue', DUE_SOON: 'Due soon', OK: 'In date', NOT_SCHEDULED: 'Not scheduled' } as const;
const NC_LABEL = { OPEN: 'Open', ACTION: 'Action', VERIFICATION: 'Verification', CLOSED: 'Closed' } as const;
const NC_TONE = { OPEN: 'red', ACTION: 'amber', VERIFICATION: 'blue', CLOSED: 'green' } as const;
const NC_SOURCES = ['Complaint', 'Internal audit', 'External audit', 'Proficiency testing', 'Customer feedback', 'Routine work', 'Other'];

const usePeople = () => useQuery({ queryKey: ['quality-people'], staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/quality/people')) });

/** Server field errors next to their fields; anything else as a toast. */
function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const onError = (e: unknown) => {
    if (e instanceof ApiError && e.fields.length) setErrors(Object.fromEntries(e.fields.map((f) => [f.field, f.message])));
    else toastError(e);
  };
  return { errors, setErrors, onError };
}

/**
 * Quality management for ISO/IEC 17025: equipment calibration and maintenance, who is authorised for which test,
 * training, and non-conformances with corrective action.
 */
export default function QualityPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  return (
    <>
      <PageHeader title="Quality" description="Equipment, staff competency, and non-conformance with corrective action (ISO/IEC 17025)." />
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="competency">Competency</TabsTrigger>
          <TabsTrigger value="nc">Non-conformance</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview onOpen={(t) => setParams({ tab: t })} />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="competency">
          <CompetencyTab />
        </TabsContent>
        <TabsContent value="nc">
          <NcTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Overview({ onOpen }: { onOpen: (tab: string) => void }) {
  const q = useQuery({ queryKey: ['quality-summary'], queryFn: async () => unwrap(await api.GET('/api/v1/quality/summary')) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const s = q.data;
  const tiles: { label: string; value: number; tone: 'red' | 'amber' | 'gray'; tab: string }[] = [
    { label: 'Equipment overdue', value: s.equipmentOverdue, tone: s.equipmentOverdue ? 'red' : 'gray', tab: 'equipment' },
    { label: 'Equipment due soon', value: s.equipmentDueSoon, tone: s.equipmentDueSoon ? 'amber' : 'gray', tab: 'equipment' },
    { label: 'Authorisations expiring soon', value: s.authorisationsExpiringSoon, tone: s.authorisationsExpiringSoon ? 'amber' : 'gray', tab: 'competency' },
    { label: 'Non-conformances open', value: s.ncOpen, tone: s.ncOpen ? 'amber' : 'gray', tab: 'nc' },
    { label: 'Non-conformances overdue', value: s.ncOverdue, tone: s.ncOverdue ? 'red' : 'gray', tab: 'nc' },
  ];
  const colour = { red: 'text-red-800', amber: 'text-amber-800', gray: 'text-gray-900' };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map((t) => (
        <button key={t.label} type="button" onClick={() => onOpen(t.tab)} className="rounded-lg border border-gray-200 bg-surface p-4 text-left hover:border-gray-400">
          <p className={`text-2xl font-semibold ${colour[t.tone]}`}>{t.value}</p>
          <p className="text-[13px] text-gray-700">{t.label}</p>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- equipment

function EquipmentTab() {
  const { can } = useSession();
  const q = useQuery({ queryKey: ['quality-equipment'], queryFn: async () => unwrap(await api.GET('/api/v1/quality/equipment')) });
  const [recording, setRecording] = useState<Equipment | null>(null);
  const [scheduling, setScheduling] = useState<Equipment | null>(null);
  const [history, setHistory] = useState<Equipment | null>(null);
  const manage = can('quality.manage');
  const columns = useMemo<Col<Equipment>[]>(
    () => [
      { id: 'code', header: 'Instrument', cell: ({ row }) => <span><span className="font-medium">{row.original.code}</span> {row.original.name}</span> },
      { id: 'dept', header: 'Department', cell: ({ row }) => row.original.departmentName ?? '—' },
      { id: 'cal', header: 'Calibration due', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.calibrationDueAt)}</span> },
      { id: 'maint', header: 'Maintenance due', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.maintenanceDueAt)}</span> },
      { id: 'status', header: 'Status', cell: ({ row }) => <Badge tone={EQUIPMENT_TONE[row.original.status]}>{EQUIPMENT_LABEL[row.original.status]}</Badge> },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <span className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setHistory(row.original)}>
              History
            </Button>
            {manage && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setScheduling(row.original)}>
                  Schedule
                </Button>
                <Button size="sm" variant="secondary" aria-label={`Record work on ${row.original.code}`} onClick={() => setRecording(row.original)}>
                  Record
                </Button>
              </>
            )}
          </span>
        ),
      },
    ],
    [manage],
  );
  return (
    <>
      <DataTable ariaLabel="Equipment" columns={columns} rows={q.data} loading={q.isLoading} error={q.error} onRetry={q.refetch} getRowId={(r) => r.id} emptyTitle="No instruments yet" emptyHint="Add instruments in Masters, then schedule their calibration here." />
      {recording && <RecordEventDialog instrument={recording} onClose={() => setRecording(null)} />}
      {scheduling && <ScheduleDialog instrument={scheduling} onClose={() => setScheduling(null)} />}
      {history && <HistoryDialog instrument={history} onClose={() => setHistory(null)} />}
    </>
  );
}

function RecordEventDialog({ instrument, onClose }: { instrument: Equipment; onClose: () => void }) {
  const client = useQueryClient();
  const [v, setV] = useState({ kind: 'CALIBRATION', performedOn: today(), performedBy: '', outcome: 'PASS', certificateNo: '', nextDueOn: '', notes: '' });
  const { errors, onError } = useFieldErrors();
  const m = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/api/v1/quality/equipment/{id}/events', {
          params: { path: { id: instrument.id } },
          body: { kind: v.kind as 'CALIBRATION', performedOn: v.performedOn, performedBy: v.performedBy, outcome: v.outcome as 'PASS', certificateNo: v.certificateNo || null, nextDueOn: v.nextDueOn || null, notes: v.notes || null },
        }),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['quality-equipment'] });
      void client.invalidateQueries({ queryKey: ['quality-summary'] });
      toast.success('Recorded. The due dates are updated.');
      onClose();
    },
    onError,
  });
  const interval = v.kind === 'CALIBRATION' ? instrument.calibrationIntervalMonths : v.kind === 'MAINTENANCE' ? instrument.maintenanceIntervalMonths : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Record work on ${instrument.code}`} description={instrument.name}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="What was done" htmlFor="ev-kind">
          <Select id="ev-kind" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
            <option value="CALIBRATION">Calibration</option>
            <option value="INTERMEDIATE_CHECK">Intermediate check</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="REPAIR">Repair</option>
            <option value="BREAKDOWN">Breakdown</option>
          </Select>
        </Field>
        <Field label="Outcome" htmlFor="ev-outcome">
          <Select id="ev-outcome" value={v.outcome} onChange={(e) => setV({ ...v, outcome: e.target.value })}>
            <option value="PASS">Pass</option>
            <option value="ADJUSTED">Adjusted, then passed</option>
            <option value="FAIL">Fail</option>
          </Select>
        </Field>
        <Field label="Date done" htmlFor="ev-date" error={errors.performedOn}>
          <Input id="ev-date" type="date" max={today()} value={v.performedOn} onChange={(e) => setV({ ...v, performedOn: e.target.value })} />
        </Field>
        <Field label="Done by" htmlFor="ev-by" hint="Agency or person" error={errors.performedBy}>
          <Input id="ev-by" value={v.performedBy} onChange={(e) => setV({ ...v, performedBy: e.target.value })} />
        </Field>
        <Field label="Certificate no." htmlFor="ev-cert">
          <Input id="ev-cert" value={v.certificateNo} onChange={(e) => setV({ ...v, certificateNo: e.target.value })} />
        </Field>
        <Field label="Next due" htmlFor="ev-next" hint={interval ? `Empty: ${interval} months from the date done` : 'Optional'} error={errors.nextDueOn}>
          <Input id="ev-next" type="date" value={v.nextDueOn} onChange={(e) => setV({ ...v, nextDueOn: e.target.value })} />
        </Field>
        <Field label="Notes" htmlFor="ev-notes" className="sm:col-span-2">
          <Textarea id="ev-notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </Field>
      </div>
      {v.outcome === 'FAIL' && v.kind === 'CALIBRATION' && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-900">A failed calibration makes the instrument due today, so it shows as overdue until it passes again.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.performedBy.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Record
        </Button>
      </div>
    </Dialog>
  );
}

function ScheduleDialog({ instrument, onClose }: { instrument: Equipment; onClose: () => void }) {
  const client = useQueryClient();
  const [cal, setCal] = useState(instrument.calibrationIntervalMonths?.toString() ?? '');
  const [maint, setMaint] = useState(instrument.maintenanceIntervalMonths?.toString() ?? '');
  const [maintDue, setMaintDue] = useState(instrument.maintenanceDueAt ? String(instrument.maintenanceDueAt).slice(0, 10) : '');
  const m = useMutation({
    mutationFn: async () => unwrap(await api.PATCH('/api/v1/quality/equipment/{id}/schedule', { params: { path: { id: instrument.id } }, body: { version: instrument.version, calibrationIntervalMonths: cal ? Number(cal) : null, maintenanceIntervalMonths: maint ? Number(maint) : null, maintenanceDueAt: maintDue || null } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['quality-equipment'] });
      toast.success('Schedule saved');
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Schedule for ${instrument.code}`} description="Intervals set the next due date each time the work is recorded. The calibration due date itself is set by recording a calibration, or in Masters.">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        <Field label="Calibrate every (months)" htmlFor="sc-cal">
          <Input id="sc-cal" type="number" min={1} max={120} value={cal} onChange={(e) => setCal(e.target.value)} />
        </Field>
        <Field label="Maintain every (months)" htmlFor="sc-maint">
          <Input id="sc-maint" type="number" min={1} max={120} value={maint} onChange={(e) => setMaint(e.target.value)} />
        </Field>
        <Field label="Next maintenance" htmlFor="sc-due">
          <Input id="sc-due" type="date" value={maintDue} onChange={(e) => setMaintDue(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={m.isPending} onClick={() => m.mutate()}>
          Save schedule
        </Button>
      </div>
    </Dialog>
  );
}

function HistoryDialog({ instrument, onClose }: { instrument: Equipment; onClose: () => void }) {
  const q = useQuery({ queryKey: ['equipment-events', instrument.id], queryFn: async () => unwrap(await api.GET('/api/v1/quality/equipment/{id}/events', { params: { path: { id: instrument.id } } })) });
  const label: Record<string, string> = { CALIBRATION: 'Calibration', INTERMEDIATE_CHECK: 'Intermediate check', MAINTENANCE: 'Maintenance', REPAIR: 'Repair', BREAKDOWN: 'Breakdown' };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`History of ${instrument.code}`} description={instrument.name} wide>
      {q.isLoading && <Spinner />}
      {q.data && q.data.length === 0 && <p className="text-[13px] text-gray-600">Nothing recorded yet.</p>}
      <ul className="divide-y divide-gray-100 text-[13px]">
        {q.data?.map((e) => (
          <li key={e.id} className="py-2">
            <p className="font-medium text-gray-900">
              {label[e.kind]} on {formatDate(e.performedOn)} <Badge tone={e.outcome === 'FAIL' ? 'red' : 'green'}>{e.outcome === 'ADJUSTED' ? 'Adjusted' : e.outcome === 'FAIL' ? 'Fail' : 'Pass'}</Badge>
            </p>
            <p className="text-gray-700">
              By {e.performedBy}
              {e.certificateNo ? ` · certificate ${e.certificateNo}` : ''}
              {e.nextDueOn ? ` · next due ${formatDate(e.nextDueOn)}` : ''}
            </p>
            {e.notes && <p className="text-gray-600">{e.notes}</p>}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

// ---------------------------------------------------------------- competency

function CompetencyTab() {
  const { can } = useSession();
  const manage = can('quality.manage');
  const auths = useQuery({ queryKey: ['quality-authorisations'], queryFn: async () => unwrap(await api.GET('/api/v1/quality/authorisations')) });
  const training = useQuery({ queryKey: ['quality-training'], queryFn: async () => unwrap(await api.GET('/api/v1/quality/training')) });
  const [adding, setAdding] = useState<'auth' | 'training' | null>(null);
  const [withdrawing, setWithdrawing] = useState<Authorisation | null>(null);
  const authCols = useMemo<Col<Authorisation>[]>(
    () => [
      { id: 'user', header: 'Analyst', cell: ({ row }) => row.original.userName },
      { id: 'test', header: 'Test', cell: ({ row }) => `${row.original.testCode} ${row.original.testName}` },
      { id: 'from', header: 'Authorised', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.authorisedOn)}</span> },
      { id: 'until', header: 'Valid until', cell: ({ row }) => <span className="whitespace-nowrap">{row.original.validUntil ? formatDate(row.original.validUntil) : 'No end date'}</span> },
      { id: 'state', header: 'State', cell: ({ row }) => <Badge tone={row.original.state === 'ACTIVE' ? 'green' : row.original.state === 'EXPIRED' ? 'amber' : 'gray'}>{row.original.state === 'ACTIVE' ? 'Active' : row.original.state === 'EXPIRED' ? 'Expired' : 'Withdrawn'}</Badge> },
      { id: 'evidence', header: 'Evidence', cell: ({ row }) => <span className="line-clamp-2 text-gray-700">{row.original.evidence ?? '—'}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          manage && row.original.state === 'ACTIVE' ? (
            <Button size="sm" variant="ghost" onClick={() => setWithdrawing(row.original)}>
              Withdraw
            </Button>
          ) : null,
      },
    ],
    [manage],
  );
  const trainingCols = useMemo<Col<Training>[]>(
    () => [
      { id: 'user', header: 'Person', cell: ({ row }) => row.original.userName },
      { id: 'title', header: 'Training', cell: ({ row }) => row.original.title },
      { id: 'on', header: 'Date', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.trainedOn)}</span> },
      { id: 'trainer', header: 'Trainer', cell: ({ row }) => row.original.trainer ?? '—' },
      { id: 'hours', header: 'Hours', cell: ({ row }) => row.original.hours ?? '—' },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <Section title="Authorisations" description="Who may perform which test, from when, until when, and on what evidence. Planners are warned when they assign a test to someone not authorised for it." action={manage ? <Button size="sm" onClick={() => setAdding('auth')}><Plus aria-hidden />Authorise</Button> : null}>
        <DataTable ariaLabel="Authorisations" columns={authCols} rows={auths.data} loading={auths.isLoading} error={auths.error} onRetry={auths.refetch} getRowId={(r) => r.id} emptyTitle="No authorisations yet" maxHeightClass="max-h-96" />
      </Section>
      <Section title="Training" description="Courses, internal sessions and on-the-job training." action={manage ? <Button size="sm" variant="secondary" onClick={() => setAdding('training')}><Plus aria-hidden />Add training</Button> : null}>
        <DataTable ariaLabel="Training records" columns={trainingCols} rows={training.data} loading={training.isLoading} error={training.error} onRetry={training.refetch} getRowId={(r) => r.id} emptyTitle="No training recorded yet" maxHeightClass="max-h-96" />
      </Section>
      {adding === 'auth' && <AuthoriseDialog onClose={() => setAdding(null)} />}
      {adding === 'training' && <TrainingDialog onClose={() => setAdding(null)} />}
      {withdrawing && <WithdrawDialog auth={withdrawing} onClose={() => setWithdrawing(null)} />}
    </div>
  );
}

function Section({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-[13px] text-gray-600">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AuthoriseDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const people = usePeople();
  const tests = useTests();
  const [v, setV] = useState({ userId: '', testId: '', authorisedOn: today(), validUntil: '', evidence: '' });
  const { errors, onError } = useFieldErrors();
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/quality/authorisations', { body: { userId: v.userId, testId: v.testId, authorisedOn: v.authorisedOn, validUntil: v.validUntil || null, evidence: v.evidence || null } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['quality-authorisations'] });
      toast.success('Authorised');
      onClose();
    },
    onError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Authorise an analyst for a test">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="Analyst" htmlFor="au-user">
          <Select id="au-user" value={v.userId} onChange={(e) => setV({ ...v, userId: e.target.value })}>
            <option value="">Choose a person</option>
            {people.data?.filter((p) => p.analyst).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Test" htmlFor="au-test">
          <Select id="au-test" value={v.testId} onChange={(e) => setV({ ...v, testId: e.target.value })}>
            <option value="">Choose a test</option>
            {tests.data?.filter((t) => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Authorised on" htmlFor="au-from">
          <Input id="au-from" type="date" value={v.authorisedOn} onChange={(e) => setV({ ...v, authorisedOn: e.target.value })} />
        </Field>
        <Field label="Valid until" htmlFor="au-until" hint="Optional, e.g. a year for re-evaluation" error={errors.validUntil}>
          <Input id="au-until" type="date" value={v.validUntil} onChange={(e) => setV({ ...v, validUntil: e.target.value })} />
        </Field>
        <Field label="Evidence" htmlFor="au-evidence" hint="e.g. supervised trials, replicate results, proficiency testing" className="sm:col-span-2">
          <Textarea id="au-evidence" rows={3} value={v.evidence} onChange={(e) => setV({ ...v, evidence: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.userId || !v.testId} loading={m.isPending} onClick={() => m.mutate()}>
          Authorise
        </Button>
      </div>
    </Dialog>
  );
}

function WithdrawDialog({ auth, onClose }: { auth: Authorisation; onClose: () => void }) {
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/quality/authorisations/{id}/withdraw', { params: { path: { id: auth.id } }, body: { reason } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['quality-authorisations'] });
      toast.success('Authorisation withdrawn');
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Withdraw ${auth.userName}'s authorisation`} description={`${auth.testCode} ${auth.testName}`}>
      <Field label="Reason" htmlFor="wd-reason">
        <Textarea id="wd-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" disabled={!reason.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Withdraw
        </Button>
      </div>
    </Dialog>
  );
}

function TrainingDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const people = usePeople();
  const [v, setV] = useState({ userId: '', title: '', trainedOn: today(), trainer: '', hours: '' });
  const { errors, onError } = useFieldErrors();
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/quality/training', { body: { userId: v.userId, title: v.title, trainedOn: v.trainedOn, trainer: v.trainer || null, hours: v.hours ? Number(v.hours) : null } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['quality-training'] });
      toast.success('Training recorded');
      onClose();
    },
    onError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Record training">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="Person" htmlFor="tr-user">
          <Select id="tr-user" value={v.userId} onChange={(e) => setV({ ...v, userId: e.target.value })}>
            <option value="">Choose a person</option>
            {people.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="tr-date" error={errors.trainedOn}>
          <Input id="tr-date" type="date" max={today()} value={v.trainedOn} onChange={(e) => setV({ ...v, trainedOn: e.target.value })} />
        </Field>
        <Field label="Training" htmlFor="tr-title" className="sm:col-span-2">
          <Input id="tr-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="e.g. ISO/IEC 17025:2017 awareness" />
        </Field>
        <Field label="Trainer" htmlFor="tr-trainer">
          <Input id="tr-trainer" value={v.trainer} onChange={(e) => setV({ ...v, trainer: e.target.value })} />
        </Field>
        <Field label="Hours" htmlFor="tr-hours">
          <Input id="tr-hours" type="number" min={0} step="0.5" value={v.hours} onChange={(e) => setV({ ...v, hours: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.userId || !v.title.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Record
        </Button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- non-conformance

function NcTab() {
  const q = useQuery({ queryKey: ['quality-nc'], queryFn: async () => unwrap(await api.GET('/api/v1/quality/nc')) });
  const [raising, setRaising] = useState(false);
  const [open, setOpen] = useState<Nc | null>(null);
  const columns = useMemo<Col<Nc>[]>(
    () => [
      { id: 'no', header: 'Number', cell: ({ row }) => <span className="font-medium whitespace-nowrap">{row.original.ncNo}</span> },
      { id: 'title', header: 'Title', cell: ({ row }) => row.original.title },
      { id: 'source', header: 'Source', cell: ({ row }) => row.original.source },
      { id: 'sev', header: 'Severity', cell: ({ row }) => <Badge tone={row.original.severity === 'CRITICAL' ? 'red' : row.original.severity === 'MAJOR' ? 'amber' : 'gray'}>{row.original.severity.toLowerCase()}</Badge> },
      { id: 'owner', header: 'Owner', cell: ({ row }) => row.original.ownerName ?? '—' },
      { id: 'due', header: 'Due', cell: ({ row }) => <span className={row.original.overdue ? 'font-medium whitespace-nowrap text-red-800' : 'whitespace-nowrap'}>{formatDate(row.original.dueOn)}</span> },
      { id: 'status', header: 'Status', cell: ({ row }) => <Badge tone={NC_TONE[row.original.status]}>{NC_LABEL[row.original.status]}</Badge> },
    ],
    [],
  );
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setRaising(true)}>
          <Plus aria-hidden />
          Raise a non-conformance
        </Button>
      </div>
      <DataTable ariaLabel="Non-conformances" columns={columns} rows={q.data} loading={q.isLoading} error={q.error} onRetry={q.refetch} getRowId={(r) => r.id} onRowClick={setOpen} emptyTitle="No non-conformances" />
      {raising && <RaiseNcDialog onClose={() => setRaising(false)} />}
      {open && <NcDialog nc={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RaiseNcDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const people = usePeople();
  const [v, setV] = useState({ source: 'Routine work', title: '', description: '', severity: 'MINOR', reference: '', ownerId: '', dueOn: '' });
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/quality/nc', { body: { source: v.source as 'Other', title: v.title, description: v.description, severity: v.severity as 'MINOR', reference: v.reference || null, ownerId: v.ownerId || null, dueOn: v.dueOn || null } })),
    onSuccess: (nc) => {
      void client.invalidateQueries({ queryKey: ['quality-nc'] });
      void client.invalidateQueries({ queryKey: ['quality-summary'] });
      toast.success(`${nc.ncNo} raised`);
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Raise a non-conformance" wide>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        <Field label="Source" htmlFor="nc-source">
          <Select id="nc-source" value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })}>
            {NC_SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Severity" htmlFor="nc-sev">
          <Select id="nc-sev" value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value })}>
            <option value="MINOR">Minor</option>
            <option value="MAJOR">Major</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </Field>
        <Field label="Concerns" htmlFor="nc-ref" hint="Job, sample, test or report number">
          <Input id="nc-ref" value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} />
        </Field>
        <Field label="Title" htmlFor="nc-title" className="sm:col-span-3">
          <Input id="nc-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label="What happened" htmlFor="nc-desc" className="sm:col-span-3">
          <Textarea id="nc-desc" rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <Field label="Owner" htmlFor="nc-owner" hint="Who works it through">
          <Select id="nc-owner" value={v.ownerId} onChange={(e) => setV({ ...v, ownerId: e.target.value })}>
            <option value="">Decide later</option>
            {people.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due" htmlFor="nc-due">
          <Input id="nc-due" type="date" value={v.dueOn} onChange={(e) => setV({ ...v, dueOn: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.title.trim() || !v.description.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Raise
        </Button>
      </div>
    </Dialog>
  );
}

const NEXT: Record<Nc['status'], { to: Nc['status']; label: string }[]> = {
  OPEN: [{ to: 'ACTION', label: 'Start action' }],
  ACTION: [{ to: 'VERIFICATION', label: 'Send for verification' }],
  VERIFICATION: [
    { to: 'ACTION', label: 'Send back' },
    { to: 'CLOSED', label: 'Verify and close' },
  ],
  CLOSED: [{ to: 'ACTION', label: 'Reopen' }],
};

function NcDialog({ nc: start, onClose }: { nc: Nc; onClose: () => void }) {
  const client = useQueryClient();
  const { can } = useSession();
  const manage = can('quality.manage');
  const [nc, setNc] = useState(start);
  const [v, setV] = useState({ correction: nc.correction ?? '', rootCause: nc.rootCause ?? '', correctiveAction: nc.correctiveAction ?? '', verification: nc.verification ?? '' });
  const m = useMutation({
    mutationFn: async (status?: Nc['status']) => unwrap(await api.PATCH('/api/v1/quality/nc/{id}', { params: { path: { id: nc.id } }, body: { version: nc.version, ...v, ...(status ? { status } : {}) } })),
    onSuccess: (next) => {
      setNc(next);
      void client.invalidateQueries({ queryKey: ['quality-nc'] });
      void client.invalidateQueries({ queryKey: ['quality-summary'] });
      toast.success(next.status === 'CLOSED' ? `${next.ncNo} closed` : 'Saved');
    },
    onError: toastError,
  });
  const area = (name: keyof typeof v, label: string, hint: string) => (
    <Field label={label} htmlFor={`ncd-${name}`} hint={hint}>
      <Textarea id={`ncd-${name}`} rows={2} value={v[name]} disabled={!manage || nc.status === 'CLOSED'} onChange={(e) => setV({ ...v, [name]: e.target.value })} />
    </Field>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`${nc.ncNo}: ${nc.title}`} description={`${nc.source} · ${nc.severity.toLowerCase()} · raised by ${nc.createdByName ?? '—'}${nc.reference ? ` · ${nc.reference}` : ''}`} wide>
      <div className="space-y-3">
        <p className="flex flex-wrap items-center gap-2 text-[13px]">
          <Badge tone={NC_TONE[nc.status]}>{NC_LABEL[nc.status]}</Badge>
          <span className="text-gray-700">Owner: {nc.ownerName ?? 'not set'}</span>
          {nc.dueOn && <span className={nc.overdue ? 'font-medium text-red-800' : 'text-gray-700'}>Due {formatDate(nc.dueOn)}</span>}
          {nc.verifiedByName && <span className="text-gray-700">Verified by {nc.verifiedByName}</span>}
        </p>
        <p className="rounded-md bg-gray-50 px-3 py-2 text-[13px] whitespace-pre-line text-gray-800">{nc.description}</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {area('correction', 'Correction', 'What was done straight away')}
          {area('rootCause', 'Root cause', 'Why it happened')}
          {area('correctiveAction', 'Corrective action', 'What stops it happening again')}
          {area('verification', 'Verification of effectiveness', 'How the action was checked, by someone other than the owner')}
        </div>
      </div>
      {manage && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {nc.status !== 'CLOSED' && (
            <Button variant="secondary" loading={m.isPending && m.variables === undefined} onClick={() => m.mutate(undefined)}>
              Save
            </Button>
          )}
          {NEXT[nc.status].map((n) => (
            <Button key={n.to} variant={n.to === 'ACTION' && nc.status !== 'OPEN' ? 'secondary' : 'primary'} loading={m.isPending && m.variables === n.to} onClick={() => m.mutate(n.to)}>
              {n.label}
            </Button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
