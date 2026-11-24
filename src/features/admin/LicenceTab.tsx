import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardHeader, ErrorState, Field, Spinner, Textarea } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { useReportDirty } from '@/lib/use-leave-guard';

const STATE = {
  'not-required': { label: 'Not needed', tone: 'gray' },
  missing: { label: 'None', tone: 'red' },
  active: { label: 'Active', tone: 'green' },
  ending: { label: 'Ending soon', tone: 'amber' },
  grace: { label: 'Ended, still working', tone: 'amber' },
  expired: { label: 'Ended, read-only', tone: 'red' },
} as const;

/** The licence or trial this installation runs on, and where a new one is entered. */
export function LicenceTab() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ['admin-licence'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/licence')) });
  const [text, setText] = useState('');
  useReportDirty(text.trim() !== '');
  const add = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/licence', { body: { licence: text.trim() } })),
    onSuccess: async (next) => {
      client.setQueryData(['admin-licence'], next);
      setText('');
      await client.invalidateQueries({ queryKey: ['licence'] });
      toast.success('Licence added');
    },
    onError: toastError,
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const l = q.data;
  const state = STATE[l.state];
  if (l.state === 'not-required')
    return (
      <Card>
        <CardHeader title="Licence" description="This installation does not need a licence." />
      </Card>
    );
  const facts: [string, string | null][] = [
    ['Kind', l.kind === 'trial' ? 'Trial' : l.kind === 'full' ? 'Licence' : null],
    ['Issued to', l.customer],
    ['Started', l.startedAt && formatDate(l.startedAt)],
    ['Ends', l.endsAt && formatDate(l.endsAt)],
    ['Read-only from', l.readOnlyFrom && formatDate(l.readOnlyFrom)],
    ['Days left', l.daysLeft === null ? null : String(l.daysLeft)],
    ['Licence number', l.licenceId],
    ['Installation', l.installation],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Licence"
          description="When it ends, nothing is deleted: everything stays readable and can be exported, but nothing new can be saved until a new licence is added."
          actions={<Badge tone={state.tone}>{state.label}</Badge>}
        />
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-600">{label}</dt>
              <dd className="break-words text-gray-900">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Add a licence" description="Paste the licence you were sent. To ask for one, quote the installation above. Your password is confirmed first." />
        <p className="px-4 pt-3 text-[13px] text-gray-700">
          Licences come from{' '}
          {l.vendorUrl ? (
            <a href={l.vendorUrl} className="font-medium underline" target="_blank" rel="noopener noreferrer">
              {l.vendorName}
            </a>
          ) : (
            l.vendorName
          )}
          .
        </p>
        <form
          className="space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <Field label="Licence" htmlFor="licence-text">
            <Textarea id="licence-text" rows={4} className="font-mono text-[13px]" autoComplete="off" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={text.trim().length < 20} loading={add.isPending}>
              Add licence
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
