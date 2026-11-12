import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { DataTable, type Col } from '@/components/DataTable';
import { Badge, Button, Dialog, Field, Input, Select, Spinner, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';

type Request = components['schemas']['DataRequestDto'];
type Breach = components['schemas']['BreachDto'];
const today = () => new Date().toISOString().slice(0, 10);
const KIND: Record<Request['kind'], string> = { ACCESS: 'Access to data', CORRECTION: 'Correction', ERASURE: 'Erasure', GRIEVANCE: 'Grievance', CONSENT_WITHDRAWAL: 'Consent withdrawn' };

/**
 * The Digital Personal Data Protection Act 2023: requests from people about their personal data, answered by a
 * deadline, and the log of personal data breaches with when the Board and the people affected were told.
 */
export function PrivacyTab() {
  const requests = useQuery({ queryKey: ['privacy-requests'], queryFn: async () => unwrap(await api.GET('/api/v1/privacy/requests')) });
  const breaches = useQuery({ queryKey: ['privacy-breaches'], queryFn: async () => unwrap(await api.GET('/api/v1/privacy/breaches')) });
  const [adding, setAdding] = useState<'request' | 'breach' | null>(null);
  const [open, setOpen] = useState<Request | null>(null);
  const [breach, setBreach] = useState<Breach | null>(null);
  const reqCols = useMemo<Col<Request>[]>(
    () => [
      { id: 'kind', header: 'Request', cell: ({ row }) => KIND[row.original.kind] },
      { id: 'who', header: 'From', cell: ({ row }) => <span>{row.original.requesterName} <span className="text-gray-600">{row.original.requesterEmail}</span></span> },
      { id: 'received', header: 'Received', cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.receivedOn)}</span> },
      { id: 'due', header: 'Answer by', cell: ({ row }) => <span className={row.original.overdue ? 'font-medium whitespace-nowrap text-red-800' : 'whitespace-nowrap'}>{formatDate(row.original.dueOn)}</span> },
      { id: 'status', header: 'Status', cell: ({ row }) => <Badge tone={row.original.status === 'OPEN' ? (row.original.overdue ? 'red' : 'amber') : row.original.status === 'DONE' ? 'green' : 'gray'}>{row.original.status === 'OPEN' ? (row.original.overdue ? 'Overdue' : 'Open') : row.original.status === 'DONE' ? 'Done' : 'Rejected'}</Badge> },
    ],
    [],
  );
  const breachCols = useMemo<Col<Breach>[]>(
    () => [
      { id: 'detected', header: 'Detected', cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.detectedAt)}</span> },
      { id: 'what', header: 'What happened', cell: ({ row }) => <span className="line-clamp-2">{row.original.description}</span> },
      { id: 'board', header: 'Board told', cell: ({ row }) => (row.original.reportedToBoardAt ? formatDateTime(row.original.reportedToBoardAt) : <span className={new Date(row.original.boardReportDueAt) < new Date() ? 'font-medium text-red-800' : 'text-amber-800'}>Due by {formatDateTime(row.original.boardReportDueAt)}</span>) },
      { id: 'people', header: 'People told', cell: ({ row }) => (row.original.notifiedPeopleAt ? formatDateTime(row.original.notifiedPeopleAt) : 'Not yet') },
      { id: 'status', header: 'Status', cell: ({ row }) => <Badge tone={row.original.closedAt ? 'green' : 'red'}>{row.original.closedAt ? 'Closed' : 'Open'}</Badge> },
    ],
    [],
  );
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Privacy requests</h2>
            <p className="text-[13px] text-gray-600">Requests to see, correct or erase personal data, withdrawals of consent, and grievances, from customers' contacts or staff. Set the privacy contact in Lab profile.</p>
          </div>
          <Button size="sm" onClick={() => setAdding('request')}>
            <Plus aria-hidden />
            Log a request
          </Button>
        </div>
        <DataTable ariaLabel="Privacy requests" columns={reqCols} rows={requests.data} loading={requests.isLoading} error={requests.error} onRetry={requests.refetch} getRowId={(r) => r.id} onRowClick={setOpen} emptyTitle="No privacy requests" maxHeightClass="max-h-96" />
      </section>
      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Data breaches</h2>
            <p className="text-[13px] text-gray-600">Tell the Data Protection Board and the people affected without delay; the detailed report to the Board is due within 72 hours.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setAdding('breach')}>
            <Plus aria-hidden />
            Log a breach
          </Button>
        </div>
        <DataTable ariaLabel="Data breaches" columns={breachCols} rows={breaches.data} loading={breaches.isLoading} error={breaches.error} onRetry={breaches.refetch} getRowId={(r) => r.id} onRowClick={setBreach} emptyTitle="No breaches logged" maxHeightClass="max-h-72" />
      </section>
      {adding === 'request' && <NewRequestDialog onClose={() => setAdding(null)} />}
      {adding === 'breach' && <NewBreachDialog onClose={() => setAdding(null)} />}
      {open && <RequestDialog request={open} onClose={() => setOpen(null)} />}
      {breach && <BreachDialog breach={breach} onClose={() => setBreach(null)} />}
    </div>
  );
}

function NewRequestDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [v, setV] = useState({ kind: 'ACCESS', requesterName: '', requesterEmail: '', details: '', receivedOn: today() });
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/privacy/requests', { body: { ...v, kind: v.kind as Request['kind'] } })),
    onSuccess: (r) => {
      void client.invalidateQueries({ queryKey: ['privacy-requests'] });
      toast.success(`Logged. Answer by ${formatDate(r.dueOn)}.`);
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Log a privacy request">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="Request" htmlFor="pr-kind">
          <Select id="pr-kind" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
            {Object.entries(KIND).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Received on" htmlFor="pr-date">
          <Input id="pr-date" type="date" max={today()} value={v.receivedOn} onChange={(e) => setV({ ...v, receivedOn: e.target.value })} />
        </Field>
        <Field label="Name" htmlFor="pr-name">
          <Input id="pr-name" value={v.requesterName} onChange={(e) => setV({ ...v, requesterName: e.target.value })} />
        </Field>
        <Field label="Email" htmlFor="pr-email">
          <Input id="pr-email" type="email" value={v.requesterEmail} onChange={(e) => setV({ ...v, requesterEmail: e.target.value })} />
        </Field>
        <Field label="What they asked" htmlFor="pr-details" className="sm:col-span-2">
          <Textarea id="pr-details" rows={3} value={v.details} onChange={(e) => setV({ ...v, details: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.requesterName.trim() || !v.requesterEmail.includes('@') || !v.details.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Log request
        </Button>
      </div>
    </Dialog>
  );
}

function RequestDialog({ request, onClose }: { request: Request; onClose: () => void }) {
  const client = useQueryClient();
  const [resolution, setResolution] = useState('');
  const data = useQuery({ queryKey: ['personal-data', request.requesterEmail], queryFn: async () => unwrap(await api.GET('/api/v1/privacy/personal-data', { params: { query: { email: request.requesterEmail } } })) });
  const erase = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/privacy/requests/{id}/erase', { params: { path: { id: request.id } } })),
    onSuccess: (r) => {
      void data.refetch();
      setResolution((t) => t || `Erased the name, email and phone from ${r.contacts} customer contact(s). Issued documents are kept as tax and accreditation rules require.`);
      toast.success(`${r.contacts} contact(s) erased`);
    },
    onError: toastError,
  });
  const resolve = useMutation({
    mutationFn: async (status: 'DONE' | 'REJECTED') => unwrap(await api.POST('/api/v1/privacy/requests/{id}/resolve', { params: { path: { id: request.id } }, body: { version: request.version, status, resolution } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['privacy-requests'] });
      toast.success('Request answered');
      onClose();
    },
    onError: toastError,
  });
  const open = request.status === 'OPEN';
  const canErase = open && (request.kind === 'ERASURE' || request.kind === 'CONSENT_WITHDRAWAL');
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`${KIND[request.kind]}: ${request.requesterName}`} description={`${request.requesterEmail} · received ${formatDate(request.receivedOn)} · answer by ${formatDate(request.dueOn)}`} wide>
      <div className="space-y-3 text-[13px]">
        <p className="rounded-md bg-gray-50 px-3 py-2 whitespace-pre-line text-gray-800">{request.details}</p>
        <div>
          <p className="mb-1 font-medium text-gray-900">Where this email address is held</p>
          {data.isLoading && <Spinner />}
          {data.data?.items.length === 0 && <p className="text-gray-600">Nowhere: no personal data with this address.</p>}
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
            {data.data?.items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-2 px-3 py-1.5">
                <span>
                  <span className="font-medium">{it.place}</span>: {it.record}
                  <span className="block text-gray-600">{it.details}</span>
                </span>
                <Badge tone={it.erasable ? 'amber' : 'gray'}>{it.erasable ? 'Can be erased' : 'Kept'}</Badge>
              </li>
            ))}
          </ul>
        </div>
        {open ? (
          <Field label="Answer" htmlFor="pr-resolution" hint="What was done, or why the request is rejected. Keep a copy of what was sent to the person.">
            <Textarea id="pr-resolution" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </Field>
        ) : (
          <p className="rounded-md bg-green-50 px-3 py-2 text-green-900">
            {request.status === 'DONE' ? 'Done' : 'Rejected'} by {request.resolvedByName} on {formatDate(request.resolvedAt)}: {request.resolution}
          </p>
        )}
      </div>
      {open && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {canErase && (
            <Button variant="danger" loading={erase.isPending} disabled={!data.data?.items.some((i) => i.erasable)} onClick={() => erase.mutate()}>
              Erase from customer contacts
            </Button>
          )}
          <Button variant="secondary" disabled={!resolution.trim()} loading={resolve.isPending && resolve.variables === 'REJECTED'} onClick={() => resolve.mutate('REJECTED')}>
            Reject
          </Button>
          <Button disabled={!resolution.trim()} loading={resolve.isPending && resolve.variables === 'DONE'} onClick={() => resolve.mutate('DONE')}>
            Mark done
          </Button>
        </div>
      )}
    </Dialog>
  );
}

const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

function NewBreachDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [v, setV] = useState({ detectedAt: nowLocal(), description: '', dataAffected: '', peopleAffected: '', containment: '' });
  const m = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/privacy/breaches', { body: { detectedAt: new Date(v.detectedAt).toISOString(), description: v.description, dataAffected: v.dataAffected, peopleAffected: v.peopleAffected ? Number(v.peopleAffected) : null, containment: v.containment || null } })),
    onSuccess: (b) => {
      void client.invalidateQueries({ queryKey: ['privacy-breaches'] });
      toast.success(`Logged. The report to the Board is due by ${formatDateTime(b.boardReportDueAt)}.`);
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Log a personal data breach" wide>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <Field label="Detected at" htmlFor="br-at">
          <Input id="br-at" type="datetime-local" value={v.detectedAt} onChange={(e) => setV({ ...v, detectedAt: e.target.value })} />
        </Field>
        <Field label="People affected" htmlFor="br-people" hint="An estimate is fine">
          <Input id="br-people" type="number" min={0} value={v.peopleAffected} onChange={(e) => setV({ ...v, peopleAffected: e.target.value })} />
        </Field>
        <Field label="What happened" htmlFor="br-desc" className="sm:col-span-2">
          <Textarea id="br-desc" rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <Field label="Personal data affected" htmlFor="br-data" className="sm:col-span-2">
          <Input id="br-data" value={v.dataAffected} onChange={(e) => setV({ ...v, dataAffected: e.target.value })} placeholder="e.g. names, emails and phone numbers of customer contacts" />
        </Field>
        <Field label="Containment so far" htmlFor="br-contain" className="sm:col-span-2">
          <Textarea id="br-contain" rows={2} value={v.containment} onChange={(e) => setV({ ...v, containment: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!v.description.trim() || !v.dataAffected.trim()} loading={m.isPending} onClick={() => m.mutate()}>
          Log breach
        </Button>
      </div>
    </Dialog>
  );
}

function BreachDialog({ breach, onClose }: { breach: Breach; onClose: () => void }) {
  const client = useQueryClient();
  const local = (d: string | null) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '');
  const [v, setV] = useState({ containment: breach.containment ?? '', reportedToBoardAt: local(breach.reportedToBoardAt as unknown as string), notifiedPeopleAt: local(breach.notifiedPeopleAt as unknown as string), closedAt: local(breach.closedAt as unknown as string) });
  const iso = (s: string) => (s ? new Date(s).toISOString() : null);
  const m = useMutation({
    mutationFn: async () => unwrap(await api.PATCH('/api/v1/privacy/breaches/{id}', { params: { path: { id: breach.id } }, body: { version: breach.version, containment: v.containment || null, reportedToBoardAt: iso(v.reportedToBoardAt), notifiedPeopleAt: iso(v.notifiedPeopleAt), closedAt: iso(v.closedAt) } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['privacy-breaches'] });
      toast.success('Breach updated');
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Data breach" description={`Detected ${formatDateTime(breach.detectedAt)} · report to the Board due by ${formatDateTime(breach.boardReportDueAt)}`} wide>
      <div className="space-y-3 text-[13px]">
        <p className="rounded-md bg-gray-50 px-3 py-2 whitespace-pre-line text-gray-800">{breach.description}</p>
        <p className="text-gray-700">
          Data affected: {breach.dataAffected}
          {breach.peopleAffected !== null ? ` · about ${breach.peopleAffected} people` : ''}
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
          <Field label="Reported to the Board" htmlFor="bd-board">
            <Input id="bd-board" type="datetime-local" value={v.reportedToBoardAt} onChange={(e) => setV({ ...v, reportedToBoardAt: e.target.value })} />
          </Field>
          <Field label="People told" htmlFor="bd-people">
            <Input id="bd-people" type="datetime-local" value={v.notifiedPeopleAt} onChange={(e) => setV({ ...v, notifiedPeopleAt: e.target.value })} />
          </Field>
          <Field label="Closed" htmlFor="bd-closed">
            <Input id="bd-closed" type="datetime-local" value={v.closedAt} onChange={(e) => setV({ ...v, closedAt: e.target.value })} />
          </Field>
          <Field label="Containment and remedy" htmlFor="bd-contain" className="sm:col-span-3">
            <Textarea id="bd-contain" rows={3} value={v.containment} onChange={(e) => setV({ ...v, containment: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={m.isPending} onClick={() => m.mutate()}>
          Save
        </Button>
      </div>
    </Dialog>
  );
}
