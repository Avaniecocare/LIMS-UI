import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { PhoneUploadButton } from '@/components/PhoneUpload';
import { uploadEntityFile } from '@/components/shared';
import { Button, Card, CardHeader, Checkbox, EmptyState, ErrorState, Field, Input, Select, Spinner } from '@/components/ui/primitives';
import { WebcamCapture } from '@/components/WebcamCapture';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/format';
import { isConflict, toastError } from '@/lib/forms';
import { useSignedUrls } from '@/lib/use-signed-urls';

type Report = components['schemas']['ReportDetailDto'];
type Photo = components['schemas']['ReportPhotoDto'];
type FileRow = components['schemas']['FileDto'];

/** Print sizes that fit the report page (about 180 mm wide); two Medium photos sit side by side. */
export const PHOTO_SIZES = [
  { id: 'small', label: 'Small (55 × 40 mm)', widthMm: 55, heightMm: 40 },
  { id: 'medium', label: 'Medium (85 × 64 mm)', widthMm: 85, heightMm: 64 },
  { id: 'large', label: 'Large (120 × 90 mm)', widthMm: 120, heightMm: 90 },
  { id: 'full', label: 'Full width (175 × 130 mm)', widthMm: 175, heightMm: 130 },
] as const;
const sizeOf = (p: Pick<Photo, 'widthMm' | 'heightMm'>) => PHOTO_SIZES.find((s) => s.widthMm === p.widthMm && s.heightMm === p.heightMm)?.id ?? 'custom';
const MEDIUM = PHOTO_SIZES[1];
const MAX_PHOTOS = 12;

/** Turns the saved selection plus the available files into the editor's rows: chosen ones first, in print order. */
export function photoRows(files: Pick<FileRow, 'id'>[], chosen: Photo[]) {
  const picked = chosen.filter((c) => files.some((f) => f.id === c.fileId)).map((c) => ({ ...c, caption: c.caption ?? '', selected: true }));
  const rest = files.filter((f) => !chosen.some((c) => c.fileId === f.id)).map((f) => ({ fileId: f.id, caption: '', widthMm: MEDIUM.widthMm, heightMm: MEDIUM.heightMm, selected: false }));
  return [...picked, ...rest];
}
type Row = ReturnType<typeof photoRows>[number];

/**
 * Sample photographs on the report. Photos taken at booking are offered alongside any added here; the reviewer
 * ticks the ones to print, gives each a caption and size, and sets the order. Only a draft can change, and the
 * signed report keeps exactly the photos it was approved with.
 */
export function ReportPhotos({ report, version, editable, onSaved, onConflict }: { report: Report; version: number; editable: boolean; onSaved: (r: Report) => void; onConflict: () => void }) {
  const client = useQueryClient();
  const sampleKey = ['files', 'Sample', report.sampleId, 'sample-image'];
  const reportKey = ['files', 'Report', report.id, 'report-photo'];
  const sampleFiles = useQuery({ queryKey: sampleKey, queryFn: async () => unwrap(await api.GET('/api/v1/files', { params: { query: { entity: 'Sample', entityId: report.sampleId, category: 'sample-image' } } })) });
  const reportFiles = useQuery({ queryKey: reportKey, queryFn: async () => unwrap(await api.GET('/api/v1/files', { params: { query: { entity: 'Report', entityId: report.id, category: 'report-photo' } } })) });
  const files = useMemo(() => [...(sampleFiles.data ?? []), ...(reportFiles.data ?? [])].filter((f) => f.mimeType.startsWith('image/')), [sampleFiles.data, reportFiles.data]);
  const fromBooking = useMemo(() => new Set((sampleFiles.data ?? []).map((f) => f.id)), [sampleFiles.data]);

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const pendingSelect = useRef<string[]>([]);
  const latestRows = useRef(rows);
  latestRows.current = rows;
  // Follow the server: unsaved edits are kept, files that arrive are appended, and photos just added arrive ticked.
  useEffect(() => {
    const base = (dirty ? latestRows.current : photoRows(files, report.samplePhotos)).filter((r) => files.some((f) => f.id === r.fileId));
    const known = new Set(base.map((r) => r.fileId));
    const added = files.filter((f) => !known.has(f.id)).map((f) => ({ fileId: f.id, caption: '', widthMm: MEDIUM.widthMm, heightMm: MEDIUM.heightMm, selected: false }));
    const fresh = pendingSelect.current;
    const merged = [...base, ...added].map((r) => (fresh.includes(r.fileId) && !r.selected ? { ...r, selected: true } : r));
    const ticked = merged.some((r) => fresh.includes(r.fileId));
    // A stable sort keeps the print order and puts newly ticked photos after the ones already chosen.
    const next = merged.sort((a, b) => Number(b.selected) - Number(a.selected));
    if (ticked) {
      pendingSelect.current = [];
      setDirty(true);
    }
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the server data changes, not on each edit
  }, [files, report.samplePhotos]);

  const selectedCount = rows.filter((r) => r.selected).length;
  const change = (fileId: string, patch: Partial<Row>) => {
    setDirty(true);
    setRows((all) => all.map((r) => (r.fileId === fileId ? { ...r, ...patch } : r)));
  };
  const move = (index: number, by: -1 | 1) => {
    setDirty(true);
    setRows((all) => {
      const next = [...all];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.PATCH('/api/v1/reports/{id}/draft', {
          params: { path: { id: report.id } },
          body: { version, samplePhotos: rows.filter((r) => r.selected).map((r) => ({ fileId: r.fileId, caption: r.caption.trim() || null, widthMm: r.widthMm, heightMm: r.heightMm })) },
        }),
      ),
    onSuccess: (r) => {
      setDirty(false);
      onSaved(r);
      toast.success(r.samplePhotos.length ? `${r.samplePhotos.length} photo(s) will print on the report` : 'No photos will print on the report');
    },
    onError: (e) => (isConflict(e) ? (toast.error('Someone else changed this draft. It has been reloaded.'), setDirty(false), onConflict()) : toastError(e)),
  });

  const upload = useMutation({
    // One at a time, so the photos keep the order they were chosen in.
    mutationFn: async (list: File[]) => {
      const added = [];
      for (const f of list) added.push(await uploadEntityFile('Report', report.id, 'report-photo', f));
      return added;
    },
    onSuccess: (added) => {
      pendingSelect.current = added.map((f) => f.id);
      void client.invalidateQueries({ queryKey: reportKey });
      toast.success(`${added.length} photo(s) added and ticked. Save to put them on the report.`);
    },
    onError: toastError,
  });
  const input = useRef<HTMLInputElement>(null);

  const loading = sampleFiles.isLoading || reportFiles.isLoading;
  const error = sampleFiles.error ?? reportFiles.error;
  const shown = editable ? rows : rows.filter((r) => r.selected);

  return (
    <Card>
      <CardHeader
        title="Sample photographs"
        description={editable ? 'Tick the photos to print on the report, then save. Photos taken at booking are listed here too.' : 'The photos printed on this revision.'}
        actions={
          editable && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={input}
                type="file"
                multiple
                accept="image/png,image/jpeg"
                className="sr-only"
                aria-label="Add sample photos from this computer"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  if (list.length) upload.mutate(list);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" loading={upload.isPending} onClick={() => input.current?.click()}>
                <ImagePlus aria-hidden />
                Add photos
              </Button>
              <WebcamCapture title={`Photos of ${report.sampleNo}`} buttonLabel="Take photo" onSave={async (list) => void (await upload.mutateAsync(list))} />
              <PhoneUploadButton
                purpose="report-photo"
                entityId={report.id}
                onReceived={(ids) => {
                  pendingSelect.current = [...pendingSelect.current, ...ids];
                  void client.invalidateQueries({ queryKey: reportKey });
                }}
              />
            </div>
          )
        }
      />
      <div className="space-y-3 p-4">
        {loading && <Spinner label="Loading photos" />}
        {error && <ErrorState error={error} onRetry={() => void Promise.all([sampleFiles.refetch(), reportFiles.refetch()])} />}
        {!loading && !error && shown.length === 0 && <EmptyState title={editable ? 'No photos of this sample yet' : 'No photos on this report'}>{editable && <p className="mt-1 text-[13px] text-gray-600">Add photos from this computer or take them with the camera.</p>}</EmptyState>}
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Sample photos">
          <Thumbs ids={shown.map((r) => r.fileId)}>
            {(urls) =>
              shown.map((r, i) => {
                const label = files.find((f) => f.id === r.fileId)?.originalName ?? 'Photo';
                const order = rows.filter((x) => x.selected).findIndex((x) => x.fileId === r.fileId);
                return (
                  <li key={r.fileId} className={cn('flex flex-col gap-2 rounded-lg border p-2', r.selected ? 'border-brand bg-brand/5' : 'border-gray-200')}>
                    <div className="flex h-40 items-center justify-center overflow-hidden rounded bg-gray-100">
                      {urls[r.fileId] ? <img src={urls[r.fileId]} alt={r.caption || label} className="max-h-40 object-contain" /> : <Spinner />}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate text-gray-700" title={label}>
                        {label}
                        <span className="ml-1 text-xs text-gray-600">{fromBooking.has(r.fileId) ? '(taken at booking)' : '(added on report)'}</span>
                      </span>
                      {r.selected && <span className="shrink-0 text-xs font-semibold text-gray-900">Photo {order + 1}</span>}
                    </div>
                    {editable ? (
                      <>
                        <Checkbox id={`photo-${r.fileId}`} label="Print on report" checked={r.selected} disabled={!r.selected && selectedCount >= MAX_PHOTOS} onCheckedChange={(v) => change(r.fileId, { selected: v === true })} />
                        {r.selected && (
                          <>
                            <Field label="Caption" htmlFor={`cap-${r.fileId}`}>
                              <Input id={`cap-${r.fileId}`} maxLength={200} placeholder="For example: as received, fracture face" value={r.caption} onChange={(e) => change(r.fileId, { caption: e.target.value })} />
                            </Field>
                            <div className="flex items-end gap-2">
                              <Field label="Print size" htmlFor={`size-${r.fileId}`} className="flex-1">
                                <Select
                                  id={`size-${r.fileId}`}
                                  value={sizeOf(r)}
                                  onChange={(e) => {
                                    const s = PHOTO_SIZES.find((x) => x.id === e.target.value);
                                    if (s) change(r.fileId, { widthMm: s.widthMm, heightMm: s.heightMm });
                                  }}
                                >
                                  {sizeOf(r) === 'custom' && <option value="custom">{`${r.widthMm} × ${r.heightMm} mm`}</option>}
                                  {PHOTO_SIZES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <Button variant="ghost" size="icon" aria-label={`Move ${label} earlier`} disabled={i === 0 || !rows[i - 1]?.selected} onClick={() => move(i, -1)}>
                                <ArrowUp aria-hidden />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label={`Move ${label} later`} disabled={!rows[i + 1]?.selected} onClick={() => move(i, 1)}>
                                <ArrowDown aria-hidden />
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      r.caption && <p className="text-[13px] text-gray-800">{r.caption}</p>
                    )}
                  </li>
                );
              })
            }
          </Thumbs>
        </ul>
        {editable && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-3">
            <span className="text-[13px] text-gray-700">
              {selectedCount} of {MAX_PHOTOS} max selected{dirty && ' · not saved yet'}
            </span>
            {dirty && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDirty(false);
                  setRows(photoRows(files, report.samplePhotos));
                }}
              >
                Undo changes
              </Button>
            )}
            <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
              Save photos
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function Thumbs({ ids, children }: { ids: string[]; children: (urls: Record<string, string>) => React.ReactNode }) {
  return <>{children(useSignedUrls(ids))}</>;
}
