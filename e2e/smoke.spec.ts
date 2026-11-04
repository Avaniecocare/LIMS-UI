import { expect, test } from '@playwright/test';

const ADMIN = { email: 'owner@bluepeak.example', password: 'Owner-Password-1!' };

test('first-run setup, sign-in, admin screens and branding', async ({ page }, info) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/(setup|login)/);
  if (page.url().includes('/setup')) {
    await page.getByLabel('Name').fill('Owner Admin');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password', { exact: false }).fill(ADMIN.password);
    await page.getByRole('button', { name: 'Finish setup' }).click();
    await expect(page).toHaveURL(/\/login/);
  }
  await expect(page).toHaveTitle('BluePeak LIMS');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('table', { name: 'Users' })).toContainText(ADMIN.email);
  await page.screenshot({ path: info.outputPath('users.png') });
  for (const tab of ['Roles', 'Settings', 'Terms', 'Holidays', 'Audit log', 'Company']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: info.outputPath(`${tab}.png`) });
  }
  await expect(page.getByRole('tabpanel')).toContainText('27AAAAA0000A1Z2');
  await page.reload();
  await expect(page.getByRole('tabpanel')).toContainText('27AAAAA0000A1Z2');
});
