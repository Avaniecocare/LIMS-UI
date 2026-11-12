import { useQuery } from '@tanstack/react-query';
import { Camera, CircleCheck, CircleX, Images, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { components } from '@/api/schema';
import { timeLeft } from '@/components/PhoneUpload';
import { Spinner } from '@/components/ui/primitives';
import { apiBaseUrl } from '@/lib/api';
import { shrinkImage } from '@/lib/shrink-image';

type LinkInfo = components['schemas']['PhoneUploadPublicDto'];
type Item = { id: number; name: string; preview: string; state: 'shrinking' | 'sending' | 'sent' | 'failed'; error?: string; file?: File };

class LinkEnded extends Error {}

/** Plain requests without cookies: the token in the address is the only permission this page has. */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}/api/v1/public/phone-uploads/${path}`, { ...init, credentials: 'omit' });
  const body = await res.json().catch(() => ({}));
  if (res.status === 410) throw new LinkEnded(body?.error?.message);
  if (!res.ok) throw new Error(body?.error?.message ?? 'Could not send. Check the connection and try again.');
  return body as T;
}

/**
 * Opened by scanning the QR code on the lab computer. Takes or picks photos, shrinks each one on the phone, and
 * sends it to that one sample or report. Built for one hand: two large buttons and a list of what was sent.
 */
export default function PhoneUploadPage() {
  const { token = '' } = useParams();
  const info = useQuery({ queryKey: ['phone-link', token], retry: false, queryFn: () => call<LinkInfo>(encodeURIComponent(token)) });
  const [items, setItems] = useState<Item[]>([]);
  const [ended, setEnded] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const nextId = useRef(0);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps -- on leave only

  const update = (id: number, patch: Partial<Item>) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const send = async (id: number, original: File) => {
    try {
      update(id, { state: 'shrinking', error: undefined });
      const file = await shrinkImage(original);
      update(id, { state: 'sending', file });
      const form = new FormData();
      form.set('file', file);
      const res = await call<{ received: number; remaining: number }>(`${encodeURIComponent(token)}/files`, { method: 'POST', body: form });
      setRemaining(res.remaining);
      update(id, { state: 'sent' });
    } catch (e) {
      if (e instanceof LinkEnded) setEnded(true);
      update(id, { state: 'failed', error: e instanceof Error ? e.message : 'Could not send' });
    }
  };

  const add = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    const added = files.map((f) => ({ id: nextId.current++, name: f.name, preview: URL.createObjectURL(f), state: 'shrinking' as const, file: f }));
    // Newest at the top of the list; sent one at a time in the order chosen, which is kinder to a weak connection.
    setItems((all) => [...[...added].reverse(), ...all]);
    for (const item of added) await send(item.id, item.file);
  };

  const lab = info.data?.laboratoryName;
  const left = remaining ?? info.data?.remaining ?? 0;
  const expired = ended || (info.data ? new Date(info.data.expiresAt).getTime() <= now || left <= 0 : false);
  const sent = items.filter((i) => i.state === 'sent').length;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-gray-50 px-4 py-5">
      {info.isLoading && <Spinner label="Opening" />}
      {info.error && (
        <Message tone="red" title={info.error instanceof LinkEnded ? 'This link has ended' : 'Could not open the link'}>
          {info.error instanceof LinkEnded ? 'Links last 15 minutes and end when closed on the computer. Ask for a new QR code there.' : 'Check the phone is online and scan the code again.'}
        </Message>
      )}
      {info.data && (
        <div className="space-y-4">
          <header>
            {lab && <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">{lab}</p>}
            <h1 className="mt-1 text-xl font-semibold text-gray-900">{info.data.label}</h1>
            {!expired && (
              <p className="mt-1 text-sm text-gray-700">
                {left} more photo{left === 1 ? '' : 's'} · link works for {timeLeft(info.data.expiresAt, now)}
              </p>
            )}
          </header>

          {expired ? (
            <Message tone="amber" title="This link has ended">
              {sent ? `${sent} photo(s) were sent. ` : ''}To send more, ask for a new QR code on the computer.
            </Message>
          ) : (
            <div className="grid gap-3">
              <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a photo" onChange={(e) => void add(e.target.files).finally(() => (e.target.value = ''))} />
              <input ref={gallery} type="file" accept="image/*" multiple className="sr-only" aria-label="Choose photos from the gallery" onChange={(e) => void add(e.target.files).finally(() => (e.target.value = ''))} />
              <button type="button" onClick={() => camera.current?.click()} className="flex h-16 items-center justify-center gap-3 rounded-xl bg-brand text-lg font-semibold text-brand-fg shadow-sm active:opacity-90">
                <Camera className="size-6" aria-hidden />
                Take photo
              </button>
              <button type="button" onClick={() => gallery.current?.click()} className="flex h-14 items-center justify-center gap-3 rounded-xl border border-gray-300 bg-surface text-base font-medium text-gray-900 active:bg-gray-100">
                <Images className="size-5" aria-hidden />
                Choose from gallery
              </button>
            </div>
          )}

          {items.length > 0 && (
            <section aria-label="Photos sent">
              <p role="status" aria-live="polite" className="mb-2 text-sm text-gray-800">
                {sent} sent{items.some((i) => i.state === 'sending' || i.state === 'shrinking') ? ', sending…' : ''}. They appear on the computer straight away.
              </p>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface p-2">
                    <img src={i.preview} alt="" className="size-14 shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate text-gray-900">{i.name}</p>
                      <p className={i.state === 'failed' ? 'text-red-700' : 'text-gray-600'}>
                        {i.state === 'shrinking' && 'Preparing…'}
                        {i.state === 'sending' && `Sending${i.file ? ` (${Math.max(1, Math.round(i.file.size / 1024))} KB)` : ''}…`}
                        {i.state === 'sent' && 'Sent'}
                        {i.state === 'failed' && i.error}
                      </p>
                    </div>
                    {i.state === 'sent' && <CircleCheck className="size-6 shrink-0 text-green-700" aria-label="Sent" />}
                    {(i.state === 'sending' || i.state === 'shrinking') && <Spinner />}
                    {i.state === 'failed' &&
                      (ended ? (
                        <CircleX className="size-6 shrink-0 text-red-700" aria-label="Not sent" />
                      ) : (
                        <button type="button" aria-label={`Try sending ${i.name} again`} className="rounded-md border border-gray-300 p-2" onClick={() => i.file && void send(i.id, i.file)}>
                          <RotateCw className="size-5" aria-hidden />
                        </button>
                      ))}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function Message({ tone, title, children }: { tone: 'red' | 'amber'; title: string; children: React.ReactNode }) {
  const tones = { red: 'border-red-300 bg-red-50 text-red-900', amber: 'border-amber-300 bg-amber-50 text-amber-900' };
  return (
    <div role="status" className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}
