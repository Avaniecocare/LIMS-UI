import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import type { paths } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { Attachments, DocumentButton, HistoryList, SearchBox } from '@/components/shared';
import { Badge, Button, Checkbox, ConfirmDialog, Dialog, ErrorState, Field, Input, PageHeader, Select, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, uploadFile, unwrap } from '@/lib/api';
import { cn, formatDate, formatINR } from '@/lib/format';
import { applyServerErrors, toastError } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';
import { fetchAllPages } from '@/lib/fetch-all';
import { useCloseGuard, useLeaveGuard } from '@/lib/use-leave-guard';

/*
 * The master screens share one implementation driven by the MASTERS configuration below.
 * Typing works in two layers:
 *  - Each master is declared with defineMaster<K>(), where K must be a CRUD master in the generated
 *    contract (`/api/v1/masters/{K}/{id}` exists) and its columns, option labels and nested editor are
 *    checked against that master's DTO. A renamed endpoint or field is a compile error there.
 *  - The generic screen (list, form, save) then works on a plain record (Row) and the form's values are
 *    validated by the server, as their shape depends on the configuration.
 */
type MasterKey = { [P in keyof paths]: P extends `/api/v1/masters/${infer K}/{id}` ? K : never }[keyof paths];
type ListResponse<K extends MasterKey> = `/api/v1/masters/${K}` extends infer P extends keyof paths
  ? paths[P] extends { get: { responses: { 200: { content: { 'application/json': infer R } } } } }
    ? R
    : never
  : never;
/** One record of master K as the list endpoint returns it. */
type MasterRecord<K extends MasterKey> = ListResponse<K> extends { data: (infer T)[] } ? T : never;
/** A record of any master, as the generic screen sees it. */
type Row = { id: string; version?: number; isActive?: boolean } & Record<string, unknown>;
type FormValues = Record<string, unknown>;
type Page = { data: Row[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };

/**
 * The one place master calls are made with a path built from configuration. openapi-fetch cannot type a
 * path chosen at run time, so the client is viewed loosely here; MasterKey keeps the paths honest.
 */
type LooseCall = (path: string, init: object) => Promise<{ data?: unknown }>;
const loose = api as unknown as { GET: LooseCall; POST: LooseCall; PATCH: LooseCall; DELETE: LooseCall };
const masterApi = {
  list: async (key: MasterKey, query: Record<string, unknown>) => (await loose.GET(`/api/v1/masters/${key}`, { params: { query } })).data as Page,
  create: async (key: MasterKey, body: object) => (await loose.POST(`/api/v1/masters/${key}`, { body })).data as Row,
  update: async (key: MasterKey, id: string, body: object) => (await loose.PATCH(`/api/v1/masters/${key}/{id}`, { params: { path: { id } }, body })).data as Row,
  remove: async (key: MasterKey, id: string) => loose.DELETE(`/api/v1/masters/${key}/{id}`, { params: { path: { id } } }),
  history: async (key: MasterKey, id: string) => (await loose.GET(`/api/v1/masters/${key}/{id}/history`, { params: { path: { id } } })).data as Parameters<typeof HistoryList>[0]['entries'],
};

type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
  /** options come from another master: build with sourceOf() */
  source?: Source;
  hint?: string;
  showIf?: (values: FormValues) => boolean;
  default?: unknown;
};

type Source = { master: MasterKey; label: (r: Row) => string; query?: Record<string, string> };

/** Options from another master, labelled from that master's own (typed) record. */
function sourceOf<S extends MasterKey>(master: S, label: (r: MasterRecord<S>) => string, query?: Record<string, string>): Source {
  return { master, label: label as unknown as (r: Row) => string, query };
}

type ExtraProps<K extends MasterKey> = { value: Partial<MasterRecord<K>>; onChange: (patch: Record<string, unknown>) => void; record: MasterRecord<K> | null };

type TypedConfig<K extends MasterKey> = Omit<MasterConfig, 'key' | 'columns' | 'extra'> & {
  key: K;
  columns: Col<MasterRecord<K>>[];
  extra?: (props: ExtraProps<K>) => ReactNode;
};

/** Checks one master's configuration against its DTO, then hands it to the generic screen. */
function defineMaster<K extends MasterKey>(cfg: TypedConfig<K>): MasterConfig {
  return cfg as unknown as MasterConfig;
}

type MasterConfig = {
  key: MasterKey;
  label: string;
  edit: string;
  view: string;
  importable?: boolean;
  searchable?: boolean;
  columns: Col<Row>[];
  fields: FieldDef[];
  /** nested editor shown below the fields */
  extra?: (props: { value: Row; onChange: (patch: Record<string, unknown>) => void; record: Row | null }) => ReactNode;
  filters?: FieldDef[];
};

const col = <T,>(accessorKey: keyof T & string, header: string, sortable = false): Col<T> => ({ accessorKey, header, enableSorting: sortable, id: accessorKey }) as Col<T>;
const dateCol = <T,>(key: { [F in keyof T]: T[F] extends string | null ? F : never }[keyof T] & string, header: string, sortable = false): Col<T> => ({
  id: key,
  header,
  enableSorting: sortable,
  cell: ({ row }) => formatDate(row.original[key] as string | null),
});
const activeCol: Col<Row> = { id: 'isActive', header: 'Status', cell: ({ row }) => <Badge tone={row.original.isActive ? 'green' : 'gray'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> };
const CODE_NAME: FieldDef[] = [
  { name: 'code', label: 'Code', required: true },
  { name: 'name', label: 'Name', required: true },
];
const testSource = sourceOf('tests', (r) => `${r.code} — ${r.name}`);
const unitSource = sourceOf('units', (r) => `${r.name} (${r.symbol})`);
const deptSource = sourceOf('departments', (r) => r.name);

/** Every record of a master (all pages), so a select never silently stops at the first 200. */
function useMasterRecords<S extends MasterKey>(master: S | null, query?: Record<string, string>) {
  return useQuery({
    queryKey: ['master-options', master ?? undefined, query],
    enabled: !!master,
    staleTime: 60_000,
    queryFn: async () => (await fetchAllPages((page) => masterApi.list(master!, { ...query, page, pageSize: 200 }))) as unknown as MasterRecord<S>[],
  });
}

function useOptions(source?: Source) {
  const q = useMasterRecords(source?.master ?? null, source?.query);
  return q as typeof q & { data: Row[] | undefined };
}

function FieldInput({ def, form }: { def: FieldDef; form: UseFormReturn<FormValues> }) {
  const options = useOptions(def.source);
  const id = `f-${def.name}`;
  const error = (form.formState.errors[def.name]?.message as string | undefined) ?? undefined;
  // Only fields with a condition, or checkboxes, need to follow values as they change.
  const values = useWatch({ control: form.control, disabled: !def.showIf && def.type !== 'checkbox' }) as FormValues;
  if (def.showIf && !def.showIf(values)) return null;
  if (def.type === 'checkbox') {
    return (
      <div className="pt-6">
        <Checkbox id={id} label={def.label} checked={!!values[def.name]} onCheckedChange={(v) => form.setValue(def.name, !!v, { shouldDirty: true })} />
      </div>
    );
  }
  const common = { id, 'aria-invalid': !!error, ...form.register(def.name) };
  return (
    <Field label={def.label} htmlFor={id} required={def.required} error={error} hint={def.hint} className={def.type === 'textarea' ? 'sm:col-span-2' : undefined}>
      {def.type === 'textarea' ? (
        <Textarea {...common} />
      ) : def.type === 'select' ? (
        <Select {...common}>
          <option value="">—</option>
          {def.source
            ? options.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {def.source!.label(r)}
                </option>
              ))
            : def.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
        </Select>
      ) : (
        <Input {...common} type={def.type ?? 'text'} step={def.type === 'number' ? 'any' : undefined} />
      )}
    </Field>
  );
}

function schemaFor(cfg: MasterConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of cfg.fields) {
    if (f.required && f.type !== 'checkbox') shape[f.name] = z.string().trim().min(1, `${f.label} is required`);
  }
  return z.object(shape).loose();
}

const toFormValue = (f: FieldDef, v: unknown) => {
  if (f.type === 'checkbox') return !!(v ?? f.default);
  if (f.type === 'date') return v ? String(v).slice(0, 10) : '';
  return v === null || v === undefined ? (f.default ?? '') : String(v);
};

const toPayload = (cfg: MasterConfig, values: FormValues, record: Row | null, extra: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const f of cfg.fields) {
    const v = values[f.name];
    if (f.showIf && !f.showIf(values)) continue;
    if (f.type === 'checkbox') out[f.name] = !!v;
    else if (v === '' || v === undefined) {
      if (record && f.type !== 'number') out[f.name] = f.type === 'select' || f.type === 'date' ? null : undefined;
    } else out[f.name] = f.type === 'number' ? Number(v) : v;
  }
  if (record) {
    out.version = record.version;
    out.isActive = values.isActive;
  }
  return { ...out, ...extra };
};

function MasterForm({ cfg, record, onDone, onDirtyChange }: { cfg: MasterConfig; record: Row | null; onDone: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const client = useQueryClient();
  const initial = useMemo(() => {
    const v: FormValues = { isActive: record?.isActive ?? true };
    for (const f of cfg.fields) v[f.name] = toFormValue(f, record?.[f.name]);
    return v;
  }, [cfg, record]);
  const form = useForm<FormValues>({ resolver: zodResolver(schemaFor(cfg)), defaultValues: initial });
  const [extra, setExtra] = useState<Record<string, unknown>>({});
  const dirty = form.formState.isDirty || Object.keys(extra).length > 0;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const m = useMutation({
    mutationFn: (values: FormValues) => {
      const body = toPayload(cfg, values, record, extra);
      return record ? masterApi.update(cfg.key, record.id, body) : masterApi.create(cfg.key, body);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['master', cfg.key] });
      client.invalidateQueries({ queryKey: ['master-options'] });
      // Pickers elsewhere (quotation, booking, planning) keep their own copies of tests and lookups.
      client.invalidateQueries({ queryKey: ['test-options'] });
      client.invalidateQueries({ queryKey: ['lookups'] });
      toast.success(`${cfg.label}: saved`);
      onDirtyChange(false);
      onDone();
    },
    onError: (e) =>
      applyServerErrors(
        e,
        form.setError,
        cfg.fields.map((f) => f.name),
      ),
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {cfg.fields.map((f) => (
          <FieldInput key={f.name} def={f} form={form} />
        ))}
        {record && (
          <div className="pt-6">
            <Checkbox id="f-isActive" label="Active" checked={!!form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', !!v, { shouldDirty: true })} />
          </div>
        )}
      </div>
      {cfg.extra?.({ value: { ...record, ...extra } as Row, onChange: (p) => setExtra((e) => ({ ...e, ...p })), record })}
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}

function ImportButton({ cfg }: { cfg: MasterConfig }) {
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ created: number; updated: number; errors: { row: number; message: string }[] } | null>(null);
  const m = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set('file', file);
      return uploadFile(`/masters/${cfg.key}/import`, form) as Promise<NonNullable<typeof result>>;
    },
    onSuccess: (r) => {
      setResult(r);
      client.invalidateQueries({ queryKey: ['master', cfg.key] });
    },
    onError: toastError,
  });
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".xlsx"
        className="sr-only"
        aria-label={`Import ${cfg.label} from Excel`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) m.mutate(f);
          e.target.value = '';
        }}
      />
      <Button variant="secondary" loading={m.isPending} onClick={() => input.current?.click()}>
        Import Excel
      </Button>
      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)} title="Import result">
        {result?.errors.length ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-red-800">Nothing was saved. Fix these rows and upload the file again.</p>
            <ul className="max-h-72 space-y-1 overflow-auto">
              {result.errors.map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm">
            {result?.created} created, {result?.updated} updated.
          </p>
        )}
      </Dialog>
    </>
  );
}

function Editor({ canEdit, cfg, record, onDone, onDirtyChange }: { canEdit: boolean; cfg: MasterConfig; record: Row | null; onDone: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [tab, setTab] = useState('details');
  const history = useQuery({
    queryKey: ['master-history', cfg.key, record?.id],
    enabled: !!record && tab === 'history',
    queryFn: () => masterApi.history(cfg.key, record!.id),
  });
  if (!record) return <MasterForm cfg={cfg} record={null} onDone={onDone} onDirtyChange={onDirtyChange} />;
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      {/* Kept mounted so typed changes (and the unsaved-changes warning) survive a look at History. */}
      <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
        <fieldset disabled={!canEdit} className="contents">
          <MasterForm cfg={cfg} record={record} onDone={onDone} onDirtyChange={onDirtyChange} />
        </fieldset>
        {cfg.key === 'instruments' && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <Attachments entity="Instrument" entityId={record.id} category="certificate" title="Calibration certificates" canEdit={canEdit} />
          </div>
        )}
      </TabsContent>
      <TabsContent value="history">{history.isLoading ? <Spinner /> : history.error ? <ErrorState error={history.error} /> : <HistoryList entries={history.data ?? []} />}</TabsContent>
    </Tabs>
  );
}

function MasterScreen({ cfg }: { cfg: MasterConfig }) {
  const { can } = useSession();
  const client = useQueryClient();
  const list = useListState();
  const canEdit = can(cfg.edit);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  // Unsaved changes in the open record: closing the dialog or leaving the page asks first.
  const [dirty, setDirty] = useState(false);
  const guard = useLeaveGuard(!!editing && dirty);
  const closeEditor = () => {
    setDirty(false);
    setEditing(null);
  };
  const closeGuard = useCloseGuard(dirty, closeEditor);
  const q = useQuery({ queryKey: ['master', cfg.key, list.query], queryFn: () => masterApi.list(cfg.key, list.query) });
  const del = useMutation({
    mutationFn: (id: string) => masterApi.remove(cfg.key, id),
    onSuccess: () => {
      setDeleting(null);
      client.invalidateQueries({ queryKey: ['master', cfg.key] });
      client.invalidateQueries({ queryKey: ['master-options'] });
      client.invalidateQueries({ queryKey: ['test-options'] });
      client.invalidateQueries({ queryKey: ['lookups'] });
    },
    onError: (e) => {
      setDeleting(null);
      toastError(e);
    },
  });
  const columns = useMemo<Col<Row>[]>(
    () => [
      ...cfg.columns,
      activeCol,
      ...(canEdit
        ? [
            {
              id: 'x',
              header: '',
              cell: ({ row }: { row: { original: Row } }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${String(row.original.code ?? row.original.name ?? 'record')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleting(row.original);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              ),
            },
          ]
        : []),
    ],
    [cfg, canEdit],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {cfg.searchable !== false && <SearchBox value={list.q} onChange={list.setSearch} placeholder={`Search ${cfg.label.toLowerCase()}`} label={`Search ${cfg.label}`} />}
        <Select aria-label="Status filter" className="w-32" value={list.filters.active ?? 'true'} onChange={(e) => list.setFilter('active', e.target.value === 'true' ? null : e.target.value)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="all">All</option>
        </Select>
        <div className="ml-auto flex flex-wrap gap-2">
          <DocumentButton kind={`master-export:${cfg.key}`}>Export Excel</DocumentButton>
          {canEdit && cfg.importable !== false && <ImportButton cfg={cfg} />}
          {canEdit && (
            <Button onClick={() => setEditing('new')}>
              <Plus aria-hidden />
              Add
            </Button>
          )}
        </div>
      </div>
      <DataTable
        ariaLabel={cfg.label}
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
        onRowClick={setEditing}
        getRowId={(r) => r.id}
      />
      <Dialog
        wide
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) closeGuard.requestClose();
        }}
        title={editing === 'new' ? `Add to ${cfg.label}` : `${canEdit ? 'Edit ' : ''}${String(editing?.code ?? editing?.name ?? '')}`}
      >
        {editing && <Editor key={editing === 'new' ? 'new' : editing.id} canEdit={canEdit} cfg={cfg} record={editing === 'new' ? null : editing} onDone={closeEditor} onDirtyChange={setDirty} />}
      </Dialog>
      {closeGuard.dialog}
      {guard.dialog}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this record?"
        description="Records already in use can only be deactivated."
        confirmLabel="Delete"
        danger
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

// ------------------------------------------------------------------ nested editors
type LimitDraft = { parameterId: string; parameterName: string; minValue: string; maxValue: string; textLimit: string };

function LimitsEditor({ value, onChange }: ExtraProps<'specifications'>) {
  const [limits, setLimits] = useState<LimitDraft[]>(() =>
    (value.limits ?? []).map((l) => ({ parameterId: l.parameterId, parameterName: l.parameterName, minValue: l.minValue ?? '', maxValue: l.maxValue ?? '', textLimit: l.textLimit ?? '' })),
  );
  const [testId, setTestId] = useState('');
  const tests = useMasterRecords('tests');
  const params = useMasterRecords(testId ? 'test-parameters' : null, { testId });
  const push = (next: LimitDraft[]) => {
    setLimits(next);
    onChange({ limits: next.map((l) => ({ parameterId: l.parameterId, minValue: l.minValue || undefined, maxValue: l.maxValue || undefined, textLimit: l.textLimit || undefined })) });
  };
  const set = (i: number, patch: Partial<LimitDraft>) => push(limits.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  return (
    <fieldset className="space-y-2 border-t border-gray-200 pt-3">
      <legend className="text-[13px] font-semibold">Parameter limits</legend>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Test" htmlFor="lim-test">
          <Select id="lim-test" className="w-64" value={testId} onChange={(e) => setTestId(e.target.value)}>
            <option value="">Choose a test</option>
            {tests.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Add parameter" htmlFor="lim-param">
          <Select
            id="lim-param"
            className="w-56"
            value=""
            onChange={(e) => {
              const p = params.data?.find((x) => x.id === e.target.value);
              if (p && !limits.some((l) => l.parameterId === p.id)) push([...limits, { parameterId: p.id, parameterName: p.name, minValue: '', maxValue: '', textLimit: '' }]);
            }}
          >
            <option value="">Choose a parameter</option>
            {params.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {limits.length > 0 && (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-gray-700">
              <th className="py-1 pr-2 font-semibold">Parameter</th>
              <th className="py-1 pr-2 font-semibold">Min</th>
              <th className="py-1 pr-2 font-semibold">Max</th>
              <th className="py-1 pr-2 font-semibold">Text limit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {limits.map((l, i) => (
              <tr key={l.parameterId}>
                <td className="py-1 pr-2">{l.parameterName}</td>
                <td className="py-1 pr-2">
                  <Input aria-label={`Minimum for ${l.parameterName}`} className="h-8" inputMode="decimal" value={l.minValue} onChange={(e) => set(i, { minValue: e.target.value })} />
                </td>
                <td className="py-1 pr-2">
                  <Input aria-label={`Maximum for ${l.parameterName}`} className="h-8" inputMode="decimal" value={l.maxValue} onChange={(e) => set(i, { maxValue: e.target.value })} />
                </td>
                <td className="py-1 pr-2">
                  <Input aria-label={`Text limit for ${l.parameterName}`} className="h-8" value={l.textLimit} onChange={(e) => set(i, { textLimit: e.target.value })} />
                </td>
                <td>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${l.parameterName}`} onClick={() => push(limits.filter((_, n) => n !== i))}>
                    <Trash2 aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </fieldset>
  );
}

type GroupItemDraft = { testId: string; testCode: string; testName: string; parameterId?: string | null };

function GroupItemsEditor({ value, onChange }: ExtraProps<'test-groups'>) {
  const tests = useMasterRecords('tests');
  const [items, setItems] = useState<GroupItemDraft[]>(value.items ?? []);
  const push = (next: GroupItemDraft[]) => {
    setItems(next);
    onChange({ items: next.map((x) => ({ testId: x.testId, parameterId: x.parameterId ?? undefined })) });
  };
  return (
    <fieldset className="space-y-2 border-t border-gray-200 pt-3">
      <legend className="text-[13px] font-semibold">Tests in this group</legend>
      <Select
        aria-label="Add a test"
        className="max-w-md"
        value=""
        onChange={(e) => {
          const t = tests.data?.find((x) => x.id === e.target.value);
          if (t && !items.some((i) => i.testId === t.id)) push([...items, { testId: t.id, testCode: t.code, testName: t.name }]);
        }}
      >
        <option value="">Add a test</option>
        {tests.data?.map((t) => (
          <option key={t.id} value={t.id}>
            {t.code} — {t.name}
          </option>
        ))}
      </Select>
      <ul className="divide-y divide-gray-100">
        {items.map((it) => (
          <li key={it.testId} className="flex items-center justify-between py-1 text-[13px]">
            {it.testCode} — {it.testName}
            <Button variant="ghost" size="icon" aria-label={`Remove ${it.testName}`} onClick={() => push(items.filter((x) => x.testId !== it.testId))}>
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

type ResultOptionDraft = { value: string; isPass: boolean | null };

function ResultOptionsEditor({ value, onChange }: ExtraProps<'result-sets'>) {
  const [options, setOptions] = useState<ResultOptionDraft[]>(value.options ?? []);
  const push = (next: ResultOptionDraft[]) => {
    setOptions(next);
    onChange({ options: next.map((o) => ({ value: o.value, isPass: o.isPass ?? undefined })) });
  };
  return (
    <fieldset className="space-y-2 border-t border-gray-200 pt-3">
      <legend className="text-[13px] font-semibold">Allowed results</legend>
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input aria-label={`Result ${i + 1}`} className="max-w-xs" value={o.value} onChange={(e) => push(options.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} />
          <Select
            aria-label={`Outcome of result ${i + 1}`}
            className="w-36"
            value={o.isPass === true ? 'pass' : o.isPass === false ? 'fail' : ''}
            onChange={(e) => push(options.map((x, n) => (n === i ? { ...x, isPass: e.target.value === '' ? null : e.target.value === 'pass' } : x)))}
          >
            <option value="">No outcome</option>
            <option value="pass">Counts as pass</option>
            <option value="fail">Counts as fail</option>
          </Select>
          <Button variant="ghost" size="icon" aria-label={`Remove result ${i + 1}`} onClick={() => push(options.filter((_, n) => n !== i))}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => push([...options, { value: '', isPass: null }])}>
        Add result
      </Button>
    </fieldset>
  );
}

function StagesEditor({ value, onChange }: ExtraProps<'tests'>) {
  const [text, setText] = useState<string>((value.stages ?? ['Sample Received by Analyst', 'Sample Preparation', 'Analysis', 'Calculation and Result Entry']).join('\n'));
  return (
    <Field label="Stages, one per line" htmlFor="stages" className="border-t border-gray-200 pt-3">
      <Textarea
        id="stages"
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange({
            stages: e.target.value
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          });
        }}
      />
    </Field>
  );
}

function FormulaConsole({ value }: { value: Partial<MasterRecord<'formulas'>> }) {
  const [expression, setExpression] = useState<string>(value.expression ?? '');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/masters/formula-console', { body: { expression, inputs, decimals: value.decimals ?? 2 } })),
    onError: toastError,
  });
  const vars = m.data?.variables ?? [];
  return (
    <fieldset className="space-y-2 border-t border-gray-200 pt-3">
      <legend className="text-[13px] font-semibold">Test console</legend>
      <div className="flex items-end gap-2">
        <Field label="Expression to try" htmlFor="fc-expr" className="flex-1">
          <Input id="fc-expr" className="font-mono" value={expression} onChange={(e) => setExpression(e.target.value)} />
        </Field>
        <Button variant="secondary" loading={m.isPending} onClick={() => m.mutate()}>
          Check
        </Button>
      </div>
      {vars.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vars.map((v) => (
            <Field key={v} label={v} htmlFor={`fc-${v}`}>
              <Input id={`fc-${v}`} className="h-8 w-24" inputMode="decimal" value={inputs[v] ?? ''} onChange={(e) => setInputs((i) => ({ ...i, [v]: e.target.value }))} />
            </Field>
          ))}
        </div>
      )}
      {m.data && (
        <p className={cn('text-[13px]', m.data.valid ? 'text-gray-800' : 'text-red-800')} role="status">
          {m.data.error ?? (m.data.value ? `Result ${m.data.value}. ${m.data.working}` : 'The formula is valid. Enter inputs and check again to see a result.')}
        </p>
      )}
      <p className="text-xs text-gray-600">Functions: avg, sum, min, max, abs, sqrt, round. Operators: + − * / ^ and brackets.</p>
    </fieldset>
  );
}

function BindingsEditor({ value, onChange }: ExtraProps<'test-parameters'>) {
  const [text, setText] = useState<string>(
    value.formulaBindings
      ? Object.entries(value.formulaBindings)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')
      : '',
  );
  return (
    <Field label="Formula inputs (variable=PARAMETER_CODE, one per line)" htmlFor="bindings" hint="Used when the kind is Calculated." className="border-t border-gray-200 pt-3">
      <Textarea
        id="bindings"
        className="font-mono text-[13px]"
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const out: Record<string, string> = {};
          for (const line of e.target.value.split('\n')) {
            const [k, v] = line.split('=').map((s) => s.trim());
            if (k && v) out[k] = v;
          }
          onChange({ formulaBindings: out });
        }}
      />
    </Field>
  );
}

const ACCREDITATION: FieldDef[] = [
  { name: 'accredited', label: 'In accreditation scope', type: 'checkbox' },
  { name: 'accreditedUntil', label: 'Accreditation valid until', type: 'date' },
];

const MASTERS: MasterConfig[] = [
  defineMaster<'tests'>({
    key: 'tests',
    label: 'Tests',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [
      col('code', 'Code', true),
      col('name', 'Name', true),
      col('category', 'Category'),
      col('departmentName', 'Department'),
      col('methodName', 'Method'),
      col('defaultTatDays', 'TAT (days)', true),
      col('parameterCount', 'Parameters'),
    ],
    fields: [
      ...CODE_NAME,
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: ['CHEMICAL', 'MECHANICAL', 'PHYSICAL', 'OTHER'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() })),
        default: 'OTHER',
      },
      { name: 'departmentId', label: 'Department', type: 'select', source: deptSource },
      { name: 'methodId', label: 'Test method', type: 'select', source: sourceOf('test-methods', (r) => `${r.code} — ${r.name}`) },
      { name: 'defaultTatDays', label: 'Default TAT (working days)', type: 'number', default: 5 },
      { name: 'urgentTatDays', label: 'Urgent TAT (working days)', type: 'number', default: 2 },
      { name: 'printAttachments', label: 'Print result images and instrument reports on the report by default', type: 'checkbox', default: true },
      ...ACCREDITATION,
    ],
    extra: (p) => <StagesEditor {...p} />,
  }),
  defineMaster<'test-parameters'>({
    key: 'test-parameters',
    label: 'Test parameters',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [
      col('testCode', 'Test'),
      col('code', 'Code', true),
      col('name', 'Name', true),
      col('kind', 'Kind'),
      col('unitSymbol', 'Unit'),
      col('decimals', 'Decimals'),
      col('sortOrder', 'Order', true),
      col('showOnReport', 'On report'),
    ],
    fields: [
      { name: 'testId', label: 'Test', type: 'select', required: true, source: testSource },
      ...CODE_NAME,
      {
        name: 'kind',
        label: 'Kind',
        type: 'select',
        required: true,
        options: [
          ['NUMERIC', 'Numeric'],
          ['TEXT', 'Text'],
          ['RESULT_SET', 'Result set'],
          ['CALCULATED', 'Calculated'],
        ].map(([value, label]) => ({ value, label })),
        default: 'NUMERIC',
      },
      { name: 'unitId', label: 'Unit', type: 'select', source: unitSource },
      { name: 'decimals', label: 'Decimal places', type: 'number', default: 2 },
      { name: 'sortOrder', label: 'Order', type: 'number', default: 0 },
      { name: 'showOnReport', label: 'Show on report (untick for working values such as dimensions, loads or individual readings)', type: 'checkbox', default: true },
      { name: 'resultSetId', label: 'Result set', type: 'select', source: sourceOf('result-sets', (r) => r.name), showIf: (v) => v.kind === 'RESULT_SET' },
      { name: 'formulaId', label: 'Formula', type: 'select', source: sourceOf('formulas', (r) => `${r.name}: ${r.expression}`), showIf: (v) => v.kind === 'CALCULATED' },
      ...ACCREDITATION,
    ],
    extra: (p) => <BindingsEditor {...p} />,
  }),
  defineMaster<'test-methods'>({
    key: 'test-methods',
    label: 'Test methods',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [col('code', 'Code', true), col('name', 'Name', true), col('standardRef', 'Standard')],
    fields: [...CODE_NAME, { name: 'standardRef', label: 'Standard reference' }, ...ACCREDITATION],
  }),
  defineMaster<'specifications'>({
    key: 'specifications',
    label: 'Specifications and grades',
    view: 'masters.view',
    edit: 'masters.edit',
    importable: false,
    columns: [
      col('code', 'Code', true),
      col('name', 'Name', true),
      { id: 'scope', header: 'Scope', cell: ({ row }) => (row.original.customerId ? 'Customer-specific' : 'General') },
      { id: 'limitCount', header: 'Limits', cell: ({ row }) => row.original.limits.length },
    ],
    fields: [...CODE_NAME, { name: 'customerId', label: 'Customer (for a customer-wise specification)', type: 'select', hint: 'Leave empty for a general specification.', source: undefined }],
    extra: (p) => <LimitsEditor {...p} />,
  }),
  defineMaster<'test-groups'>({
    key: 'test-groups',
    label: 'Test and chemical groups',
    view: 'masters.view',
    edit: 'masters.edit',
    importable: false,
    columns: [col('code', 'Code', true), col('name', 'Name', true), col('kind', 'Kind'), { id: 'n', header: 'Tests', cell: ({ row }) => row.original.items.length }],
    fields: [
      ...CODE_NAME,
      {
        name: 'kind',
        label: 'Kind',
        type: 'select',
        required: true,
        default: 'TEST',
        options: [
          { value: 'TEST', label: 'Test group' },
          { value: 'CHEMICAL', label: 'Chemical group' },
        ],
      },
    ],
    extra: (p) => <GroupItemsEditor {...p} />,
  }),
  defineMaster<'result-sets'>({
    key: 'result-sets',
    label: 'Result sets',
    view: 'masters.view',
    edit: 'masters.edit',
    importable: false,
    columns: [col('code', 'Code', true), col('name', 'Name', true), { id: 'o', header: 'Results', cell: ({ row }) => row.original.options.map((o) => o.value).join(', ') }],
    fields: CODE_NAME,
    extra: (p) => <ResultOptionsEditor {...p} />,
  }),
  defineMaster<'formulas'>({
    key: 'formulas',
    label: 'Formulas',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [
      col('code', 'Code', true),
      col('name', 'Name', true),
      { id: 'expr', header: 'Expression', cell: ({ row }) => <code className="text-xs">{row.original.expression}</code> },
      col('currentVersion', 'Version'),
    ],
    fields: [
      ...CODE_NAME,
      { name: 'expression', label: 'Expression', required: true, type: 'textarea', hint: 'Saving a changed expression creates a new version. Existing results keep the version they used.' },
      { name: 'decimals', label: 'Decimal places', type: 'number', default: 2 },
      { name: 'description', label: 'Description' },
    ],
    extra: (p) => <FormulaConsole value={p.value} />,
  }),
  defineMaster<'instruments'>({
    key: 'instruments',
    label: 'Instruments',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [
      col('code', 'Code', true),
      col('name', 'Name', true),
      col('departmentName', 'Department'),
      dateCol('lastCalibratedAt', 'Last calibrated'),
      {
        id: 'calibrationDueAt',
        header: 'Calibration due',
        enableSorting: true,
        cell: ({ row }) => (row.original.calibrationOverdue ? <Badge tone="red">{formatDate(row.original.calibrationDueAt)} overdue</Badge> : formatDate(row.original.calibrationDueAt)),
      },
    ],
    fields: [
      ...CODE_NAME,
      { name: 'serialNo', label: 'Serial no.' },
      { name: 'departmentId', label: 'Department', type: 'select', source: deptSource },
      { name: 'lastCalibratedAt', label: 'Last calibrated', type: 'date' },
      { name: 'calibrationDueAt', label: 'Calibration due', type: 'date' },
    ],
  }),
  defineMaster<'departments'>({
    key: 'departments',
    label: 'Departments',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [col('code', 'Code', true), col('name', 'Name', true)],
    fields: CODE_NAME,
  }),
  defineMaster<'units'>({
    key: 'units',
    label: 'Units',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [col('code', 'Code', true), col('name', 'Name', true), col('symbol', 'Symbol')],
    fields: [...CODE_NAME, { name: 'symbol', label: 'Symbol', required: true }],
  }),
  defineMaster<'unit-conversions'>({
    key: 'unit-conversions',
    label: 'Unit conversions',
    view: 'masters.view',
    edit: 'masters.edit',
    searchable: false,
    columns: [col('fromUnitCode', 'From'), col('toUnitCode', 'To'), col('factor', 'Multiply by')],
    fields: [
      { name: 'fromUnitId', label: 'From unit', type: 'select', required: true, source: unitSource },
      { name: 'toUnitId', label: 'To unit', type: 'select', required: true, source: unitSource },
      { name: 'factor', label: 'Multiply by', required: true },
    ],
  }),
  defineMaster<'standard-rates'>({
    key: 'standard-rates',
    label: 'Standard rates',
    view: 'rates.view',
    edit: 'rates.edit',
    columns: [
      col('testCode', 'Code'),
      col('testName', 'Test'),
      { id: 'rate', header: 'Rate (₹)', enableSorting: true, cell: ({ row }) => formatINR(row.original.rate) },
      dateCol('effectiveFrom', 'From', true),
      dateCol('effectiveTo', 'To'),
    ],
    fields: [
      { name: 'testId', label: 'Test', type: 'select', required: true, source: testSource },
      { name: 'rate', label: 'Rate (₹)', required: true },
      { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true },
      { name: 'effectiveTo', label: 'Effective to', type: 'date' },
    ],
  }),
  defineMaster<'customer-rates'>({
    key: 'customer-rates',
    label: 'Customer rates',
    view: 'rates.view',
    edit: 'rates.edit',
    columns: [
      col('customerName', 'Customer'),
      col('testName', 'Test'),
      { id: 'rate', header: 'Rate (₹)', enableSorting: true, cell: ({ row }) => formatINR(row.original.rate) },
      dateCol('effectiveFrom', 'From', true),
      dateCol('effectiveTo', 'To'),
    ],
    fields: [
      { name: 'customerId', label: 'Customer', type: 'select', required: true, source: undefined },
      { name: 'testId', label: 'Test', type: 'select', required: true, source: testSource },
      { name: 'rate', label: 'Rate (₹)', required: true },
      { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true },
      { name: 'effectiveTo', label: 'Effective to', type: 'date' },
    ],
  }),
  defineMaster<'remark-templates'>({
    key: 'remark-templates',
    label: 'Remark templates',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [col('code', 'Code', true), col('outcome', 'Suggest when'), col('text', 'Text')],
    fields: [
      { name: 'code', label: 'Code', required: true },
      {
        name: 'outcome',
        label: 'Suggest when',
        type: 'select',
        required: true,
        default: 'ANY',
        options: [
          { value: 'ANY', label: 'Any result' },
          { value: 'PASS', label: 'Result passes' },
          { value: 'FAIL', label: 'Result fails' },
        ],
      },
      { name: 'testId', label: 'Only for test', type: 'select', source: testSource },
      { name: 'text', label: 'Text', type: 'textarea', required: true },
    ],
  }),
  defineMaster<'lookups'>({
    key: 'lookups',
    label: 'Deviation types and modes',
    view: 'masters.view',
    edit: 'masters.edit',
    columns: [col('kind', 'Kind', true), col('code', 'Code', true), col('label', 'Label', true)],
    fields: [
      {
        name: 'kind',
        label: 'Kind',
        type: 'select',
        required: true,
        options: [
          { value: 'DEVIATION_TYPE', label: 'Deviation type' },
          { value: 'RECEIPT_MODE', label: 'Receipt mode' },
          { value: 'DISPATCH_MODE', label: 'Dispatch mode' },
        ],
      },
      { name: 'code', label: 'Code', required: true },
      { name: 'label', label: 'Label', required: true },
    ],
  }),
];

// Customers are not a master endpoint, so their select loads through the customers API.
function useCustomerSource(enabled: boolean) {
  return useQuery({
    queryKey: ['customer-options'],
    enabled,
    staleTime: 60_000,
    queryFn: () => fetchAllPages(async (page) => unwrap(await api.GET('/api/v1/customers', { params: { query: { page, pageSize: 200 } } }))),
  });
}

function withCustomers(cfg: MasterConfig, customers: { id: string; name: string; crn: string }[] | undefined): MasterConfig {
  return {
    ...cfg,
    fields: cfg.fields.map((f) => (f.name === 'customerId' ? { ...f, source: undefined, options: customers?.map((c) => ({ value: c.id, label: `${c.crn} — ${c.name}` })) ?? [] } : f)),
  };
}

export default function MastersPage() {
  const { can } = useSession();
  const { key } = useParams();
  const navigate = useNavigate();
  const available = MASTERS.filter((m) => can(m.view));
  const canSeeCustomers = can('customers.view');
  const customers = useCustomerSource(canSeeCustomers);
  const base = available.find((m) => m.key === key) ?? available[0];
  const cfg = useMemo(() => (base && canSeeCustomers ? withCustomers(base, customers.data) : base), [base, canSeeCustomers, customers.data]);
  if (!cfg) return null;
  return (
    <>
      <PageHeader title="Masters" description={cfg.label} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Masters" className="hidden flex-col gap-0.5 lg:flex">
          {available.map((m) => (
            <NavLink
              key={m.key}
              to={`/masters/${m.key}`}
              className={() => cn('rounded-md px-2.5 py-1.5 text-[13px]', m.key === cfg.key ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-100')}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 space-y-3">
          <Select aria-label="Choose a master" className="lg:hidden" value={cfg.key} onChange={(e) => navigate(`/masters/${e.target.value}`)}>
            {available.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </Select>
          <MasterScreen key={cfg.key} cfg={cfg} />
        </div>
      </div>
    </>
  );
}
