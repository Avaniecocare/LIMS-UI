import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, File, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus, Image, Pencil, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { DataTable, type Col } from '@/components/DataTable';
import { CustomerPicker } from '@/components/pickers';
import { ReasonDialog, SearchBox } from '@/components/shared';
import { Button, Card, Dialog, Field, Input, PageHeader, Select, Tabs, TabsList, TabsTrigger, Textarea } from '@/components/ui/primitives';
import { api, unwrap, uploadFile } from '@/lib/api';
import { toastError } from '@/lib/forms';
import { cn, formatDateTime } from '@/lib/format';

type FileRow = components['schemas']['LibraryFileDto'];
type FolderRow = components['schemas']['FolderDto'];
type Link = { entity: 'Customer' | 'Job'; entityId: string };

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,.docx,.xlsx,.csv';

export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function FileIcon({ mime }: { mime: string }) {
  const Icon = mime === 'application/pdf' ? FileText : mime.startsWith('image/') ? Image : /sheet|csv/.test(mime) ? FileSpreadsheet : File;
  return <Icon className="size-4 shrink-0 text-gray-500" aria-hidden />;
}

function useFolders() {
  return useQuery({ queryKey: ['library-folders'], queryFn: async () => unwrap(await api.GET('/api/v1/library/folders')) });
}

/** Folder paths like "SOPs / Mechanical", for pickers. */
function folderPaths(folders: FolderRow[] | undefined) {
  const byId = new Map((folders ?? []).map((f) => [f.id, f]));
  const path = (f: FolderRow): string => (f.parentId && byId.get(f.parentId) ? `${path(byId.get(f.parentId)!)} / ${f.name}` : f.name);
  return (folders ?? []).map((f) => ({ id: f.id, path: path(f) })).sort((a, b) => a.path.localeCompare(b.path));
}

async function download(id: string) {
  // A new tab opened before the request keeps pop-up blockers happy.
  const tab = window.open('', '_blank');
  try {
    const { url } = unwrap(await api.GET('/api/v1/library/files/{id}/url', { params: { path: { id } } }));
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    toastError(e);
  }
}

function UploadDialog({ open, onOpenChange, folderId, fixedLink }: { open: boolean; onOpenChange: (o: boolean) => void; folderId: string | null; fixedLink?: Link }) {
  const client = useQueryClient();
  const folders = useFolders();
  const { can } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [folder, setFolder] = useState(folderId ?? '');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const m = useMutation({
    mutationFn: async () => {
      // One request per file: each is checked by content on the server, and one bad file doesn't stop the rest.
      const failed: string[] = [];
      for (const f of files) {
        const form = new FormData();
        if (folder) form.append('folderId', folder);
        if (description) form.append('description', description);
        const link = fixedLink ?? (customerId ? { entity: 'Customer', entityId: customerId } : null);
        if (link) {
          form.append('entity', link.entity);
          form.append('entityId', link.entityId);
        }
        form.append('file', f);
        try {
          await uploadFile('/library/files', form);
        } catch (e) {
          failed.push(`${f.name}: ${e instanceof Error ? e.message : 'failed'}`);
        }
      }
      return failed;
    },
    onSuccess: (failed) => {
      client.invalidateQueries({ queryKey: ['library-files'] });
      client.invalidateQueries({ queryKey: ['library-folders'] });
      if (failed.length) toast.error(`Not uploaded: ${failed.join('; ')}`);
      if (failed.length < files.length) toast.success(`${files.length - failed.length} file(s) uploaded`);
      setFiles([]);
      setDescription('');
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Upload files" description="PDF, images, Word, Excel or CSV. Each file is checked before it is stored.">
      <div className="space-y-3">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-600"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles([...e.dataTransfer.files]);
          }}
        >
          <Upload className="size-6 text-gray-400" aria-hidden />
          <p>Drag files here, or</p>
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            Choose files
          </Button>
          <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Files to upload" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
          {files.length > 0 && <p className="font-medium text-gray-900">{files.map((f) => f.name).join(', ')}</p>}
        </div>
        <Field label="Folder" htmlFor="up-folder" hint="Optional">
          <Select id="up-folder" value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">Not in a folder</option>
            {folderPaths(folders.data).map((f) => (
              <option key={f.id} value={f.id}>
                {f.path}
              </option>
            ))}
          </Select>
        </Field>
        {!fixedLink && can('customers.view') && (
          <Field label="Link to customer" htmlFor="up-customer" hint="Optional. Linked files also show on that customer's page.">
            <CustomerPicker allowCreate={false} id="up-customer" value={customerId} onChange={setCustomerId} />
          </Field>
        )}
        <Field label="Description" htmlFor="up-desc" hint="Optional, for example 'Tensile SOP, revision 3'">
          <Textarea id="up-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!files.length} loading={m.isPending} onClick={() => m.mutate()}>
            Upload {files.length > 1 ? `${files.length} files` : ''}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditDialog({ file, onClose }: { file: FileRow; onClose: () => void }) {
  const client = useQueryClient();
  const folders = useFolders();
  const [name, setName] = useState(file.originalName);
  const [folder, setFolder] = useState(file.folderId ?? '');
  const [description, setDescription] = useState(file.description ?? '');
  const m = useMutation({
    mutationFn: async () => unwrap(await api.PATCH('/api/v1/library/files/{id}', { params: { path: { id: file.id } }, body: { originalName: name, folderId: folder || null, description: description || null } })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['library-files'] });
      client.invalidateQueries({ queryKey: ['library-folders'] });
      toast.success('File updated');
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Edit ${file.originalName}`}>
      <div className="space-y-3">
        <Field label="Name" htmlFor="ed-name" required>
          <Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Folder" htmlFor="ed-folder">
          <Select id="ed-folder" value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">Not in a folder</option>
            {folderPaths(folders.data).map((f) => (
              <option key={f.id} value={f.id}>
                {f.path}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="ed-desc">
          <Textarea id="ed-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} loading={m.isPending} onClick={() => m.mutate()}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** The file list: used by the Files page and by a customer's Files tab (fixedLink). */
export function LibraryFiles({ folderId = null, fixedLink, scope = 'library' }: { folderId?: string | null; fixedLink?: Link; scope?: 'library' | 'system' | 'all' }) {
  const { can } = useSession();
  const client = useQueryClient();
  const manage = can('files.manage');
  const [paging, setPaging] = useState({ page: 1, pageSize: 25 });
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<FileRow | null>(null);
  const [removing, setRemoving] = useState<FileRow | null>(null);
  const query = {
    ...paging,
    scope: fixedLink ? ('all' as const) : scope,
    ...(search ? { q: search } : {}),
    ...(fixedLink ? { entity: fixedLink.entity, entityId: fixedLink.entityId } : folderId ? { folderId } : {}),
  };
  const q = useQuery({ queryKey: ['library-files', query], queryFn: async () => unwrap(await api.GET('/api/v1/library/files', { params: { query } })) });
  const remove = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => unwrap(await api.DELETE('/api/v1/library/files/{id}', { params: { path: { id }, query: { reason } } })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['library-files'] });
      client.invalidateQueries({ queryKey: ['library-folders'] });
      toast.success('File removed');
      setRemoving(null);
    },
    onError: toastError,
  });
  const cols: Col<FileRow>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <FileIcon mime={row.original.mimeType} />
          <div className="min-w-0">
            <button type="button" className="text-left font-medium text-gray-900 hover:underline" onClick={() => download(row.original.id)}>
              {row.original.originalName}
            </button>
            {row.original.description && <p className="text-xs text-gray-600">{row.original.description}</p>}
          </div>
        </div>
      ),
    },
    { id: 'link', header: 'Linked to', cell: ({ row }) => row.original.entityLabel ?? (row.original.category === 'library' ? '—' : row.original.category) },
    ...(fixedLink ? [] : [{ id: 'folder', header: 'Folder', cell: ({ row }: { row: { original: FileRow } }) => row.original.folderName ?? '—' } as Col<FileRow>]),
    { id: 'size', header: 'Size', cell: ({ row }) => <span className="whitespace-nowrap">{formatBytes(row.original.sizeBytes)}</span> },
    {
      id: 'when',
      header: 'Added',
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-[13px]">
          {formatDateTime(row.original.createdAt)}
          {row.original.createdByName && <span className="block text-xs text-gray-600">{row.original.createdByName}</span>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label={`Download ${row.original.originalName}`} onClick={() => download(row.original.id)}>
            <Download aria-hidden />
          </Button>
          {row.original.canEdit && (
            <>
              <Button variant="ghost" size="icon" aria-label={`Edit ${row.original.originalName}`} onClick={() => setEditing(row.original)}>
                <Pencil aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Remove ${row.original.originalName}`} onClick={() => setRemoving(row.original)}>
                <Trash2 aria-hidden />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-full max-w-sm">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPaging((p) => ({ ...p, page: 1 }));
            }}
            placeholder="Search file name or description"
            label="Search files"
          />
        </div>
        {manage && scope !== 'system' && (
          <Button onClick={() => setUploading(true)}>
            <Upload aria-hidden />
            Upload
          </Button>
        )}
      </div>
      <DataTable
        ariaLabel="Files"
        columns={cols}
        rows={q.data?.data}
        meta={q.data?.meta}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onPageChange={(page) => setPaging((p) => ({ ...p, page }))}
        onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })}
        emptyTitle={search ? 'No files match your search' : 'No files here yet'}
        emptyHint={manage && scope !== 'system' ? 'Use Upload to add SOPs, certificates, customer letters and other documents.' : undefined}
      />
      {uploading && <UploadDialog open onOpenChange={setUploading} folderId={folderId} fixedLink={fixedLink} />}
      {editing && <EditDialog file={editing} onClose={() => setEditing(null)} />}
      <ReasonDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.originalName ?? ''}?`}
        description="The file leaves the library. Its upload and removal stay in the audit trail."
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onConfirm={(reason) => removing && remove.mutate({ id: removing.id, reason })}
      />
    </div>
  );
}

function FolderTree({ folders, selected, onSelect, actions }: { folders: FolderRow[]; selected: string | null; onSelect: (id: string | null) => void; actions: (f: FolderRow) => ReactNode }) {
  const children = useMemo(() => {
    const map = new Map<string | null, FolderRow[]>();
    for (const f of folders) map.set(f.parentId, [...(map.get(f.parentId) ?? []), f]);
    return map;
  }, [folders]);
  const item = (id: string | null, label: string, icon: ReactNode, count?: number, depth = 0, f?: FolderRow) => (
    <li key={id ?? 'all'}>
      <div className={cn('group flex items-center gap-1 rounded-md pr-1', selected === id ? 'bg-brand/10 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-100')}>
        <button type="button" aria-current={selected === id ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => onSelect(id)}>
          {icon}
          <span className="truncate">{label}</span>
          {count !== undefined && <span className="ml-auto text-xs text-gray-500">{count}</span>}
        </button>
        {f && actions(f)}
      </div>
      {f && (children.get(f.id) ?? []).length > 0 && <ul>{(children.get(f.id) ?? []).map((c) => item(c.id, c.name, selected === c.id ? <FolderOpen className="size-4 shrink-0" aria-hidden /> : <Folder className="size-4 shrink-0" aria-hidden />, c.fileCount, depth + 1, c))}</ul>}
    </li>
  );
  return (
    <nav aria-label="Folders">
      <ul className="space-y-0.5">
        {item(null, 'All files', <FileText className="size-4 shrink-0" aria-hidden />)}
        {item('none', 'Not in a folder', <File className="size-4 shrink-0" aria-hidden />)}
        {(children.get(null) ?? []).map((f) => item(f.id, f.name, selected === f.id ? <FolderOpen className="size-4 shrink-0" aria-hidden /> : <Folder className="size-4 shrink-0" aria-hidden />, f.fileCount, 0, f))}
      </ul>
    </nav>
  );
}

function FolderDialog({ folder, parentId, onClose }: { folder: FolderRow | null; parentId: string | null; onClose: () => void }) {
  const client = useQueryClient();
  const folders = useFolders();
  const [name, setName] = useState(folder?.name ?? '');
  const [parent, setParent] = useState(folder ? (folder.parentId ?? '') : (parentId && parentId !== 'none' ? parentId : ''));
  const m = useMutation({
    mutationFn: async () =>
      folder
        ? unwrap(await api.PATCH('/api/v1/library/folders/{id}', { params: { path: { id: folder.id } }, body: { name, parentId: parent || null, version: folder.version } }))
        : unwrap(await api.POST('/api/v1/library/folders', { body: { name, parentId: parent || null } })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['library-folders'] });
      toast.success(folder ? 'Folder updated' : 'Folder created');
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={folder ? `Edit folder ${folder.name}` : 'New folder'}>
      <div className="space-y-3">
        <Field label="Name" htmlFor="fd-name" required hint="For example SOPs, Calibration certificates, Customer POs">
          <Input id="fd-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Inside" htmlFor="fd-parent">
          <Select id="fd-parent" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Top level</option>
            {folderPaths(folders.data)
              .filter((f) => f.id !== folder?.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} loading={m.isPending} onClick={() => m.mutate()}>
            {folder ? 'Save' : 'Create folder'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default function FilesPage() {
  const { can } = useSession();
  const client = useQueryClient();
  const manage = can('files.manage');
  const folders = useFolders();
  const [selected, setSelected] = useState<string | null>(null);
  const [scope, setScope] = useState<'library' | 'system'>('library');
  const [folderDialog, setFolderDialog] = useState<{ folder: FolderRow | null } | null>(null);
  const removeFolder = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE('/api/v1/library/folders/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['library-folders'] });
      setSelected(null);
      toast.success('Folder removed');
    },
    onError: toastError,
  });
  return (
    <>
      <PageHeader title="Files" description="The lab's documents in one place: SOPs, certificates, customer letters, and every report, invoice and attachment the system holds." />
      <Tabs value={scope} onValueChange={(v) => setScope(v as 'library' | 'system')}>
        <TabsList className="mb-3">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="system">System files</TabsTrigger>
        </TabsList>
      </Tabs>
      {scope === 'system' ? (
        <Card className="p-4">
          <p className="mb-3 text-[13px] text-gray-600">Reports, invoices, quotations and attachments made or uploaded on records. They are managed on their own record, so here they can only be found and downloaded.</p>
          <LibraryFiles scope="system" />
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[16rem_1fr]">
          <Card className="h-fit p-2">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Folders</span>
              {manage && (
                <Button variant="ghost" size="icon" aria-label="New folder" onClick={() => setFolderDialog({ folder: null })}>
                  <FolderPlus aria-hidden />
                </Button>
              )}
            </div>
            <FolderTree
              folders={folders.data ?? []}
              selected={selected}
              onSelect={setSelected}
              actions={(f) =>
                manage ? (
                  <span className="hidden gap-0.5 group-focus-within:flex group-hover:flex">
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit folder ${f.name}`} onClick={() => setFolderDialog({ folder: f })}>
                      <Pencil aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Remove folder ${f.name}`} disabled={f.fileCount > 0} onClick={() => removeFolder.mutate(f.id)}>
                      <Trash2 aria-hidden />
                    </Button>
                  </span>
                ) : null
              }
            />
          </Card>
          <Card className="p-4">
            <LibraryFiles key={selected ?? 'all'} folderId={selected} />
          </Card>
        </div>
      )}
      {folderDialog && <FolderDialog folder={folderDialog.folder} parentId={selected} onClose={() => setFolderDialog(null)} />}
    </>
  );
}
