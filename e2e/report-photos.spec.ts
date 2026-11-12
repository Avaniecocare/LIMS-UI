import { expect, test } from '@playwright/test';
import { issuedJob, signIn } from './helpers';

// A tiny real PNG (1 x 1 pixel).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('a reviewer adds sample photos to a draft report and they print in the chosen order', async ({ page }) => {
  const { reportId } = await issuedJob({ until: 'draft' });
  await signIn(page, 'reviewer');
  await page.goto(`/approvals/reports/${reportId}`);
  await page.getByRole('tab', { name: 'Photos (0)' }).click();
  await expect(page.getByText('No photos of this sample yet')).toBeVisible();

  await page.getByLabel('Add sample photos from this computer').setInputFiles([
    { name: 'as-received.png', mimeType: 'image/png', buffer: PNG },
    { name: 'after-test.png', mimeType: 'image/png', buffer: PNG },
  ]);
  const photos = page.getByRole('list', { name: 'Sample photos' });
  await expect(photos.getByRole('listitem')).toHaveCount(2);
  // Added photos arrive ticked; caption them, enlarge one and put it first.
  const first = photos.getByRole('listitem').filter({ hasText: 'as-received.png' });
  const second = photos.getByRole('listitem').filter({ hasText: 'after-test.png' });
  await expect(first.getByRole('checkbox', { name: 'Print on report' })).toBeChecked();
  await first.getByLabel('Caption').fill('As received');
  await second.getByLabel('Caption').fill('After testing');
  await second.getByLabel('Print size').selectOption({ label: 'Large (120 × 90 mm)' });
  await second.getByRole('button', { name: 'Move after-test.png earlier' }).click();
  await expect(second).toContainText('Photo 1');
  await expect(page.getByText('not saved yet')).toBeVisible();
  await page.getByRole('button', { name: 'Save photos' }).click();
  await expect(page.getByText('2 photo(s) will print on the report')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Photos (2)' })).toBeVisible();

  // The preview prints them under their own heading, in that order.
  await page.getByRole('tab', { name: 'Preview' }).click();
  const preview = page.frameLocator('iframe[title^="Preview of"]');
  await expect(preview.getByRole('heading', { name: 'Sample photographs' })).toBeVisible();
  const text = await preview.locator('body').innerText();
  expect(text.indexOf('Photo 1: After testing')).toBeGreaterThan(-1);
  expect(text.indexOf('Photo 1: After testing')).toBeLessThan(text.indexOf('Photo 2: As received'));

  // Unticking one and saving takes it off the report.
  await page.getByRole('tab', { name: 'Photos (2)' }).click();
  await first.getByRole('checkbox', { name: 'Print on report' }).click();
  await page.getByRole('button', { name: 'Save photos' }).click();
  await expect(page.getByRole('tab', { name: 'Photos (1)' })).toBeVisible();
});
