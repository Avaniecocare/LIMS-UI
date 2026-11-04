import { Link } from 'react-router-dom';
import { useSession } from '@/app/providers';
import { Card, CardHeader, ErrorState, PageHeader, Spinner } from '@/components/ui/primitives';
import { CalibrationsDue, MetricGrid, RangeFilter, useDashboard, type Dashboard } from './parts';

function MyWork({ items }: { items: Dashboard['myWork'] }) {
  return (
    <Card>
      <CardHeader title="My work" />
      {items.length ? (
        <ul className="divide-y divide-gray-100">
          {items.map((w) => (
            <li key={w.key}>
              <Link to={w.link} data-work={w.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-900 hover:bg-gray-50">
                <span className="underline-offset-2 hover:underline">{w.label}</span>
                <span className="text-base font-semibold tabular-nums">{w.count.toLocaleString('en-IN')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-[13px] text-gray-700">Nothing is waiting on you right now.</p>
      )}
    </Card>
  );
}

/** What is waiting on this user, then a compact summary. Charts live on Analytics, so this page never loads them. */
export default function DashboardPage() {
  const { user, can } = useSession();
  const { q, list } = useDashboard();
  const d = q.data;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome, ${user?.name}`}
        actions={
          <>
            <RangeFilter dashboard={d} onChange={list.setFilter} />
            {can('analytics.operations', 'analytics.quality', 'analytics.people', 'analytics.commercial') && (
              <Link to={`/analytics${window.location.search}`} className="text-[13px] font-medium text-gray-900 underline">
                Open analytics
              </Link>
            )}
          </>
        }
      />
      {q.isLoading && <Spinner />}
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
      {d && (
        <div className="space-y-4">
          <MyWork items={d.myWork} />
          {d.operations && <MetricGrid title="Operations" metrics={d.operations.metrics} />}
          {d.quality && <MetricGrid title="Quality" metrics={d.quality.metrics} />}
          {d.commercial && <MetricGrid title="Commercial" metrics={d.commercial.metrics} />}
          {d.people && <CalibrationsDue rows={d.people.calibrationsDue} />}
        </div>
      )}
    </>
  );
}
