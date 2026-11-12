import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Copy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { Badge, Button, Card, CardHeader, ErrorState, Field, Input, Select, Spinner } from '@/components/ui/primitives';
import { WhatsappStatus } from '@/features/whatsapp/WhatsappSend';
import { api, unwrap } from '@/lib/api';
import { isConflict, toastError } from '@/lib/forms';

type Settings = components['schemas']['WhatsappSettingsDto'];
type Template = Settings['templates'][number];
type Draft = Record<string, { name: string; language: string; values: string[] }>;
const KIND_LABEL: Record<string, string> = { report: 'Report', invoice: 'Invoice', acknowledgement: 'Samples received', reminder: 'Reminder' };

const draftOf = (s: Settings): Draft => Object.fromEntries(s.templates.map((t) => [t.key, { name: t.name, language: t.language, values: [...t.values] }]));
const same = (a: Draft[string] | undefined, t: Template) => !!a && a.name === t.name && a.language === t.language && a.values.join() === t.values.join();

/**
 * WhatsApp for the lab: whether the server is connected, delivered and read receipts, which approved template each
 * message uses and which values fill its {{1}}, {{2}}... in what order, a test message, and the most recent messages.
 */
export function WhatsappTab() {
  const client = useQueryClient();
  const { can } = useSession();
  const canEdit = can('admin.company.edit');
  const q = useQuery({ queryKey: ['admin-whatsapp'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab/whatsapp')) });
  const [draft, setDraft] = useState<Draft>({});
  const [testTo, setTestTo] = useState('');
  useEffect(() => {
    if (q.data) setDraft(draftOf(q.data));
  }, [q.data]);
  const save = useMutation({
    mutationFn: async (s: Settings) => unwrap(await api.PUT('/api/v1/admin/lab/whatsapp/templates', { body: { version: s.version, templates: draft } })),
    onSuccess: (next) => {
      client.setQueryData(['admin-whatsapp'], next);
      toast.success('WhatsApp templates saved');
    },
    onError: (e) => (isConflict(e) ? (toast.error('Someone else changed these. They have been reloaded.'), void q.refetch()) : toastError(e)),
  });
  const test = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/lab/whatsapp/test', { body: { to: testTo.trim() } })),
    onSuccess: () => toast.success('Test message sent. It should arrive on that WhatsApp in a few seconds.'),
    onError: toastError,
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const s = q.data;
  const dirty = s.templates.some((t) => !same(draft[t.key], t));
  const setValues = (key: string, values: string[]) => setDraft((d) => ({ ...d, [key]: { ...d[key], values } }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Connection"
          description="Messages go through the WhatsApp Business Cloud API, from your lab's own WhatsApp Business number."
          actions={s.configured ? <Badge tone={s.enabled ? 'green' : 'gray'}>{s.enabled ? 'Connected' : 'Connected, module off'}</Badge> : <Badge tone="amber">Not set up</Badge>}
        />
        <div className="space-y-3 p-4 text-[13px] text-gray-700">
          {!s.configured ? (
            <ol className="list-decimal space-y-1 pl-5">
              <li>Create a WhatsApp Business account in Meta Business Suite and add your lab's number.</li>
              <li>In WhatsApp Manager, create a message template for each message below and wait for approval.</li>
              <li>Ask whoever runs your server to set WHATSAPP_TOKEN (a permanent system-user token) and WHATSAPP_PHONE_NUMBER_ID, then restart it.</li>
            </ol>
          ) : (
            <>
              <p>
                {s.transport === 'json' ? 'Test mode: messages are recorded but not sent.' : 'Sending through Meta.'}
                {s.phoneNumberIdHint && <> Phone number id ending {s.phoneNumberIdHint}.</>}
                {!s.enabled && ' Turn WhatsApp on in Admin, Modules to show the send buttons.'}
              </p>
              {canEdit && (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (testTo.trim()) test.mutate();
                  }}
                >
                  <Field label="Send a test message to" htmlFor="wa-test" hint="Uses Meta's hello_world template, which every account has.">
                    <Input id="wa-test" type="tel" inputMode="tel" className="w-56" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="98765 43210" />
                  </Field>
                  <Button type="submit" variant="secondary" loading={test.isPending} disabled={!testTo.trim()}>
                    Send test
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Delivered and read"
          description="WhatsApp tells the lab when a message reaches the phone and when it is opened, if your Meta app sends its status updates here."
          actions={s.receipts ? <Badge tone="green">Receiving</Badge> : <Badge tone="amber">Not set up</Badge>}
        />
        <div className="space-y-2 p-4 text-[13px] text-gray-700">
          <p>In your Meta app, open WhatsApp, Configuration, and edit the webhook:</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">Callback URL</span>
            <code className="rounded bg-gray-100 px-1.5 py-0.5">{s.webhookUrl}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void navigator.clipboard.writeText(s.webhookUrl).then(
                  () => toast.success('Callback URL copied'),
                  () => toast.error('Could not copy. Select the address and copy it.'),
                )
              }
            >
              <Copy aria-hidden />
              Copy
            </Button>
          </div>
          <p>
            <span className="font-medium text-gray-900">Verify token</span>: the WHATSAPP_VERIFY_TOKEN set on your server. Then subscribe to the{' '}
            <code className="rounded bg-gray-100 px-1">messages</code> field.
          </p>
          {!s.receipts && (
            <p className="text-amber-900">Your server also needs WHATSAPP_APP_SECRET (from the app's Settings, Basic) and WHATSAPP_VERIFY_TOKEN. Until then messages still send, but stay at Sent.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Message templates"
          description="WhatsApp only lets a business start a conversation with a template it has approved. For each message, enter the template's exact name and language, then put the values in the same order as the {{1}}, {{2}}... in its approved wording."
        />
        <ul className="divide-y divide-gray-100">
          {s.templates.map((t) => {
            const d = draft[t.key];
            if (!d) return null;
            const label = (k: string) => t.available.find((a) => a.key === k)?.label ?? k;
            const unused = t.available.filter((a) => !d.values.includes(a.key));
            return (
              <li key={t.key} className="grid grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 text-[13px] lg:grid-cols-[1fr_22rem]">
                <section aria-label={`${t.label} wording`}>
                  <p className="font-medium text-gray-900">{t.label}</p>
                  <p className="mb-2 text-gray-600">{t.document ? 'Header: document (the PDF).' : 'No header.'} Body values, in order:</p>
                  <ol className="space-y-1" aria-label={`${t.label} values`}>
                    {d.values.map((k, i) => (
                      <li key={k} className="flex items-center gap-2">
                        <code className="w-10 shrink-0 rounded bg-gray-100 px-1 text-center">{`{{${i + 1}}}`}</code>
                        <span className="flex-1">{label(k)}</span>
                        {canEdit && (
                          <span className="flex">
                            <Button variant="ghost" size="icon" aria-label={`Move ${label(k)} up`} disabled={i === 0} onClick={() => setValues(t.key, swap(d.values, i, i - 1))}>
                              <ArrowUp aria-hidden />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Move ${label(k)} down`} disabled={i === d.values.length - 1} onClick={() => setValues(t.key, swap(d.values, i, i + 1))}>
                              <ArrowDown aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${label(k)}`}
                              onClick={() =>
                                setValues(
                                  t.key,
                                  d.values.filter((v) => v !== k),
                                )
                              }
                            >
                              <X aria-hidden />
                            </Button>
                          </span>
                        )}
                      </li>
                    ))}
                    {d.values.length === 0 && <li className="text-gray-600">No values: the template's wording is fixed.</li>}
                  </ol>
                  {canEdit && unused.length > 0 && (
                    <Select className="mt-2 w-64" aria-label={`Add a value to ${t.label}`} value="" onChange={(e) => e.target.value && setValues(t.key, [...d.values, e.target.value])}>
                      <option value="">Add a value…</option>
                      {unused.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </section>
                <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 sm:grid-cols-[1fr_7rem]">
                  <Field label="Template name" htmlFor={`wa-name-${t.key}`}>
                    <Input id={`wa-name-${t.key}`} disabled={!canEdit} value={d.name} onChange={(e) => setDraft((x) => ({ ...x, [t.key]: { ...x[t.key], name: e.target.value.trim() } }))} />
                  </Field>
                  <Field label="Language" htmlFor={`wa-lang-${t.key}`}>
                    <Input
                      id={`wa-lang-${t.key}`}
                      disabled={!canEdit}
                      value={d.language}
                      onChange={(e) => setDraft((x) => ({ ...x, [t.key]: { ...x[t.key], language: e.target.value.trim() } }))}
                      placeholder="en"
                    />
                  </Field>
                </div>
              </li>
            );
          })}
        </ul>
        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
            {dirty && (
              <Button variant="secondary" onClick={() => setDraft(draftOf(s))}>
                Undo changes
              </Button>
            )}
            <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(s)}>
              Save templates
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent messages" />
        {s.recent.length === 0 ? (
          <p className="p-4 text-[13px] text-gray-600">Nothing sent yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[13px]">
            {s.recent.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                <WhatsappStatus message={m} />
                <span className="font-medium text-gray-900">{KIND_LABEL[m.kind] ?? m.kind}</span>
                <span className="tabular-nums text-gray-700">+{m.toNumber}</span>
                {m.documentName && <span className="text-gray-600">{m.documentName}</span>}
                {m.status === 'FAILED' && m.lastError && <span className="basis-full text-xs text-red-700">{m.lastError}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
