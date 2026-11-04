import { Link } from 'react-router-dom';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/primitives';
import { useMisCatalog } from './catalog';

export default function ReportsPage() {
  const q = useMisCatalog();
  const groups = new Map<string, NonNullable<typeof q.data>>();
  for (const r of q.data ?? []) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  return (
    <>
      <PageHeader title="Reports" description="Open a report to filter it and export it to Excel or PDF." />
      {q.isLoading && <Spinner />}
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
      {q.data?.length === 0 && <EmptyState title="No reports are available to you" />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...groups.entries()].map(([group, reports]) => (
          <Card key={group}>
            <CardHeader title={group} />
            <ul className="divide-y divide-gray-100">
              {reports.map((r) => (
                <li key={r.key}>
                  <Link to={`/reports/${r.key}`} className="block px-4 py-2 text-[13px] text-gray-900 underline-offset-2 hover:bg-gray-50 hover:underline">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
