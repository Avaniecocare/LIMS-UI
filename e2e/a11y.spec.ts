import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { issuedJob, plannedJob, signIn } from './helpers';

/** Runs axe on what is on screen now. Scoped by `include` for dialogs, which sit outside the page's main area. */
async function check(page: Page, name: string, include?: string) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('status').filter({ hasText: /^Loading/ })).toHaveCount(0);
  // The report preview is the printed document in a sandboxed frame, not this app's interface. Axe's default
  // mode opens a helper page to combine frames, and that hangs on it, so legacy mode runs in the page instead.
  // A toast mid-fade measures as low contrast, so wait for it to finish arriving.
  await page.locator('[data-sonner-toast]').evaluateAll((els) => Promise.all(els.flatMap((e) => [...e.getAnimations({ subtree: true })].map((a) => a.finished.catch(() => undefined)))));
  let axe = new AxeBuilder({ page }).setLegacyMode(true).exclude('iframe[title^="Preview of"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  if (include) axe = axe.include(include);
  const { violations } = await axe.analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).slice(0, 5).join(' | ')}`);
  expect(summary, `axe on ${name}`).toEqual([]);
}

const SCREENS: { user: string; paths: string[] }[] = [
  { user: 'admin', paths: ['/admin', '/masters', '/customers', '/account'] },
  { user: 'sales', paths: ['/', '/orders', '/quotations', '/quotations/new'] },
  { user: 'reception', paths: ['/', '/samples', '/samples?tab=samples', '/samples/new', '/reports'] },
  { user: 'planner', paths: ['/', '/planning', '/planning?view=unassigned', '/planning?view=assigned'] },
  { user: 'tech', paths: ['/', '/my-tests'] },
  { user: 'hod', paths: ['/', '/approvals?tab=results'] },
  { user: 'reviewer', paths: ['/', '/approvals?tab=review'] },
  { user: 'signatory', paths: ['/', '/approvals?tab=sign', '/approvals?tab=issue', '/approvals?tab=issued'] },
  { user: 'dispatch', paths: ['/', '/dispatch', '/dispatch?tab=dispatches', '/dispatch?tab=returnables', '/dispatch?tab=returnables&view=due-for-disposal'] },
  { user: 'accounts', paths: ['/', '/invoices?tab=ready', '/invoices?tab=all', '/invoices?tab=payments', '/due-invoices', '/reports', '/reports/invoice-register'] },
  { user: 'management', paths: ['/', '/analytics', '/reports', '/reports/sample-status', '/reports/tat-crossed'] },
];

test('login and password screens', async ({ page }) => {
  for (const path of ['/login', '/forgot-password']) {
    await page.goto(path);
    await check(page, path);
  }
});

for (const { user, paths } of SCREENS) {
  test(`main screens as ${user}`, async ({ page }) => {
    await signIn(page, user);
    for (const path of paths) {
      await page.goto(path);
      await check(page, `${path} as ${user}`);
    }
  });
}

test('result entry, a test detail and a job detail', async ({ page }) => {
  const { job, sampleTestIds } = await plannedJob(['TENS']);
  await signIn(page, 'tech');
  await page.goto(`/my-tests/${sampleTestIds[0]}`);
  await page.getByRole('button', { name: 'Start test' }).click();
  await expect(page.locator('tr[data-parameter="WIDTH"]').getByRole('textbox')).toBeVisible();
  await check(page, 'result entry');
  await page.locator('tr[data-parameter="WIDTH"]').getByRole('textbox').fill('5x');
  await expect(page.locator('tr[data-parameter="WIDTH"]')).toContainText('Enter a number');
  await check(page, 'result entry with an error');
  await page.locator('tr[data-parameter="WIDTH"]').getByRole('textbox').fill('');
  await signIn(page, 'planner');
  await page.goto(`/samples/jobs/${job.id}`);
  await check(page, 'job detail');
  await page.getByRole('button', { name: 'Cancel job' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Keep it' })).toBeVisible();
  await check(page, 'cancel dialog', '[role="dialog"]');
});

test('report, dispatch, invoice and payment dialogs', async ({ page }) => {
  const { job, reportId } = await issuedJob();

  await signIn(page, 'signatory');
  await page.goto(`/approvals/reports/${reportId}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
  await check(page, 'report detail');
  await page.getByRole('button', { name: 'Revise' }).click();
  await check(page, 'revise dialog', '[role="dialog"]');

  await signIn(page, 'dispatch');
  await page.goto(`/dispatch?q=${encodeURIComponent(job.jobNo)}`);
  await page.getByRole('button', { name: `Record dispatch for ${job.jobNo}` }).click();
  await page.getByRole('dialog').getByLabel(/^Mode/).selectOption({ label: 'Courier' });
  await check(page, 'record dispatch', '[role="dialog"]');

  await signIn(page, 'accounts');
  await page.goto(`/invoices?tab=ready&q=${encodeURIComponent(job.jobNo)}`);
  await page.getByRole('row', { name: new RegExp(job.jobNo) }).getByRole('checkbox').click();
  await check(page, 'ready to invoice with a selection');
  await page.getByRole('button', { name: 'Create draft invoice' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Create draft' }).click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}/);
  await check(page, 'draft invoice');
  await page.getByRole('button', { name: 'Issue', exact: true }).click();
  await check(page, 'issue invoice', '[role="dialog"]');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
  await check(page, 'issued invoice');
  for (const [button, name] of [['Record payment', 'record payment'], ['Credit note', 'credit note'], ['Email', 'email invoice'], ['Cancel invoice', 'cancel invoice']]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await check(page, name, '[role="dialog"]');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Send reminder' }).click();
  await check(page, 'send reminder', '[role="alertdialog"]');
});
