import { useMutation, useQuery } from '@tanstack/react-query';
import { useIsPhone } from '@/app/device';
import { Smartphone } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { components } from '@/api/schema';
import { useSession } from '@/app/providers';
import { Button, Dialog, ErrorState, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { toastError } from '@/lib/forms';

/** Minutes and seconds left, e.g. "14:05". */
export function timeLeft(expiresAt: string, now: number): string {
  const s = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * "Use phone": shows a QR code that opens a camera page on the phone for this one sample or report, with no sign-in
 * there. Photos appear here as they arrive. The link lasts 15 minutes, takes up to 20 photos, and ends when this
 * dialog closes.
 */
type Purpose = components['schemas']['CreatePhoneUploadDto']['purpose'];

export function PhoneUploadButton({ purpose, entityId, note, onReceived, disabled }: { purpose: Purpose; entityId?: string; note?: string; onReceived: (fileIds: string[]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const { moduleOn } = useSession();
  // Already on a phone: its own camera and files are right there (Use camera, Add file), so no QR code is needed.
  const phone = useIsPhone();
  if (!moduleOn('phoneUpload') || phone) return null;
  return (
    <>
      <Button variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <Smartphone aria-hidden />
        Use phone
      </Button>
      {open && <PhoneUploadDialog purpose={purpose} entityId={entityId} note={note} onReceived={onReceived} onClose={() => setOpen(false)} />}
    </>
  );
}

function PhoneUploadDialog({ purpose, entityId, note, onReceived, onClose }: { purpose: Purpose; entityId?: string; note?: string; onReceived: (fileIds: string[]) => void; onClose: () => void }) {
  const create = useMutation({ mutationFn: async () => unwrap(await api.POST('/api/v1/phone-uploads', { body: { purpose, ...(entityId ? { entityId } : {}), ...(note ? { note } : {}) } })), onError: toastError });
  const link = create.data;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create.mutate();
  }, [create]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = useQuery({
    queryKey: ['phone-upload', link?.id],
    enabled: !!link,
    refetchInterval: (q) => (q.state.data && !q.state.data.active ? false : 2000),
    queryFn: async () => unwrap(await api.GET('/api/v1/phone-uploads/{id}', { params: { path: { id: link!.id } } })),
  });
  const received = useMemo(() => status.data?.fileIds ?? [], [status.data]);
  const seen = useRef(0);
  const report = useRef(onReceived);
  report.current = onReceived;
  useEffect(() => {
    if (received.length > seen.current) {
      report.current(received.slice(seen.current));
      seen.current = received.length;
    }
  }, [received]);

  const close = () => {
    // Ends the link, so the QR code stops working the moment the dialog closes.
    if (link) void api.DELETE('/api/v1/phone-uploads/{id}', { params: { path: { id: link.id } } });
    onClose();
  };
  const expired = !!link && (new Date(link.expiresAt).getTime() <= now || status.data?.active === false);

  return (
    <Dialog open onOpenChange={(o) => !o && close()} title="Send photos from your phone" description="Scan the code with the phone's camera. A camera page opens for this record only; no sign-in is needed on the phone.">
      <div className="space-y-3">
        {create.isPending && <Spinner label="Making a link" />}
        {create.isError && <ErrorState error={create.error as Error} onRetry={() => create.mutate()} />}
        {link && (
          <>
            <div className="flex flex-col items-center gap-2">
              <img src={link.qrDataUri} alt={`QR code for ${link.label}`} className={expired ? 'size-56 opacity-20' : 'size-56'} />
              <p className="text-[13px] font-medium text-gray-900">{link.label}</p>
              {expired ? (
                <div className="text-center">
                  <p className="text-[13px] text-gray-700">This code has stopped working.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      seen.current = 0;
                      create.mutate();
                    }}
                  >
                    Make a new code
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  Works for {timeLeft(link.expiresAt, now)} more, up to {link.maxUploads} photos.
                </p>
              )}
            </div>
            <p role="status" aria-live="polite" className="rounded-md bg-gray-50 px-3 py-2 text-center text-[13px] text-gray-800">
              {received.length ? `${received.length} photo(s) received from the phone` : 'Waiting for photos…'}
            </p>
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer">Can't scan? Open this link on the phone</summary>
              <p className="mt-1 break-all select-all">{link.url}</p>
            </details>
          </>
        )}
        <div className="flex justify-end">
          <Button onClick={close}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}
