import { expect, test } from '@playwright/test';
import { signIn, unique } from './helpers';

test('a new order for a customer not in the system: Create new customer opens the full page and comes back', async ({ page }) => {
  const name = `Walk-in ${unique('Metals')}`;
  await signIn(page, 'admin');
  await page.goto('/orders/new');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();

  const picker = page.getByRole('combobox', { name: /^Customer/ });
  await picker.fill(name);
  // The create row is the first entry in the list.
  const options = page.getByRole('listbox').getByRole('option');
  await expect(options.first()).toHaveAccessibleName('Create new customer');
  await options.first().click();

  // The full New customer page, with the typed name and a way back.
  await expect(page).toHaveURL(/\/customers\/new\?/);
  await expect(page.getByRole('heading', { level: 1, name: 'New customer' })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue(name);
  await expect(page.getByText('After saving, you will go back to where you were')).toBeVisible();

  // The address starts with the PIN code, which fills the city, state, GST code and offers the areas.
  await page.getByRole('button', { name: 'Add address' }).click();
  const pin = page.getByLabel('PIN code');
  await expect(pin).toBeFocused();
  await pin.fill('201306');
  await expect(page.getByRole('status').filter({ hasText: 'Filled from the PIN code' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('City')).toHaveValue('Gautam Buddha Nagar');
  await expect(page.locator('#ad-0-state')).toHaveValue('Uttar Pradesh');
  await expect(page.locator('#ad-0-code')).toHaveValue('09');
  await page.getByRole('group', { name: /Localities for PIN 201306/ }).getByRole('button', { name: 'Bisrakh' }).click();
  await expect(page.getByLabel('Area / locality')).toHaveValue('Bisrakh');
  await page.locator('#ad-0-l1').fill('Plot 7, Ecotech III');
  // A newer PIN that India Post does not list yet is filled from the nearest one, and says so.
  await page.getByRole('button', { name: 'Add address' }).click();
  await page.locator('#ad-1-pin').fill('201318');
  await expect(page.getByRole('status').filter({ hasText: /PIN 201318 is not in India Post's list yet, so these come from nearby PIN 2013\d\d/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#ad-1-city')).toHaveValue('Gautam Buddha Nagar');
  await expect(page.locator('#ad-1-code')).toHaveValue('09');
  await page.locator('#ad-1-l1').fill('Tower B, Sector 1');

  // The customer's own state was empty, so the PIN code filled it as well.
  await expect(page.locator('#c-state')).toHaveValue('Uttar Pradesh');
  await expect(page.locator('#c-statecode')).toHaveValue('09');
  await page.getByRole('button', { name: 'Save customer' }).click();

  // Back on the order, with the new customer chosen.
  await expect(page).toHaveURL(/\/orders\/new\?customerId=/);
  await expect(picker).toHaveValue(name);
  await page.getByRole('button', { name: 'Save order' }).click();
  await expect(page).toHaveURL(/\/orders\/(?!new)[\w-]+/);
  await expect(page.getByText(name).first()).toBeVisible();

  // A customer filter never offers to create one.
  await page.goto('/invoices');
  await page.getByRole('combobox', { name: 'Customer filter' }).fill('zzz-nobody');
  await expect(page.getByRole('option', { name: 'Create new customer' })).toHaveCount(0);
});

test('the customer form uses the searchable state list, by name or GST code', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/customers/new');
  const state = page.locator('#c-state');
  await state.click();
  await expect(page.getByRole('listbox', { name: 'States' }).getByRole('option').first()).toBeVisible();
  await state.fill('27');
  await page.getByRole('option', { name: /Maharashtra/ }).click();
  await expect(state).toHaveValue('Maharashtra');
  await expect(page.getByLabel('GST code').first()).toHaveValue('27');
});
