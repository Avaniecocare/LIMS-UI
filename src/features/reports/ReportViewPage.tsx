import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { CustomerPicker } from '@/components/pickers';
import { DateRangeFilter, DocumentButton, SavedFilters } from '@/components/shared';
import { EmptyState, ErrorState, PageHeader, Select, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime, formatINR, humanize, monthStartIso, todayIso } from '@/lib/format';
import { useListState } from '@/lib/use-list-state';
import { useMisCatalog } from './catalog';

type Column = components['schemas']['MisColumnDto'];
type Row = Record<string, unknown>;

const SAMPLE_STATUSES = ['RECEIVED', 'PLANNED', 'IN_TESTING', 'REPORTING', 'COMPLETED', 'CANCELLED'];
const OPEN_TEST_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'];
const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
const STATUS_OPTIONS: Record<string, string[]> = {
  'pending-samples': SAMPLE_STATUSES,
  'sample-status': SAMPLE_STATUSES,
  'result-pending': OPEN_TEST_STATUSES,
  'quotation-register': QUOTATION_STATUSES,
};

/** Display only: every value is as the server calculated it. */
export function formatCell(type: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'date') return formatDate(String(value));
  if (type === 'datetime') return formatDateTime(String(value));
  if (type === 'money') return formatINR(String(value));
  if (type === 'number') return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN') : String(value);
  return String(value);
}

const RIGHT = ['money', 'number'];

export default function ReportViewPage() {
  const { key } = useParams();
  const { can } = useSession();
  const list = useListState();
  const catalog = useMisCatalog();
  const report = catalog.data?.find((r) => r.key === key);
  const filters = report?.filters ?? [];
  const hasDate = filters.includes('date');
  const noParams = Object.keys(list.allParams).length === 0;

  // Only a bare link gets the default month: links from the dashboard must show what they counted.
  useEffect(() => {
    if (report && hasDate && noParams) list.applyFilters({ from: monthStartIso(), to: todayIso() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the report's definition arrives
  }, [report?.key, hasDate, noParams]);
  const waitingForDefault = !report || (hasDate && noParams);

  const q = useQuery({
    queryKey: ['mis', key, list.query],
    enabled: !waitingForDefault,
    queryFn: async () => unwrap(await api.GET('/api/v1/mis/{key}', { params: { path: { key: key! }, query: list.query } })),
  });
  const departments = useQuery({
    queryKey: ['department-options'],
    enabled: filters.includes('department') && can('masters.view'),
    staleTime: 60_000,
    queryFn: async () => unwrap(await api.GET('/api/v1/masters/departments', { params: { query: { pageSize: 200 } } })).data,
  });
  const technicians = useQuery({
    queryKey: ['technician-options'],
    enabled: filters.includes('technician') && can('planning.view'),
    staleTime: 60_000,
    queryFn: async () => unwrap(await api.GET('/api/v1/planning/technicians')),
  });

  const shownColumns: Column[] = q.data?.columns ?? report?.columns ?? [];
  const columns = useMemo<Col<Row>[]>(
    () =>
      shownColumns.map((c) => ({
        id: c.key,
        header: c.label,
        cell: ({ row }) => (
          <span className={RIGHT.includes(c.type) ? 'whitespace-nowrap tabular-nums' : c.type === 'text' ? undefined : 'whitespace-nowrap'}>{formatCell(c.type, row.original[c.key])}</span>
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the columns of one report do not change
    [q.data?.columns, report?.key],
  );

  if (catalog.isLoading) return <Spinner />;
  if (catalog.error) return <ErrorState error={catalog.error} onRetry={catalog.refetch} />;
  if (!report) return <EmptyState title="This report is not available to you" />;

  const f = list.filters;
  const exportParams = Object.fromEntries(
    Object.entries({ from: f.from, to: f.to, customerId: f.customerId, departmentId: f.departmentId, technicianId: f.technicianId, status: f.status }).filter(([, v]) => v),
  );
  const statuses = STATUS_OPTIONS[report.key] ?? [];

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/reports" className="underline">
            Reports
          </Link>
        }
        title={report.title}
        actions={
          <>
            <DocumentButton kind={`mis:${report.key}`} params={{ format: 'excel', ...exportParams }}>
              Excel
            </DocumentButton>
            <DocumentButton kind={`mis:${report.key}`} params={{ format: 'pdf', ...exportParams }}>
              PDF
            </DocumentButton>
          </>
        }
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {hasDate && <DateRangeFilter from={f.from ?? ''} to={f.to ?? ''} onChange={list.setFilter} />}
          {filters.includes('customer') && can('customers.view') && (
            <div className="w-56">
              <CustomerPicker allowCreate={false} ariaLabel="Customer filter" placeholder="All customers" value={f.customerId ?? ''} onChange={(v) => list.setFilter('customerId', v || null)} />
            </div>
          )}
          {departments.data && (
            <Select aria-label="Department filter" className="w-44" value={f.departmentId ?? ''} onChange={(e) => list.setFilter('departmentId', e.target.value || null)}>
              <option value="">All departments</option>
              {departments.data.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
          {technicians.data && (
            <Select aria-label="Technician filter" className="w-44" value={f.technicianId ?? ''} onChange={(e) => list.setFilter('technicianId', e.target.value || null)}>
              <option value="">All technicians</option>
              {technicians.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
          {filters.includes('status') && (
            <Select aria-label="Status filter" className="w-40" value={f.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || null)}>
              <option value="">All statuses</option>
              {[...statuses, ...(f.status && !statuses.includes(f.status) ? [f.status] : [])].map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          )}
          <SavedFilters screen={`report-${report.key}`} current={list.allParams} onApply={list.applyFilters} />
        </div>
        <DataTable
          ariaLabel={report.title}
          columns={columns}
          rows={q.data?.data as Row[] | undefined}
          meta={q.data?.meta}
          loading={q.isLoading || waitingForDefault}
          error={q.error}
          onRetry={q.refetch}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          emptyTitle="No records for these filters"
        />
      </div>
    </>
  );
}
