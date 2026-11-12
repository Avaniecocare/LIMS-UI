import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { CustomerPicker } from '@/components/pickers';
import { DateRangeFilter, SavedFilters, SearchBox, StatusBadge, MobileFilters } from '@/components/shared';
import { Button, PageHeader, Select } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatINR, humanize } from '@/lib/format';
import { useListState } from '@/lib/use-list-state';

type Row = components['schemas']['QuotationSummaryDto'];

export default function QuotationsPage() {
  const { can } = useSession();
  const navigate = useNavigate();
  const list = useListState();
  const q = useQuery({ queryKey: ['quotations', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/quotations', { params: { query: list.query } })) });
  const columns = useMemo<Col<Row>[]>(
    () => [
      { accessorKey: 'quotationNo', id: 'quotationNo', header: 'Quotation', enableSorting: true },
      { accessorKey: 'customerName', id: 'customerName', header: 'Customer' },
      { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: 'version', header: 'Version', cell: ({ row }) => `v${row.original.currentVersionNo}` },
      { id: 'validUntil', header: 'Valid until', enableSorting: true, cell: ({ row }) => formatDate(row.original.validUntil) },
      { id: 'grandTotal', header: 'Grand total', enableSorting: true, cell: ({ row }) => <span className="tabular-nums">{formatINR(row.original.grandTotal)}</span> },
      { id: 'createdAt', header: 'Created', enableSorting: true, cell: ({ row }) => formatDate(row.original.createdAt) },
    ],
    [],
  );
  return (
    <>
      <PageHeader
        title="Quotations"
        actions={
          can('quotations.edit') && (
            <Button onClick={() => navigate('/quotations/new')}>
              <Plus aria-hidden />
              New quotation
            </Button>
          )
        }
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search quotation or customer" label="Search quotations" />
          <MobileFilters filters={list.filters} onClear={list.clearFilters}>
            <Select aria-label="Status filter" className="w-36" value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || null)}>
              <option value="">All statuses</option>
              {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
            {can('customers.view') && (
              <div className="w-56">
                <CustomerPicker
                  allowCreate={false}
                  ariaLabel="Customer filter"
                  placeholder="All customers"
                  value={list.filters.customerId ?? ''}
                  onChange={(v) => list.setFilter('customerId', v || null)}
                />
              </div>
            )}
            <DateRangeFilter label="Created" from={list.filters.from ?? ''} to={list.filters.to ?? ''} onChange={list.setFilter} />
            <SavedFilters screen="quotations" current={list.allParams} onApply={list.applyFilters} />
          </MobileFilters>
        </div>
        <DataTable
          ariaLabel="Quotations"
          columns={columns}
          rows={q.data?.data}
          meta={q.data?.meta}
          loading={q.isLoading}
          error={q.error}
          onRetry={q.refetch}
          sort={list.sort}
          onSortChange={list.setSort}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          onRowClick={(r) => navigate(`/quotations/${r.id}`)}
          getRowId={(r) => r.id}
          emptyTitle="No quotations found"
        />
      </div>
    </>
  );
}
