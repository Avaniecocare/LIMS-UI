import { ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cameraAvailable, createDetector, type Detector } from '@/lib/barcode';
import { toastError } from '@/lib/forms';

/** Any browser that can open the camera can scan: the browser's own reader, or the bundled one (iPhone). */
export const cameraScanSupported = cameraAvailable;

/** "Scan a label": points the camera at a sample label's QR code or barcode and opens what it belongs to. */
export function CameraScanButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  if (!cameraScanSupported()) return null;
  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        <ScanLine aria-hidden />
        Scan a label
      </Button>
      {open && <ScanDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ScanDialog({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [message, setMessage] = useState('Point the camera at the label.');
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let frame = 0;
    let detector: Detector | null = null;
    const look = async () => {
      if (stopped || !video.current || !detector) return;
      try {
        const [hit] = await detector.detect(video.current);
        if (hit?.rawValue) {
          stopped = true;
          setMessage(`Found ${hit.rawValue}. Opening…`);
          const { link } = unwrap(await api.GET('/api/v1/search/scan', { params: { query: { code: hit.rawValue } } }));
          if (link) {
            onClose();
            navigate(link);
          } else {
            setMessage(`Nothing matches ${hit.rawValue}. Try another label.`);
            stopped = false;
          }
        }
      } catch (e) {
        toastError(e);
      }
      if (!stopped) frame = window.setTimeout(() => void look(), 250);
    };
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped || !video.current) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play();
      } catch {
        setMessage('The camera could not be opened. Allow camera access for this site and try again.');
        return;
      }
      try {
        detector = await createDetector(['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix']);
      } catch {
        setMessage('The label reader could not start. Reload the page and try again, or type the number in the search box.');
        return;
      }
      void look();
    })();
    return () => {
      stopped = true;
      clearTimeout(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [navigate, onClose]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Scan a label" description="Sample, job or report labels with a QR code or barcode.">
      <video ref={video} className="aspect-[4/3] w-full rounded-md bg-black object-cover" muted playsInline aria-label="Camera view" />
      <p role="status" className="mt-2 text-sm text-gray-700">
        {message}
      </p>
    </Dialog>
  );
}
