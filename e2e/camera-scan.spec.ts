import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// A QR code for a code that matches nothing: the dialog then repeats the exact code, which proves it was read.
const CODE = 'LIMS-SCAN-CHECK-01';
const QR_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOgAAADoCAYAAADlqah4AAAAAklEQVR4AewaftIAAARPSURBVO3BwY1bCRQDwX6E8k+Z6wT8DysI4oy76voHkiYFSbOCpFlB0qwgaVaQNCtImhUkzQqSZgVJs4KkWUHSrCBpVpA0K0iaFSTNCpJmBUmzgqRZQdKsIGlWkDQrSJoVJM0KkmYFSbOCpFlB0qwgaVaQNCtImhUkzXrxZXfHb9aWb7o73tGWJ3fHb9aWbwqSZgVJs4KkWUHSrCBpVpA0K0ia9WJcW5bdHcva8k1tWXZ3LAuSZgVJs4KkWUHSrCBpVpA0K0ia9eKHuzs+qS2fdHcsa8sn3R2f1JafLEiaFSTNCpJmBUmzgqRZQdKsIGnWC/1obXnH3aFdQdKsIGlWkDQrSJoVJM0KkmYFSbOCpFlB0qwgaVaQNCtImhUkzQqSZgVJs178cG35l90d72jLN7VFfxckzQqSZgVJs4KkWUHSrCBpVpA068W4u+Nf1pYnd8eTtjy5O5605R13h/6/IGlWkDQrSJoVJM0KkmYFSbOCpFnXP9DX3B1P2qJ/V5A0K0iaFSTNCpJmBUmzgqRZQdKsF192dzxpy5O7Y1lbnrTlHXfHO9ryjrtjWVt+siBpVpA0K0iaFSTNCpJmBUmzgqRZ1z/4xe6OT2rLJ90d72jLk7vjHW15cnc8acuTu+Ob2vJNQdKsIGlWkDQrSJoVJM0KkmYFSbNejLs73tGWJ3fHk7Y8uTs+qS0/WVs+qS2/WZA0K0iaFSTNCpJmBUmzgqRZQdKsF192dyy7O5605R13x7K2PLk73tEW/V2QNCtImhUkzQqSZgVJs4KkWUHSrBdf1pYnd8eTtjy5Oz7p7njSlidtecfd8aQt39SWb7o73tGWbwqSZgVJs4KkWUHSrCBpVpA0K0ia9WJcW97RlmV3xyfdHcvujnfcHb9ZkDQrSJoVJM0KkmYFSbOCpFlB0qwXX3Z3/GZtedKWd9wdT9ry5O74pLvjSVue3B3vaMtPFiTNCpJmBUmzgqRZQdKsIGlWkDTrxbi2LLs73nF3PGnLsrY8uTs+qS1P7o4nbVkWJM0KkmYFSbOCpFlB0qwgaVaQNOvFD3d3fFJbvunueNKWZW35pLvjSVue3B1P2vJNQdKsIGlWkDQrSJoVJM0KkmYFSbNeSG+4O5605cnd8U1tWRYkzQqSZgVJs4KkWUHSrCBpVpA064WmteWT2vLk7njSlid3x5O2vOPu+M2CpFlB0qwgaVaQNCtImhUkzQqSZr344dryk7Xlyd3xjrZ80t3xpC3vuDs+6e540pZvCpJmBUmzgqRZQdKsIGlWkDQrSJr1Ytzd8ZvdHe9oy5O745Pa8uTueNKWb2rLsiBpVpA0K0iaFSTNCpJmBUmzgqRZ1z+QNClImhUkzQqSZgVJs4KkWUHSrCBpVpA0K0iaFSTNCpJmBUmzgqRZQdKsIGlWkDQrSJoVJM0KkmYFSbOCpFlB0qwgaVaQNCtImhUkzQqSZgVJs4KkWUHSrCBp1n85vO/J8JbSsAAAAABJRU5ErkJggg==';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('on a browser without a built-in code reader (every iPhone browser), Scan a label still reads a label', async ({ page }) => {
  // Behave like iPhone Safari: no BarcodeDetector, and a camera that shows the label.
  await page.addInitScript((src) => {
    delete (window as { BarcodeDetector?: unknown }).BarcodeDetector;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = src;
    const draw = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 640, 480);
      if (img.complete) ctx.drawImage(img, 320 - img.width / 2, 240 - img.height / 2);
      requestAnimationFrame(draw);
    };
    draw();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => canvas.captureStream(15) } });
  }, QR_PNG);
  const wasm: string[] = [];
  page.on('response', (r) => r.url().endsWith('.wasm') && wasm.push(new URL(r.url()).origin));

  await signIn(page, 'reception');
  await page.getByRole('button', { name: 'Scan a label' }).click();
  const dialog = page.getByRole('dialog', { name: 'Scan a label' });
  await expect(dialog.getByRole('status')).toHaveText(`Nothing matches ${CODE}. Try another label.`, { timeout: 20_000 });
  // The reader came from this site, not a CDN.
  expect(wasm.length).toBeGreaterThan(0);
  expect(new Set(wasm)).toEqual(new Set([new URL(page.url()).origin]));
});
