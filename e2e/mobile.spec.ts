import { expect, test, type Page } from '@playwright/test';
import { apiAs, issuedJob, plannedJob, signIn } from './helpers';

// A mid-size phone, held upright, with touch.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const noSideways = async (page: Page) => {
  const sideways = await page.evaluate(() => {
    const main = document.getElementById('main')!;
    return { page: document.documentElement.scrollWidth - innerWidth, main: main.scrollWidth - main.clientWidth };
  });
  expect(sideways, 'no horizontal scrolling').toEqual({ page: 0, main: 0 });
};

test('the bottom bar, the More menu and a desktop-only screen', async ({ page }) => {
  await signIn(page, 'admin');
  const quick = page.getByRole('navigation', { name: 'Quick' });
  await expect(quick.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await quick.getByRole('link', { name: 'Samples' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Samples' })).toBeVisible();
  await noSideways(page);

  await quick.getByRole('button', { name: 'More' }).click();
  const menu = page.getByRole('navigation', { name: 'Main' });
  await menu.getByRole('link', { name: 'Masters' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Best on a larger screen' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Email me the link' })).toHaveAttribute('href', /^mailto:admin@demo\.example\?/);
  await page.getByRole('button', { name: 'Continue anyway' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Masters' })).toBeVisible();
});

test('list filters live in a sheet and count what is in use; rows are cards', async ({ page }) => {
  await plannedJob(['DEN'], { urgent: true });
  await signIn(page, 'reception');
  await page.goto('/samples');
  await expect(page.getByRole('list', { name: 'Jobs' }).getByRole('listitem').first()).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  await sheet.getByLabel('Urgent filter').selectOption('true');
  await sheet.getByRole('button', { name: 'Show results' }).click();
  await expect(page).toHaveURL(/urgent=true/);
  await expect(page.getByRole('button', { name: /^Filters/ })).toContainText('1');
  for (const card of await page.getByRole('list', { name: 'Jobs' }).getByRole('listitem').all()) await expect(card).toContainText('Urgent');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).not.toHaveURL(/urgent=/);
  await noSideways(page);
});

test('an analyst finds a test with search and enters a result on the phone', async ({ page }) => {
  const { sample, sampleTestIds } = await plannedJob(['DEN']);
  await signIn(page, 'tech');
  await page.getByRole('button', { name: 'Search or scan' }).click();
  await page.getByRole('combobox', { name: 'Search or scan' }).fill(sample.sampleNo);
  // An exact sample number opens it, as a scan does.
  await page.getByRole('combobox', { name: 'Search or scan' }).press('Enter');
  await expect(page).toHaveURL(new RegExp(`/my-tests/${sampleTestIds[0]}`));
  await page.getByRole('button', { name: 'Start test' }).click();
  const input = page.locator('tr[data-parameter="DENSITY"]').getByRole('textbox').or(page.getByLabel(/Density/i).first());
  await input.first().fill('0.91');
  await expect(page.getByText(/Saved|Saving/).first()).toBeVisible();
  await noSideways(page);
});

test('a dialog is a bottom sheet with its actions in reach; detail actions sit above the bottom bar', async ({ page }) => {
  const { reportId } = await issuedJob();
  await signIn(page, 'signatory');
  await page.goto(`/approvals/reports/${reportId}`);
  const actions = page.locator('[data-page-actions]');
  await expect(actions).toBeVisible();
  const bar = await actions.boundingBox();
  const nav = await page.getByRole('navigation', { name: 'Quick' }).boundingBox();
  expect(bar!.y + bar!.height).toBeLessThanOrEqual(nav!.y + 1);
  await actions.getByRole('button', { name: 'Email again' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(Math.round(box!.width)).toBe(390);
  expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(844 - 40);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});

test('going back returns to where the list was scrolled', async ({ page }) => {
  const reception = await apiAs('reception');
  const jobs = (await reception.get('/jobs?pageSize=25')).data as { id: string }[];
  test.skip(jobs.length < 10, 'needs a longer list');
  await signIn(page, 'reception');
  await page.goto('/samples');
  const list = page.getByRole('list', { name: 'Jobs' });
  await expect(list.getByRole('listitem').nth(8)).toBeVisible();
  await page.locator('#main').evaluate((m) => m.scrollTo({ top: 1200 }));
  await expect.poll(() => page.locator('#main').evaluate((m) => m.scrollTop)).toBeGreaterThan(1000);
  const before = await page.locator('#main').evaluate((m) => m.scrollTop);
  await list.getByRole('listitem').nth(8).click();
  await expect(page).toHaveURL(/\/samples\/jobs\//);
  await page.goBack();
  await expect.poll(() => page.locator('#main').evaluate((m) => m.scrollTop), { timeout: 5000 }).toBeGreaterThan(before - 50);
});
