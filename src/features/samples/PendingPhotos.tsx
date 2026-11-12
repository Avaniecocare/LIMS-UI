import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { PhoneUploadButton } from '@/components/PhoneUpload';
import { Button, Spinner } from '@/components/ui/primitives';
import { WebcamCapture } from '@/components/WebcamCapture';
import { api } from '@/lib/api';
import { useSignedUrls } from '@/lib/use-signed-urls';

/** A photo chosen while booking: a file still in this browser, or one already sent from a phone and held for us. */
export type PendingPhoto = { kind: 'local'; file: File } | { kind: 'phone'; fileId: string };

/**
 * Photos chosen while booking. The sample has no number yet, so computer photos wait in the browser and phone photos
 * wait in a private holding area; both are put on the sample right after booking. Optional.
 */
export function PendingPhotos({ label, items, onChange }: { label: string; items: PendingPhoto[]; onChange: (items: PendingPhoto[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const local = useMemo(() => new Map(items.flatMap((p) => (p.kind === 'local' ? [[p.file, URL.createObjectURL(p.file)] as const] : []))), [items]);
  useEffect(() => () => local.forEach((u) => URL.revokeObjectURL(u)), [local]);
  const remote = useSignedUrls(items.flatMap((p) => (p.kind === 'phone' ? [p.fileId] : [])));
  const addFiles = (files: File[]) => onChange([...items, ...files.map((file) => ({ kind: 'local' as const, file }))]);
  const remove = (i: number) => {
    const gone = items[i];
    // A phone photo is already stored: remove it there too, so nothing is left behind.
    if (gone?.kind === 'phone') void api.DELETE('/api/v1/files/{id}', { params: { path: { id: gone.fileId } } });
    onChange(items.filter((_, k) => k !== i));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-gray-900">
          Photos <span className="font-normal text-gray-600">(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label={`Add photos of ${label}`}
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            <ImagePlus aria-hidden />
            Add photos
          </Button>
          <WebcamCapture title={`Photos of ${label}`} buttonLabel="Take photo" onSave={async (shots) => addFiles(shots)} />
          <PhoneUploadButton purpose="booking" note={label} onReceived={(ids) => onChange([...items, ...ids.map((fileId) => ({ kind: 'phone' as const, fileId }))])} />
        </div>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={`Photos of ${label}`}>
          {items.map((p, i) => {
            const src = p.kind === 'local' ? local.get(p.file) : remote[p.fileId];
            const name = p.kind === 'local' ? p.file.name : `photo ${i + 1} from phone`;
            return (
              <li key={p.kind === 'local' ? `l-${i}-${p.file.name}` : p.fileId} className="relative">
                {src ? <img src={src} alt={name} className="size-20 rounded border border-gray-200 object-cover" /> : <span className="flex size-20 items-center justify-center rounded border border-gray-200"><Spinner /></span>}
                {p.kind === 'phone' && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Phone</span>}
                <button type="button" aria-label={`Remove ${name}`} className="absolute -top-2 -right-2 rounded-full border border-gray-300 bg-surface p-0.5 shadow-sm" onClick={() => remove(i)}>
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-gray-600">Photos of the sample as received, from this computer, its camera, or a phone.</p>
      )}
    </div>
  );
}
