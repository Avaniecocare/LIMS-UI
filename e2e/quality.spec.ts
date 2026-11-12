import { expect, test } from '@playwright/test';
import { apiAs, freshCustomer, signIn, unique } from './helpers';

test('quality: record a calibration, authorise an analyst, and take a non-conformance through to closure', async ({ page }) => {
  test.setTimeout(120_000);
  const admin = await apiAs('admin');
  const code = unique('BAL');
  await admin.post('/masters/instruments', { code, name: 'Analytical balance' });

  await signIn(page, 'quality');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Quality' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quality' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Equipment overdue/ })).toBeVisible();

  // Equipment: schedule yearly calibration, then record one.
  await page.getByRole('tab', { name: 'Equipment' }).click();
  const row = page.getByRole('table', { name: 'Equipment' }).getByRole('row', { name: new RegExp(code) });
  await expect(row).toContainText('Not scheduled');
  await row.getByRole('button', { name: 'Schedule' }).click();
  await page.getByRole('dialog').getByLabel('Calibrate every (months)').fill('12');
  await page.getByRole('dialog').getByRole('button', { name: 'Save schedule' }).click();
  await expect(page.getByText('Schedule saved')).toBeVisible();
  await row.getByRole('button', { name: `Record work on ${code}` }).click();
  const rec = page.getByRole('dialog', { name: `Record work on ${code}` });
  await expect(rec.getByLabel('Next due')).toHaveAccessibleDescription(/12 months from the date done/);
  await rec.getByLabel('Done by').fill('NABL-accredited calibration agency');
  await rec.getByLabel('Certificate no.').fill('CC/2026/0042');
  await rec.getByRole('button', { name: 'Record' }).click();
  await expect(page.getByText('Recorded. The due dates are updated.')).toBeVisible();
  await expect(row).toContainText('In date');
  await row.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('dialog').getByText(/Calibration on .* Pass/)).toBeVisible();
  await page.keyboard.press('Escape');

  // Competency: authorise the technician for Density (withdrawing any earlier authorisation, so the test can run again).
  const techs = await admin.get('/quality/people');
  const tushar = techs.find((p: { name: string }) => p.name === 'Tushar Technician');
  for (const a of await admin.get(`/quality/authorisations?userId=${tushar.id}`)) if (a.state === 'ACTIVE' && a.testCode === 'DEN') await admin.post(`/quality/authorisations/${a.id}/withdraw`, { reason: 'Test set-up' });
  await page.getByRole('tab', { name: 'Competency' }).click();
  await page.getByRole('button', { name: 'Authorise' }).click();
  const auth = page.getByRole('dialog', { name: 'Authorise an analyst for a test' });
  await auth.getByLabel('Analyst').selectOption({ label: 'Tushar Technician' });
  await auth.getByLabel('Test').selectOption({ label: 'DEN — Density' });
  await auth.getByLabel('Evidence').fill('Five supervised trials within repeatability limits');
  await auth.getByRole('button', { name: 'Authorise' }).click();
  await expect(page.getByText('Authorised', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Authorisations' }).getByRole('row', { name: /Tushar Technician.*Density.*Active/ }).first()).toBeVisible();

  // Non-conformance: raised, worked through the steps, verified by someone other than the owner.
  const ncTitle = `Balance used past its calibration date ${unique('NC')}`;
  await page.getByRole('tab', { name: 'Non-conformance' }).click();
  await page.getByRole('button', { name: 'Raise a non-conformance' }).click();
  const raise = page.getByRole('dialog', { name: 'Raise a non-conformance' });
  await raise.getByLabel('Source').selectOption('Internal audit');
  await raise.getByLabel('Severity').selectOption('MAJOR');
  await raise.getByLabel('Title').fill(ncTitle);
  await raise.getByLabel('What happened').fill('Found during the internal audit of the chemistry section.');
  await raise.getByLabel('Owner').selectOption({ label: 'Asha Admin' });
  await raise.getByRole('button', { name: 'Raise' }).click();
  await expect(page.getByText(/\/NC\/.* raised/)).toBeVisible();
  await page.getByRole('table', { name: 'Non-conformances' }).getByRole('row', { name: new RegExp(ncTitle) }).click();
  const nc = page.getByRole('dialog', { name: new RegExp(ncTitle) });
  await nc.getByRole('button', { name: 'Start action' }).click();
  await expect(page.getByText('Record the correction or the root cause first')).toBeVisible();
  await nc.getByLabel('Correction').fill('Balance taken out of use and calibrated');
  await nc.getByLabel('Root cause').fill('No check of the due date before use');
  await nc.getByRole('button', { name: 'Start action' }).click();
  await nc.getByLabel('Corrective action').fill('Due dates checked automatically; overdue instruments blocked in planning');
  await nc.getByRole('button', { name: 'Send for verification' }).click();
  await nc.getByLabel('Verification of effectiveness').fill('Four weeks of planning records reviewed; no overdue instrument used');
  await nc.getByRole('button', { name: 'Verify and close' }).click();
  await expect(page.getByText(/\/NC\/.* closed/)).toBeVisible();
  await expect(nc).toContainText('Verified by Kavya Quality');
});

test('privacy: an erasure request is logged, the person found, erased from contacts, and answered', async ({ page }) => {
  const email = `${unique('person').toLowerCase()}@customer.example`;
  await freshCustomer({ email });
  await signIn(page, 'admin');
  await page.goto('/admin?tab=privacy');
  await page.getByRole('button', { name: 'Log a request' }).click();
  const log = page.getByRole('dialog', { name: 'Log a privacy request' });
  await log.getByLabel('Request').selectOption('ERASURE');
  await log.getByLabel('Name').fill('Bina Buyer');
  await log.getByLabel('Email').fill(email);
  await log.getByLabel('What they asked').fill('I have left the company; please delete my details.');
  await log.getByRole('button', { name: 'Log request' }).click();
  await expect(page.getByText(/Logged. Answer by/)).toBeVisible();
  await page.getByRole('table', { name: 'Privacy requests' }).getByRole('row', { name: new RegExp(email) }).click();
  const req = page.getByRole('dialog', { name: /Erasure: Bina Buyer/ });
  await expect(req.getByText('Customer contact', { exact: true })).toBeVisible();
  await expect(req.getByText('Can be erased')).toBeVisible();
  await req.getByRole('button', { name: 'Erase from customer contacts' }).click();
  // Erasing needs the password confirmed.
  const confirm = page.getByRole('dialog', { name: 'Confirm your password' });
  await expect(confirm.or(page.getByText('1 contact(s) erased'))).toBeVisible();
  if (await confirm.isVisible()) {
    await confirm.getByLabel('Your password').fill(process.env.E2E_PASSWORD ?? 'Demo-Password-1!');
    await confirm.getByRole('button', { name: 'Confirm' }).click();
  }
  await expect(page.getByText('1 contact(s) erased')).toBeVisible();
  await expect(req.getByLabel('Answer')).toHaveValue(/Erased the name, email and phone from 1 customer contact/);
  await req.getByRole('button', { name: 'Mark done' }).click();
  await expect(page.getByText('Request answered')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Privacy requests' }).getByRole('row', { name: new RegExp(email) })).toContainText('Done');
});
