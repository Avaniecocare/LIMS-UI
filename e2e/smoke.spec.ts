import { expect, test } from '@playwright/test';
import { signIn, unique } from './helpers';

test('branding and admin screens', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/.+/);
  const productName = await page.title();
  expect(productName).not.toBe('Loading…');
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('table', { name: 'Users' })).toContainText('admin@demo.example');
  for (const tab of ['Roles', 'Settings', 'Terms', 'Holidays', 'Audit log', 'Company']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  await expect(page.getByRole('tabpanel')).toContainText('LIMS-Deploy');
});

test('masters: create, edit, deactivate, history', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Masters' }).click();
  await expect(page.getByRole('table', { name: 'Tests' })).toContainText('Flash Point (COC)');
  await page.getByRole('link', { name: 'Departments' }).click();
  const code = unique('D');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Code is required')).toBeVisible(); // instant client-side check
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('Name').fill(`Dept ${code}`);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('searchbox').fill(code);
  const table = page.getByRole('table', { name: 'Departments' });
  await expect(table.getByRole('row')).toHaveCount(2);
  await table.getByRole('row').nth(1).click();
  await page.getByLabel('Name').fill(`Renamed ${code}`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(table).toContainText(`Renamed ${code}`);
  await table.getByRole('row').nth(1).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('Department.update')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  // Formula console
  await page.getByRole('link', { name: 'Formulas' }).click();
  await page.getByRole('row', { name: /PREN/ }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByLabel('Cr', { exact: true }).fill('22');
  await page.getByLabel('Mo', { exact: true }).fill('3');
  await page.getByLabel('N', { exact: true }).fill('0.17');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('status')).toContainText('34.62');
});

test('customers: validation, create, contacts', async ({ page }) => {
  await signIn(page, 'sales');
  await page.getByRole('link', { name: 'Customers' }).click();
  await expect(page.getByRole('table', { name: 'Customers' })).toContainText('Contoso Forgings');
  await page.getByRole('button', { name: 'New customer' }).click();
  const name = unique('Cust');
  await page.getByLabel('Name', { exact: false }).first().fill(name);
  await page.getByLabel('GSTIN').fill('27AAAAA0000A1Z3');
  await page.getByLabel('State', { exact: false }).first().fill('Maharashtra');
  await page.getByLabel('GST code').fill('27');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByText('Not a valid GSTIN')).toBeVisible(); // server check digit, mapped to the field
  await page.getByLabel('GSTIN').fill('27AAAAA0000A1Z2');
  await page.getByRole('button', { name: 'Add contact' }).click();
  await page.locator('#ct-0-name').fill('Asha Rao');
  await page.locator('#ct-0-email').fill('asha@example.example');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
});
