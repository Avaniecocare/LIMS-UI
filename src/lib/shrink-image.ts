/**
 * Photos are shrunk in the browser before upload: a phone photo of 3–8 MB becomes about 2000 pixels on the long
 * side and under 1 MB. That still prints sharply at the largest report size (175 mm is about 290 dpi), uploads
 * quickly on mobile data, and keeps report PDFs small enough to email.
 */
export const MAX_SIDE = 2000;
export const MAX_BYTES = 1024 * 1024;
/** Attachment categories that hold photographs and are shrunk; letters, signatures and documents are left alone. */
export const PHOTO_CATEGORIES = new Set(['sample-image', 'report-photo', 'result-image']);

/** The size to draw at so the long side is at most `max`, never enlarging. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Encodes at falling quality, then smaller, until under `maxBytes`. `encode` is injected so the steps can be
 * tested without a real canvas.
 */
export async function encodeUnder(encode: (side: number, quality: number) => Promise<Blob | null>, maxSide = MAX_SIDE, maxBytes = MAX_BYTES): Promise<Blob | null> {
  let last: Blob | null = null;
  for (const side of [maxSide, Math.round(maxSide * 0.8), Math.round(maxSide * 0.64)]) {
    for (const quality of [0.85, 0.75, 0.65]) {
      last = await encode(side, quality);
      if (last && last.size <= maxBytes) return last;
    }
  }
  return last;
}

const jpegName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;

/**
 * Returns a smaller JPEG of an image file, or the file itself when it is already small enough, isn't an image, or
 * the browser can't decode it (the server then decides). The camera's rotation is applied, so photos stay upright.
 */
export async function shrinkImage(file: File, maxSide = MAX_SIDE, maxBytes = MAX_BYTES): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    if (file.size <= maxBytes && Math.max(bitmap.width, bitmap.height) <= maxSide) return file;
    const blob = await encodeUnder(
      (side, quality) => {
        const { width, height } = fitWithin(bitmap.width, bitmap.height, side);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const g = canvas.getContext('2d');
        if (!g) return Promise.resolve(null);
        // Transparent PNGs get a white background rather than black.
        g.fillStyle = '#fff';
        g.fillRect(0, 0, width, height);
        g.drawImage(bitmap, 0, 0, width, height);
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      },
      maxSide,
      maxBytes,
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
