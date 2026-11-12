import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { ReasonDialog, StatusBadge } from '@/components/shared';
import { Badge, Button, Card, CardHeader, Dialog, ErrorState, Field, Select, Spinner, Tabs, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';

type AccessRequest = components['schemas']['AccessRequestDto'];
type Role = components['schemas']['RoleDto'];

/** Admin: people asking for access. Approving gives a role (never more than the approver holds). */
export function AccessRequestsTab() {
  const client = useQueryClient();
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'DENIED'>('PENDING');
  const [page, setPage] = useState({ page: 1, pageSize: 25 });
  const [approving, setApproving] = useState<AccessRequest | null>(null);
  const [denying, setDenying] = useState<AccessRequest | null>(null);
  const q = useQuery({ queryKey: ['access-requests', status, page], queryFn: async () => unwrap(await api.GET('/api/v1/access-requests', { params: { query: { status, ...page } } })) });
  const done = () => {
    client.invalidateQueries({ queryKey: ['access-requests'] });
    client.invalidateQueries({ queryKey: ['users'] });
    setApproving(null);
    setDenying(null);
  };
  const deny = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => unwrap(await api.POST('/api/v1/access-requests/{id}/deny', { params: { path: { id } }, body: { note } })),
    onSuccess: () => {
      toast.success('Request declined; they have been told why');
      done();
    },
    onError: toastError,
  });
  const cols: Col<AccessRequest>[] = [
    {
      id: 'who',
      header: 'Person',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.userName}</span>
          <span className="block text-xs text-gray-600">{row.original.currentRoles.join(', ') || 'No roles'}</span>
        </div>
      ),
    },
    { id: 'page', header: 'Asked for', cell: ({ row }) => <code className="text-[13px]">{row.original.page}</code> },
    { id: 'reason', header: 'Reason', cell: ({ row }) => <span className="text-[13px]">{row.original.reason}</span> },
    { id: 'when', header: 'Asked', cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div>
          <StatusBadge status={row.original.status} />
          {row.original.grantedRoleName && <span className="block text-xs text-gray-600">Given {row.original.grantedRoleName}</span>}
          {row.original.decisionNote && <span className="block text-xs text-gray-600">{row.original.decisionNote}</span>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'PENDING' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setApproving(row.original)}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDenying(row.original)}>
              Decline
            </Button>
          </div>
        ) : null,
    },
  ];
  return (
    <div className="space-y-3">
      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <TabsList>
          <TabsTrigger value="PENDING">Waiting</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="DENIED">Declined</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        ariaLabel="Access requests"
        columns={cols}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onPageChange={(p) => setPage((x) => ({ ...x, page: p }))}
        onPageSizeChange={(s) => setPage({ page: 1, pageSize: s })}
        emptyTitle={status === 'PENDING' ? 'Nobody is waiting for access' : 'Nothing here yet'}
      />
      {approving && <ApproveDialog request={approving} onDone={done} onClose={() => setApproving(null)} />}
      <ReasonDialog
        open={!!denying}
        onOpenChange={(o) => !o && setDenying(null)}
        title={`Decline ${denying?.userName ?? ''}'s request?`}
        description="Your reason is sent to them."
        confirmLabel="Decline"
        loading={deny.isPending}
        onConfirm={(note) => denying && deny.mutate({ id: denying.id, note })}
      />
    </div>
  );
}

function ApproveDialog({ request, onDone, onClose }: { request: AccessRequest; onDone: () => void; onClose: () => void }) {
  const roles = useQuery({ queryKey: ['roles'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/roles')) });
  const { can } = useSession();
  const [roleId, setRoleId] = useState('');
  const [note, setNote] = useState('');
  // Only roles the approver could give: the server enforces this too.
  const grantable = (roles.data ?? []).filter((r: Role) => r.isActive && r.permissions.every((p) => can(p)) && !request.currentRoles.includes(r.name));
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/access-requests/{id}/approve', { params: { path: { id: request.id } }, body: { roleId, note: note || undefined } })),
    onSuccess: () => {
      toast.success(`${request.userName} now has the new role and has been told`);
      onDone();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Approve ${request.userName}'s request`} description={`They asked for ${request.page}: "${request.reason}"`}>
      <div className="space-y-3">
        <Field label="Give this role" htmlFor="ar-role" required hint="Choose the smallest role that covers what they need.">
          <Select id="ar-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Choose a role</option>
            {grantable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.permissions.length} permissions)
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note to them" htmlFor="ar-note" hint="Optional">
          <Textarea id="ar-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!roleId} loading={m.isPending} onClick={() => m.mutate()}>
            Approve and give role
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type ReviewUser = components['schemas']['AccessReviewUserDto'];

/** Admin: who holds what, with the accounts that most need a second look at the top. */
export function AccessReviewTab() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['access-review'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/access-review')) });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const users = [...q.data.users].sort((a, b) => Number(b.adminCapable) - Number(a.adminCapable) || Number(b.dormant) - Number(a.dormant) || a.name.localeCompare(b.name));
  const flags = (u: ReviewUser) => (
    <div className="flex flex-wrap gap-1">
      {u.adminCapable && <Badge tone="red">Can manage users or roles</Badge>}
      {u.dormant && <Badge tone="amber">{u.lastLoginAt ? 'No sign-in for 90 days' : 'Never signed in'}</Badge>}
      {u.locked && <Badge tone="amber">Locked</Badge>}
      {!u.isActive && <Badge>Inactive</Badge>}
      {u.mustChangePassword && <Badge>Must change password</Badge>}
    </div>
  );
  const cols: Col<ReviewUser>[] = [
    {
      id: 'name',
      header: 'Person',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          <span className="block text-xs text-gray-600">{row.original.email}</span>
        </div>
      ),
    },
    { id: 'roles', header: 'Roles', cell: ({ row }) => row.original.roles.join(', ') || '—' },
    { id: 'perms', header: 'Permissions', cell: ({ row }) => row.original.permissionCount },
    { id: 'last', header: 'Last sign-in', cell: ({ row }) => (row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : 'Never') },
    { id: 'flags', header: 'Look at', cell: ({ row }) => flags(row.original) },
  ];
  const active = q.data.users.filter((u) => u.isActive);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        <Card className="p-3">
          <p className="text-xs text-gray-600">Active accounts</p>
          <p className="text-lg font-semibold">{active.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-600">Can manage users or roles</p>
          <p className="text-lg font-semibold">{active.filter((u) => u.adminCapable).length}</p>
        </Card>
        <Card className="p-3">
          <p className="flex items-center gap-1 text-xs text-gray-600">
            <ShieldAlert className="size-3.5" aria-hidden /> Dormant accounts to review
          </p>
          <p className="text-lg font-semibold">{active.filter((u) => u.dormant).length}</p>
        </Card>
      </div>
      <Card>
        <CardHeader title="People and their access" description={`Generated ${formatDateTime(q.data.generatedAt)}. Open a person to change their roles or switch the account off.`} />
        <div className="p-4">
          <DataTable ariaLabel="Access review" columns={cols} rows={users} onRowClick={() => navigate('/admin?tab=users')} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Who holds each permission" description="Active accounts only. Few holders is normal for the powerful ones." />
        <div className="p-4">
          <table className="w-full text-sm">
            <caption className="sr-only">Permission holders</caption>
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="py-1 font-medium">Area</th>
                <th className="py-1 font-medium">Permission</th>
                <th className="py-1 text-right font-medium">Holders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {q.data.permissions.map((p) => (
                <tr key={p.code}>
                  <td className="py-1 text-gray-600">{p.module}</td>
                  <td className="py-1">{p.description}</td>
                  <td className="py-1 text-right font-medium">{p.holders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** "Preview as this role": the menus and buttons this role would see. The server still checks your own access. */
export function PreviewRoleButton({ role }: { role: Role }) {
  const { setPreview } = useSession();
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        setPreview({ role: role.name, permissions: role.permissions });
        navigate('/');
      }}
    >
      Preview
    </Button>
  );
}
