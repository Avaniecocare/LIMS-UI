import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { JobPicker, useTests } from '@/components/pickers';
import { DocumentButton, SavedFilters, SearchBox, StatusBadge } from '@/components/shared';
import { Badge, Button, Checkbox, Dialog, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn, formatDate } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';

type Row = components['schemas']['PlanningRowDto'];
type Suggested = components['schemas']['SuggestedTestDto'];
type Instrument = components['schemas']['InstrumentOptionDto'];
type Workload = components['schemas']['WorkloadRowDto'];

const STALE = 30_000;

function useTechnicians() {
  return useQuery({ queryKey: ['planning-technicians'], staleTime: STALE, queryFn: async () => unwrap(await api.GET('/api/v1/planning/technicians')) });
}
function useInstruments() {
  return useQuery({ queryKey: ['planning-instruments'], staleTime: STALE, queryFn: async () => unwrap(await api.GET('/api/v1/planning/instruments')) });
}
function useWorkload() {
  return useQuery({ queryKey: ['planning-workload'], queryFn: async () => unwrap(await api.GET('/api/v1/planning/workload')) });
}

const instrumentLabel = (i: Instrument) => `${i.code} — ${i.name}${i.calibrationOverdue ? ' (calibration overdue)' : ''}`;

function TestParameters({ testId }: { testId: string }) {
  const q = useQuery({ queryKey: ['test-parameters', testId], staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/masters/test-parameters', { params: { query: { testId, pageSize: 200 } } })).data });
  if (q.isLoading) return <p className="text-xs text-gray-600">Loading parameters…</p>;
  if (q.error) return <p className="text-xs text-red-800">The parameters could not be loaded.</p>;
  if (!q.data?.length) return <p className="text-xs text-red-800">This test has no parameters. Add them in Masters before planning.</p>;
  return (
    <p className="text-xs text-gray-700">
      <span className="font-medium">Parameters: </span>
      {q.data.map((p) => p.name).join(', ')}
    </p>
  );
}

interface PlanTestValues {
  analysisMode: '' | 'SPECTRO' | 'WET';
  officeInstructions: string;
  technicalData: string;
  assignedToId: string;
  instrumentId: string;
}
const blankTest: PlanTestValues = { analysisMode: '', officeInstructions: '', technicalData: '', assignedToId: '', instrumentId: '' };
type TestInfo = Pick<Suggested, 'testId' | 'testCode' | 'testName' | 'methodName' | 'category'>;

function PlanDialog({ jobId, sampleIds, testIds, open, onOpenChange, onPlanned }: { jobId: string; sampleIds?: string[]; testIds: string[]; open: boolean; onOpenChange: (o: boolean) => void; onPlanned: () => void }) {
  const job = useQuery({ queryKey: ['job', jobId], enabled: open, queryFn: async () => unwrap(await api.GET('/api/v1/jobs/{id}', { params: { path: { id: jobId } } })) });
  const masters = useTests();
  const specs = useQuery({ queryKey: ['spec-options'], enabled: open, staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/masters/specifications', { params: { query: { pageSize: 200 } } })).data });
  const groups = useQuery({ queryKey: ['test-group-options'], enabled: open, staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/masters/test-groups', { params: { query: { pageSize: 200 } } })).data });
  const technicians = useTechnicians();
  const instruments = useInstruments();
  const workload = useWorkload();

  const [pickedSamples, setPickedSamples] = useState<string[] | null>(sampleIds ?? null);
  const [specificationId, setSpecificationId] = useState('');
  const [dualSpecificationId, setDualSpecificationId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [notes, setNotes] = useState('');
  const [ids, setIds] = useState<string[]>(testIds);
  const [values, setValues] = useState<Record<string, PlanTestValues>>({});
  const [suggested, setSuggested] = useState<Record<string, TestInfo>>({});

  const info = (id: string): TestInfo | undefined => {
    if (suggested[id]) return suggested[id];
    const t = masters.data?.find((x) => x.id === id);
    return t && { testId: t.id, testCode: t.code, testName: t.name, methodName: t.methodName, category: t.category };
  };
  const activeSamples = job.data?.samples.filter((s) => s.status !== 'CANCELLED') ?? [];
  const samples = pickedSamples ?? activeSamples.map((s) => s.id);
  const openWork = (id: string) => workload.data?.technicians.find((w) => w.id === id)?.openTests;

  const suggest = useMutation({
    mutationFn: async () => unwrap(await api.GET('/api/v1/planning/suggest', { params: { query: { ...(specificationId ? { specificationId } : {}), ...(dualSpecificationId ? { dualSpecificationId } : {}), ...(groupId ? { groupId } : {}) } } })),
    onSuccess: (rows) => {
      setSuggested((prev) => ({ ...prev, ...Object.fromEntries(rows.map((r) => [r.testId, r])) }));
      setIds((prev) => [...prev, ...rows.map((r) => r.testId).filter((id) => !prev.includes(id))]);
      toast.success(rows.length ? `${rows.length} suggested ${rows.length === 1 ? 'test' : 'tests'} in the list` : 'Nothing to suggest from that choice');
    },
    onError: toastError,
  });
  const plan = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/api/v1/planning/plans', {
          body: {
            sampleIds: samples,
            specificationId: specificationId || null,
            dualSpecificationId: dualSpecificationId || null,
            notes: notes.trim() || null,
            tests: ids.map((testId) => {
              const v = values[testId] ?? blankTest;
              return { testId, analysisMode: v.analysisMode || null, officeInstructions: v.officeInstructions.trim() || null, technicalData: v.technicalData.trim() || null, assignedToId: v.assignedToId || null, instrumentId: v.instrumentId || null };
            }),
          },
        }),
      ),
    onSuccess: (res) => {
      toast.success(`Plan ${res.planNo} created with ${res.sampleTestIds.length} ${res.sampleTestIds.length === 1 ? 'test' : 'tests'}`);
      onPlanned();
    },
    onError: toastError,
  });
  const set = (testId: string, patch: Partial<PlanTestValues>) => setValues((prev) => ({ ...prev, [testId]: { ...(prev[testId] ?? blankTest), ...patch } }));
  const specOption = (s: { id: string; code: string; name: string }) => (
    <option key={s.id} value={s.id}>
      {s.code} — {s.name}
    </option>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={job.data ? `Plan samples on ${job.data.jobNo}` : 'Plan samples'} wide>
      {job.isLoading && <Spinner />}
      {job.error && <ErrorState error={job.error} onRetry={job.refetch} />}
      {job.data && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            plan.mutate();
          }}
        >
          <fieldset className="space-y-1">
            <legend className="text-[13px] font-medium text-gray-700">Samples</legend>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {activeSamples.map((s) => (
                <div key={s.id}>
                  <Checkbox id={`plan-s-${s.id}`} label={`${s.sampleNo} — ${s.description}`} checked={samples.includes(s.id)} onCheckedChange={(v) => setPickedSamples(v ? [...samples, s.id] : samples.filter((x) => x !== s.id))} />
                </div>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <Field label="Grade / specification" htmlFor="plan-spec">
              <Select id="plan-spec" value={specificationId} onChange={(e) => {
                  setSpecificationId(e.target.value);
                  if (!e.target.value || e.target.value === dualSpecificationId) setDualSpecificationId('');
                }}>
                <option value="">None</option>
                {specs.data?.map(specOption)}
              </Select>
            </Field>
            <Field label="Second grade (dual grade)" htmlFor="plan-dual">
              <Select id="plan-dual" value={dualSpecificationId} disabled={!specificationId} onChange={(e) => setDualSpecificationId(e.target.value)}>
                <option value="">None</option>
                {specs.data?.filter((s) => s.id !== specificationId).map(specOption)}
              </Select>
            </Field>
            <Field label="Test or chemical group" htmlFor="plan-group">
              <Select id="plan-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">None</option>
                {groups.data?.map(specOption)}
              </Select>
            </Field>
            <Button variant="secondary" disabled={!specificationId && !groupId} loading={suggest.isPending} onClick={() => suggest.mutate()}>
              Suggest tests
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-gray-900">Tests to include ({ids.length})</h3>
              <div className="w-72">
                <Select
                  aria-label="Add a test"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                  }}
                >
                  <option value="">Add a test…</option>
                  {masters.data
                    ?.filter((t) => !ids.includes(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            {ids.length === 0 && <p className="text-[13px] text-gray-600">Suggest tests from a grade or group, or add them one at a time.</p>}
            {ids.map((testId) => {
              const t = info(testId);
              const v = values[testId] ?? blankTest;
              const key = t?.testCode ?? testId;
              return (
                <div key={testId} role="group" aria-label={`Test ${key}`} className="space-y-2 rounded-md border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px]">
                      <span className="font-semibold text-gray-900">
                        {t?.testCode} — {t?.testName}
                      </span>
                      {t && <Badge className="ml-2">{t.category}</Badge>}
                      {t?.methodName && <p className="text-xs text-gray-700">{t.methodName}</p>}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Remove ${key}`} onClick={() => setIds((prev) => prev.filter((x) => x !== testId))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  <TestParameters testId={testId} />
                  <div className="grid gap-2 md:grid-cols-4">
                    {t?.category === 'CHEMICAL' && (
                      <Field label="Analysis mode" htmlFor={`plan-${testId}-mode`}>
                        <Select id={`plan-${testId}-mode`} value={v.analysisMode} onChange={(e) => set(testId, { analysisMode: e.target.value as PlanTestValues['analysisMode'] })}>
                          <option value="">—</option>
                          <option value="SPECTRO">Spectro</option>
                          <option value="WET">Wet</option>
                        </Select>
                      </Field>
                    )}
                    <Field label="Office instructions" htmlFor={`plan-${testId}-office`}>
                      <Textarea id={`plan-${testId}-office`} rows={1} className="min-h-9" value={v.officeInstructions} onChange={(e) => set(testId, { officeInstructions: e.target.value })} />
                    </Field>
                    <Field label="Technical data" htmlFor={`plan-${testId}-tech`}>
                      <Textarea id={`plan-${testId}-tech`} rows={1} className="min-h-9" value={v.technicalData} onChange={(e) => set(testId, { technicalData: e.target.value })} />
                    </Field>
                    <Field label="Assign to" htmlFor={`plan-${testId}-assignee`}>
                      <Select id={`plan-${testId}-assignee`} value={v.assignedToId} onChange={(e) => set(testId, { assignedToId: e.target.value })}>
                        <option value="">Later</option>
                        {technicians.data?.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {openWork(u.id) !== undefined ? ` (${openWork(u.id)} open)` : ''}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Instrument" htmlFor={`plan-${testId}-instrument`}>
                      <Select id={`plan-${testId}-instrument`} value={v.instrumentId} onChange={(e) => set(testId, { instrumentId: e.target.value })}>
                        <option value="">None</option>
                        {instruments.data?.map((i) => (
                          <option key={i.id} value={i.id}>
                            {instrumentLabel(i)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
          <Field label="Plan notes" htmlFor="plan-notes">
            <Input id="plan-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ids.length || !samples.length} loading={plan.isPending}>
              Create plan
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function WorkloadCells({ row }: { row?: Workload }) {
  return (
    <>
      <td className="px-2 py-1.5 tabular-nums">{row?.openTests ?? 0}</td>
      <td className="px-2 py-1.5 tabular-nums">{row?.inProgress ?? 0}</td>
      <td className="px-2 py-1.5 tabular-nums">{row?.overdue ?? 0}</td>
      <td className="px-2 py-1.5 tabular-nums">{row?.urgent ?? 0}</td>
    </>
  );
}
const LOAD_HEADINGS = ['Open', 'In progress', 'Overdue', 'Urgent'];

function AssignDialog({ rows, reassign, open, onOpenChange, onAssigned }: { rows: Row[]; reassign: boolean; open: boolean; onOpenChange: (o: boolean) => void; onAssigned: () => void }) {
  const technicians = useTechnicians();
  const instruments = useInstruments();
  const workload = useWorkload();
  const [assignedToId, setAssignedToId] = useState('');
  const [instrumentId, setInstrumentId] = useState('');
  useEffect(() => {
    if (open) {
      setAssignedToId('');
      setInstrumentId('');
    }
  }, [open]);
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/planning/assign', { body: { sampleTestIds: rows.map((r) => r.id), assignedToId, instrumentId: instrumentId || null } })),
    onSuccess: () => {
      toast.success(`${rows.length} ${rows.length === 1 ? 'test' : 'tests'} ${reassign ? 'reassigned' : 'assigned'}`);
      onAssigned();
    },
    onError: toastError,
  });
  const chosenInstrument = instruments.data?.find((i) => i.id === instrumentId);
  const verb = reassign ? 'Reassign' : 'Assign';
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`${verb} ${rows.length} ${rows.length === 1 ? 'test' : 'tests'}`} description="Current open work is shown for each person and instrument." wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (assignedToId) m.mutate();
        }}
      >
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold text-gray-900">Technician</legend>
          {(technicians.isLoading || workload.isLoading) && <Spinner />}
          {technicians.error && <ErrorState error={technicians.error} onRetry={technicians.refetch} />}
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-[13px]" aria-label="Technician workload">
              <thead className="bg-gray-50 text-left text-xs text-gray-700">
                <tr>
                  <th scope="col" className="px-2 py-1.5 font-semibold">
                    Name
                  </th>
                  {LOAD_HEADINGS.map((h) => (
                    <th key={h} scope="col" className="px-2 py-1.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {technicians.data?.map((t) => (
                  <tr key={t.id} className={cn('border-t border-gray-100', assignedToId === t.id && 'bg-blue-50')}>
                    <td className="px-2 py-1.5">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="assign-technician" value={t.id} checked={assignedToId === t.id} onChange={() => setAssignedToId(t.id)} />
                        {t.name}
                      </label>
                    </td>
                    <WorkloadCells row={workload.data?.technicians.find((w) => w.id === t.id)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold text-gray-900">Instrument (optional)</legend>
          <div className="max-h-56 overflow-auto rounded-md border border-gray-200">
            <table className="w-full text-[13px]" aria-label="Instrument workload">
              <thead className="bg-gray-50 text-left text-xs text-gray-700">
                <tr>
                  <th scope="col" className="px-2 py-1.5 font-semibold">
                    Instrument
                  </th>
                  <th scope="col" className="px-2 py-1.5 font-semibold">
                    Calibration due
                  </th>
                  {LOAD_HEADINGS.map((h) => (
                    <th key={h} scope="col" className="px-2 py-1.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-2 py-1.5" colSpan={6}>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="assign-instrument" value="" checked={!instrumentId} onChange={() => setInstrumentId('')} />
                      {reassign ? 'Keep the current instrument' : 'No instrument'}
                    </label>
                  </td>
                </tr>
                {instruments.data?.map((i) => (
                  <tr key={i.id} className={cn('border-t border-gray-100', instrumentId === i.id && 'bg-blue-50')}>
                    <td className="px-2 py-1.5">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="assign-instrument" value={i.id} checked={instrumentId === i.id} onChange={() => setInstrumentId(i.id)} />
                        {i.code} — {i.name}
                      </label>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {formatDate(i.calibrationDueAt)}
                      {i.calibrationOverdue && (
                        <Badge tone="red" className="ml-1.5">
                          Calibration overdue
                        </Badge>
                      )}
                    </td>
                    <WorkloadCells row={workload.data?.instruments.find((w) => w.id === i.id)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {chosenInstrument?.calibrationOverdue && (
            <p role="alert" className="mt-1 text-[13px] text-red-800">
              {chosenInstrument.name} is overdue for calibration.
            </p>
          )}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!assignedToId} loading={m.isPending}>
            {verb}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const VIEWS = [
  { value: 'unplanned', label: 'Unplanned' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Assigned' },
] as const;

export default function PlanningPage() {
  const { can } = useSession();
  const client = useQueryClient();
  const list = useListState();
  const canEdit = can('planning.edit');
  const view = (list.filters.view ?? 'unplanned') as (typeof VIEWS)[number]['value'];
  const jobFilter = list.filters.jobId ?? '';
  const q = useQuery({ queryKey: ['planning', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/planning/tests', { params: { query: list.query } })) });
  const departments = useQuery({ queryKey: ['department-options'], staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/masters/departments', { params: { query: { pageSize: 200 } } })).data });

  const [selected, setSelected] = useState<Record<string, Row>>({});
  const [dialog, setDialog] = useState<'plan' | 'plan-job' | 'assign' | null>(null);
  const selection = useMemo(() => Object.fromEntries(Object.keys(selected).map((id) => [id, true])), [selected]);
  const rows = Object.values(selected);
  const jobIds = [...new Set(rows.map((r) => r.jobId))];
  const singleJob = jobIds.length === 1 ? jobIds[0] : null;

  const clear = () => setSelected({});
  const afterChange = (jobId?: string | null) => {
    clear();
    setDialog(null);
    client.invalidateQueries({ queryKey: ['planning'] });
    client.invalidateQueries({ queryKey: ['planning-workload'] });
    client.invalidateQueries({ queryKey: ['jobs'] });
    client.invalidateQueries({ queryKey: ['samples'] });
    if (jobId) {
      client.invalidateQueries({ queryKey: ['job', jobId] });
      client.invalidateQueries({ queryKey: ['job-timeline', jobId] });
    }
  };

  const columns = useMemo<Col<Row>[]>(
    () => [
      { accessorKey: 'sampleNo', id: 'sampleNo', header: 'Sample' },
      { accessorKey: 'sampleDescription', id: 'sampleDescription', header: 'Description' },
      {
        id: 'job',
        header: 'Job',
        cell: ({ row }) => (
          <Link to={`/samples/jobs/${row.original.jobId}?sample=${row.original.sampleId}`} className="underline" onClick={(e) => e.stopPropagation()}>
            {row.original.jobNo}
          </Link>
        ),
      },
      { id: 'testName', header: 'Test', enableSorting: true, cell: ({ row }) => `${row.original.testCode} — ${row.original.testName}` },
      { id: 'method', header: 'Method', cell: ({ row }) => row.original.methodName ?? '—' },
      { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: 'urgent', header: 'Urgent', cell: ({ row }) => (row.original.urgent ? <Badge tone="red">Urgent</Badge> : <span className="text-gray-600">—</span>) },
      { id: 'dueDate', header: 'Due', enableSorting: true, cell: ({ row }) => formatDate(row.original.dueDate) },
      { id: 'assignee', header: 'Assigned to', cell: ({ row }) => row.original.assignedToName ?? '—' },
      { id: 'instrument', header: 'Instrument', cell: ({ row }) => row.original.instrumentName ?? '—' },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Planning"
        actions={
          jobFilter && (
            <>
              <DocumentButton kind="job-card" params={{ jobId: jobFilter }}>
                Job card
              </DocumentButton>
              {canEdit && (
                <Button onClick={() => setDialog('plan-job')}>
                  <Plus aria-hidden />
                  Plan samples
                </Button>
              )}
            </>
          )
        }
      />
      <Tabs
        value={view}
        onValueChange={(v) => {
          clear();
          list.setFilter('view', v === 'unplanned' ? null : v);
        }}
      >
        <TabsList className="mb-3">
          {VIEWS.map((v) => (
            <TabsTrigger key={v.value} value={v.value}>
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search test, sample or job" label="Search tests" />
          <div className="w-52">
            <JobPicker ariaLabel="Job filter" placeholder="All jobs" value={jobFilter} onChange={(v) => list.setFilter('jobId', v || null)} />
          </div>
          <Select aria-label="Department filter" className="w-44" value={list.filters.departmentId ?? ''} onChange={(e) => list.setFilter('departmentId', e.target.value || null)}>
            <option value="">All departments</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <SavedFilters screen="planning" current={list.allParams} onApply={list.applyFilters} />
        </div>
        <DataTable
          ariaLabel="Tests to plan"
          columns={columns}
          rows={q.data?.data}
          meta={q.data?.meta}
          loading={q.isLoading}
          error={q.error}
          onRetry={q.refetch}
          sort={list.sort}
          onSortChange={list.setSort}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          getRowId={(r) => r.id}
          selection={canEdit ? selection : undefined}
          onSelectionChange={
            canEdit
              ? (next) =>
                  setSelected((prev) => {
                    const out: Record<string, Row> = {};
                    for (const id of Object.keys(next)) {
                      const row = prev[id] ?? q.data?.data.find((r) => r.id === id);
                      if (row) out[id] = row;
                    }
                    return out;
                  })
              : undefined
          }
          bulkActions={
            <>
              {view === 'unplanned' ? (
                <Button size="sm" disabled={!singleJob} onClick={() => setDialog('plan')}>
                  Plan
                </Button>
              ) : (
                <Button size="sm" onClick={() => setDialog('assign')}>
                  {view === 'assigned' ? 'Reassign' : 'Assign'}
                </Button>
              )}
              {view !== 'unplanned' && singleJob && (
                <DocumentButton kind="job-card" params={{ jobId: singleJob }} size="sm">
                  Job card
                </DocumentButton>
              )}
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
              {view === 'unplanned' && !singleJob && <span className="text-[13px] text-gray-700">Plan samples from one job at a time.</span>}
            </>
          }
          emptyTitle={view === 'unplanned' ? 'No tests waiting to be planned' : view === 'unassigned' ? 'No planned tests waiting for a technician' : 'No tests are assigned'}
          emptyHint={view === 'unplanned' && jobFilter && canEdit ? 'A sample booked without requested tests can still be planned with Plan samples.' : undefined}
        />
      </div>
      {dialog === 'plan' && singleJob && <PlanDialog open jobId={singleJob} sampleIds={[...new Set(rows.map((r) => r.sampleId))]} testIds={[...new Set(rows.map((r) => r.testId))]} onOpenChange={(o) => !o && setDialog(null)} onPlanned={() => afterChange(singleJob)} />}
      {dialog === 'plan-job' && jobFilter && <PlanDialog open jobId={jobFilter} testIds={[]} onOpenChange={(o) => !o && setDialog(null)} onPlanned={() => afterChange(jobFilter)} />}
      <AssignDialog rows={rows} reassign={view === 'assigned'} open={dialog === 'assign'} onOpenChange={(o) => setDialog(o ? 'assign' : null)} onAssigned={() => afterChange(singleJob)} />
    </>
  );
}
