import { devices, expect, test, type Page } from '@playwright/test';
import { apiAs, issuedJob, plannedJob, signIn } from './helpers';

/** A phone-sized photo: 4000 x 3000, a gradient with grain, saved at high quality (several MB). */
async function bigPhoto(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 4000;
    c.height = 3000;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 4000, 3000);
    grad.addColorStop(0, '#8a9099');
    grad.addColorStop(1, '#d9dde1');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4000, 3000);
    const img = g.getImageData(0, 0, 4000, 3000);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.97);
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('a reviewer shows a QR code, a phone sends photos without signing in, and they arrive ticked on the report', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const { reportId } = await issuedJob({ until: 'draft' });
  await signIn(page, 'reviewer');
  await page.goto(`/approvals/reports/${reportId}`);
  await page.getByRole('tab', { name: /^Photos/ }).click();
  await page.getByRole('button', { name: 'Use phone' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send photos from your phone' });
  await expect(dialog.getByRole('img', { name: /QR code for Photos for report / })).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Waiting for photos…');
  await dialog.getByText("Can't scan? Open this link on the phone").click();
  const url = (await dialog.locator('p.break-all').textContent())!.trim();
  expect(url).toMatch(/\/phone\/[\w-]{43}$/);

  // The phone: a separate browser with no session at all.
  const phoneContext = await browser.newContext({ ...devices['iPhone 13'] });
  const phone = await phoneContext.newPage();
  await phone.goto(url);
  await expect(phone.getByRole('heading', { name: /^Photos for report .* \(sample .*\)$/ })).toBeVisible();
  await expect(phone.getByText(/20 more photos · link works for 1[45]:/)).toBeVisible();
  const big = await bigPhoto(phone);
  expect(big.length).toBeGreaterThan(1024 * 1024);
  await phone.getByLabel('Choose photos from the gallery').setInputFiles([
    { name: 'IMG_4031.jpg', mimeType: 'image/jpeg', buffer: big },
    { name: 'IMG_4032.png', mimeType: 'image/png', buffer: PNG },
  ]);
  await expect(phone.getByRole('status').filter({ hasText: /^2 sent\./ })).toBeVisible({ timeout: 30_000 });

  // The computer sees them arrive, and they come in ticked.
  await expect(dialog.getByRole('status')).toHaveText('2 photo(s) received from the phone', { timeout: 10_000 });
  await dialog.getByRole('button', { name: 'Done' }).click();
  const photos = page.getByRole('list', { name: 'Sample photos' });
  await expect(photos.getByRole('listitem')).toHaveCount(2);
  await expect(photos.getByRole('checkbox', { name: 'Print on report' }).first()).toBeChecked();
  await expect(page.getByText('not saved yet')).toBeVisible();

  // The large photo was shrunk on the phone: about 2000 pixels and under 1 MB.
  const reviewer = await apiAs('reviewer');
  const files: { originalName: string; sizeBytes: number; mimeType: string }[] = await reviewer.get(`/files?entity=Report&entityId=${reportId}&category=report-photo`);
  const shrunk = files.find((f) => f.originalName === 'IMG_4031.jpg')!;
  expect(shrunk.sizeBytes).toBeLessThan(1024 * 1024);
  expect(shrunk.sizeBytes).toBeLessThan(big.length / 2);

  // Closing the dialog ended the link: the phone is told so on its next photo.
  await phone.getByLabel('Choose photos from the gallery').setInputFiles([{ name: 'IMG_4033.png', mimeType: 'image/png', buffer: PNG }]);
  await expect(phone.getByText('This link has ended')).toBeVisible();
  await phoneContext.close();
});

test('while booking, a phone sends photos for a sample that does not exist yet, and they land on it once booked', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await signIn(page, 'reception');
  await page.goto('/samples/new');
  const form = page.getByRole('region', { name: 'Book without a quotation' });
  await expect(async () => {
    await form.getByRole('combobox', { name: /^Customer/ }).fill('Contoso');
    await page.getByRole('option', { name: /Contoso/ }).first().click({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
  await form.getByLabel('Reason for no quotation').fill('Walk-in customer');
  const sample = form.getByRole('region', { name: 'Sample 1' });
  await sample.getByLabel('Description').fill('Pipe offcut');
  await form.getByRole('checkbox', { name: /Email the acknowledgement/ }).click();

  await sample.getByRole('button', { name: 'Use phone' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send photos from your phone' });
  await expect(dialog.getByText('Photos for a new booking (sample 1)')).toBeVisible();
  await dialog.getByText("Can't scan? Open this link on the phone").click();
  const url = (await dialog.locator('p.break-all').textContent())!.trim();

  const phoneContext = await browser.newContext({ ...devices['iPhone 13'] });
  const phone = await phoneContext.newPage();
  await phone.goto(url);
  await expect(phone.getByRole('heading', { name: 'Photos for a new booking (sample 1)' })).toBeVisible();
  await phone.getByLabel('Choose photos from the gallery').setInputFiles([{ name: 'IMG_5001.png', mimeType: 'image/png', buffer: PNG }]);
  await expect(phone.getByRole('status').filter({ hasText: /^1 sent\./ })).toBeVisible({ timeout: 30_000 });
  await phoneContext.close();

  await expect(dialog.getByRole('status')).toHaveText('1 photo(s) received from the phone', { timeout: 10_000 });
  await dialog.getByRole('button', { name: 'Done' }).click();
  const thumbs = sample.getByRole('list', { name: 'Photos of sample 1' }).getByRole('listitem');
  await expect(thumbs).toHaveCount(1);
  await expect(thumbs.first()).toContainText('Phone');

  await form.getByRole('button', { name: 'Book job' }).click();
  await expect(page.getByText(/booked; 1 photo\(s\) saved/)).toBeVisible({ timeout: 20_000 });
  const jobId = page.url().split('/samples/jobs/')[1].split(/[?#]/)[0];
  const reception = await apiAs('reception');
  const job = await reception.get(`/jobs/${jobId}`);
  const files = await reception.get(`/files?entity=Sample&entityId=${job.samples[0].id}&category=sample-image`);
  expect(files.map((f: { originalName: string }) => f.originalName)).toEqual(['IMG_5001.png']);
});

test('the phone option is offered for result images and letter pages too', async ({ page }) => {
  const { job, sampleTestIds } = await plannedJob(['DEN']);
  await signIn(page, 'reception');
  await page.goto(`/samples/jobs/${job.id}`);
  await page.getByRole('tab', { name: 'Documents' }).click();
  const letter = page.getByRole('heading', { name: 'Captured pages, in order' }).locator('..');
  await expect(letter.getByRole('button', { name: 'Use phone' })).toBeVisible();

  const tech = await apiAs('tech');
  const t = await tech.get(`/tests/${sampleTestIds[0]}`);
  await tech.post(`/tests/${sampleTestIds[0]}/start`, { version: t.version });
  await signIn(page, 'tech');
  await page.goto(`/my-tests/${sampleTestIds[0]}`);
  await page.getByRole('tab', { name: 'Images and worksheets' }).click();
  await page.getByRole('button', { name: 'Use phone' }).click();
  await expect(page.getByRole('dialog', { name: 'Send photos from your phone' }).getByText(/^Result photos: Density, sample /)).toBeVisible();
});
