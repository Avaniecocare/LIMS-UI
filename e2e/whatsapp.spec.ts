import { expect, test } from '@playwright/test';
import { apiAs, freshCustomer, issuedJob, plannedJob, signIn, unique } from './helpers';

// The local and CI stacks run WhatsApp in test mode (WHATSAPP_TRANSPORT=json): messages are recorded, not sent.

test('a signatory sends an issued report on WhatsApp, only after confirming consent', async ({ page }) => {
  const customer = await freshCustomer({ phone: '98765 43210' });
  const { reportId, reportNo } = await issuedJob({ customerId: customer.id });
  await signIn(page, 'signatory');
  await page.goto(`/approvals/reports/${reportId}`);
  await page.getByRole('button', { name: 'WhatsApp' }).click();
  const dialog = page.getByRole('dialog', { name: `WhatsApp ${reportNo}` });
  await expect(dialog.getByLabel('WhatsApp number')).toHaveValue('98765 43210');
  await expect(dialog.getByLabel('Greeting name')).toHaveValue('Bina Buyer');
  const send = dialog.getByRole('button', { name: 'Send on WhatsApp' });
  await expect(send).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'The customer agreed to receive messages from us on WhatsApp' }).click();
  await send.click();
  await expect(page.getByText('Queued for WhatsApp')).toBeVisible();

  // The worker sends it; the dialog shows it as sent.
  const signatory = await apiAs('signatory');
  await expect.poll(async () => (await signatory.get(`/whatsapp/Report/${reportId}`)).messages[0]?.status, { timeout: 30_000 }).toBe('SENT');
  await page.getByRole('button', { name: 'WhatsApp' }).click();
  await expect(page.getByRole('dialog').getByText('Sent', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('+919876543210')).toBeVisible();
});

test('reception sends the samples-received letter on WhatsApp from the job', async ({ page }) => {
  const { job } = await plannedJob(['DEN']);
  await signIn(page, 'reception');
  await page.goto(`/samples/jobs/${job.id}`);
  await page.getByRole('tab', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'WhatsApp' }).click();
  const dialog = page.getByRole('dialog', { name: `WhatsApp the acknowledgement for ${job.jobNo}` });
  await dialog.getByLabel('WhatsApp number').fill('12345');
  await dialog.getByRole('checkbox', { name: /customer agreed/ }).click();
  await dialog.getByRole('button', { name: 'Send on WhatsApp' }).click();
  await expect(dialog.getByText('Enter a mobile number')).toBeVisible();
  await dialog.getByLabel('WhatsApp number').fill('+91 91234 56789');
  await dialog.getByRole('button', { name: 'Send on WhatsApp' }).click();
  await expect(page.getByText('Queued for WhatsApp')).toBeVisible();
  const reception = await apiAs('reception');
  await expect.poll(async () => (await reception.get(`/whatsapp/Job/${job.id}`)).messages[0]?.status, { timeout: 60_000 }).toBe('SENT');
  expect((await reception.get(`/whatsapp/Job/${job.id}`)).messages[0].documentName).toMatch(/^Acknowledgement .*\.pdf$/);
});

test("the admin sees the connection, orders a template's values and sends a test", async ({ page }) => {
  const admin = await apiAs('admin');
  const before = await admin.get('/admin/lab/whatsapp');
  await signIn(page, 'admin');
  await page.goto('/admin?tab=whatsapp');
  await expect(page.getByText('Test mode: messages are recorded but not sent.')).toBeVisible();
  await expect(page.getByText(/\/api\/v1\/webhooks\/whatsapp/)).toBeVisible();

  // Match the approved wording: report number first, then the sample number, no lab name.
  const values = page.getByRole('list', { name: 'Test report values' });
  await page.getByRole('button', { name: 'Move Report number up' }).click();
  await page.getByRole('button', { name: 'Remove Laboratory name' }).first().click();
  await page.getByRole('combobox', { name: 'Add a value to Test report' }).selectOption({ label: 'Sample number' });
  await expect(values.getByRole('listitem')).toHaveText([/\{\{1\}\}\s*Report number/, /\{\{2\}\}\s*Customer contact name/, /\{\{3\}\}\s*Sample number/]);
  await page.getByRole('button', { name: 'Save templates' }).click();
  await expect(page.getByText('WhatsApp templates saved')).toBeVisible();
  const saved = await admin.get('/admin/lab/whatsapp');
  expect(saved.templates[0].values).toEqual(['reportNo', 'contactName', 'sampleNo']);
  const report = before.templates[0];
  await admin.put('/admin/lab/whatsapp/templates', { version: saved.version, templates: { report: { name: report.name, language: report.language, values: report.values } } });

  await page.getByLabel('Send a test message to').fill('98765 43210');
  await page.getByRole('button', { name: 'Send test' }).click();
  await expect(page.getByText(/Test message sent/)).toBeVisible();
});

test('an analyst reports a problem from their test; the quality team sees it', async ({ page }) => {
  const { sampleTestIds, sample } = await plannedJob(['DEN']);
  const title = unique('Balance drifts');
  await signIn(page, 'tech');
  await page.goto(`/my-tests/${sampleTestIds[0]}`);
  await page.getByRole('button', { name: 'Report a problem' }).click();
  const dialog = page.getByRole('dialog', { name: 'Report a problem' });
  await expect(dialog.getByLabel('Concerns')).toHaveValue(new RegExp(sample.sampleNo));
  await dialog.getByLabel('In a few words').fill(title);
  await dialog.getByLabel('What happened').fill('Reading moved by 0.3 mg while weighing.');
  await dialog.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(page.getByText(/Reported as .*\/NC\//)).toBeVisible();

  await page.goto('/account');
  const mine = page.getByRole('listitem').filter({ hasText: title });
  await expect(mine).toBeVisible();
  await expect(mine.getByText('Received')).toBeVisible();

  await signIn(page, 'quality');
  await page.goto('/quality');
  await page.getByRole('tab', { name: 'Non-conformance' }).click();
  await expect(page.getByRole('table', { name: 'Non-conformances' }).getByRole('row', { name: new RegExp(title) })).toBeVisible();
});
