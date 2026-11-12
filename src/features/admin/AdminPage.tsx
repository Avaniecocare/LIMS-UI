import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, useDebounced, type Col } from '@/components/DataTable';
import { uploadEntityFile } from '@/components/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  Dialog,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui/primitives';
import { DirtyScope, useCloseGuard, useDirtyScope, useLeaveGuard, useReportDirty } from '@/lib/use-leave-guard';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { applyServerErrors, toastError } from '@/lib/forms';
import { EmailTemplatesTab, ModulesTab } from './LabExtras';
import { PrivacyTab } from './PrivacyTab';
import { WhatsappTab } from './WhatsappTab';
import { HelpAssistantTab } from './HelpAssistantTab';
import { BrandingTab, LabProfileTab } from './LabSettings';
import { AccessRequestsTab, AccessReviewTab, PreviewRoleButton } from './SecurityTabs';
import { useListState } from '@/lib/use-list-state';

type User = components['schemas']['UserDto'];
type Role = components['schemas']['RoleDto'];
type Setting = components['schemas']['SettingDto'];
type AuditEntry = components['schemas']['AuditEntryDto'];

const useRoles = () => useQuery({ queryKey: ['roles'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/roles')) });

// ---------------------------------------------------------------- users
/** The image printed on reports this person signs. */
function SignatureSection({ user, onChange }: { user: User; onChange: (user: User) => void }) {
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const url = useQuery({
    queryKey: ['signature-url', user.signatureFileId],
    enabled: !!user.signatureFileId,
    staleTime: 60_000,
    queryFn: async () => unwrap(await api.GET('/api/v1/files/{id}/url', { params: { path: { id: user.signatureFileId! } } })).url,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const stored = await uploadEntityFile('User', user.id, 'signature', file);
      return unwrap(await api.POST('/api/v1/admin/users/{id}/signature', { params: { path: { id: user.id } }, body: { version: user.version, fileId: stored.id } }));
    },
    onSuccess: (updated) => {
      onChange(updated);
      client.invalidateQueries({ queryKey: ['users'] });
      toast.success('Signature saved');
    },
    onError: toastError,
  });
  return (
    <section aria-label="Signature image" className="rounded-md border border-gray-200 p-3">
      <h3 className="text-[13px] font-semibold text-gray-900">Signature image</h3>
      <p className="mt-0.5 text-xs text-gray-600">Printed on reports this person signs.</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {user.signatureFileId ? (
          <>
            {url.data ? (
              <img src={url.data} alt={`Signature of ${user.name}`} className="h-14 max-w-48 rounded border border-gray-200 bg-surface object-contain p-1" />
            ) : (
              <span className="text-[13px] text-gray-700">{url.isError ? 'The image could not be shown.' : 'Loading…'}</span>
            )}
            <span className="text-[13px] text-gray-800">Signature on file</span>
          </>
        ) : (
          <span className="text-[13px] text-gray-800">No signature uploaded yet</span>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          aria-label={`Upload a signature image for ${user.name}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = '';
          }}
        />
        <Button variant="secondary" size="sm" className="ml-auto" loading={upload.isPending} onClick={() => input.current?.click()}>
          {user.signatureFileId ? 'Replace signature' : 'Upload signature'}
        </Button>
      </div>
    </section>
  );
}

function UserForm({ user, onDone, onChange }: { user: User | null; onDone: () => void; onChange: (user: User) => void }) {
  const roles = useRoles();
  const client = useQueryClient();
  const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((r) => r.id) ?? []);
  const [isActive, setActive] = useState(user?.isActive ?? true);
  const form = useForm({ defaultValues: { name: user?.name ?? '', email: user?.email ?? '', designation: user?.designation ?? '', phone: user?.phone ?? '', password: '' } });
  const initialRoles =
    user?.roles
      .map((r) => r.id)
      .sort()
      .join() ?? '';
  useReportDirty(form.formState.isDirty || [...roleIds].sort().join() !== initialRoles || isActive !== (user?.isActive ?? true));
  const m = useMutation({
    mutationFn: async (v: { name: string; email: string; designation: string; phone: string; password: string }) => {
      if (user) {
        return unwrap(
          await api.PATCH('/api/v1/admin/users/{id}', {
            params: { path: { id: user.id } },
            body: { version: user.version, name: v.name, designation: v.designation || undefined, phone: v.phone || undefined, isActive, roleIds },
          }),
        );
      }
      return unwrap(
        await api.POST('/api/v1/admin/users', { body: { email: v.email, name: v.name, password: v.password, designation: v.designation || undefined, phone: v.phone || undefined, roleIds } }),
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['users'] });
      toast.success('User saved');
      onDone();
    },
    onError: (e) => applyServerErrors(e, form.setError, ['name', 'email', 'password', 'designation', 'phone']),
  });
  const e = form.formState.errors;
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="u-name" error={e.name?.message} required>
          <Input id="u-name" {...form.register('name')} />
        </Field>
        <Field label="Email" htmlFor="u-email" error={e.email?.message} required>
          <Input id="u-email" type="email" disabled={!!user} {...form.register('email')} />
        </Field>
        <Field label="Designation" htmlFor="u-designation" hint="Printed on signed reports." error={e.designation?.message}>
          <Input id="u-designation" {...form.register('designation')} />
        </Field>
        <Field label="Phone" htmlFor="u-phone" error={e.phone?.message}>
          <Input id="u-phone" {...form.register('phone')} />
        </Field>
      </div>
      {!user && (
        <Field label="Temporary password" htmlFor="u-password" hint="The user must change it at first sign-in." error={e.password?.message} required>
          <Input id="u-password" type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
      )}
      <fieldset>
        <legend className="mb-1 text-[13px] font-medium text-gray-700">Roles</legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
          {roles.data?.map((r) => (
            <Checkbox
              key={r.id}
              id={`role-${r.id}`}
              label={r.name}
              checked={roleIds.includes(r.id)}
              onCheckedChange={(v) => setRoleIds((ids) => (v ? [...ids, r.id] : ids.filter((x) => x !== r.id)))}
            />
          ))}
        </div>
      </fieldset>
      {user && <Checkbox id="u-active" label="Active" checked={isActive} onCheckedChange={(v) => setActive(!!v)} />}
      {user && <SignatureSection user={user} onChange={onChange} />}
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>
          Save user
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onDone }: { user: User; onDone: () => void }) {
  const [newPassword, setPassword] = useState('');
  const m = useMutation({
    mutationFn: () => api.POST('/api/v1/admin/users/{id}/reset-password', { params: { path: { id: user.id } }, body: { newPassword } }),
    onSuccess: () => {
      toast.success('Password reset. The user must change it at next sign-in.');
      onDone();
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <Field label="Temporary password" htmlFor="rp" hint="This ends the user's current sessions." error={m.error?.message}>
        <Input id="rp" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>
          Reset password
        </Button>
      </div>
    </form>
  );
}

function UsersTab() {
  const list = useListState();
  const [search, setSearch] = useState(list.q);
  const debounced = useDebounced(search);
  useEffect(() => {
    if (debounced !== list.q) list.setSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const formScope = useDirtyScope();
  const closeGuard = useCloseGuard(formScope.dirty, () => setEditing(null));
  const q = useQuery({
    queryKey: ['users', list.query],
    queryFn: async () => unwrap(await api.GET('/api/v1/admin/users', { params: { query: list.query } })),
  });
  const columns = useMemo<Col<User>[]>(
    () => [
      { accessorKey: 'name', header: 'Name', enableSorting: true },
      { accessorKey: 'email', header: 'Email', enableSorting: true },
      { id: 'roles', header: 'Roles', cell: ({ row }) => row.original.roles.map((r) => r.name).join(', ') },
      { id: 'status', header: 'Status', cell: ({ row }) => <Badge tone={row.original.isActive ? 'green' : 'gray'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
      { id: 'lastLoginAt', accessorKey: 'lastLoginAt', header: 'Last sign-in', enableSorting: true, cell: ({ row }) => formatDateTime(row.original.lastLoginAt) },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setResetting(row.original);
            }}
          >
            Reset password
          </Button>
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" type="search" placeholder="Search name or email" aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button className="ml-auto" onClick={() => setEditing('new')}>
          Add user
        </Button>
      </div>
      <DataTable
        ariaLabel="Users"
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
        onRowClick={setEditing}
        getRowId={(r) => r.id}
        emptyTitle="No users match"
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && closeGuard.requestClose()} title={editing === 'new' ? 'Add user' : 'Edit user'}>
        <DirtyScope value={formScope.report}>{editing && <UserForm user={editing === 'new' ? null : editing} onDone={() => setEditing(null)} onChange={setEditing} />}</DirtyScope>
      </Dialog>
      {closeGuard.dialog}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)} title={`Reset password for ${resetting?.name ?? ''}`}>
        {resetting && <ResetPasswordForm user={resetting} onDone={() => setResetting(null)} />}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- roles
function RoleEditor({ role, onDone }: { role: Role | null; onDone: () => void }) {
  const client = useQueryClient();
  const perms = useQuery({ queryKey: ['permissions'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/permissions')) });
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? []);
  useReportDirty(name !== (role?.name ?? '') || description !== (role?.description ?? '') || [...selected].sort().join() !== [...(role?.permissions ?? [])].sort().join());
  const grouped = useMemo(() => {
    const out = new Map<string, components['schemas']['PermissionDto'][]>();
    for (const p of perms.data ?? []) out.set(p.module, [...(out.get(p.module) ?? []), p]);
    return [...out.entries()];
  }, [perms.data]);
  const m = useMutation({
    mutationFn: async () =>
      role
        ? unwrap(
            await api.PATCH('/api/v1/admin/roles/{id}', { params: { path: { id: role.id } }, body: { version: role.version, name, description: description || undefined, permissions: selected } }),
          )
        : unwrap(await api.POST('/api/v1/admin/roles', { body: { name, description: description || undefined, permissions: selected } })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role saved');
      onDone();
    },
    onError: toastError,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="Role name" htmlFor="r-name" required>
          <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="r-desc">
          <Input id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        {grouped.map(([module, items]) => (
          <fieldset key={module}>
            <legend className="mb-1 text-[13px] font-semibold text-gray-900">{module}</legend>
            <div className="space-y-1">
              {items.map((p) => (
                <div key={p.code}>
                  <Checkbox
                    id={`p-${p.code}`}
                    label={p.description}
                    checked={selected.includes(p.code)}
                    onCheckedChange={(v) => setSelected((s) => (v ? [...s, p.code] : s.filter((x) => x !== p.code)))}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>
          Save role
        </Button>
      </div>
    </form>
  );
}

function RolesTab() {
  const roles = useRoles();
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const formScope = useDirtyScope();
  const closeGuard = useCloseGuard(formScope.dirty, () => setEditing(null));
  const columns = useMemo<Col<Role>[]>(
    () => [
      { accessorKey: 'name', header: 'Role' },
      { accessorKey: 'description', header: 'Description' },
      { accessorKey: 'userCount', header: 'Users' },
      { id: 'perms', header: 'Permissions', cell: ({ row }) => row.original.permissions.length },
      { id: 'preview', header: '', cell: ({ row }) => <PreviewRoleButton role={row.original} /> },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>Add role</Button>
      </div>
      <DataTable ariaLabel="Roles" columns={columns} rows={roles.data} loading={roles.isLoading} error={roles.error} onRetry={roles.refetch} onRowClick={setEditing} getRowId={(r) => r.id} />
      <Dialog wide open={!!editing} onOpenChange={(o) => !o && closeGuard.requestClose()} title={editing === 'new' ? 'Add role' : `Edit ${(editing as Role | null)?.name ?? ''}`}>
        <DirtyScope value={formScope.report}>{editing && <RoleEditor role={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}</DirtyScope>
      </Dialog>
      {closeGuard.dialog}
    </div>
  );
}

// ---------------------------------------------------------------- settings
const SENSITIVE_PREFIX = 'controls.allow';
const isSensitive = (key: string) => key.startsWith(SENSITIVE_PREFIX) || key === 'controls.impartiality';

function SettingRow({ setting }: { setting: Setting }) {
  const client = useQueryClient();
  const initial = typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : String(setting.value ?? '');
  const [text, setText] = useState(initial);
  const [reason, setReason] = useState('');
  useEffect(() => setText(initial), [initial]);
  const dirty = text !== initial;
  useReportDirty(dirty);
  const m = useMutation({
    mutationFn: async () => {
      let value: unknown = text;
      if (typeof setting.default === 'number') value = Number(text);
      else if (typeof setting.default === 'boolean') value = text === 'true';
      else if (typeof setting.default === 'object') value = JSON.parse(text);
      return unwrap(
        await api.PUT('/api/v1/admin/settings/{key}', {
          params: { path: { key: setting.key } },
          body: { value: value as Record<string, never>, version: setting.version, reason: reason || undefined },
        }),
      );
    },
    onSuccess: () => {
      setReason('');
      client.invalidateQueries({ queryKey: ['settings'] });
      toast.success(`${setting.label} saved`);
    },
    onError: (e) => toastError(e instanceof SyntaxError ? new Error('That is not valid JSON') : e),
  });
  const id = `s-${setting.key}`;
  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 border-b border-gray-100 px-4 py-3 last:border-0 md:grid-cols-[16rem_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <label htmlFor={id} className="pt-2 text-[13px] font-medium text-gray-800">
        {setting.label}
      </label>
      <div className="space-y-2">
        {typeof setting.default === 'boolean' ? (
          <Select id={id} value={text} onChange={(e) => setText(e.target.value)}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        ) : typeof setting.default === 'object' ? (
          <Textarea id={id} className="font-mono text-[13px]" rows={Math.min(14, text.split('\n').length + 1)} value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <Input id={id} type={typeof setting.default === 'number' ? 'number' : 'text'} value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {dirty && isSensitive(setting.key) && (
          <Input aria-label="Reason for this change" placeholder="Reason for this change (required, written to the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
        )}
      </div>
      <Button type="submit" variant={dirty ? 'primary' : 'secondary'} size="sm" className="mt-0.5" disabled={!dirty} loading={m.isPending}>
        Save
      </Button>
    </form>
  );
}

function SettingsTab() {
  const q = useQuery({ queryKey: ['settings'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/settings')) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const groups = new Map<string, Setting[]>();
  for (const s of q.data ?? []) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([group, items]) => (
        <Card key={group}>
          <CardHeader title={group} />
          {items.map((s) => (
            <SettingRow key={s.key} setting={s} />
          ))}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- terms
function TermsCard({ kind, label, current }: { kind: 'QUOTATION' | 'INVOICE' | 'REPORT'; label: string; current?: components['schemas']['TermsDto'] }) {
  const client = useQueryClient();
  const [body, setBody] = useState(current?.body ?? '');
  useEffect(() => setBody(current?.body ?? ''), [current?.body]);
  useReportDirty(body !== (current?.body ?? ''));
  const m = useMutation({
    mutationFn: () => api.POST('/api/v1/admin/terms', { body: { kind, body } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['terms'] });
      toast.success(`${label} saved as a new version`);
    },
    onError: toastError,
  });
  return (
    <Card>
      <CardHeader
        title={label}
        description={current ? `Version ${current.versionNo}, saved ${formatDate(current.createdAt)}. Issued documents keep the version they were issued with.` : 'No terms saved yet.'}
      />
      <div className="space-y-2 p-4">
        <Textarea aria-label={label} rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button size="sm" disabled={!body.trim() || body === current?.body} loading={m.isPending} onClick={() => m.mutate()}>
          Save new version
        </Button>
      </div>
    </Card>
  );
}

function TermsTab() {
  const q = useQuery({ queryKey: ['terms'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/terms')) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const of = (kind: string) => q.data?.find((t) => t.kind === kind);
  return (
    <div className="space-y-4">
      <TermsCard kind="QUOTATION" label="Quotation terms" current={of('QUOTATION')} />
      <TermsCard kind="INVOICE" label="Invoice terms" current={of('INVOICE')} />
      <TermsCard kind="REPORT" label="Report terms" current={of('REPORT')} />
    </div>
  );
}

// ---------------------------------------------------------------- holidays
function HolidaysTab() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ['holidays'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/holidays')) });
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const invalidate = () => client.invalidateQueries({ queryKey: ['holidays'] });
  const add = useMutation({
    mutationFn: () => api.POST('/api/v1/admin/holidays', { body: { date, name } }),
    onSuccess: () => {
      setDate('');
      setName('');
      invalidate();
    },
    onError: toastError,
  });
  const [removing, setRemoving] = useState<components['schemas']['HolidayDto'] | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/admin/holidays/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      setRemoving(null);
      invalidate();
    },
    onError: (e) => {
      setRemoving(null);
      toastError(e);
    },
  });
  const columns = useMemo<Col<components['schemas']['HolidayDto']>[]>(
    () => [
      { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
      { accessorKey: 'name', header: 'Holiday' },
      {
        id: 'x',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" aria-label={`Remove ${row.original.name}`} onClick={() => setRemoving(row.original)}>
            Remove
          </Button>
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Field label="Date" htmlFor="h-date">
          <Input id="h-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Holiday" htmlFor="h-name">
          <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button type="submit" disabled={!date || !name} loading={add.isPending}>
          Add holiday
        </Button>
      </form>
      <DataTable
        ariaLabel="Holidays"
        columns={columns}
        rows={q.data}
        loading={q.isLoading}
        error={q.error}
        getRowId={(r) => r.id}
        emptyTitle="No holidays added"
        emptyHint="Due dates skip these days, along with non-working weekdays."
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? 'this holiday'}?`}
        description="Due dates worked out from now on will count this day as a working day."
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

// ---------------------------------------------------------------- audit
function AuditTab() {
  const list = useListState();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const q = useQuery({ queryKey: ['audit', list.query], queryFn: async () => unwrap(await api.GET('/api/v1/admin/audit', { params: { query: list.query } })) });
  const columns = useMemo<Col<AuditEntry>[]>(
    () => [
      { id: 'at', header: 'When', cell: ({ row }) => formatDateTime(row.original.at) },
      { id: 'user', header: 'User', cell: ({ row }) => row.original.userName ?? 'System' },
      { accessorKey: 'action', header: 'Action' },
      { accessorKey: 'entity', header: 'Record' },
      { id: 'reason', header: 'Reason', cell: ({ row }) => row.original.reason ?? '' },
      { id: 'ip', header: 'IP', cell: ({ row }) => row.original.ip ?? '' },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Record type" htmlFor="a-entity">
          <Input id="a-entity" className="w-40" defaultValue={list.filters.entity ?? ''} onBlur={(e) => list.setFilter('entity', e.target.value)} />
        </Field>
        <Field label="Action starts with" htmlFor="a-action">
          <Input id="a-action" className="w-40" defaultValue={list.filters.action ?? ''} onBlur={(e) => list.setFilter('action', e.target.value)} />
        </Field>
        <Field label="From" htmlFor="a-from">
          <Input id="a-from" type="date" defaultValue={list.filters.from ?? ''} onChange={(e) => list.setFilter('from', e.target.value)} />
        </Field>
        <Field label="To" htmlFor="a-to">
          <Input id="a-to" type="date" defaultValue={list.filters.to ?? ''} onChange={(e) => list.setFilter('to', e.target.value)} />
        </Field>
      </div>
      <DataTable
        ariaLabel="Audit log"
        columns={columns}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={setSelected}
        getRowId={(r) => r.id}
        emptyTitle="No entries match"
      />
      <Dialog
        wide
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.action ?? ''}
        description={selected ? `${formatDateTime(selected.at)} · ${selected.userName ?? 'System'}` : undefined}
      >
        {selected && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            {(['before', 'after'] as const).map((k) => (
              <div key={k}>
                <p className="mb-1 text-[13px] font-semibold capitalize">{k}</p>
                <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-2 text-xs">{JSON.stringify(selected[k] ?? null, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- company
const TABS = [
  { id: 'users', label: 'Users', perm: 'admin.users', body: UsersTab },
  { id: 'roles', label: 'Roles', perm: 'admin.roles', body: RolesTab },
  { id: 'access', label: 'Access requests', perm: 'admin.users', body: AccessRequestsTab },
  { id: 'review', label: 'Access review', perm: 'admin.users', body: AccessReviewTab },
  { id: 'settings', label: 'Settings', perm: 'admin.settings', body: SettingsTab },
  { id: 'terms', label: 'Terms', perm: 'admin.settings', body: TermsTab },
  { id: 'holidays', label: 'Holidays', perm: 'admin.settings', body: HolidaysTab },
  { id: 'audit', label: 'Audit log', perm: 'admin.audit', body: AuditTab },
  { id: 'company', label: 'Lab profile', perm: 'admin.company.view', body: LabProfileTab },
  { id: 'branding', label: 'Branding', perm: 'admin.company.view', body: BrandingTab },
  { id: 'emails', label: 'Email templates', perm: 'admin.company.view', body: EmailTemplatesTab },
  { id: 'modules', label: 'Modules', perm: 'admin.company.view', body: ModulesTab },
  { id: 'whatsapp', label: 'WhatsApp', perm: 'admin.company.view', body: WhatsappTab },
  { id: 'help', label: 'Help assistant', perm: 'admin.settings', body: HelpAssistantTab },
  { id: 'privacy', label: 'Privacy', perm: 'privacy.manage', body: PrivacyTab },
];

export default function AdminPage() {
  const { can } = useSession();
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((t) => can(t.perm));
  const active = tabs.find((t) => t.id === params.get('tab'))?.id ?? tabs[0]?.id;
  // Unsaved edits anywhere on the page: leaving the page, or switching tab (which unmounts it), asks first.
  const scope = useDirtyScope();
  const guard = useLeaveGuard(scope.dirty);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  return (
    <DirtyScope value={scope.report}>
      <PageHeader title="Admin" />
      <Tabs value={active} onValueChange={(tab) => (scope.dirty ? setPendingTab(tab) : setParams({ tab }))}>
        <TabsList className="mb-4">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            <t.body />
          </TabsContent>
        ))}
      </Tabs>
      <ConfirmDialog
        open={!!pendingTab}
        onOpenChange={(o) => !o && setPendingTab(null)}
        title="Discard your changes?"
        description="Some changes on this tab have not been saved. They will be lost if you switch tab."
        confirmLabel="Discard changes"
        danger
        onConfirm={() => {
          if (pendingTab) setParams({ tab: pendingTab });
          setPendingTab(null);
        }}
      />
      {guard.dialog}
    </DirtyScope>
  );
}
