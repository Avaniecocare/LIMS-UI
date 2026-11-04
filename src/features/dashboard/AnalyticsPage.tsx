import { lazy, Suspense, type ReactNode } from 'react';
import { ErrorState, PageHeader, Spinner } from '@/components/ui/primitives';
import { humanize } from '@/lib/format';
import { CalibrationsDue, MetricGrid, RangeFilter, useDashboard } from './parts';

// Recharts stays in this chunk, so only people who open Analytics ever download it.
const BarPanel = lazy(() => import('./charts').then((m) => ({ default: m.BarPanel })));
const BilledCollectedPanel = lazy(() => import('./charts').then((m) => ({ default: m.BilledCollectedPanel })));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={`${title} charts`} className="space-y-3">
      <Suspense fallback={<Spinner label={`Loading ${title.toLowerCase()} charts`} />}>
        <div className="grid gap-3 lg:grid-cols-2">{children}</div>
      </Suspense>
    </section>
  );
}

export default function AnalyticsPage() {
  const { q, list } = useDashboard();
  const d = q.data;
  return (
    <>
      <PageHeader title="Analytics" actions={<RangeFilter dashboard={d} onChange={list.setFilter} />} />
      {q.isLoading && <Spinner />}
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
      {d && (
        <div className="space-y-5">
          {d.operations && (
            <div className="space-y-3">
              <MetricGrid title="Operations" metrics={d.operations.metrics} />
              <Section title="Operations">
                <BarPanel title="Samples by status" points={d.operations.samplesByStatus.map((p) => ({ ...p, label: humanize(p.label) }))} />
                <BarPanel title="Tests by stage" points={d.operations.testsByStage} />
              </Section>
            </div>
          )}
          {d.quality && (
            <div className="space-y-3">
              <MetricGrid title="Quality" metrics={d.quality.metrics} />
              <Section title="Quality">
                <BarPanel title="Rejection reasons" points={d.quality.rejectionReasons.map((r) => ({ label: r.reason, value: r.count, link: null }))} />
              </Section>
            </div>
          )}
          {d.people && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">People and equipment</h2>
              <Section title="People and equipment">
                <BarPanel title="Output by technician" points={d.people.byTechnician} />
                <BarPanel title="Output by instrument" points={d.people.byInstrument} />
              </Section>
              <CalibrationsDue rows={d.people.calibrationsDue} />
            </div>
          )}
          {d.commercial && (
            <div className="space-y-3">
              <MetricGrid title="Commercial" metrics={d.commercial.metrics} />
              <Section title="Commercial">
                <BilledCollectedPanel points={d.commercial.billedVsCollected} />
                <BarPanel title="Ageing of what is outstanding" points={d.commercial.ageing} money />
                <BarPanel title="Top customers" points={d.commercial.topCustomers} money />
                <BarPanel title="Top tests" points={d.commercial.topTests} money />
              </Section>
            </div>
          )}
        </div>
      )}
    </>
  );
}
