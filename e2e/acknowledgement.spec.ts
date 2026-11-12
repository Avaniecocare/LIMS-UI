import { expect, test } from '@playwright/test';
import { apiAs, freshCustomer, plannedJob, signIn } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test('booking with photos emails the acknowledgement, photos included, straight away', async ({ page }) => {
  const customer = await freshCustomer({ email: 'receiving@customer.example' });
  await signIn(page, 'reception');
  await page.goto('/samples/new');
  const form = page.getByRole('region', { name: 'Book without a quotation' });
  await expect(async () => {
    await form.getByRole('combobox', { name: /^Customer/ }).fill(customer.name);
    await page.getByRole('option', { name: new RegExp(customer.name) }).first().click({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
  await expect(form.getByLabel('Contact email')).toHaveValue('receiving@customer.example');
  await form.getByLabel('Reason for no quotation').fill('Walk-in customer');
  const sample = form.getByRole('region', { name: 'Sample 1' });
  await sample.getByLabel('Description').fill('MS plate, 6 mm');
  await sample.getByLabel('Add photos of sample 1').setInputFiles([
    { name: 'front.png', mimeType: 'image/png', buffer: PNG },
    { name: 'back.png', mimeType: 'image/png', buffer: PNG },
  ]);
  await expect(sample.getByRole('list', { name: 'Photos of sample 1' }).getByRole('listitem')).toHaveCount(2);
  await sample.getByRole('button', { name: 'Remove back.png' }).click();
  await expect(sample.getByRole('list', { name: 'Photos of sample 1' }).getByRole('listitem')).toHaveCount(1);

  const email = form.getByRole('checkbox', { name: 'Email the acknowledgement to receiving@customer.example' });
  await expect(email).toBeChecked();
  await expect(form.getByText('The 1 photo(s) added above go with it.')).toBeVisible();
  await form.getByRole('button', { name: 'Book job' }).click();
  await expect(page.getByText(/booked; 1 photo\(s\) saved, acknowledgement emailed to receiving@customer\.example/)).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/samples\/jobs\//);

  // The photo is on the sample, and the email went out with it.
  const jobId = page.url().split('/samples/jobs/')[1].split(/[?#]/)[0];
  const reception = await apiAs('reception');
  const job = await reception.get(`/jobs/${jobId}`);
  const files = await reception.get(`/files?entity=Sample&entityId=${job.samples[0].id}&category=sample-image`);
  expect(files.map((f: { originalName: string }) => f.originalName)).toEqual(['front.png']);
  await expect.poll(async () => (await reception.get(`/jobs/${jobId}/emails`))[0]?.toAddress, { timeout: 30_000 }).toBe('receiving@customer.example');
});

test('a job not yet acknowledged says so; photos are optional and chosen in the email dialog', async ({ page }) => {
  const { job } = await plannedJob(['DEN']);
  await signIn(page, 'reception');
  await page.goto(`/samples/jobs/${job.id}`);
  await page.getByRole('tab', { name: 'Documents' }).click();
  const card = page.getByText('The customer has not been sent an acknowledgement yet.');
  await expect(card).toBeVisible();

  // A photo taken on the job page, under the sample.
  await page.getByRole('tab', { name: 'Samples' }).click();
  await page.getByLabel('Upload to Sample images').first().setInputFiles({ name: 'as-received.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'as-received.png' }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Documents' }).click();

  await page.getByRole('button', { name: 'Email acknowledgement' }).click();
  const dialog = page.getByRole('dialog', { name: 'Email the acknowledgement' });
  const photo = dialog.getByRole('list', { name: 'Photos for the acknowledgement' }).getByRole('checkbox');
  await expect(photo).toHaveCount(1);
  await expect(photo).toBeChecked();
  await expect(dialog.getByText('Photos to include (1 of 1 ticked, up to 12). Optional.')).toBeVisible();
  // Untick it: the letter goes without photos.
  await photo.click();
  await dialog.getByRole('textbox', { name: /^To/ }).fill('buyer@customer.example');
  const sent = page.waitForRequest((r) => r.url().endsWith('/acknowledgement') && r.method() === 'POST');
  await dialog.getByRole('button', { name: 'Send' }).click();
  expect((await sent).postDataJSON()).toMatchObject({ to: 'buyer@customer.example', photoIds: [] });
  await expect(page.getByText('Acknowledgement queued')).toBeVisible();
  await expect(card).toBeHidden({ timeout: 30_000 });
});
