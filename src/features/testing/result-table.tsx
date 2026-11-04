import { Check, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { components } from '@/api/schema';
import { Input, Select } from '@/components/ui/primitives';
import { cn } from '@/lib/format';
import { isNumberText } from './autosave';

export type ParameterResult = components['schemas']['ParameterResultDto'];
type Limit = components['schemas']['LimitDto'];

/** Pass and fail always carry words as well as colour. */
export function PassFail({ pass }: { pass: boolean | null }) {
  if (pass === null) return <span className="text-gray-600">—</span>;
  return pass ? (
    <span className="inline-flex items-center gap-1 font-semibold text-green-800">
      <Check className="size-3.5" aria-hidden />
      Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-red-800">
      <X className="size-3.5" aria-hidden />
      Fail
    </span>
  );
}

/** The server's overall result for a test. */
export function Outcome({ outcome }: { outcome: string }) {
  if (outcome === 'PASS') return <PassFail pass />;
  if (outcome === 'FAIL') return <PassFail pass={false} />;
  return <span className="text-gray-700">No limits</span>;
}

function limitText(l: Limit) {
  if (l.text) return l.text;
  if (l.min !== null && l.max !== null) return `${l.min} to ${l.max}`;
  if (l.min !== null) return `min ${l.min}`;
  if (l.max !== null) return `max ${l.max}`;
  return '—';
}

export function Limits({ limits }: { limits: Limit[] }) {
  if (!limits.length) return <span className="text-gray-600">—</span>;
  return (
    <ul className="space-y-0.5">
      {limits.map((l) => (
        <li key={`${l.role}-${l.spec}`}>
          <span className="text-gray-700">{l.spec}: </span>
          <span className="font-medium whitespace-nowrap text-gray-900 tabular-nums">{limitText(l)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Pass or fail against each grade, exactly as the server decided it. */
export function Verdicts({ result }: { result: ParameterResult }) {
  if (!result.limits.length) return <PassFail pass={result.passPrimary} />;
  return (
    <ul className="space-y-0.5">
      {result.limits.map((l) => (
        <li key={`${l.role}-${l.spec}`} className="whitespace-nowrap">
          {result.limits.length > 1 && <span className="text-gray-700">{l.spec}: </span>}
          <PassFail pass={l.role === 'dual' ? result.passDual : result.passPrimary} />
        </li>
      ))}
    </ul>
  );
}

const failed = (r: ParameterResult) => r.passPrimary === false || r.passDual === false;

function Calculation({ result }: { result: ParameterResult }) {
  const calc = result.calculation as ParameterResult['calculation'] | null;
  return (
    <div className="space-y-0.5">
      <output className="block text-base font-semibold text-gray-900 tabular-nums">{result.value ?? '—'}</output>
      {result.error && <p className="text-xs text-amber-900">{result.error}</p>}
      {calc && (
        <>
          <p className="font-mono text-xs break-words text-gray-700">{calc.working}</p>
          <p className="text-xs break-words text-gray-600">
            {Object.entries(calc.inputs)
              .map(([k, v]) => `${k} = ${v}`)
              .join(', ')}
          </p>
        </>
      )}
    </div>
  );
}

export interface EntryHandlers {
  drafts: Record<string, string>;
  /** The server's message for an entry it refused, by parameter id. */
  errors?: Record<string, string>;
  onChange: (result: ParameterResult, text: string) => void;
  onFocus: (key: string) => void;
  onBlur: () => void;
}

/** Enter moves on like Tab does, so a column of readings can be keyed without leaving the keyboard. */
function moveOnEnter(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter') return;
  const target = e.target as HTMLElement;
  if (!target.matches('[data-entry]')) return;
  e.preventDefault();
  const inputs = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-entry]'));
  const next = inputs[inputs.indexOf(target as HTMLInputElement) + 1];
  if (!next) {
    target.blur();
    return;
  }
  next.focus();
  if (next instanceof HTMLInputElement) next.select();
}

function ResultInput({ result, entry }: { result: ParameterResult; entry: EntryHandlers }) {
  const value = entry.drafts[result.parameterId] ?? '';
  const label = `${result.name}${result.unit ? ` in ${result.unit}` : ''}`;
  const shared = { 'data-entry': true, 'aria-label': label, className: 'h-11', onFocus: () => entry.onFocus(result.parameterId), onBlur: entry.onBlur };
  const errorId = `${result.parameterId}-error`;
  const refused = entry.errors?.[result.parameterId];
  if (result.kind === 'RESULT_SET') {
    return (
      <>
      <Select {...shared} value={value} aria-invalid={!!refused} aria-describedby={refused ? errorId : undefined} onChange={(e) => entry.onChange(result, e.target.value)}>
        <option value="">Choose…</option>
        {result.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value}
          </option>
        ))}
      </Select>
      {refused && (
        <p id={errorId} className="mt-1 text-xs text-red-800">
          {refused}
        </p>
      )}
      </>
    );
  }
  const invalid = result.kind === 'NUMERIC' && value.trim() !== '' && !isNumberText(value);
  const error = invalid ? 'Enter a number' : (refused ?? result.error);
  return (
    <>
      <Input {...shared} className={cn('h-11', result.kind === 'NUMERIC' && 'tabular-nums')} inputMode={result.kind === 'NUMERIC' ? 'decimal' : undefined} autoComplete="off" value={value} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={(e) => entry.onChange(result, e.target.value)} />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-800">
          {error}
        </p>
      )}
    </>
  );
}

function shownValue(r: ParameterResult) {
  return <span className="text-sm font-medium text-gray-900 tabular-nums">{r.value ?? '—'}</span>;
}

/** Every parameter of a test. With `entry` the values can be edited; without it the table only reads. */
export function ResultTable({ results, entry, caption }: { results: ParameterResult[]; entry?: EntryHandlers; caption: string }) {
  if (!results.length) return <p className="p-4 text-[13px] text-gray-600">This test has no parameters.</p>;
  return (
    <div className="overflow-x-auto" onKeyDown={entry ? moveOnEnter : undefined}>
      <table className="w-full min-w-[44rem] text-[13px]" aria-label={caption}>
        <thead className="bg-gray-50 text-left text-xs text-gray-700">
          <tr>
            {['Parameter', 'Result', 'Unit', 'Limits', 'Pass or fail'].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.parameterId} data-parameter={r.code} className={cn('border-t border-gray-100 align-top', failed(r) && 'bg-red-50')}>
              <th scope="row" className="px-3 py-2 text-left font-medium text-gray-900">
                {r.name}
                <span className="block text-xs font-normal text-gray-600">
                  {r.code}
                  {r.accredited && ' · Accredited'}
                </span>
              </th>
              <td className="w-64 px-3 py-2">{r.kind === 'CALCULATED' ? <Calculation result={r} /> : entry ? <ResultInput result={r} entry={entry} /> : shownValue(r)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-800">{r.unit ?? '—'}</td>
              <td className="px-3 py-2">
                <Limits limits={r.limits} />
              </td>
              <td className="px-3 py-2">
                <Verdicts result={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
