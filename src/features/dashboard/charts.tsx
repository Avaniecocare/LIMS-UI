import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { components } from '@/api/schema';
import { Button, Card, CardHeader } from '@/components/ui/primitives';
import { formatINR, formatMonth } from '@/lib/format';
import { useLinkCheck } from './parts';

type Point = components['schemas']['ChartPointDto'];
type SeriesPoint = components['schemas']['ChartSeriesPointDto'];

// Fixed, validated for colour-blind separation and 3:1 contrast on white. Text never wears these colours.
const SERIES_1 = 'var(--brand-primary)';
const SERIES_2 = '#eb6834';
const INK = 'var(--color-gray-700)';
const GRID = 'var(--color-gray-200)';

const count = (v: number) => v.toLocaleString('en-IN');
const shorten = (text: string, max = 34) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function ChartTip({ active, label, rows }: { active?: boolean; label?: string; rows: { name?: string; value: string; color?: string }[] }) {
  if (!active || !rows.length) return null;
  return (
    <div className="max-w-64 rounded-md border border-gray-200 bg-surface px-2.5 py-1.5 text-xs text-gray-900 shadow">
      <p className="font-medium break-words">{label}</p>
      {rows.map((r) => (
        <p key={r.name ?? r.value} className="flex items-center gap-1.5 tabular-nums">
          {r.color && <span className="size-2 rounded-sm" style={{ background: r.color }} aria-hidden />}
          {r.name && `${r.name}: `}
          {r.value}
        </p>
      ))}
    </div>
  );
}

/** The same numbers as the chart, as links: this is the keyboard and screen reader route to them. */
function PointsTable({ title, points, money }: { title: string; points: Point[]; money?: boolean }) {
  const allowed = useLinkCheck();
  return (
    <table className="w-full text-[13px]" aria-label={`${title} as a table`}>
      <thead className="bg-gray-50 text-left text-xs text-gray-700">
        <tr>
          <th scope="col" className="px-3 py-1.5 font-semibold">
            Item
          </th>
          <th scope="col" className="px-3 py-1.5 text-right font-semibold">
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => {
          const value = money ? formatINR(p.value) : count(p.value);
          return (
            <tr key={p.label} className="border-t border-gray-100">
              <td className="px-3 py-1.5">{p.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {allowed(p.link) ? (
                  <Link to={p.link} className="underline" aria-label={`${p.label}: ${value}`}>
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** One measure across named items: thin horizontal bars in one colour, each going to its own records. */
export function BarPanel({ title, points, money }: { title: string; points: Point[]; money?: boolean }) {
  const [asTable, setAsTable] = useState(false);
  const allowed = useLinkCheck();
  const navigate = useNavigate();
  const text = (v: number) => (money ? formatINR(v) : count(v));
  const summary = points.map((p) => `${p.label}: ${text(p.value)}`).join(', ');
  const rowHeight = 32;
  return (
    <Card>
      <CardHeader
        title={title}
        actions={
          points.length > 0 && (
            <Button variant="ghost" size="sm" aria-pressed={asTable} aria-label={`Show ${title} as a table`} onClick={() => setAsTable((t) => !t)}>
              {asTable ? 'Chart' : 'Table'}
            </Button>
          )
        }
      />
      {!points.length ? (
        <p className="p-4 text-[13px] text-gray-700">No data for this period.</p>
      ) : asTable ? (
        <PointsTable title={title} points={points} money={money} />
      ) : (
        <div role="img" aria-label={`${title}. ${summary}`} className="px-2 py-3" style={{ height: points.length * rowHeight + 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={points} layout="vertical" margin={{ top: 0, right: money ? 88 : 40, bottom: 0, left: 4 }} barCategoryGap={8}>
              <XAxis type="number" hide domain={[0, 'dataMax']} />
              <YAxis
                type="category"
                dataKey="label"
                width={190}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                tick={{ fill: INK, fontSize: 12 }}
                tickFormatter={(v: string) => shorten(v)}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-gray-100)' }}
                isAnimationActive={false}
                content={({ active, payload }) => <ChartTip active={active} label={payload?.[0]?.payload?.label} rows={payload?.length ? [{ value: text(Number(payload[0].value)) }] : []} />}
              />
              <Bar
                dataKey="value"
                fill={SERIES_1}
                maxBarSize={18}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
                cursor={points.some((p) => allowed(p.link)) ? 'pointer' : undefined}
                onClick={(item) => {
                  const link = (item as unknown as { payload?: Point }).payload?.link;
                  if (allowed(link)) navigate(link);
                }}
              >
                <LabelList dataKey="value" position="right" formatter={(v) => text(Number(v))} style={{ fill: INK, fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

const BILLED = 'Billed';
const COLLECTED = 'Collected';

/** Two measures in the same currency on one axis, month by month. */
export function BilledCollectedPanel({ points }: { points: SeriesPoint[] }) {
  const [asTable, setAsTable] = useState(false);
  const data = points.map((p) => ({ ...p, month: formatMonth(p.label) }));
  const summary = data.map((p) => `${p.month}: billed ${formatINR(p.billed)}, collected ${formatINR(p.collected)}`).join('; ');
  return (
    <Card>
      <CardHeader
        title="Billed against collected"
        actions={
          points.length > 0 && (
            <Button variant="ghost" size="sm" aria-pressed={asTable} aria-label="Show billed against collected as a table" onClick={() => setAsTable((t) => !t)}>
              {asTable ? 'Chart' : 'Table'}
            </Button>
          )
        }
      />
      {!points.length ? (
        <p className="p-4 text-[13px] text-gray-700">No data for this period.</p>
      ) : asTable ? (
        <table className="w-full text-[13px]" aria-label="Billed against collected as a table">
          <thead className="bg-gray-50 text-left text-xs text-gray-700">
            <tr>
              {['Month', BILLED, COLLECTED].map((h) => (
                <th key={h} scope="col" className="px-3 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.label} className="border-t border-gray-100">
                <td className="px-3 py-1.5">{p.month}</td>
                <td className="px-3 py-1.5 tabular-nums">{formatINR(p.billed)}</td>
                <td className="px-3 py-1.5 tabular-nums">{formatINR(p.collected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-label={`Billed against collected. ${summary}`} className="h-64 px-2 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} />
              <YAxis width={80} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 12 }} tickFormatter={(v: number) => formatINR(v).replace(/\.00$/, '')} />
              <Tooltip
                cursor={{ fill: 'var(--color-gray-100)' }}
                isAnimationActive={false}
                content={({ active, label, payload }) => (
                  <ChartTip active={active} label={String(label ?? '')} rows={(payload ?? []).map((s) => ({ name: String(s.name), value: formatINR(Number(s.value)), color: String(s.color) }))} />
                )}
              />
              <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} formatter={(v) => <span style={{ color: INK, fontSize: 12 }}>{v}</span>} />
              <Bar dataKey="billed" name={BILLED} fill={SERIES_1} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="collected" name={COLLECTED} fill={SERIES_2} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
