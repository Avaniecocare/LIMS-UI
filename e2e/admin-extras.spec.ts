import { expect, test } from '@playwright/test';
import { apiAs, signIn } from './helpers';

test('the lab rewords an email with a live preview, then goes back to the standard wording', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin?tab=emails');
  await page.getByRole('list', { name: 'Email templates' }).getByRole('button', { name: 'Tax invoice' }).click();
  const subject = page.getByLabel('Subject');
  await subject.fill('Your invoice from ');
  await page.getByRole('button', { name: 'labName', exact: true }).click();
  await expect(subject).toHaveValue('Your invoice from {{labName}}');
  // The preview shows it with example values, in the branded layout.
  await expect(page.getByText(/^Subject: Your invoice from \S/)).toBeVisible();
  await expect(page.frameLocator('iframe[title="Preview of Tax invoice"]').locator('body')).toContainText('Please find attached tax invoice');
  // A value that does not exist for this email is pointed out before saving.
  await subject.fill('Invoice {{reportNo}}');
  await expect(page.getByText('{{reportNo}} is not available here')).toBeVisible();
  await subject.fill('Your invoice {{invoiceNo}} from {{labName}}');
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(page.getByText('Template saved. Emails use it from now on.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Email templates' }).getByRole('button', { name: /Tax invoice/ })).toContainText('Edited');
  await page.getByRole('button', { name: 'Reset to standard wording' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText('Back to the standard wording.')).toBeVisible();
  await expect(subject).toHaveValue('Tax invoice {{invoiceNo}} — {{labName}}');
});

test('turning Billing off hides its menus and pages for everyone, and turning it on brings them back', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Main' });
  await signIn(page, 'admin');
  await page.goto('/admin?tab=modules');
  try {
    await page.getByRole('checkbox', { name: 'Billing' }).click();
    await page.getByRole('button', { name: 'Save modules' }).click();
    await expect(page.getByText('Modules saved.')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Invoices' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Due Invoices' })).toHaveCount(0);
    await page.goto('/invoices');
    await expect(page.getByRole('heading', { name: 'This part of the system is turned off' })).toBeVisible();
    // Other people too, and the server refuses it, not just the screen.
    await signIn(page, 'accounts');
    await expect(nav.getByRole('link', { name: 'Invoices' })).toHaveCount(0);
    const accounts = await apiAs('accounts');
    await expect(accounts.get('/invoices')).rejects.toThrow(/MODULE_OFF/);
  } finally {
    const admin = await apiAs('admin');
    const list = await admin.get('/admin/lab/modules');
    await admin.put('/admin/lab/modules', { version: list.version, enabled: { billing: true } });
  }
  await signIn(page, 'accounts');
  await expect(nav.getByRole('link', { name: 'Invoices', exact: true })).toBeVisible();
});

test('the users list loads when the address names its tab', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin?tab=users');
  await expect(page.getByRole('cell', { name: 'admin@demo.example' })).toBeVisible();
  await expect(page.getByText('Please check the highlighted fields')).toHaveCount(0);
});

test('scrolling a long page moves only the content, never the whole window', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin?tab=company');
  await expect(page.getByText('Accreditation')).toBeVisible();
  await page.mouse.move(700, 500);
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => document.getElementById('main')!.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => ({ y: window.scrollY, extra: document.documentElement.scrollHeight - window.innerHeight }))).toEqual({ y: 0, extra: 0 });
});

test('a computer keeps the side menu and no phone bar', async ({ page }) => {
  await signIn(page, 'admin');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Quick' })).toHaveCount(0);
  await page.goto('/masters');
  await expect(page.getByRole('heading', { level: 1, name: 'Masters' })).toBeVisible();
});
