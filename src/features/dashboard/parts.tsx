import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DateRangeFilter } from '@/components/shared';
import { Badge, Card, CardHeader } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { useListState } from '@/lib/use-list-state';
import { useMisCatalog } from '@/features/reports/catalog';
import { canOpenLink } from './links';

export type Dashboard = components['schemas']['DashboardDto'];
export type Metric = components['schemas']['MetricDto'];

/** The dashboard for the range in the URL. The server decides which sections this role receives. */
export function useDashboard() {
  const list = useListState();
  const { from, to } = list.filters;
  const q = useQuery({ queryKey: ['dashboard', from ?? '', to ?? ''], queryFn: async () => unwrap(await api.GET('/api/v1/dashboard', { params: { query: { ...(from ? { from } : {}), ...(to ? { to } : {}) } } })) });
  return { q, list };
}

export function RangeFilter({ dashboard, onChange }: { dashboard?: Dashboard; onChange: (key: 'from' | 'to', value: string | null) => void }) {
  return <DateRangeFilter label="Period" from={dashboard?.from ?? ''} to={dashboard?.to ?? ''} onChange={onChange} />;
}

/** Whether a server link leads somewhere this user may go. */
export function useLinkCheck() {
  const { can } = useSession();
  const catalog = useMisCatalog();
  const keys = useMemo(() => (catalog.data ? new Set(catalog.data.map((r) => r.key)) : undefined), [catalog.data]);
  return (link: string | null | undefined): link is string => !!link && canOpenLink(link, can, keys);
}

/** `display` is the server's own text; a bare decimal in it is money. */
export function metricText(m: Metric) {
  if (m.display === null || m.display === undefined) return m.value.toLocaleString('en-IN');
  return /^-?\d+(\.\d+)?$/.test(m.display) ? formatINR(m.display) : m.display;
}

export function MetricTile({ metric }: { metric: Metric }) {
  const allowed = useLinkCheck();
  const body = (
    <>
      <span className="block text-xs font-medium text-gray-700">{metric.label}</span>
      <span className="mt-0.5 block text-xl font-semibold text-gray-900 tabular-nums">{metricText(metric)}</span>
    </>
  );
  const shell = 'block rounded-lg border border-gray-200 bg-white px-3 py-2.5';
  return allowed(metric.link) ? (
    <Link to={metric.link} data-metric={metric.key} className={`${shell} hover:border-gray-400 hover:bg-gray-50`}>
      {body}
    </Link>
  ) : (
    <div data-metric={metric.key} className={shell}>
      {body}
    </div>
  );
}

export function MetricGrid({ title, metrics }: { title: string; metrics: Metric[] }) {
  return (
    <section aria-label={title} className="space-y-1.5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <MetricTile key={m.key} metric={m} />
        ))}
      </div>
    </section>
  );
}

export function CalibrationsDue({ rows }: { rows: NonNullable<Dashboard['people']>['calibrationsDue'] }) {
  return (
    <Card>
      <CardHeader title="Calibrations due" description="Within the next 30 days, and any overdue." />
      {rows.length ? (
        <ul className="divide-y divide-gray-100">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[13px]">
              <span className="text-gray-900">{c.name}</span>
              <span className="flex items-center gap-2 text-gray-800">
                {formatDate(c.dueDate)}
                {c.overdue && <Badge tone="red">Overdue</Badge>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-[13px] text-gray-700">No calibrations are due.</p>
      )}
    </Card>
  );
}
