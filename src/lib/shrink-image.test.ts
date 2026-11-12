import { describe, expect, it } from 'vitest';
import { timeLeft } from '@/components/PhoneUpload';
import { encodeUnder, fitWithin, MAX_BYTES, shrinkImage } from './shrink-image';

describe('fitWithin', () => {
  it('brings the long side down to 2000 pixels, keeping the shape', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 });
  });
  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('encodeUnder', () => {
  it('lowers quality first, then size, until the photo is under 1 MB', async () => {
    const tried: [number, number][] = [];
    // Pretend bytes grow with pixels and quality.
    const encode = async (side: number, quality: number) => {
      tried.push([side, quality]);
      return new Blob([new Uint8Array(Math.round(side * side * quality * 0.5))]);
    };
    const blob = await encodeUnder(encode);
    expect(blob!.size).toBeLessThanOrEqual(MAX_BYTES);
    expect(tried[0]).toEqual([2000, 0.85]);
    expect(tried.at(-1)![0]).toBeLessThan(2000);
  });
  it('gives back the smallest attempt if nothing fits', async () => {
    const blob = await encodeUnder(async () => new Blob([new Uint8Array(MAX_BYTES + 10)]));
    expect(blob!.size).toBe(MAX_BYTES + 10);
  });
});

describe('shrinkImage', () => {
  it('leaves files that are not photos alone', async () => {
    const pdf = new File(['%PDF-1.4'], 'letter.pdf', { type: 'application/pdf' });
    expect(await shrinkImage(pdf)).toBe(pdf);
  });
  it('sends the original when the browser cannot read the image', async () => {
    const odd = new File([new Uint8Array([1, 2, 3])], 'IMG_0001.HEIC', { type: 'image/heic' });
    expect(await shrinkImage(odd)).toBe(odd);
  });
});

describe('timeLeft', () => {
  it('shows minutes and seconds, and stops at zero', () => {
    const now = Date.parse('2026-11-12T10:00:00Z');
    expect(timeLeft('2026-11-12T10:14:05Z', now)).toBe('14:05');
    expect(timeLeft('2026-11-12T09:59:00Z', now)).toBe('0:00');
  });
});
