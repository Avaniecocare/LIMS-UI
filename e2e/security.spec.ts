import { expect, test } from '@playwright/test';
import { apiAs, DEMO_PASSWORD, signIn } from './helpers';

const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Main' });

test('a technician asks for access, an admin approves it, and the page opens', async ({ page }) => {
  // Start clean: no earlier request and no Accounts role for the demo technician.
  const admin = await apiAs('admin');
  const tech = (await admin.get('/admin/users?q=tech@demo.example')).data[0];
  const accounts = (await admin.get('/admin/roles')).find((r: { name: string }) => r.name === 'Accounts');
  const techRole = (await admin.get('/admin/roles')).find((r: { name: string }) => r.name === 'Technician / Analyst');
  await admin.dispose();

  await signIn(page, 'tech');
  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: "You don't have access to this page" })).toBeVisible();
  await page.getByLabel('Why do you need it?').fill('I cover for accounts on Saturdays');
  await page.getByRole('button', { name: 'Request access' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Request sent|already asked/ })).toBeVisible();

  await signIn(page, 'admin');
  await page.goto('/admin?tab=access');
  const row = page
    .getByRole('table', { name: 'Access requests' })
    .getByRole('row', { name: /Saturdays/ })
    .first();
  await row.getByRole('button', { name: 'Approve' }).click();
  await page
    .getByRole('dialog')
    .getByLabel(/Give this role/)
    .selectOption({ label: `Accounts (${accounts.permissions.length} permissions)` });
  await page.getByRole('dialog').getByRole('button', { name: 'Approve and give role' }).click();
  // Giving a role needs the admin's password.
  const confirm = page.getByRole('dialog', { name: 'Confirm your password' });
  const done = page.getByText(/now has the new role/);
  await expect(confirm.or(done)).toBeVisible();
  if (await confirm.isVisible()) {
    await confirm.getByLabel('Your password').fill(DEMO_PASSWORD);
    await confirm.getByRole('button', { name: 'Confirm' }).click();
  }
  await expect(done).toBeVisible();

  await signIn(page, 'tech');
  await page.goto('/invoices');
  await expect(page.getByRole('heading', { level: 1, name: 'Invoices' })).toBeVisible();

  // Put the technician back as they were for the other tests.
  const reset = await apiAs('admin');
  const fresh = (await reset.get('/admin/users?q=tech@demo.example')).data[0];
  await reset.patch(`/admin/users/${tech.id}`, { version: fresh.version, roleIds: [techRole.id] });
  await reset.dispose();
});

test('an admin previews the app as a technician and exits', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin?tab=roles');
  await page
    .getByRole('table', { name: 'Roles' })
    .getByRole('row', { name: /Technician \/ Analyst/ })
    .getByRole('button', { name: 'Preview' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: 'Previewing as Technician / Analyst' })).toBeVisible();
  // A preview never shows more than the admin holds: admins do not hold tests.work, so My Tests stays hidden.
  await expect(nav(page).getByRole('link')).toHaveText(['Dashboard']);
  await page.getByRole('button', { name: 'Exit preview' }).click();
  await expect(nav(page).getByRole('link', { name: 'Admin' })).toBeVisible();
});

test('the account page lists where you are signed in and your sign-ins', async ({ page }) => {
  await signIn(page, 'reception');
  await page.goto('/account');
  await expect(page.getByText("Where you're signed in")).toBeVisible();
  await expect(page.getByText('This browser')).toBeVisible();
  await expect(page.getByText('Recent sign-ins')).toBeVisible();
});
