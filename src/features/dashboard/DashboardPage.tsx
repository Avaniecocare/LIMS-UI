import { AlarmClock, BadgeCheck, Microscope, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsPhone } from '@/app/device';
import { useSession } from '@/app/providers';
import { CameraScanButton } from '@/components/CameraScan';
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

/** Phones: the few things people do on the move, one tap away. Only those this person may do. */
function QuickActions() {
  const { can, moduleOn } = useSession();
  const actions = [
    can('tests.work') && { to: '/my-tests', label: 'My tests', icon: Microscope },
    can('tests.approve', 'reports.review', 'reports.approve', 'reports.issue') && { to: '/approvals', label: 'To approve', icon: BadgeCheck },
    can('dispatch.view') && moduleOn('dispatch') && { to: '/dispatch', label: 'Dispatch', icon: Send },
    can('invoices.view') && moduleOn('billing') && { to: '/due-invoices', label: 'Due invoices', icon: AlarmClock },
  ].filter((a): a is { to: string; label: string; icon: typeof Microscope } => !!a);
  return (
    <section aria-label="Quick actions" className="space-y-2">
      <CameraScanButton className="w-full" />
      {actions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <Link key={a.to} to={a.to} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-surface px-3 py-3 text-sm font-medium text-gray-900 transition-colors duration-(--motion-fast) active:bg-gray-100">
              <a.icon className="size-5 text-brand" aria-hidden />
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** What is waiting on this user, then a compact summary. Charts live on Analytics, so this page never loads them. */
export default function DashboardPage() {
  const { user, can } = useSession();
  const { q, list } = useDashboard();
  const phone = useIsPhone();
  const d = q.data;
  const filters = (
    <>
      <RangeFilter dashboard={d} onChange={list.setFilter} />
      {can('analytics.operations', 'analytics.quality', 'analytics.people', 'analytics.commercial') && (
        <Link to={`/analytics${window.location.search}`} className="text-[13px] font-medium text-gray-900 underline">
          Open analytics
        </Link>
      )}
    </>
  );
  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome, ${user?.name}`} actions={phone ? undefined : filters} />
      {phone && (
        <div className="mb-4 space-y-3">
          <QuickActions />
          <details className="rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-gray-800">Date range</summary>
            <div className="mt-2 flex flex-col items-start gap-2">{filters}</div>
          </details>
        </div>
      )}
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
