import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Clock, MessageCircle, X } from 'lucide-react';
import type { components } from '@/api/schema';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/app/providers';
import { Badge, Button, Checkbox, Dialog, Field, Input, Select, Spinner } from '@/components/ui/primitives';
import { ApiError, api, unwrap } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';

export type WhatsappKind = 'report' | 'invoice' | 'acknowledgement' | 'reminder';
type Entity = 'Report' | 'Invoice' | 'Job';

const ENTITY: Record<WhatsappKind, Entity> = { report: 'Report', invoice: 'Invoice', reminder: 'Invoice', acknowledgement: 'Job' };
/** The same people who may email each kind. */
const SEND_PERMS: Record<WhatsappKind, string[]> = { report: ['reports.issue'], invoice: ['invoices.edit'], reminder: ['reminders.send'], acknowledgement: ['jobs.create', 'jobs.edit'] };
const WHAT: Record<WhatsappKind, string> = { report: 'the report PDF', invoice: 'the invoice PDF', acknowledgement: 'the samples-received letter', reminder: 'a payment reminder' };
type Message = components['schemas']['WhatsappMessageDto'];
/** Like WhatsApp's own ticks: sent (accepted by WhatsApp), delivered (on the phone), read (opened). */
export const WHATSAPP_STATUS = {
  QUEUED: { tone: 'amber', label: 'Sending', icon: Clock },
  SENT: { tone: 'gray', label: 'Sent', icon: Check },
  DELIVERED: { tone: 'blue', label: 'Delivered', icon: CheckCheck },
  READ: { tone: 'green', label: 'Read', icon: CheckCheck },
  FAILED: { tone: 'red', label: 'Failed', icon: X },
} as const;

/** A message's status with when it got there, e.g. "Read 12 Nov 2026, 3:04 pm". */
export function WhatsappStatus({ message }: { message: Message }) {
  const st = WHATSAPP_STATUS[message.status];
  const Icon = st.icon;
  const when = message.status === 'READ' ? message.readAt : message.status === 'DELIVERED' ? message.deliveredAt : (message.sentAt ?? message.createdAt);
  return (
    <>
      <Badge tone={st.tone} className="inline-flex items-center gap-1">
        <Icon className="size-3" aria-hidden />
        {st.label}
      </Badge>
      <span className="text-gray-500">{formatDateTime(when ?? message.createdAt)}</span>
    </>
  );
}

/** Whether "Send on WhatsApp" applies for this person: the module is on and they may send this kind. */
export function useCanWhatsapp(kind: WhatsappKind) {
  const { can, moduleOn } = useSession();
  return moduleOn('whatsapp') && can(...SEND_PERMS[kind]);
}

/**
 * "Send on WhatsApp": the customer's number (their contacts' numbers suggested), who it greets, and the sender's
 * confirmation that the customer agreed to WhatsApp messages. The PDF goes as the message's attachment.
 */
export function WhatsappButton({ kind, entityId, title, label = 'WhatsApp', photoIds }: { kind: WhatsappKind; entityId: string; title: string; label?: string; photoIds?: string[] }) {
  const allowed = useCanWhatsapp(kind);
  const [open, setOpen] = useState(false);
  if (!allowed) return null;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <MessageCircle aria-hidden />
        {label}
      </Button>
      {open && <WhatsappDialog kind={kind} entityId={entityId} title={title} photoIds={photoIds} onClose={() => setOpen(false)} />}
    </>
  );
}

export function WhatsappDialog({ kind, entityId, title, photoIds, onClose }: { kind: WhatsappKind; entityId: string; title: string; photoIds?: string[]; onClose: () => void }) {
  const client = useQueryClient();
  const entity = ENTITY[kind];
  const panel = useQuery({
    queryKey: ['whatsapp', entity, entityId],
    queryFn: async () => unwrap(await api.GET('/api/v1/whatsapp/{entity}/{id}', { params: { path: { entity, id: entityId } } })),
    // While a message is on its way, check back so its status updates in place.
    // Receipts from WhatsApp arrive later, so a sent message is checked now and then too.
    refetchInterval: (q) => (q.state.data?.messages.some((m) => m.status === 'QUEUED') ? 3000 : q.state.data?.messages.some((m) => m.status === 'SENT' || m.status === 'DELIVERED') ? 15000 : false),
  });
  const [to, setTo] = useState('');
  const [contactName, setContactName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const contacts = panel.data?.contacts ?? [];
  useEffect(() => {
    if (contacts.length && !to) {
      setTo(contacts[0].phone);
      setContactName(contacts[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fill in the first contact once they load
  }, [contacts.length]);

  const m = useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/api/v1/whatsapp/send', { body: { kind, entityId, to: to.trim(), contactName: contactName.trim() || null, consent: true, ...(photoIds?.length ? { photoIds } : {}) } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['whatsapp', entity, entityId] });
      toast.success(kind === 'reminder' ? 'Reminder queued for WhatsApp' : 'Queued for WhatsApp. The PDF is attached once it is ready.');
      onClose();
    },
    onError: (e) => (e instanceof ApiError && e.fields.some((f) => f.field === 'to') ? setError(e.message) : toastError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`WhatsApp ${title}`} description={`Sends ${WHAT[kind]} to the customer's WhatsApp, using the message your lab had approved by WhatsApp.`}>
      {panel.isLoading ? (
        <Spinner />
      ) : panel.data && !panel.data.available ? (
        <p className="text-sm text-gray-700">WhatsApp is not set up for this laboratory. An administrator can connect it in Admin, WhatsApp.</p>
      ) : (
        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(undefined);
            if (to.replace(/\D/g, '').length < 10) return setError('Enter a mobile number');
            m.mutate();
          }}
        >
          {contacts.length > 1 && (
            <Field label="Customer contact" htmlFor="wa-contact">
              <Select
                id="wa-contact"
                value={contacts.findIndex((c) => c.phone === to && c.name === contactName)}
                onChange={(e) => {
                  const c = contacts[Number(e.target.value)];
                  if (c) {
                    setTo(c.phone);
                    setContactName(c.name);
                  }
                }}
              >
                <option value={-1}>Someone else</option>
                {contacts.map((c, i) => (
                  <option key={`${c.name}-${c.phone}`} value={i}>
                    {c.name}: {c.phone}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="WhatsApp number" htmlFor="wa-to" required error={error} hint="Indian numbers can be written without +91. Others need their country code.">
            <Input id="wa-to" type="tel" inputMode="tel" autoComplete="off" aria-invalid={!!error} value={to} onChange={(e) => setTo(e.target.value)} placeholder="98765 43210" />
          </Field>
          <Field label="Greeting name" htmlFor="wa-name" hint="Leave empty for Sir/Madam">
            <Input id="wa-name" maxLength={80} value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Checkbox id="wa-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} label="The customer agreed to receive messages from us on WhatsApp" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={m.isPending} disabled={!consent}>
              Send on WhatsApp
            </Button>
          </div>
        </form>
      )}
      {!!panel.data?.messages.length && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <h3 className="mb-2 text-sm font-medium text-gray-900">Sent before</h3>
          <ul className="space-y-1.5 text-sm">
            {panel.data.messages.map((msg) => (
              <li key={msg.id} className="flex flex-wrap items-center gap-2">
                <WhatsappStatus message={msg} />
                <span className="tabular-nums">+{msg.toNumber.replace(/^\+/, '')}</span>
                <span className="text-gray-600">{msg.kind === 'reminder' ? 'Reminder' : (msg.documentName ?? msg.kind)}</span>
                {msg.status === 'FAILED' && msg.lastError && <span className="basis-full text-xs text-red-700">{msg.lastError}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
