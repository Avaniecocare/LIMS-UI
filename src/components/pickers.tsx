import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useSession } from '@/app/providers';
import { Badge, Checkbox, Input } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';

export interface PickerOption {
  value: string;
  label: string;
  hint?: string | null;
}

/** Type-to-find picker for lists too long for a native select. The list itself comes from the server. */
export function AsyncPicker({ id, name, value, onChange, search, resolve, placeholder, disabled, invalid, ariaLabel }: { id?: string; name: string; value: string; onChange: (value: string) => void; search: (q: string) => Promise<PickerOption[]>; resolve: (value: string) => Promise<string>; placeholder?: string; disabled?: boolean; invalid?: boolean; ariaLabel?: string }) {
  const listId = useId();
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const q = useDebounced((text ?? '').trim(), 200);
  const options = useQuery({ queryKey: ['picker', name, q], enabled: open, staleTime: 15_000, queryFn: () => search(q) });
  const label = useQuery({ queryKey: ['picker-label', name, value], enabled: !!value, staleTime: 60_000, queryFn: () => resolve(value) });
  const items = options.data ?? [];
  const pick = (o: PickerOption) => {
    onChange(o.value);
    setText(null);
    setOpen(false);
    setActive(-1);
  };
  return (
    <div className="relative" onMouseDown={(e) => (e.target as HTMLElement).tagName !== 'INPUT' && e.preventDefault()}>
      <Input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={text ?? (value ? (label.data ?? '') : '')}
        onChange={(e) => {
          setText(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (text === '') onChange('');
          setText(null);
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            if (items.length) setActive((i) => (i + 1) % items.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length) setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
          } else if (e.key === 'Enter' && open) {
            // Enter chooses here; it must not submit the surrounding form.
            e.preventDefault();
            const chosen = items[active] ?? (items.length === 1 ? items[0] : undefined);
            if (chosen) pick(chosen);
          }
        }}
      />
      <div id={listId} role="listbox" hidden={!open} className="absolute top-full left-0 z-30 mt-1 max-h-60 w-full min-w-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
        {open &&
          items.map((o, i) => (
            <button key={o.value} id={`${listId}-${i}`} type="button" role="option" aria-selected={o.value === value} tabIndex={-1} className={cn('flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[13px]', i === active ? 'bg-gray-100' : 'hover:bg-gray-50')} onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
              <span className="truncate text-gray-900">{o.label}</span>
              {o.hint && <span className="shrink-0 text-xs text-gray-600">{o.hint}</span>}
            </button>
          ))}
        {open && !items.length && <p className="px-2.5 py-2 text-[13px] text-gray-700">{options.isFetching ? 'Searching…' : options.error ? 'Could not load the list' : 'Nothing found'}</p>}
      </div>
    </div>
  );
}

export function CustomerPicker(props: { id?: string; value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean; ariaLabel?: string; placeholder?: string }) {
  return (
    <AsyncPicker
      name="customers"
      placeholder="Type a name or CRN"
      {...props}
      search={async (q) => unwrap(await api.GET('/api/v1/customers', { params: { query: { pageSize: 20, ...(q ? { q } : {}) } } })).data.map((c) => ({ value: c.id, label: c.name, hint: c.crn }))}
      resolve={async (id) => unwrap(await api.GET('/api/v1/customers/{id}', { params: { path: { id } } })).name}
    />
  );
}

export function JobPicker(props: { id?: string; value: string; onChange: (value: string) => void; ariaLabel?: string; placeholder?: string }) {
  return (
    <AsyncPicker
      name="jobs"
      placeholder="Type a job number"
      {...props}
      search={async (q) => unwrap(await api.GET('/api/v1/jobs', { params: { query: { pageSize: 20, ...(q ? { q } : {}) } } })).data.map((j) => ({ value: j.id, label: j.jobNo, hint: j.status.replace(/_/g, ' ').toLowerCase() }))}
      resolve={async (id) => unwrap(await api.GET('/api/v1/jobs/{id}', { params: { path: { id } } })).jobNo}
    />
  );
}

const STALE = 60_000;

export function useTests() {
  return useQuery({ queryKey: ['test-options'], staleTime: STALE, queryFn: async () => unwrap(await api.GET('/api/v1/masters/tests', { params: { query: { pageSize: 200 } } })).data });
}

export function useLookups(kind: 'DEVIATION_TYPE' | 'RECEIPT_MODE') {
  const { can } = useSession();
  return useQuery({ queryKey: ['lookups', kind], enabled: can('masters.view'), staleTime: STALE, queryFn: async () => unwrap(await api.GET('/api/v1/masters/lookups', { params: { query: { kind, pageSize: 200 } } })).data });
}

/** Choose any number of tests from the test master. */
export function TestMultiPicker({ id, label, value, onChange, disabled }: { id: string; label: string; value: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  const tests = useTests();
  const [filter, setFilter] = useState('');
  const needle = filter.trim().toLowerCase();
  const all = tests.data ?? [];
  const shown = needle ? all.filter((t) => `${t.code} ${t.name}`.toLowerCase().includes(needle)) : all;
  const chosen = all.filter((t) => value.includes(t.id));
  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-[13px] font-medium text-gray-700">{label}</legend>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label={`${label}: chosen`}>
          {chosen.map((t) => (
            <Badge key={t.id} tone="blue">
              {t.code}
            </Badge>
          ))}
        </div>
      )}
      <Input id={`${id}-filter`} className="h-8" type="search" aria-label={`Filter ${label.toLowerCase()}`} placeholder="Filter by code or name" value={filter} onChange={(e) => setFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} />
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
        {tests.isLoading && <p className="text-[13px] text-gray-600">Loading tests…</p>}
        {tests.error && <p className="text-[13px] text-red-800">The tests could not be loaded.</p>}
        {!tests.isLoading && !shown.length && <p className="text-[13px] text-gray-600">No test matches.</p>}
        {shown.map((t) => (
          <div key={t.id}>
            <Checkbox id={`${id}-${t.id}`} label={`${t.code} — ${t.name}`} checked={value.includes(t.id)} disabled={disabled} onCheckedChange={(v) => onChange(v ? [...value, t.id] : value.filter((x) => x !== t.id))} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
