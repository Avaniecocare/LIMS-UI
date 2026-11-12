import { describe, expect, it } from 'vitest';
import { contrastColor, contrastRatio, focusColor } from './providers';

describe('contrastColor', () => {
  it('uses white on dark brands and dark text on light brands', () => {
    expect(contrastColor('#0f4c81')).toBe('#ffffff');
    expect(contrastColor('#fde68a')).toBe('#111827');
  });

  it.each([
    ['#10b981', '#111827'],
    ['#3b82f6', '#111827'],
    ['#1a6b5a', '#ffffff'],
    ['#fde047', '#111827'],
  ])('picks the higher-contrast text for %s', (brand, expected) => {
    const chosen = contrastColor(brand);
    expect(chosen).toBe(expected);
    const other = chosen === '#ffffff' ? '#111827' : '#ffffff';
    expect(contrastRatio(brand, chosen)).toBeGreaterThanOrEqual(contrastRatio(brand, other));
    expect(contrastRatio(brand, chosen)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('focusColor', () => {
  it.each(['#10b981', '#3b82f6', '#1a6b5a', '#fde047', '#ffffff'])('keeps the focus ring for %s at 3:1 or more on white', (brand) => {
    expect(contrastRatio(focusColor(brand), '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('leaves a brand that already passes unchanged', () => {
    expect(focusColor('#1a6b5a')).toBe('#1a6b5a');
  });
});
