import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { ReasonDialog, SavedFilters, SearchBox, StatusBadge, MobileFilters } from '@/components/shared';
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { toastError, writeError } from '@/lib/forms';
import { useListState } from '@/lib/use-list-state';
import { Outcome, ResultTable } from '@/features/testing/result-table';

type Item = components['schemas']['ApprovalItemDto'];
type ReportRow = components['schemas']['ReportRowDto'];
type ReportStatus = ReportRow['status'];

const OWN_RESULT = 'You entered these results, so someone else must approve them.';

function resultSummary(item: Item) {
  return item.results
    .filter((r) => r.value !== null)
    .map((r) => `${r.code} ${r.value}${r.unit ? ` ${r.unit}` : ''}`)
    .join(' · ');
}

function ResultsTab() {
  const client = useQueryClient();
  const { can } = useSession();
  const list = useListState();
  // The tab lives in the URL with the filters; list.query already leaves it out of API calls.
  const query = list.query;
  const q = useQuery({ queryKey: ['test-approvals', query], queryFn: async () => unwrap(await api.GET('/api/v1/tests/approvals', { params: { query } })) });
  const departments = useQuery({ queryKey: ['department-options'], enabled: can('masters.view'), staleTime: 60_000, queryFn: async () => unwrap(await api.GET('/api/v1/masters/departments', { params: { query: { pageSize: 200 } } })).data });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, Item>>({});
  const [approving, setApproving] = useState<Item | null>(null);
  const [rejecting, setRejecting] = useState<Item | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ approved: number; failed: { label: string; message: string }[] } | null>(null);
  const selection = useMemo(() => Object.fromEntries(Object.keys(selected).map((id) => [id, true])), [selected]);
  const chosen = Object.values(selected);

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['test-approvals'] });
    client.invalidateQueries({ queryKey: ['reports'] });
    client.invalidateQueries({ queryKey: ['notifications'] });
  };
  const approve = useMutation({
    mutationFn: async (item: Item) => unwrap(await api.POST('/api/v1/tests/{id}/approve', { params: { path: { id: item.id } }, body: { version: item.version } })),
    onSuccess: (_t, item) => {
      toast.success(`${item.testCode} on ${item.sampleNo} approved`);
      setApproving(null);
      setSelected(({ [item.id]: _removed, ...rest }) => rest);
      refresh();
    },
    onError: (e) => {
      setApproving(null);
      writeError(refresh)(e);
    },
  });
  const reject = useMutation({
    mutationFn: async ({ item, reason }: { item: Item; reason: string }) => unwrap(await api.POST('/api/v1/tests/{id}/reject', { params: { path: { id: item.id } }, body: { version: item.version, reason } })),
    onSuccess: (_t, { item }) => {
      toast.success(`${item.testCode} on ${item.sampleNo} sent back`);
      setRejecting(null);
      setSelected(({ [item.id]: _removed, ...rest }) => rest);
      refresh();
    },
    onError: (e) => {
      setRejecting(null);
      writeError(refresh)(e);
    },
  });
  const bulk = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/tests/approvals/bulk', { body: { items: chosen.map((i) => ({ id: i.id, version: i.version })) } })),
    onSuccess: (res) => {
      setBulkResult({ approved: res.approved.length, failed: res.failed.map((f) => ({ label: selected[f.id] ? `${selected[f.id].testCode} on ${selected[f.id].sampleNo}` : f.id, message: f.message })) });
      setBulkConfirm(false);
      setSelected({});
      refresh();
    },
    onError: (e) => {
      setBulkConfirm(false);
      toastError(e);
    },
  });

  const columns = useMemo<Col<Item>[]>(
    () => [
      {
        id: 'expand',
        header: () => <span className="sr-only">Details</span>,
        cell: ({ row: { original: i } }) => (
          <Button variant="ghost" size="icon" aria-expanded={!!expanded[i.id]} aria-label={`${expanded[i.id] ? 'Hide' : 'Show'} results of ${i.testCode} on ${i.sampleNo}`} onClick={() => setExpanded((e) => ({ ...e, [i.id]: !e[i.id] }))}>
            {expanded[i.id] ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
          </Button>
        ),
      },
      {
        id: 'testName',
        header: 'Test',
        enableSorting: true,
        cell: ({ row: { original: i } }) => (
          <div className="min-w-56 space-y-0.5">
            <p className="flex flex-wrap items-center gap-1.5">
              <Link to={`/my-tests/${i.id}`} className="underline">
                {i.testCode} — {i.testName}
              </Link>
              {i.urgent && <Badge tone="red">Urgent</Badge>}
            </p>
            <p className="text-xs text-gray-700">
              {i.sampleNo} · {i.jobNo} · Due {formatDate(i.dueDate)}
            </p>
            <p className="line-clamp-2 text-xs text-gray-800">{resultSummary(i) || 'No results'}</p>
          </div>
        ),
      },
      { id: 'outcome', header: 'Overall', cell: ({ row }) => <Outcome outcome={row.original.outcome} /> },
      {
        id: 'submittedAt',
        header: 'Conducted by',
        enableSorting: true,
        cell: ({ row: { original: i } }) => (
          <>
            {i.conductedByName ?? '—'}
            <span className="block text-xs text-gray-600">Submitted {formatDateTime(i.submittedAt)}</span>
          </>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row: { original: i } }) => (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Button size="sm" disabled={i.ownResult} aria-describedby={i.ownResult ? `own-${i.id}` : undefined} onClick={() => setApproving(i)}>
                Approve
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setRejecting(i)}>
                Reject
              </Button>
            </div>
            {i.ownResult && (
              <p id={`own-${i.id}`} className="max-w-44 text-xs text-gray-700">
                {OWN_RESULT}
              </p>
            )}
          </div>
        ),
      },
    ],
    [expanded],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search test, sample or job" label="Search results to approve" />
        <MobileFilters filters={list.filters} onClear={list.clearFilters}>
        {departments.data && (
          <Select aria-label="Department filter" className="w-44" value={list.filters.departmentId ?? ''} onChange={(e) => list.setFilter('departmentId', e.target.value || null)}>
            <option value="">All departments</option>
            {departments.data.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
        <SavedFilters screen="approvals-results" current={list.allParams} onApply={list.applyFilters} />
        </MobileFilters>
      </div>
      {bulkResult && (
        <Card role="status" className="p-3 text-[13px]">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900">
              {bulkResult.approved} approved{bulkResult.failed.length ? `, ${bulkResult.failed.length} could not be approved` : ''}.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setBulkResult(null)}>
              Dismiss
            </Button>
          </div>
          {bulkResult.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-800">
              {bulkResult.failed.map((f) => (
                <li key={f.label}>
                  {f.label}: {f.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <DataTable
        ariaLabel="Results to approve"
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
        getRowId={(i) => i.id}
        selection={selection}
        isRowSelectable={(i) => !i.ownResult}
        onSelectionChange={(next) =>
          setSelected((prev) => {
            const out: Record<string, Item> = {};
            for (const id of Object.keys(next)) {
              const row = prev[id] ?? q.data?.data.find((r) => r.id === id);
              if (row) out[id] = row;
            }
            return out;
          })
        }
        bulkActions={
          <>
            <Button size="sm" onClick={() => setBulkConfirm(true)}>
              Approve selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
              Clear
            </Button>
          </>
        }
        renderExpanded={(i) =>
          expanded[i.id] ? (
            <div className="bg-gray-50 p-3">
              <div className="overflow-hidden rounded-md border border-gray-200 bg-surface">
                <ResultTable results={i.results} caption={`Results of ${i.testCode} on ${i.sampleNo}`} />
              </div>
              {i.methodName && <p className="mt-2 text-xs text-gray-700">Method: {i.methodName}</p>}
            </div>
          ) : null
        }
        emptyTitle="No results are waiting for approval"
      />
      <ConfirmDialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)} title="Approve these results?" description={approving && `${approving.testCode} on ${approving.sampleNo}. Approved results are locked.`} confirmLabel="Approve" loading={approve.isPending} onConfirm={() => approving && approve.mutate(approving)} />
      <ConfirmDialog open={bulkConfirm} onOpenChange={setBulkConfirm} title={`Approve ${chosen.length} ${chosen.length === 1 ? 'test' : 'tests'}?`} description="Approved results are locked. Each test is approved on its own, so any that cannot be approved are listed afterwards." confirmLabel="Approve selected" loading={bulk.isPending} onConfirm={() => bulk.mutate()} />
      <ReasonDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} title="Send these results back" description={rejecting && `${rejecting.testCode} on ${rejecting.sampleNo} goes back to ${rejecting.conductedByName ?? 'the analyst'}, who sees your reason.`} confirmLabel="Reject" danger loading={reject.isPending} onConfirm={(reason) => rejecting && reject.mutate({ item: rejecting, reason })} />
    </div>
  );
}

function ReportsTable({ status, title, search, sort, onSortChange }: { status: ReportStatus; title?: string; search: string; sort: { id: string; desc: boolean } | null; onSortChange: (s: { id: string; desc: boolean } | null) => void }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => setPage(1), [search, sort]);
  const query = { status, page, pageSize, ...(search ? { q: search } : {}), ...(sort ? { sort: sort.id, order: sort.desc ? ('desc' as const) : ('asc' as const) } : {}) };
  const q = useQuery({ queryKey: ['reports', query], queryFn: async () => unwrap(await api.GET('/api/v1/reports', { params: { query } })) });
  const showCustomer = q.data?.data.some((r) => r.customerName !== null) ?? false;
  const columns = useMemo<Col<ReportRow>[]>(
    () => [
      { accessorKey: 'reportNo', id: 'reportNo', header: 'Report', enableSorting: true },
      { id: 'revision', header: 'Revision', cell: ({ row }) => row.original.revisionNo },
      { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { accessorKey: 'sampleNo', id: 'sampleNo', header: 'Sample' },
      { accessorKey: 'jobNo', id: 'jobNo', header: 'Job' },
      ...(showCustomer ? [{ id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName ?? '—' } as Col<ReportRow>] : []),
      { id: 'ulr', header: 'ULR', cell: ({ row }) => row.original.ulrNumber ?? '—' },
      { id: 'createdAt', header: 'Created', enableSorting: true, cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span> },
      ...(status === 'ISSUED' ? [{ id: 'issued', header: 'Issued', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.issuedAt)}</span> } as Col<ReportRow>] : []),
    ],
    [showCustomer, status],
  );
  return (
    <section className="space-y-1.5">
      {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
      <DataTable
        ariaLabel={title ?? 'Reports'}
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        sort={sort}
        onSortChange={onSortChange}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        onRowClick={(r) => navigate(`/approvals/reports/${r.id}`)}
        getRowId={(r) => r.id}
        emptyTitle="No reports here"
        maxHeightClass={title ? 'max-h-[40dvh]' : undefined}
      />
    </section>
  );
}

function ReportsTab({ statuses, screen }: { statuses: { status: ReportStatus; title?: string }[]; screen: string }) {
  const list = useListState();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={list.q} onChange={list.setSearch} placeholder="Search report, sample or customer" label="Search reports" />
        <MobileFilters filters={list.filters} onClear={list.clearFilters}>
        <SavedFilters screen={screen} current={list.allParams} onApply={list.applyFilters} />
        </MobileFilters>
      </div>
      {statuses.map((s) => (
        <ReportsTable key={s.status} status={s.status} title={s.title} search={list.q} sort={list.sort} onSortChange={list.setSort} />
      ))}
    </div>
  );
}

const TABS = [
  { value: 'results', label: 'Results', permission: 'tests.approve' },
  { value: 'review', label: 'Review', permission: 'reports.review' },
  { value: 'sign', label: 'Sign', permission: 'reports.approve' },
  { value: 'issue', label: 'Issue', permission: 'reports.issue' },
  { value: 'issued', label: 'Issued', permission: 'reports.view' },
] as const;

export default function ApprovalsPage() {
  const { can } = useSession();
  const list = useListState();
  const tabs = TABS.filter((t) => can(t.permission));
  const tab = tabs.find((t) => t.value === list.filters.tab)?.value ?? tabs[0]?.value;
  if (!tab) return <EmptyState title="You do not have access to this page" />;
  return (
    <>
      <PageHeader title="Approvals" />
      <Tabs value={tab} onValueChange={(v) => list.applyFilters({ tab: v })}>
        <TabsList className="mb-3">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
      {tab === 'results' && <ResultsTab />}
      {tab === 'review' && (
        <ReportsTab
          key="review"
          screen="approvals-review"
          statuses={[
            { status: 'IN_REVIEW', title: 'In review' },
            { status: 'DRAFT', title: 'Draft, not yet submitted for review' },
          ]}
        />
      )}
      {tab === 'sign' && <ReportsTab key="sign" screen="approvals-sign" statuses={[{ status: 'PENDING_APPROVAL' }]} />}
      {tab === 'issue' && <ReportsTab key="issue" screen="approvals-issue" statuses={[{ status: 'APPROVED' }]} />}
      {tab === 'issued' && <ReportsTab key="issued" screen="approvals-issued" statuses={[{ status: 'ISSUED' }]} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
