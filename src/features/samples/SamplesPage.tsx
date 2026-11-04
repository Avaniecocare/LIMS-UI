import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { DateRangeFilter, SavedFilters, SearchBox, StatusBadge } from '@/components/shared';
import { Badge, Button, PageHeader, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, humanize } from '@/lib/format';
import { useListState } from '@/lib/use-list-state';

type Job = components['schemas']['JobSummaryDto'];
type SampleRow = components['schemas']['SampleListItemDto'];

const UrgentBadge = ({ urgent }: { urgent: boolean }) => (urgent ? <Badge tone="red">Urgent</Badge> : <span className="text-gray-600">—</span>);

function StatusFilter({ value, onChange, options }: { value: string; onChange: (v: string | null) => void; options: string[] }) {
  return (
    <Select aria-label="Status filter" className="w-36" value={value} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">All statuses</option>
      {options.map((s) => (
        <option key={s} value={s}>
          {humanize(s)}
        </option>
      ))}
    </Select>
  );
}

const SAMPLE_STATUSES = ['RECEIVED', 'PLANNED', 'IN_TESTING', 'REPORTING', 'COMPLETED', 'CANCELLED'];

export default function SamplesPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const list = useListState();
  // The tab lives in the URL with the filters, but it is not an API parameter.
  const { tab: tabParam, ...query } = list.query as typeof list.query & { tab?: string };
  const tab = tabParam === 'samples' ? 'samples' : 'jobs';
  const identity = can('customers.view');

  const jobs = useQuery({ queryKey: ['jobs', query], enabled: tab === 'jobs', queryFn: async () => unwrap(await api.GET('/api/v1/jobs', { params: { query } })) });
  const samples = useQuery({ queryKey: ['samples', query], enabled: tab === 'samples', queryFn: async () => unwrap(await api.GET('/api/v1/samples', { params: { query } })) });

  const jobColumns = useMemo<Col<Job>[]>(
    () => [
      { accessorKey: 'jobNo', id: 'jobNo', header: 'Job', enableSorting: true },
      ...(identity ? [{ id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' } as Col<Job>] : []),
      { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: 'urgent', header: 'Urgent', cell: ({ row }) => <UrgentBadge urgent={row.original.urgent} /> },
      { accessorKey: 'sampleCount', id: 'sampleCount', header: 'Samples' },
      { id: 'receivedAt', header: 'Received', enableSorting: true, cell: ({ row }) => formatDate(row.original.receivedAt) },
      { id: 'hold', header: 'Hold reason', cell: ({ row }) => row.original.holdReason ?? '—' },
    ],
    [identity],
  );
  const sampleColumns = useMemo<Col<SampleRow>[]>(
    () => [
      { accessorKey: 'sampleNo', id: 'sampleNo', header: 'Sample', enableSorting: true },
      { accessorKey: 'description', id: 'description', header: 'Description' },
      { accessorKey: 'jobNo', id: 'jobNo', header: 'Job' },
      ...(identity ? [{ id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' } as Col<SampleRow>] : []),
      { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: 'urgent', header: 'Urgent', cell: ({ row }) => <UrgentBadge urgent={row.original.urgent} /> },
      { id: 'returnable', header: 'Returnable', cell: ({ row }) => (row.original.returnable ? 'Yes' : 'No') },
      { id: 'createdAt', header: 'Received', enableSorting: true, cell: ({ row }) => formatDate(row.original.receivedAt) },
    ],
    [identity],
  );

  return (
    <>
      <PageHeader
        title="Samples"
        actions={
          can('jobs.create') && (
            <Button onClick={() => navigate('/samples/new')}>
              <Plus aria-hidden />
              Book samples
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={(v) => list.applyFilters(v === 'samples' ? { tab: 'samples' } : {})}>
        <TabsList className="mb-3">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
        </TabsList>
      <TabsContent value={tab} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder={tab === 'jobs' ? 'Search job or customer' : 'Search sample, description or job'} label={tab === 'jobs' ? 'Search jobs' : 'Search samples'} />
          {tab === 'jobs' ? (
            <>
              <StatusFilter value={list.filters.status ?? ''} onChange={(v) => list.setFilter('status', v)} options={['RECEIVED', 'PLANNED', 'IN_TESTING', 'REPORTING', 'COMPLETED', 'ON_HOLD', 'CANCELLED']} />
              <Select aria-label="Urgent filter" className="w-32" value={list.filters.urgent ?? ''} onChange={(e) => list.setFilter('urgent', e.target.value || null)}>
                <option value="">Any priority</option>
                <option value="true">Urgent only</option>
                <option value="false">Not urgent</option>
              </Select>
            </>
          ) : (
            <>
              <StatusFilter value={list.filters.status ?? ''} onChange={(v) => list.setFilter('status', v)} options={SAMPLE_STATUSES} />
              <Select aria-label="Returnable filter" className="w-36" value={list.filters.returnable ?? ''} onChange={(e) => list.setFilter('returnable', e.target.value || null)}>
                <option value="">Returnable or not</option>
                <option value="true">Returnable only</option>
                <option value="false">Not returnable</option>
              </Select>
              <Select aria-label="Urgent filter" className="w-32" value={list.filters.urgent ?? ''} onChange={(e) => list.setFilter('urgent', e.target.value || null)}>
                <option value="">Any priority</option>
                <option value="true">Urgent only</option>
                <option value="false">Not urgent</option>
              </Select>
            </>
          )}
          <DateRangeFilter label="Received" from={list.filters.from ?? ''} to={list.filters.to ?? ''} onChange={list.setFilter} />
          <SavedFilters screen={tab === 'jobs' ? 'jobs' : 'samples'} current={list.allParams} onApply={list.applyFilters} />
        </div>
        {tab === 'jobs' ? (
          <DataTable ariaLabel="Jobs" columns={jobColumns} rows={jobs.data?.data} meta={jobs.data?.meta} loading={jobs.isLoading} error={jobs.error} onRetry={jobs.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(j) => navigate(`/samples/jobs/${j.id}`)} getRowId={(j) => j.id} emptyTitle="No jobs found" />
        ) : (
          <DataTable ariaLabel="Samples" columns={sampleColumns} rows={samples.data?.data} meta={samples.data?.meta} loading={samples.isLoading} error={samples.error} onRetry={samples.refetch} sort={list.sort} onSortChange={list.setSort} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} onRowClick={(s) => navigate(`/samples/jobs/${s.jobId}?sample=${s.id}`)} getRowId={(s) => s.id} emptyTitle="No samples found" />
        )}
      </TabsContent>
      </Tabs>
    </>
  );
}
