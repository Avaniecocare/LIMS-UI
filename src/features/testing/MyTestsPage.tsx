import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { components } from '@/api/schema';
import { DataTable, type Col } from '@/components/DataTable';
import { SavedFilters, SearchBox, StatusBadge } from '@/components/shared';
import { Badge, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useListState } from '@/lib/use-list-state';

type Item = components['schemas']['WorklistItemDto'];

export default function MyTestsPage() {
  const navigate = useNavigate();
  const list = useListState();
  const view = list.filters.view === 'done' ? 'done' : 'open';
  const q = useQuery({ queryKey: ['my-tests', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/tests/my', { params: { query: list.query } })) });
  const showCustomer = q.data?.data.some((t) => t.customerName !== null) ?? false;

  const columns = useMemo<Col<Item>[]>(
    () => [
      {
        id: 'test',
        header: 'Test',
        cell: ({ row: { original: t } }) => (
          <>
            <span className="font-medium">{t.testCode}</span> — {t.testName}
            {t.analysisMode && <span className="block text-xs text-gray-600">{t.analysisMode === 'SPECTRO' ? 'Spectro' : 'Wet'}</span>}
          </>
        ),
      },
      { accessorKey: 'sampleNo', id: 'sampleNo', header: 'Sample' },
      { accessorKey: 'jobNo', id: 'jobNo', header: 'Job' },
      ...(showCustomer ? [{ id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' } as Col<Item>] : []),
      { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: 'stage', header: 'Current stage', cell: ({ row }) => row.original.currentStage ?? '—' },
      {
        id: 'due',
        header: 'Due',
        cell: ({ row: { original: t } }) => (
          <span className="flex flex-wrap items-center gap-1 whitespace-nowrap">
            {formatDate(t.dueDate)}
            {t.overdue && <Badge tone="red">Overdue</Badge>}
          </span>
        ),
      },
      { id: 'urgent', header: 'Urgent', cell: ({ row }) => (row.original.urgent ? <Badge tone="red">Urgent</Badge> : <span className="text-gray-600">—</span>) },
      {
        id: 'attention',
        header: 'Needs attention',
        cell: ({ row: { original: t } }) =>
          t.rejectionReason || t.holdReason ? (
            <div className="max-w-sm space-y-0.5">
              {t.rejectionReason && (
                <p className="font-medium text-red-800">
                  Sent back: <span className="font-normal">{t.rejectionReason}</span>
                </p>
              )}
              {t.holdReason && (
                <p className="font-medium text-amber-900">
                  On hold: <span className="font-normal">{t.holdReason}</span>
                </p>
              )}
            </div>
          ) : (
            <span className="text-gray-600">—</span>
          ),
      },
    ],
    [showCustomer],
  );

  return (
    <>
      <PageHeader title="My Tests" description="Most urgent first, then soonest due." />
      <Tabs value={view} onValueChange={(v) => list.applyFilters(v === 'done' ? { view: 'done' } : {})}>
        <TabsList className="mb-3">
          <TabsTrigger value="open">To do</TabsTrigger>
          <TabsTrigger value="done">Submitted and approved</TabsTrigger>
        </TabsList>
      <TabsContent value={view} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search test, sample or job" label="Search my tests" />
          <SavedFilters screen="my-tests" current={list.allParams} onApply={list.applyFilters} />
        </div>
        <DataTable ariaLabel="My tests" columns={columns} rows={q.data?.data} meta={q.data?.meta} loading={q.isLoading} error={q.error} onRetry={q.refetch} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(t) => navigate(`/my-tests/${t.id}`)} getRowId={(t) => t.id} emptyTitle={view === 'open' ? 'Nothing is waiting for you' : 'Nothing submitted yet'} />
      </TabsContent>
      </Tabs>
    </>
  );
}
