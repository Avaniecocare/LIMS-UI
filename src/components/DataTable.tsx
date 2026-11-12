import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Checkbox, EmptyState, ErrorState, Select, TableSkeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each column has its own value type
export type Col<T> = ColumnDef<T, any>;

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DataTableProps<T> {
  columns: Col<T>[];
  rows: T[] | undefined;
  meta?: PageMeta;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: ReactNode;
  sort?: { id: string; desc: boolean } | null;
  onSortChange?: (sort: { id: string; desc: boolean } | null) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  selection?: RowSelectionState;
  onSelectionChange?: (selection: RowSelectionState) => void;
  bulkActions?: ReactNode;
  /** Rows that cannot be ticked, such as ones the user may not act on. */
  isRowSelectable?: (row: T) => boolean;
  /** Extra content under a row, or null when the row is collapsed. Such a table is not virtualized. */
  renderExpanded?: (row: T) => ReactNode;
  ariaLabel: string;
  maxHeightClass?: string;
}

const ROW_HEIGHT = 37;
/** Fields a phone card shows before "More details". */
const CARD_FIELDS = 4;

/** Server-driven table: no client-side sort or pagination. Rows are virtualized. */
export function DataTable<T>({
  columns,
  rows,
  meta,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  sort,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  getRowId,
  selection,
  onSelectionChange,
  bulkActions,
  isRowSelectable,
  renderExpanded,
  ariaLabel,
  maxHeightClass = 'max-h-[calc(100dvh-15rem)]',
}: DataTableProps<T>) {
  const allColumns: Col<T>[] = onSelectionChange
    ? [
        {
          id: '__select',
          size: 36,
          enableSorting: false,
          header: ({ table }) => (
            <Checkbox aria-label="Select all on this page" checked={table.getIsAllPageRowsSelected()} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} />
          ),
          cell: ({ row }) => (
            <span onClick={(e) => e.stopPropagation()}>
              <Checkbox aria-label="Select row" disabled={!row.getCanSelect()} checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
            </span>
          ),
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data: rows ?? [],
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: onSelectionChange ? (isRowSelectable ? (row) => isRowSelectable(row.original) : true) : false,
    state: { rowSelection: selection ?? {} },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(selection ?? {}) : updater;
      onSelectionChange?.(next);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({ count: tableRows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_HEIGHT, overscan: 12, enabled: !renderExpanded });
  const items = renderExpanded ? [] : virtualizer.getVirtualItems();
  // jsdom and first paint report no viewport; render a window rather than an empty table.
  const visible = items.length ? items : (renderExpanded ? tableRows : tableRows.slice(0, 30)).map((_, index) => ({ index, start: index * ROW_HEIGHT, size: ROW_HEIGHT }));
  const paddingTop = items.length ? items[0].start : 0;
  const paddingBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;

  const selectedCount = Object.keys(selection ?? {}).length;
  // Rows that arrive on a refresh (a sample just booked, a test just assigned) glow briefly. A new page or filter
  // replaces most rows; that is not news, so nothing glows then.
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Without real ids rows are numbered by position, which would mark the wrong ones.
    if (!rows || !getRowId) return;
    const ids = tableRows.map((r) => r.id);
    const before = seen.current;
    seen.current = new Set(ids);
    if (!before || !before.size) return;
    const added = ids.filter((id) => !before.has(id));
    setFresh(added.length && added.length <= Math.max(1, Math.floor(ids.length / 3)) ? new Set(added) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the rows change
  }, [rows]);
  // On a phone a wide table only scrolls sideways; each row becomes a card of label and value instead.
  const compact = useMediaQuery('(max-width: 639px)') && !renderExpanded;
  const labelOf = (header: unknown, id: string) => (typeof header === 'string' ? header : id === '__select' ? '' : id);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-surface">
      {selectedCount > 0 && bulkActions && (
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <span className="font-medium">{selectedCount} selected</span>
          {bulkActions}
        </div>
      )}
      <div ref={scrollRef} className={cn('overflow-auto', !compact && maxHeightClass)} tabIndex={0} role="group" aria-label={`${ariaLabel}, scrollable`}>
        {compact && !loading && !error && tableRows.length > 0 && (
          <ul className="divide-y divide-gray-100" aria-label={ariaLabel}>
            {tableRows.map((row) => (
              <li
                key={row.id}
                className={cn('px-3 py-2.5 text-[13px] transition-colors duration-(--motion-fast)', onRowClick && 'cursor-pointer active:bg-gray-100', row.getIsSelected() && 'bg-blue-50', fresh.has(row.id) && 'flash-new')}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(row.original) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {(() => {
                  // The first few named columns are the record; buttons and ticks always show; the rest fold away.
                  const cells = row.getVisibleCells();
                  const named = cells.filter((c) => typeof c.column.columnDef.header === 'string');
                  const key = new Set(named.slice(0, CARD_FIELDS).map((c) => c.id));
                  const always = cells.filter((c) => key.has(c.id) || typeof c.column.columnDef.header !== 'string');
                  const more = cells.filter((c) => !always.includes(c));
                  const pairs = (list: typeof cells) =>
                    list.map((cell) => (
                      <Fragment key={cell.id}>
                        <dt className="text-xs text-gray-600">{labelOf(cell.column.columnDef.header, cell.column.id)}</dt>
                        <dd className="min-w-0 break-words text-gray-900">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                      </Fragment>
                    ));
                  return (
                    <>
                      <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1">{pairs(always)}</dl>
                      {more.length > 0 && (
                        <details className="group mt-1" onClick={(e) => e.stopPropagation()}>
                          <summary className="cursor-pointer py-1 text-xs font-medium text-gray-700 select-none">
                            <span className="group-open:hidden">More details</span>
                            <span className="hidden group-open:inline">Fewer details</span>
                          </summary>
                          <dl className="grid animate-enter grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1">{pairs(more)}</dl>
                        </details>
                      )}
                    </>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
        <table className={cn('w-full border-collapse text-[13px]', compact && !loading && !error && tableRows.length > 0 && 'hidden')} aria-label={ariaLabel} aria-rowcount={meta?.total}>
          <thead className="sticky top-0 z-10 bg-gray-50">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-gray-200">
                {group.headers.map((header) => {
                  const sortable = header.column.columnDef.enableSorting === true && onSortChange;
                  const active = sort?.id === header.column.id;
                  return (
                    <th key={header.id} scope="col" aria-sort={active ? (sort?.desc ? 'descending' : 'ascending') : undefined} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700" style={header.column.columnDef.size && header.column.id === '__select' ? { width: header.column.columnDef.size } : undefined}>
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-gray-900"
                          onClick={() => onSortChange(active ? (sort?.desc ? null : { id: header.column.id, desc: true }) : { id: header.column.id, desc: false })}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {active && (sort?.desc ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />)}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          {!loading && !error && tableRows.length > 0 && !compact && (
            <tbody>
              {paddingTop > 0 && (
                <tr aria-hidden>
                  <td style={{ height: paddingTop }} />
                </tr>
              )}
              {visible.map((v) => {
                const row = tableRows[v.index];
                const extra = renderExpanded?.(row.original);
                return (
                  <Fragment key={row.id}>
                    <tr
                      data-index={v.index}
                      ref={items.length ? virtualizer.measureElement : undefined}
                      className={cn('border-b border-gray-100 transition-colors duration-(--motion-fast)', onRowClick && 'cursor-pointer hover:bg-gray-50', row.getIsSelected() && 'bg-blue-50', fresh.has(row.id) && 'flash-new')}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      onKeyDown={onRowClick ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(row.original) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 align-middle text-gray-900">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {extra && (
                      <tr className="border-b border-gray-100">
                        <td colSpan={allColumns.length} className="p-0">
                          {extra}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden>
                  <td style={{ height: paddingBottom }} />
                </tr>
              )}
            </tbody>
          )}
        </table>
        {loading && <TableSkeleton columns={allColumns.length} />}
        {!loading && !!error && <ErrorState error={error} onRetry={onRetry} />}
        {!loading && !error && tableRows.length === 0 && <EmptyState title={emptyTitle}>{emptyHint}</EmptyState>}
      </div>
      {meta && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-[13px] text-gray-700">
          <span>{meta.total.toLocaleString('en-IN')} {meta.total === 1 ? 'record' : 'records'}</span>
          <div className="flex items-center gap-2">
            {onPageSizeChange && (
              <label className="flex items-center gap-1.5">
                Rows
                <Select className="h-8 w-20" value={meta.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button variant="secondary" size="icon" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPageChange?.(meta.page - 1)}>
              <ChevronLeft aria-hidden />
            </Button>
            <Button variant="secondary" size="icon" aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange?.(meta.page + 1)}>
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { useDebounced } from '@/lib/use-debounced';
