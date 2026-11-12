// Reading QR codes and barcodes from the camera.
// Browsers with a built-in reader (Chrome on Android) use it. The others, which includes every browser on an
// iPhone, get ZXing compiled to WebAssembly. It loads only when someone opens the scanner, and the .wasm file is
// served from this site (never a CDN), which is why the app's Content-Security-Policy allows 'wasm-unsafe-eval'.

export type BarcodeFormat = 'qr_code' | 'code_128' | 'code_39' | 'ean_13' | 'data_matrix';
export type Detector = { detect: (source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap) => Promise<{ rawValue: string }[]> };
type NativeDetectorClass = (new (options: { formats: string[] }) => Detector) & { getSupportedFormats?: () => Promise<string[]> };

/** The camera can be used at all: a secure page in a browser that offers it. WebAssembly is in every such browser. */
export const cameraAvailable = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof WebAssembly === 'object';

async function nativeDetector(formats: BarcodeFormat[]): Promise<Detector | null> {
  const Native = (globalThis as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (!Native) return null;
  try {
    const supported = (await Native.getSupportedFormats?.()) ?? formats;
    // A built-in reader without QR codes (some desktop builds) is no use for labels.
    if (!supported.includes('qr_code')) return null;
    return new Native({ formats: formats.filter((f) => supported.includes(f)) });
  } catch {
    return null;
  }
}

let fallback: Promise<Detector> | null = null;

/** A reader for these formats: the browser's own, or the bundled one. Rejects if neither can start. */
export function createDetector(formats: BarcodeFormat[]): Promise<Detector> {
  return nativeDetector(formats).then(
    (native) =>
      native ??
      (fallback ??= (async () => {
        const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([import('barcode-detector/ponyfill'), import('zxing-wasm/reader/zxing_reader.wasm?url')]);
        // Load and compile now, so a failure shows when the scanner opens rather than silently on every frame.
        await prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) }, fireImmediately: true });
        return new BarcodeDetector({ formats });
      })().catch((e: unknown) => {
        fallback = null;
        throw e;
      })),
  );
}
