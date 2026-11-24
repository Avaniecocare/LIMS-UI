import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, signIn } from './helpers';

test('the administrator sees how the system is, exports all the data, and sends an email again', async ({ page }) => {
  test.setTimeout(150_000);
  await signIn(page, 'admin');
  await page.goto('/admin?tab=status');
  const checks = page.getByRole('list', { name: 'System checks' });
  for (const name of ['Database', 'File store', 'Background worker']) await expect(checks.getByRole('listitem').filter({ hasText: name })).toContainText('Working');
  // Emails are not really sent here, and it must not look as if they were.
  await expect(checks.getByRole('listitem').filter({ hasText: 'Mail server' })).toContainText('Test mode');

  await page.getByRole('tab', { name: 'Data export' }).click();
  await page.getByRole('button', { name: 'Make an export' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm your password' });
  await confirm.getByLabel('Your password').fill(DEMO_PASSWORD);
  await confirm.getByRole('button', { name: 'Confirm' }).click();
  const row = page.getByRole('list', { name: 'Data exports' }).getByRole('listitem').first();
  await expect(row).toContainText('Ready', { timeout: 60_000 });
  await expect(row).toContainText(/[\d,]+ records, \d+ files?/);
  const answer = page.waitForResponse((r) => /\/parts\/1\/download$/.test(r.url()));
  await row.getByRole('button', { name: /part 1\.zip/ }).click();
  const { url } = await (await answer).json();
  const zip = await page.request.get(url);
  expect((await zip.body()).subarray(0, 2).toString()).toBe('PK');

  // The person who asked was emailed. Sending it again makes a second one.
  await page.getByRole('tab', { name: 'Emails' }).click();
  await page.getByLabel('Search emails').fill('data export is ready');
  const emails = page.getByRole('table', { name: 'Emails' });
  const sent = emails.getByRole('row').filter({ hasText: 'The data export is ready' });
  await expect(sent.first()).toContainText('Sent', { timeout: 90_000 }); // the every-minute sweep sends it
  const before = await sent.count();
  await sent.first().getByRole('button', { name: 'Send again' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Send again' }).click();
  await expect(page.getByText('On its way')).toBeVisible();
  await expect(sent).toHaveCount(before + 1);
});

test('the audit log can be searched by person', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin?tab=audit');
  await page.getByLabel('Search the audit log').fill('auth.login');
  const rows = page.getByRole('table', { name: 'Audit log' }).getByRole('row');
  await expect(rows.nth(1)).toContainText('auth.login');
  await expect(page.getByRole('button', { name: 'Export Excel' })).toBeVisible();
});
