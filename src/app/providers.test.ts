import { describe, expect, it } from 'vitest';
import { contrastColor } from './providers';

describe('contrastColor', () => {
  it('uses white on dark brands and dark text on light brands', () => {
    expect(contrastColor('#0f4c81')).toBe('#ffffff');
    expect(contrastColor('#fde68a')).toBe('#111827');
  });
});
