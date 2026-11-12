import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { Checkbox, Spinner } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { useSignedUrls } from '@/lib/use-signed-urls';

export const MAX_ACK_PHOTOS = 12;

/** The photos taken of a job's samples, oldest first, for choosing which go on the acknowledgement. */
export function useJobSamplePhotos(samples: { id: string; sampleNo: string }[]) {
  const results = useQueries({
    queries: samples.map((s) => ({
      queryKey: ['files', 'Sample', s.id, 'sample-image'],
      queryFn: async () => unwrap(await api.GET('/api/v1/files', { params: { query: { entity: 'Sample', entityId: s.id, category: 'sample-image' } } })),
    })),
  });
  const loading = results.some((r) => r.isLoading);
  const data = results.map((r) => r.data);
  const photos = useMemo(() => samples.flatMap((s, i) => (data[i] ?? []).filter((f) => f.mimeType.startsWith('image/')).map((f) => ({ id: f.id, name: f.originalName, sampleNo: s.sampleNo }))), [samples, ...data]); // eslint-disable-line react-hooks/exhaustive-deps -- one entry per sample
  return { photos, loading };
}

/**
 * Optional photos for the acknowledgement: every photo of the job's samples, all ticked to start with. Unticking
 * them all sends the letter without photos.
 */
export function AckPhotoPicker({ samples, value, onChange }: { samples: { id: string; sampleNo: string }[]; value: string[]; onChange: (ids: string[]) => void }) {
  const { photos, loading } = useJobSamplePhotos(samples);
  const urls = useSignedUrls(photos.map((p) => p.id));
  const started = useRef(false);
  useEffect(() => {
    if (started.current || loading) return;
    started.current = true;
    onChange(photos.slice(0, MAX_ACK_PHOTOS).map((p) => p.id));
  }, [loading, photos, onChange]);

  if (loading) return <Spinner label="Loading photos" />;
  if (!photos.length) return <p className="text-[13px] text-gray-600">No photos of these samples yet. Add them under Sample images (from the computer, webcam or phone) to include them. They are optional.</p>;
  const toggle = (id: string, on: boolean) => onChange(on ? photos.filter((p) => p.id === id || value.includes(p.id)).map((p) => p.id) : value.filter((x) => x !== id));
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-gray-700">
        Photos to include ({value.length} of {photos.length} ticked, up to {MAX_ACK_PHOTOS}). Optional.
      </p>
      <ul className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3" aria-label="Photos for the acknowledgement">
        {photos.map((p) => (
          <li key={p.id} className="rounded-md border border-gray-200 p-1.5">
            <div className="flex h-20 items-center justify-center overflow-hidden rounded bg-gray-100">{urls[p.id] ? <img src={urls[p.id]} alt={`${p.sampleNo}: ${p.name}`} className="max-h-20 object-contain" /> : <Spinner />}</div>
            <Checkbox id={`ack-photo-${p.id}`} className="mt-1" label={p.sampleNo} checked={value.includes(p.id)} disabled={!value.includes(p.id) && value.length >= MAX_ACK_PHOTOS} onCheckedChange={(v) => toggle(p.id, v === true)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
