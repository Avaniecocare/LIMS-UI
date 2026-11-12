import { describe, expect, it } from 'vitest';
import { contrastColor, contrastRatio, luminance } from '@/app/providers';
import { PRESETS } from './LabSettings';

/** Every ready-made palette keeps text readable (WCAG AA, 4.5:1) wherever the app puts text on its colours. */
describe('ready-made palettes', () => {
  it.each(PRESETS.map((p) => [p.name, p.colors] as const))('%s', (_name, c) => {
    // Button text on the primary colour, and menu text on the menu colour (each picks white or near-black itself).
    expect(contrastRatio(c.primaryColor, contrastColor(c.primaryColor))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.navColor, contrastColor(c.navColor))).toBeGreaterThanOrEqual(4.5);
    // Links and headings in the primary colour on the light page background.
    expect(contrastRatio(c.primaryColor, c.surfaceColor)).toBeGreaterThanOrEqual(4.5);
    // The page background stays light.
    expect(luminance(c.surfaceColor)).toBeGreaterThan(0.85);
  });

  it('names are unique', () => {
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length);
  });
});
