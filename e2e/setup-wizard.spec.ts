import { expect, test } from '@playwright/test';
import { apiAs, signIn } from './helpers';

test('the setup wizard: lab profile, branding, a lab-type template, team, a test email, review', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, 'admin');
  await page.goto('/setup/lab');
  await expect(page.getByRole('heading', { level: 1, name: 'Set up your laboratory' })).toBeVisible();
  const steps = page.getByRole('list', { name: 'Setup steps' });
  await expect(steps.getByRole('button')).toHaveText([/Lab profile/, /Branding/, /Lab type/, /Team/, /Email/, /Review/]);

  // 1. Lab profile: saved as it is (the password is asked for, as for any profile change).
  await page.getByRole('button', { name: 'Save and continue' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm your password' });
  await expect(confirm.or(page.getByText('Lab profile saved.'))).toBeVisible();
  if (await confirm.isVisible()) {
    await confirm.getByLabel('Your password').fill(process.env.E2E_PASSWORD ?? 'Demo-Password-1!');
    await confirm.getByRole('button', { name: 'Confirm' }).click();
  }
  await expect(page.getByText('Lab profile saved.')).toBeVisible();

  // 2. Branding: skipped.
  await expect(steps.getByRole('button', { name: /Branding/ })).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Skip for now' }).click();

  // 3. Lab type: noise monitoring adds two tests with the Noise Rules limits.
  await expect(page.getByRole('heading', { name: 'What does your laboratory test?' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Noise monitoring' }).click();
  await page.getByRole('button', { name: 'Add 1 to my catalogue' }).click();
  await expect(page.getByText(/tests added|already there/)).toBeVisible();
  const admin = await apiAs('admin');
  expect((await admin.get('/masters/specifications?q=NOISE')).data.length).toBeGreaterThanOrEqual(1);

  // 4. Team.
  await expect(page.getByRole('heading', { name: 'Bring in your team' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 5. Email: a test email goes out at once.
  await page.getByLabel('Send a test email to').fill('admin@demo.example');
  await page.getByRole('button', { name: 'Send test email' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sent to admin@demo.example' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  // 6. Review, then finish.
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Your laboratory is set up.')).toBeVisible();
  await expect(page.getByText(/Finish setting up your laboratory/)).toHaveCount(0);
});
