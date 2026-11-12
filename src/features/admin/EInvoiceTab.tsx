import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { Badge, Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { isConflict, toastError } from '@/lib/forms';

type Settings = components['schemas']['EInvoiceSettingsDto'];
type Seller = Settings['seller'];

/**
 * GST e-invoicing for the lab: what the server is connected to, everything still stopping registration (each in
 * words, with where to fix it), the lab's address as the GST portal needs it, and a connection check.
 * The API credentials are server settings and never shown here.
 */
export function EInvoiceTab() {
  const client = useQueryClient();
  const { can } = useSession();
  const canEdit = can('admin.company.edit');
  const q = useQuery({ queryKey: ['admin-einvoice'], queryFn: async () => unwrap(await api.GET('/api/v1/admin/lab/einvoice')) });
  const [seller, setSeller] = useState<Seller>({ line1: '', line2: '', city: '', pincode: '' });
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (q.data) {
      setSeller(q.data.seller);
      setAuto(q.data.autoOnIssue);
    }
  }, [q.data]);
  const save = useMutation({
    mutationFn: async (s: Settings) =>
      unwrap(await api.PUT('/api/v1/admin/lab/einvoice', { body: { seller, autoOnIssue: auto, sellerVersion: s.sellerVersion, autoOnIssueVersion: s.autoOnIssueVersion } })),
    onSuccess: (next) => {
      client.setQueryData(['admin-einvoice'], next);
      toast.success('E-invoicing settings saved');
    },
    onError: (e) => (isConflict(e) ? (toast.error('Someone else changed these. They have been reloaded.'), void q.refetch()) : toastError(e)),
  });
  const check = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/admin/lab/einvoice/check')),
    onSuccess: () => toast.success('Signed in to the GST portal. The credentials work.'),
    onError: toastError,
  });
  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const s = q.data;
  const dirty = auto !== s.autoOnIssue || (['line1', 'line2', 'city', 'pincode'] as const).some((k) => seller[k] !== s.seller[k]);
  const pinOk = seller.pincode === '' || /^[1-9][0-9]{5}$/.test(seller.pincode);
  const target = !s.configured ? null : s.provider === 'mock' ? 'Test IRNs made on this server (not registered anywhere)' : `GST portal, ${s.environment === 'production' ? 'production' : 'sandbox'}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Connection"
          description="Registers B2B tax invoices and credit notes at the GST Invoice Registration Portal (IRP) and prints the IRN and signed QR code on them. Invoices to customers without a GSTIN (B2C) are not registered."
          actions={
            !s.configured ? (
              <Badge tone="amber">Not set up</Badge>
            ) : !s.enabled ? (
              <Badge tone="gray">Set up, module off</Badge>
            ) : s.problems.length ? (
              <Badge tone="amber">Needs attention</Badge>
            ) : (
              <Badge tone="green">Ready</Badge>
            )
          }
        />
        <div className="space-y-3 p-4 pt-0 text-[13px]">
          {!s.configured ? (
            <p className="text-gray-700">
              The server has no e-invoicing credentials yet. Whoever runs the server sets <code>EINVOICE_PROVIDER</code> and the API credentials from the e-invoice portal's API registration (see the
              help page E-invoicing). They are never stored in the app.
            </p>
          ) : (
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="text-gray-600">Registers at</dt>
              <dd>{target}</dd>
              {s.gstin && (
                <>
                  <dt className="text-gray-600">GSTIN</dt>
                  <dd>{s.gstin}</dd>
                </>
              )}
              <dt className="text-gray-600">Module</dt>
              <dd>{s.enabled ? 'On' : 'Off. Turn GST e-invoicing on in the Modules tab once the list below is clear.'}</dd>
            </dl>
          )}
          {s.configured && (
            <div aria-label="Before invoices can be registered" role="region">
              {s.problems.length ? (
                <ul className="space-y-1">
                  {s.problems.map((p) => (
                    <li key={p.field} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-950">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {p.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-4" aria-hidden />
                  Nothing is stopping registration.
                </p>
              )}
            </div>
          )}
          {s.configured && canEdit && (
            <Button variant="secondary" loading={check.isPending} onClick={() => check.mutate()}>
              Check the connection
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="The lab's address on e-invoices"
          description="The GST portal needs the address, town and PIN code as separate fields. The GSTIN, legal name and state come from the Lab profile."
        />
        <form
          className="grid gap-3 p-4 pt-0 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pinOk) save.mutate(s);
          }}
        >
          <Field label="Address line 1" htmlFor="ei-line1">
            <Input
              id="ei-line1"
              maxLength={100}
              value={seller.line1}
              disabled={!canEdit}
              onChange={(e) => setSeller({ ...seller, line1: e.target.value })}
              placeholder="Plot 4, MIDC Industrial Area"
            />
          </Field>
          <Field label="Address line 2" htmlFor="ei-line2" hint="Optional">
            <Input id="ei-line2" maxLength={100} value={seller.line2} disabled={!canEdit} onChange={(e) => setSeller({ ...seller, line2: e.target.value })} />
          </Field>
          <Field label="City or town" htmlFor="ei-city">
            <Input id="ei-city" maxLength={50} value={seller.city} disabled={!canEdit} onChange={(e) => setSeller({ ...seller, city: e.target.value })} />
          </Field>
          <Field label="PIN code" htmlFor="ei-pin" error={pinOk ? undefined : 'A PIN code has 6 digits'}>
            <Input id="ei-pin" inputMode="numeric" maxLength={6} value={seller.pincode} disabled={!canEdit} onChange={(e) => setSeller({ ...seller, pincode: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              id="ei-auto"
              label="Register B2B invoices and credit notes at the GST portal as soon as they are issued"
              checked={auto}
              disabled={!canEdit}
              onCheckedChange={(v) => setAuto(v === true)}
            />
            <p className="mt-1 ml-6 text-xs text-gray-600">Untick to register each one by hand from its invoice page.</p>
          </div>
          {canEdit && (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!dirty || !pinOk} loading={save.isPending}>
                Save
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
