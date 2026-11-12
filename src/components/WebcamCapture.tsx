import { Camera, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dialog } from '@/components/ui/primitives';
import { toastError } from '@/lib/forms';

type CameraState = 'off' | 'starting' | 'live' | 'denied' | 'unavailable';
interface Shot {
  id: number;
  file: File;
  url: string;
}

const MESSAGE: Partial<Record<CameraState, string>> = {
  starting: 'Starting the camera…',
  denied: 'Camera access was denied. Allow it in your browser settings, or choose image files instead.',
  unavailable: 'No camera is available here. Choose image files instead.',
};

/**
 * Captures several still images, with file upload when there is no camera or it is denied.
 * The camera starts from the button press, because browsers want a user gesture, and every track
 * stops as soon as the dialog closes.
 */
export function WebcamCapture({ title, buttonLabel = 'Use camera', accept = 'image/png,image/jpeg', onSave }: { title: string; buttonLabel?: string; accept?: string; onSave: (files: File[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CameraState>('off');
  const [shots, setShots] = useState<Shot[]>([]);
  const [saving, setSaving] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  // Bumped on close, so a camera that finishes starting after the dialog closed is stopped at once.
  const session = useRef(0);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      session.current += 1;
      stop();
    },
    [stop],
  );

  const attach = useCallback((el: HTMLVideoElement | null) => {
    video.current = el;
    if (el && stream.current) {
      el.srcObject = stream.current;
      // Autoplay of a muted preview is allowed; a refusal only means it starts on the first tap.
      void el.play()?.catch(() => undefined);
    }
  }, []);

  const start = async () => {
    const mine = ++session.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('starting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false });
      if (mine !== session.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      setState('live');
    } catch (e) {
      if (mine !== session.current) return;
      setState(e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'unavailable');
    }
  };

  const close = () => {
    session.current += 1;
    stop();
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    setShots([]);
    setState('off');
    setOpen(false);
  };

  const addFiles = (files: File[]) => {
    setShots((prev) => [...prev, ...files.map((file) => ({ id: nextId.current++, file, url: URL.createObjectURL(file) }))]);
  };

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) addFiles([new File([blob], `capture-${Date.now()}-${nextId.current}.jpg`, { type: 'image/jpeg' })]);
      },
      'image/jpeg',
      0.9,
    );
  };

  const remove = (id: number) => {
    setShots((prev) => {
      const gone = prev.find((s) => s.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((s) => s.id !== id);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(shots.map((s) => s.file));
      close();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
          void start();
        }}
      >
        <Camera aria-hidden />
        {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && close()} title={title} wide>
        <div className="space-y-3">
          {state === 'live' && <video ref={attach} className="max-h-[50dvh] w-full rounded-md bg-black" muted playsInline aria-label="Camera preview" />}
          {MESSAGE[state] && (
            <p role={state === 'starting' ? 'status' : 'alert'} className="rounded-md bg-gray-100 p-3 text-sm text-gray-800">
              {MESSAGE[state]}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {state === 'live' && (
              <Button onClick={capture}>
                <Camera aria-hidden />
                Capture
              </Button>
            )}
            {(state === 'denied' || state === 'unavailable') && (
              <Button variant="secondary" onClick={() => void start()}>
                Try the camera again
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={accept}
              className="sr-only"
              aria-label={`Choose image files for ${title}`}
              tabIndex={-1}
              onChange={(e) => {
                addFiles([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden />
              Choose files
            </Button>
            <span role="status" className="text-[13px] text-gray-700">
              {shots.length} {shots.length === 1 ? 'image' : 'images'} ready
            </span>
          </div>
          {shots.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shots.map((s, i) => (
                <li key={s.id} className="relative rounded border border-gray-200 p-1">
                  <img src={s.url} alt={`Image ${i + 1}`} className="h-24 w-full object-contain" />
                  <Button variant="secondary" size="icon" className="absolute top-1 right-1" aria-label={`Remove image ${i + 1}`} onClick={() => remove(s.id)}>
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!shots.length} loading={saving} onClick={() => void save()}>
              Save {shots.length || ''} {shots.length === 1 ? 'image' : 'images'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
