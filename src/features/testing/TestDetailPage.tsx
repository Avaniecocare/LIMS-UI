import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { ReportProblemButton } from '@/features/quality/ReportProblem';
import { DocumentButton, HistoryList, ReasonDialog, StatusBadge } from '@/components/shared';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { cn, formatDate, formatDateTime } from '@/lib/format';
import { isConflict, toastError, writeError } from '@/lib/forms';
import { AutosaveQueue, isNumberText, isResultText, mergeEntryPatch, patchKeys, reconcileDrafts, type EntryPatch, type SaveStatus } from './autosave';
import { Outcome, ResultTable, type ParameterResult } from './result-table';
import { TestFiles } from './TestFiles';

type Test = components['schemas']['TestDetailDto'];
type TextField = 'remarks' | 'observations' | 'notes';
const TEXT_FIELDS: { key: TextField; label: string }[] = [
  { key: 'remarks', label: 'Remarks' },
  { key: 'observations', label: 'Observations' },
  { key: 'notes', label: 'Notes' },
];
const INSTRUMENT = 'instrumentId';

/** Everything editable on the page, keyed the way drafts and patches name it. */
function serverValues(t: Test): Record<string, string> {
  const values: Record<string, string> = { [INSTRUMENT]: t.instrumentId ?? '', remarks: t.remarks ?? '', observations: t.observations ?? '', notes: t.notes ?? '' };
  for (const r of t.results) if (r.kind !== 'CALCULATED') values[r.parameterId] = r.numericValue ?? r.textValue ?? '';
  return values;
}

/** Fields holding what cannot be saved: not a number yet, or refused by the server with a message. */
function invalidKeys(t: Test | undefined, drafts: Record<string, string>, refused: Record<string, string> = {}) {
  return (t?.results ?? [])
    .filter((r) => r.parameterId in refused || (r.kind === 'NUMERIC' && (drafts[r.parameterId] ?? '').trim() !== '' && !isResultText(drafts[r.parameterId])))
    .map((r) => r.parameterId);
}

function SaveIndicator({ status, canRetry, onRetry }: { status: SaveStatus; canRetry: boolean; onRetry: () => void }) {
  const failed = status === 'failed';
  return (
    <span className="flex items-center gap-2 text-[13px]">
      <span role="status" aria-live="polite" className={cn('inline-flex min-w-16 items-center gap-1 font-medium', failed ? 'text-red-800' : 'text-gray-700')}>
        {(status === 'pending' || status === 'saving') && (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Saving…
          </>
        )}
        {status === 'saved' && (
          <>
            <Check className="size-3.5" aria-hidden />
            Saved
          </>
        )}
        {failed && (
          <>
            <AlertTriangle className="size-3.5" aria-hidden />
            Failed
          </>
        )}
      </span>
      {failed && canRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry save
        </Button>
      )}
    </span>
  );
}

function Banner({ tone, children }: { tone: 'red' | 'amber' | 'gray'; children: ReactNode }) {
  const tones = { red: 'border-red-300 bg-red-50 text-red-900', amber: 'border-amber-300 bg-amber-50 text-amber-900', gray: 'border-gray-200 bg-gray-50 text-gray-800' };
  return <div className={cn('rounded-md border px-3 py-2 text-[13px]', tones[tone])}>{children}</div>;
}

function Stages({ test, busy, onComplete }: { test: Test; busy: boolean; onComplete: (seq: number) => void }) {
  const next = test.stages.find((s) => !s.completedAt);
  return (
    <Card>
      <CardHeader title="Stages" />
      {test.stages.length === 0 && <p className="p-4 text-[13px] text-gray-600">This test has no stages.</p>}
      <ol className="divide-y divide-gray-100">
        {test.stages.map((s, i) => (
          <li key={s.seq} className="flex items-center justify-between gap-2 px-4 py-2 text-[13px]">
            <div className="min-w-0">
              <p className={cn('font-medium', s.completedAt || s === next ? 'text-gray-900' : 'text-gray-600')}>
                {i + 1}. {s.name}
              </p>
              {s.completedAt ? (
                <p className="text-xs text-gray-700">
                  <Check className="mr-0.5 inline size-3 text-green-800" aria-hidden />
                  Done by {s.completedByName} · {formatDateTime(s.completedAt)}
                </p>
              ) : (
                <p className="text-xs text-gray-600">{s === next ? 'Next' : 'Not done yet'}</p>
              )}
            </div>
            {test.canEdit && s === next && (
              <Button variant="secondary" className="h-11 shrink-0" loading={busy} aria-label={`Complete ${s.name}`} onClick={() => onComplete(s.seq)}>
                Complete
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function RemarkField({
  test,
  field,
  label,
  value,
  onChange,
  onFocus,
  onBlur,
}: {
  test: Test;
  field: TextField;
  label: string;
  value: string;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const id = `entry-${field}`;
  if (!test.canEdit) {
    return (
      <div>
        <h3 className="text-[13px] font-medium text-gray-700">{label}</h3>
        <p className="mt-0.5 text-[13px] whitespace-pre-wrap text-gray-900">{value || '—'}</p>
      </div>
    );
  }
  const suggested = test.remarkOptions.filter((r) => r.suggested);
  const others = test.remarkOptions.filter((r) => !r.suggested);
  const option = (r: Test['remarkOptions'][number]) => (
    <option key={r.id} value={r.text}>
      {r.code}: {r.text}
    </option>
  );
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-gray-700">
          {label}
        </label>
        {test.remarkOptions.length > 0 && (
          <Select
            aria-label={`Add a template to ${label.toLowerCase()}`}
            className="h-9 w-full max-w-64"
            value=""
            onChange={(e) => {
              if (e.target.value) onChange(value.trim() ? `${value.trimEnd()}\n${e.target.value}` : e.target.value);
            }}
          >
            <option value="">Add from a template…</option>
            {suggested.length > 0 && <optgroup label="Suggested for this result">{suggested.map(option)}</optgroup>}
            {others.length > 0 && <optgroup label="Other templates">{others.map(option)}</optgroup>}
          </Select>
        )}
      </div>
      <Textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
    </div>
  );
}

function UnitConverter({ conversions }: { conversions: Test['conversions'] }) {
  const [conversionId, setConversionId] = useState('');
  const [value, setValue] = useState('');
  const chosen = conversions.find((c) => c.id === conversionId);
  const m = useMutation({ mutationFn: async () => unwrap(await api.POST('/api/v1/masters/convert', { body: { conversionId, value: value.trim() } })), onError: toastError });
  if (!conversions.length) return null;
  return (
    <Card>
      <CardHeader title="Unit converter" />
      <form
        className="space-y-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (conversionId && isNumberText(value)) m.mutate();
        }}
      >
        <Field label="Conversion" htmlFor="convert-unit">
          <Select
            id="convert-unit"
            className="h-11"
            value={conversionId}
            onChange={(e) => {
              setConversionId(e.target.value);
              m.reset();
            }}
          >
            <option value="">Choose…</option>
            {conversions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fromSymbol} to {c.toSymbol}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={chosen ? `Value in ${chosen.fromSymbol}` : 'Value'} htmlFor="convert-value">
          <Input
            id="convert-value"
            className="h-11"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              m.reset();
            }}
          />
        </Field>
        <Button type="submit" variant="secondary" className="h-11 w-full" disabled={!conversionId || !isNumberText(value)} loading={m.isPending}>
          Convert
        </Button>
        <p aria-live="polite" className="text-sm font-semibold text-gray-900 tabular-nums">
          {m.data && chosen ? `${m.data.value} ${chosen.toSymbol}` : ''}
        </p>
      </form>
    </Card>
  );
}

function Instruction({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-600">{label}</h3>
      <p className="text-[13px] whitespace-pre-wrap text-gray-900">{text}</p>
    </div>
  );
}

function statusNote(t: Test, assignee: boolean): string | null {
  if (t.canEdit) return null;
  if (t.status === 'RESULTS_SUBMITTED') return `Results were submitted${t.submittedAt ? ` on ${formatDateTime(t.submittedAt)}` : ''} and are waiting for approval. They are locked.`;
  if (t.status === 'APPROVED') return `Approved${t.approvedByName ? ` by ${t.approvedByName}` : ''}${t.approvedAt ? ` on ${formatDateTime(t.approvedAt)}` : ''}. Results are locked.`;
  if (t.status === 'CANCELLED') return 'This test has been cancelled.';
  if (t.status === 'ASSIGNED' && assignee) return 'Start the test to enter results.';
  if (!assignee) return `You are viewing this test read-only${t.assignedToName ? `. It is assigned to ${t.assignedToName}.` : '.'}`;
  return 'Results cannot be changed right now.';
}

export default function TestDetailPage() {
  const { id } = useParams();
  const { can } = useSession();
  const client = useQueryClient();
  const key = ['test', id];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET('/api/v1/tests/{id}', { params: { path: { id: id! } } })) });
  const test = q.data;

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [refused, setRefused] = useState<Record<string, string>>({});
  // Read when a save answers, which can be before React has rendered the state, so both are set together.
  const refusedRef = useRef(refused);
  const markRefused = (next: Record<string, string>) => {
    refusedRef.current = next;
    setRefused(next);
  };
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tab, setTab] = useState('results');
  const [dialog, setDialog] = useState<'hold' | 'release' | 'submit' | null>(null);
  const [leaving, setLeaving] = useState(false);
  const focused = useRef<string | null>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const markRefusedRef = useRef(markRefused);
  markRefusedRef.current = markRefused;

  const queueRef = useRef<AutosaveQueue<EntryPatch, Test> | null>(null);
  const refetch = q.refetch;

  /** Fields to leave alone when the server answers: being typed in, not sent yet, or not valid to send. */
  const keepKeys = useCallback((t: Test | undefined) => {
    const keep = new Set<string>(patchKeys(queueRef.current?.unsent ?? null));
    if (focused.current) keep.add(focused.current);
    for (const k of invalidKeys(t, draftsRef.current, refusedRef.current)) keep.add(k);
    return keep;
  }, []);

  queueRef.current ??= new AutosaveQueue<EntryPatch, Test>({
    version: 0,
    delayMs: 800,
    merge: mergeEntryPatch,
    versionOf: (t) => t.version,
    save: async (patch, version) => {
      const { values, ...rest } = patch;
      const body = { version, ...rest, ...(values ? { values: Object.entries(values).map(([parameterId, value]) => ({ parameterId, value })) } : {}) };
      return unwrap(await api.PUT('/api/v1/tests/{id}/results', { params: { path: { id: id! } }, body }));
    },
    onSaved: (t, patch) => {
      if (INSTRUMENT in patch) setInstrumentError(null);
      client.setQueryData(key, t);
    },
    onFailed: (error, patch) => {
      if (!(error instanceof ApiError) || error.status >= 500) return patch;
      if (error.code === 'INSTRUMENT_OVERDUE') {
        // The rest of the edit is fine; only the instrument was refused.
        setInstrumentError(error.message);
        setDrafts((d) => ({ ...d, [INSTRUMENT]: client.getQueryData<Test>(key)?.instrumentId ?? '' }));
        const rest = { ...patch };
        delete rest.instrumentId;
        return Object.keys(rest).length ? rest : null;
      }
      if (error.code === 'RESULT_INVALID' && error.fields.length) {
        // The server refused the whole save. Mark those inputs, keep what was typed in them, and send the rest again.
        const bad = Object.fromEntries(error.fields.map((f) => [f.field, f.message]));
        markRefusedRef.current({ ...refusedRef.current, ...bad });
        const values = Object.fromEntries(Object.entries(patch.values ?? {}).filter(([k]) => !(k in bad)));
        const rest: EntryPatch = { ...patch, values };
        if (!Object.keys(values).length) delete rest.values;
        return Object.keys(rest).length ? rest : null;
      }
      if (isConflict(error)) toast.error('This test was changed elsewhere. The latest version has been loaded; please check your last entries.');
      else toastError(error);
      // The data may come back unchanged, so put the fields back explicitly.
      void refetch().then((r) => {
        if (r.data) setDrafts(serverValues(r.data));
        markRefusedRef.current({});
      });
      return null;
    },
    shouldRetry: (error) => !(error instanceof ApiError) || error.status >= 500 || error.code === 'INSTRUMENT_OVERDUE' || error.code === 'RESULT_INVALID',
    onStatus: setStatus,
  });
  const queue = queueRef.current;

  // Every answer from the server lands here, whichever call produced it.
  useEffect(() => {
    if (!test) return;
    queue.observeVersion(test.version);
    setDrafts((prev) => reconcileDrafts(prev, serverValues(test), keepKeys(test)));
  }, [test, queue, keepKeys]);

  useEffect(
    () => () => {
      void queue.flush();
      queue.dispose();
    },
    [queue],
  );

  const unsaved = () => queue.hasUnsaved() || invalidKeys(client.getQueryData<Test>(key), draftsRef.current, refusedRef.current).length > 0;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname && unsaved());
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let live = true;
    void queue.flush().then((ok) => {
      if (!live) return;
      if (ok && !invalidKeys(client.getQueryData<Test>(key), draftsRef.current, refusedRef.current).length) blocker.proceed();
      else setLeaving(true);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for each blocked navigation
  }, [blocker.state]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (unsaved()) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the queue and drafts through refs
  }, []);

  const history = useQuery({ queryKey: ['test-history', id], enabled: tab === 'history', queryFn: async () => unwrap(await api.GET('/api/v1/tests/{id}/history', { params: { path: { id: id! } } })) });

  const applied = (t: Test) => {
    client.setQueryData(key, t);
    client.invalidateQueries({ queryKey: ['my-tests'] });
    client.invalidateQueries({ queryKey: ['test-history', id] });
    client.invalidateQueries({ queryKey: ['test-approvals'] });
  };

  /** Runs a status action on top of the saved draft, always with the latest version. */
  const action = useMutation({
    mutationFn: async (run: (version: number) => Promise<Test>) => {
      if (!(await queue.flush())) throw new Error('UNSAVED');
      return run(queue.version);
    },
    onSuccess: (t) => {
      applied(t);
      setDialog(null);
      setSubmitError(null);
    },
    onError: (error) => {
      setDialog(null);
      if (error instanceof Error && error.message === 'UNSAVED') toast.error('Your latest entries have not been saved. Try again once they are saved.');
      else writeError(() => void refetch())(error);
    },
  });
  const path = { params: { path: { id: id! } } };
  const start = () => action.mutate(async (version) => unwrap(await api.POST('/api/v1/tests/{id}/start', { ...path, body: { version } })));
  const complete = (seq: number) => action.mutate(async (version) => unwrap(await api.POST('/api/v1/tests/{id}/stages/{seq}/complete', { params: { path: { id: id!, seq } }, body: { version } })));
  const hold = (reason: string) => action.mutate(async (version) => unwrap(await api.POST('/api/v1/tests/{id}/hold', { ...path, body: { version, reason } })));
  const release = () => action.mutate(async (version) => unwrap(await api.POST('/api/v1/tests/{id}/release', { ...path, body: { version } })));

  const submit = useMutation({
    mutationFn: async () => {
      if (invalidKeys(test, draftsRef.current, refusedRef.current).length) throw new Error('INVALID');
      if (!(await queue.flush())) throw new Error('UNSAVED');
      return unwrap(await api.POST('/api/v1/tests/{id}/submit', { ...path, body: { version: queue.version } }));
    },
    onSuccess: (t) => {
      applied(t);
      setDialog(null);
      setSubmitError(null);
      toast.success('Results submitted for approval');
    },
    onError: (error) => {
      setDialog(null);
      if (isConflict(error)) {
        writeError(() => void refetch())(error);
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error && error.message === 'INVALID') {
        setSubmitError('Some results cannot be saved. Correct the marked fields before submitting.');
      } else {
        setSubmitError('Your latest entries have not been saved. Try again once they are saved.');
      }
    },
  });

  if (q.isLoading) return <Spinner />;
  if (q.error || !test) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const assignee = test.assignedToMe;
  const canHold = can('tests.hold') || assignee;
  const note = statusNote(test, assignee);
  const entering = test.canEdit;

  const edit = (patch: EntryPatch, key_: string, text: string) => {
    setDrafts((d) => ({ ...d, [key_]: text }));
    queue.edit(patch);
  };
  const onResult = (r: ParameterResult, text: string) => {
    markRefused(Object.fromEntries(Object.entries(refusedRef.current).filter(([k]) => k !== r.parameterId)));
    if (r.kind === 'NUMERIC' && text.trim() !== '' && !isResultText(text)) {
      setDrafts((d) => ({ ...d, [r.parameterId]: text }));
      return;
    }
    edit({ values: { [r.parameterId]: text.trim() === '' ? null : text.trim() } }, r.parameterId, text);
  };
  const onBlur = () => {
    focused.current = null;
    void queue.flush().then(() => {
      const latest = client.getQueryData<Test>(key);
      if (latest) setDrafts((d) => reconcileDrafts(d, serverValues(latest), keepKeys(latest)));
    });
  };
  const entry = { drafts, errors: refused, onChange: onResult, onFocus: (k: string) => (focused.current = k), onBlur };
  const chosenInstrument = test.instruments.find((i) => i.id === drafts[INSTRUMENT]);
  const hasInstructions = test.officeInstructions || test.technicalData || test.analysisMode;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {test.testCode} — {test.testName}
            <StatusBadge status={test.status} />
            {test.urgent && <Badge tone="red">Urgent</Badge>}
            {test.overdue && <Badge tone="red">Overdue</Badge>}
          </span>
        }
        breadcrumb={
          can('tests.work') ? (
            <Link to="/my-tests" className="underline">
              My Tests
            </Link>
          ) : can('tests.approve') ? (
            <Link to="/approvals?tab=results" className="underline">
              Approvals
            </Link>
          ) : undefined
        }
        description={
          <>
            {test.sampleNo} · {test.jobNo} · {test.sampleDescription}
            {test.customerName && ` · ${test.customerName}`}
            <br />
            {test.methodName && `${test.methodName} · `}Due {formatDate(test.dueDate)}
          </>
        }
        actions={
          <>
            <ReportProblemButton reference={`${test.sampleNo} · ${test.testCode}`} context={`${test.testName} on ${test.sampleNo}`} />
            <DocumentButton kind="test-data" params={{ sampleTestId: test.id }}>
              Print test data
            </DocumentButton>
            {canHold && ['PLANNED', 'ASSIGNED', 'IN_PROGRESS'].includes(test.status) && (
              <Button variant="secondary" onClick={() => setDialog('hold')}>
                Put on hold
              </Button>
            )}
            {canHold && test.status === 'ON_HOLD' && (
              <Button variant="secondary" onClick={() => setDialog('release')}>
                Release hold
              </Button>
            )}
            {assignee && test.status === 'ASSIGNED' && (
              <Button loading={action.isPending} onClick={start}>
                Start test
              </Button>
            )}
          </>
        }
      />
      <div className="mb-3 space-y-2">
        {test.rejectionReason && (
          <div role="alert" className="rounded-md border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-900">
            <p className="font-semibold">Sent back for correction</p>
            <p>{test.rejectionReason}</p>
          </div>
        )}
        {test.holdReason && (
          <Banner tone="amber">
            <span className="font-semibold">On hold: </span>
            {test.holdReason}
          </Banner>
        )}
        {submitError && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-900">
            {submitError}
          </div>
        )}
        {note && <Banner tone="gray">{note}</Banner>}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="attachments">Images, graphs and files</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="results">
          <div className="space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Stages test={test} busy={action.isPending} onComplete={complete} />
              <Card>
                <CardHeader title="Instrument and analyst" />
                <div className="space-y-2 p-4 text-[13px]">
                  {entering ? (
                    <Field
                      label="Instrument"
                      htmlFor="entry-instrument"
                      error={instrumentError ?? undefined}
                      hint={test.blockOverdueInstruments ? 'Instruments overdue for calibration cannot be used.' : undefined}
                    >
                      <Select
                        id="entry-instrument"
                        className="h-11"
                        value={drafts[INSTRUMENT] ?? ''}
                        aria-invalid={!!instrumentError}
                        onChange={(e) => {
                          setInstrumentError(null);
                          edit({ instrumentId: e.target.value || null }, INSTRUMENT, e.target.value);
                          void queue.flush();
                        }}
                      >
                        <option value="">None</option>
                        {test.instruments.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.code} — {i.name}
                            {i.calibrationOverdue ? ' (calibration overdue)' : ''}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <div>
                      <h3 className="text-xs font-medium text-gray-600">Instrument</h3>
                      <p className="text-gray-900">{chosenInstrument ? `${chosenInstrument.code} — ${chosenInstrument.name}` : '—'}</p>
                    </div>
                  )}
                  {test.instrumentWarning && (
                    <p role="status" className="rounded bg-amber-100 p-2 text-amber-900">
                      {test.instrumentWarning}
                    </p>
                  )}
                  <div>
                    <h3 className="text-xs font-medium text-gray-600">Test conducted by</h3>
                    <p className="text-gray-900">{test.conductedByName ?? '—'}</p>
                  </div>
                </div>
              </Card>
              {hasInstructions && (
                <Card>
                  <CardHeader title="Instructions" />
                  <div className="space-y-2 p-4">
                    {test.analysisMode && <Instruction label="Analysis mode" text={test.analysisMode === 'SPECTRO' ? 'Spectro' : 'Wet'} />}
                    {test.officeInstructions && <Instruction label="Office instructions" text={test.officeInstructions} />}
                    {test.technicalData && <Instruction label="Technical data" text={test.technicalData} />}
                  </div>
                </Card>
              )}
            </div>
            <Card>
              <CardHeader
                title="Results"
                description={
                  entering ? 'Saved as you type. Enter moves to the next reading. For a result below or above what the method can measure, type < or > before it, for example <0.005.' : undefined
                }
                actions={
                  <span className="text-[13px] text-gray-700">
                    Overall: <Outcome outcome={test.outcome} />
                  </span>
                }
              />
              <ResultTable results={test.results} entry={entering ? entry : undefined} caption={`Results for ${test.testCode}`} />
            </Card>
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <Card>
                <CardHeader title="Remarks, observations and notes" />
                <div className="space-y-3 p-4">
                  {TEXT_FIELDS.map(({ key: field, label }) => (
                    <RemarkField
                      key={field}
                      test={test}
                      field={field}
                      label={label}
                      value={drafts[field] ?? ''}
                      onChange={(text) => edit({ [field]: text.trim() === '' ? null : text }, field, text)}
                      onFocus={() => (focused.current = field)}
                      onBlur={onBlur}
                    />
                  ))}
                </div>
              </Card>
              {entering && <UnitConverter conversions={test.conversions} />}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="attachments">
          <TestFiles testId={test.id} canEdit={test.canEdit} />
        </TabsContent>
        <TabsContent value="history">
          {history.isLoading && <Spinner />}
          {history.error && <ErrorState error={history.error} onRetry={history.refetch} />}
          {history.data && <HistoryList entries={history.data} />}
        </TabsContent>
      </Tabs>
      {entering && (
        <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-2 shadow-sm">
          <SaveIndicator status={status} canRetry={queue.hasUnsaved()} onRetry={() => void queue.flush()} />
          <Button className="h-11" loading={submit.isPending} onClick={() => setDialog('submit')}>
            Submit results
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={dialog === 'submit'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Submit these results?"
        description="They go for approval and can no longer be changed unless they are sent back."
        confirmLabel="Submit results"
        loading={submit.isPending}
        onConfirm={() => submit.mutate()}
      />
      <ReasonDialog
        open={dialog === 'hold'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Put this test on hold"
        description="Work stops until the hold is released."
        confirmLabel="Put on hold"
        loading={action.isPending}
        onConfirm={hold}
      />
      <ConfirmDialog
        open={dialog === 'release'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Release the hold?"
        description="The test returns to the status it had before."
        confirmLabel="Release hold"
        loading={action.isPending}
        onConfirm={release}
      />
      <ConfirmDialog
        open={leaving}
        onOpenChange={(o) => {
          if (!o) {
            setLeaving(false);
            blocker.reset?.();
          }
        }}
        title="Leave without saving?"
        description="Some of your entries could not be saved. They will be lost if you leave this page."
        confirmLabel="Leave anyway"
        danger
        onConfirm={() => {
          setLeaving(false);
          blocker.proceed?.();
        }}
      />
    </>
  );
}
