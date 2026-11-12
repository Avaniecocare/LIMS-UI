import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Image as ImageIcon, Lock, Paperclip, Printer, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { components } from '@/api/schema';
import { PhoneUploadButton } from '@/components/PhoneUpload';
import { Attachments } from '@/components/shared';
import { Badge, Button, Card, Checkbox, ConfirmDialog, ErrorState, Field, Input, Spinner } from '@/components/ui/primitives';
import { api, unwrap, uploadFile } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { shrinkImage } from '@/lib/shrink-image';

type FileRow = components['schemas']['FileDto'];
type Kind = 'result-image' | 'instrument-report' | 'raw-data';

// Below this width a graph or photo prints soft at the usual 80 mm.
const SHARP_WIDTH_PX = 1000;

/** Width and height of a picture, read in the browser before upload. */
function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * A test's files, by what they are for:
 * - result images and graphs print on the report as numbered figures, labelled with the sample, test and instrument;
 * - instrument reports (the instrument software's PDF) print as annexure pages of the report;
 * - raw data (the instrument's own files) and worksheets are kept with the test as its records, never printed.
 * All of them are locked once the results are approved.
 */
export function TestFiles({ testId, canEdit }: { testId: string; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      {!canEdit && (
        <p className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700">
          <Lock className="size-4 shrink-0" aria-hidden />
          Files can be added or changed only while the test is in progress. Approved results and their files are locked.
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <FileSection
          testId={testId}
          kind="result-image"
          canEdit={canEdit}
          title="Result images and graphs"
          icon={ImageIcon}
          accept="image/png,image/jpeg,image/webp"
          hint="Printed on the report as numbered figures, labelled with the sample, test, instrument and date. For graphs, use the instrument software's export rather than a photo of its screen."
          withPrintSize
        />
        <FileSection
          testId={testId}
          kind="instrument-report"
          canEdit={canEdit}
          title="Instrument reports (PDF)"
          icon={FileText}
          accept="application/pdf"
          hint="The PDF your instrument software exports (curves, chromatograms, its own result table). Printed as annexure pages after the report body, each carrying the report number and page count. Up to 20 pages per file."
        />
        <FileSection
          testId={testId}
          kind="raw-data"
          canEdit={canEdit}
          title="Raw data files"
          icon={Paperclip}
          hint="The instrument's original files, in any format. Kept with the test as the original record and fingerprinted; never printed on the report."
        />
        <Card>
          <div className="p-4">
            <Attachments entity="SampleTest" entityId={testId} category="worksheet" title="Worksheets" canEdit={canEdit} />
            <p className="mt-2 text-xs text-gray-600">Calculations and notes made while testing. Kept with the test; never printed.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FileSection({
  testId,
  kind,
  canEdit,
  title,
  icon: Icon,
  accept,
  hint,
  withPrintSize,
}: {
  testId: string;
  kind: Kind;
  canEdit: boolean;
  title: string;
  icon: typeof FileText;
  accept?: string;
  hint: string;
  withPrintSize?: boolean;
}) {
  const client = useQueryClient();
  const key = ['files', 'SampleTest', testId, kind];
  const q = useQuery({ queryKey: key, queryFn: async () => unwrap(await api.GET('/api/v1/files', { params: { query: { entity: 'SampleTest', entityId: testId, category: kind } } })) });
  const input = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState('80');
  const [height, setHeight] = useState('60');
  const [confirm, setConfirm] = useState<FileRow | null>(null);
  const printable = kind !== 'raw-data';
  const refresh = () => client.invalidateQueries({ queryKey: key });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (kind === 'result-image') {
        const size = await imageSize(file);
        if (size && size.w < SHARP_WIDTH_PX)
          toast.warning(`This image is small (${size.w} × ${size.h} px) and may print blurry.`, { description: 'If the instrument software can export the graph larger, or as PDF, use that.' });
      }
      const form = new FormData();
      form.set('entity', 'SampleTest');
      form.set('entityId', testId);
      form.set('category', kind);
      if (withPrintSize) {
        form.set('printWidthMm', width);
        form.set('printHeightMm', height);
      }
      form.set('file', kind === 'result-image' ? await shrinkImage(file) : file);
      return uploadFile('/files', form);
    },
    onSuccess: () => {
      void refresh();
      if (kind === 'instrument-report') toast.success('Added. It will print as an annexure of the report.');
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE('/api/v1/files/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      setConfirm(null);
      void refresh();
    },
    onError: toastError,
  });
  const open = async (id: string) => {
    try {
      window.open(unwrap(await api.GET('/api/v1/files/{id}/url', { params: { path: { id } } })).url, '_blank', 'noopener');
    } catch (e) {
      toastError(e);
    }
  };
  const printed = q.data?.filter((f) => f.printOnReport).length ?? 0;

  return (
    <Card>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
              <Icon className="size-4 text-gray-600" aria-hidden />
              {title}
              {printable && !!q.data?.length && (
                <Badge tone={printed ? 'green' : 'gray'} className="ml-1">
                  {printed} of {q.data.length} on the report
                </Badge>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-gray-600">{hint}</p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              {withPrintSize && (
                <>
                  <Field label="Print width (mm)" htmlFor={`${kind}-w`}>
                    <Input id={`${kind}-w`} className="h-8 w-20" type="number" min={1} max={400} value={width} onChange={(e) => setWidth(e.target.value)} />
                  </Field>
                  <Field label="Print height (mm)" htmlFor={`${kind}-h`}>
                    <Input id={`${kind}-h`} className="h-8 w-20" type="number" min={1} max={400} value={height} onChange={(e) => setHeight(e.target.value)} />
                  </Field>
                </>
              )}
              <input
                ref={input}
                type="file"
                accept={accept}
                className="sr-only"
                aria-label={`Upload to ${title}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" loading={upload.isPending} onClick={() => input.current?.click()}>
                <Paperclip aria-hidden />
                Add file
              </Button>
              {kind === 'result-image' && <PhoneUploadButton purpose="result-image" entityId={testId} onReceived={() => void refresh()} />}
            </div>
          )}
        </div>
        {q.isLoading && <Spinner />}
        {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
        {q.data?.length === 0 && <p className="text-[13px] text-gray-600">None yet.</p>}
        <ul className="divide-y divide-gray-100" aria-label={title}>
          {q.data?.map((f) => (
            <FileItem key={f.id} file={f} kind={kind} canEdit={canEdit} onOpen={() => void open(f.id)} onRemove={() => setConfirm(f)} onChanged={() => void refresh()} />
          ))}
        </ul>
      </div>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Remove ${confirm?.originalName ?? 'this file'}?`}
        description="It is taken off this test (and the report). The removal stays in the audit history."
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
        onConfirm={() => confirm && remove.mutate(confirm.id)}
      />
    </Card>
  );
}

function FileItem({ file, kind, canEdit, onOpen, onRemove, onChanged }: { file: FileRow; kind: Kind; canEdit: boolean; onOpen: () => void; onRemove: () => void; onChanged: () => void }) {
  const [caption, setCaption] = useState(file.caption ?? '');
  useEffect(() => setCaption(file.caption ?? ''), [file.caption]);
  const save = useMutation({
    mutationFn: async (patch: { caption?: string | null; printOnReport?: boolean }) => unwrap(await api.PATCH('/api/v1/files/{id}', { params: { path: { id: file.id } }, body: patch })),
    onSuccess: onChanged,
    onError: toastError,
  });
  const printable = kind !== 'raw-data';
  const label = kind === 'instrument-report' ? 'Annexure title' : 'Caption';
  const details: ReactNode[] = [];
  if (kind === 'instrument-report' && file.pageCount) details.push(`${file.pageCount} page${file.pageCount === 1 ? '' : 's'}`);
  if (file.printWidthMm) details.push(`${file.printWidthMm}×${file.printHeightMm} mm`);
  details.push(formatDateTime(file.createdAt));
  if (kind === 'raw-data') details.push(`SHA-256 ${file.sha256.slice(0, 12)}…`);

  return (
    <li className="space-y-1.5 py-2 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="min-w-0 truncate text-left font-medium text-gray-900 underline" onClick={onOpen}>
          {file.originalName}
        </button>
        <span className="flex shrink-0 items-center gap-1">
          {printable && file.printOnReport && (
            <Badge tone="green" className="gap-1">
              <Printer className="size-3" aria-hidden />
              On report
            </Badge>
          )}
          {canEdit && (
            <Button variant="ghost" size="icon" aria-label={`Remove ${file.originalName}`} onClick={onRemove}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </span>
      </div>
      <p className="text-xs text-gray-600">{details.join(' · ')}</p>
      {printable && !canEdit && file.caption && (
        <p className="text-xs text-gray-700">
          {label}: {file.caption}
        </p>
      )}
      {printable && canEdit && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={label} htmlFor={`cap-${file.id}`} className="min-w-0 flex-1">
            <Input
              id={`cap-${file.id}`}
              className="h-8"
              maxLength={200}
              value={caption}
              placeholder={kind === 'instrument-report' ? file.originalName.replace(/\.pdf$/i, '') : 'e.g. Load vs extension, specimen 1'}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={() => caption.trim() !== (file.caption ?? '') && save.mutate({ caption: caption.trim() || null })}
            />
          </Field>
          <Checkbox id={`print-${file.id}`} label="Print on report" checked={file.printOnReport} disabled={save.isPending} onCheckedChange={(v) => save.mutate({ printOnReport: v === true })} />
        </div>
      )}
    </li>
  );
}
