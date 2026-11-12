import { describe, expect, it } from 'vitest';
import { PHOTO_SIZES, photoRows } from './ReportPhotos';

describe('photoRows', () => {
  it('puts the saved photos first in print order, then the rest unticked at Medium size', () => {
    const files = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const rows = photoRows(files, [
      { fileId: 'c', caption: 'Fracture', widthMm: 120, heightMm: 90 },
      { fileId: 'a', caption: null, widthMm: 55, heightMm: 40 },
    ]);
    expect(rows.map((r) => [r.fileId, r.selected])).toEqual([
      ['c', true],
      ['a', true],
      ['b', false],
    ]);
    expect(rows[1].caption).toBe('');
    expect(rows[2]).toMatchObject({ widthMm: 85, heightMm: 64 });
  });

  it('drops a saved photo whose file has since been removed', () => {
    expect(photoRows([{ id: 'a' }], [{ fileId: 'gone', caption: null, widthMm: 85, heightMm: 64 }]).map((r) => r.fileId)).toEqual(['a']);
  });

  it('offers only sizes the server accepts and that fit the page', () => {
    for (const s of PHOTO_SIZES) {
      expect(s.widthMm).toBeGreaterThanOrEqual(30);
      expect(s.widthMm).toBeLessThanOrEqual(180);
      expect(s.heightMm).toBeLessThanOrEqual(240);
    }
  });
});
