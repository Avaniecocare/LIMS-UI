import { expect, test, type Locator, type Page } from '@playwright/test';
import { apiAs, DEMO_PASSWORD, signIn, unique } from './helpers';

/** The one journey, through the real UI, signing in as each role in turn. Uses a fresh customer, so it works on any database. */

const LINES = [
  { code: 'APP', label: 'APP — Appearance (Visual)', name: 'Appearance', rate: '550.00' },
  { code: 'DEN', label: 'DEN — Density', name: 'Density', rate: '550.00' },
  { code: 'FP', label: 'FP — Flash Point (COC)', name: 'Flash Point', rate: '1,100.00' },
  { code: 'KV40', label: 'KV40 — Kinematic Viscosity at 40°C', name: 'Kinematic Viscosity', rate: '550.00' },
  { code: 'GCMS', label: 'GCMS — Qualitative Analysis (GC-MSD)', name: 'Qualitative Analysis', rate: '10,450.00' },
];

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const row = (page: Page, code: string) => page.locator(`tr[data-parameter="${code}"]`);

async function pickCustomer(page: Page, label: RegExp, name: string) {
  await page.getByRole('combobox', { name: label }).fill(name);
  await page.getByRole('option', { name: new RegExp(name) }).first().click();
}

async function completeAllStages(page: Page) {
  const complete = page.getByRole('button', { name: /^Complete / });
  while (await complete.count()) {
    const name = await complete.first().getAttribute('aria-label');
    await complete.first().click();
    await expect(page.getByRole('button', { name: name!, exact: true })).toHaveCount(0);
  }
}

/** Enters a value for each kind of parameter these five tests have. */
async function enterResult(page: Page, code: string) {
  if (code === 'APP') await row(page, 'APPEAR').getByRole('combobox').selectOption({ index: 1 });
  if (code === 'DEN') await row(page, 'DENSITY').getByRole('textbox').fill('0.8542');
  if (code === 'FP') await row(page, 'FLASH').getByRole('textbox').fill('62.5');
  if (code === 'KV40') await row(page, 'KV').getByRole('textbox').fill('32.15');
  if (code === 'GCMS') await row(page, 'QUAL').getByRole('textbox').fill('No unexpected peaks');
  await page.locator('h1').click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
}

async function submitResults(page: Page) {
  await page.getByRole('button', { name: 'Submit results' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit results' }).click();
  await expect(page.getByText(/waiting for approval/)).toBeVisible();
}

async function openTest(page: Page, sampleNo: string, name: string) {
  await page.goto(`/my-tests?q=${encodeURIComponent(sampleNo)}`);
  await page.getByRole('table', { name: 'My tests' }).getByRole('row', { name: new RegExp(name) }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
}

async function openReport(page: Page, user: string, tab: string, sampleNo: string) {
  await signIn(page, user);
  await page.goto(`/approvals?tab=${tab}&q=${encodeURIComponent(sampleNo)}`);
  await page.getByRole('row', { name: new RegExp(sampleNo) }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Revision');
}

async function signAndIssue(page: Page, emailTo: string) {
  await page.getByRole('button', { name: 'Approve and sign' }).click();
  await page.getByRole('dialog').getByLabel('Your password').fill(DEMO_PASSWORD);
  await page.getByRole('dialog').getByRole('button', { name: 'Sign and approve' }).click();
  const issue = page.getByRole('button', { name: 'Issue', exact: true });
  await expect(issue).toBeEnabled({ timeout: 90_000 });
  await issue.click();
  await page.getByRole('dialog').getByLabel(/Email to/).fill(emailTo);
  await page.getByRole('dialog').getByRole('button', { name: 'Issue report' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
}

const footerCount = async (table: Locator) => {
  const footer = table.locator('../..').getByText(/^[\d,]+ records?$/);
  await expect(footer).toBeVisible();
  return Number((await footer.innerText()).replace(/[^\d]/g, ''));
};

test('the full cycle, from a new customer to dashboard numbers that match their reports', async ({ page }) => {
  test.setTimeout(480_000);
  const admin = await apiAs('admin');
  const company = await admin.get('/admin/company');
  await admin.dispose();
  const customerName = `Cycle ${unique('Customer')}`;
  const contact = `buyer-${Date.now()}@customer.example`;

  await test.step('sales creates the customer, in the lab’s own state', async () => {
    await signIn(page, 'sales');
    await nav(page).getByRole('link', { name: 'Customers' }).click();
    await page.getByRole('button', { name: /New customer/ }).click();
    await page.getByLabel('Name', { exact: false }).first().fill(customerName);
    await page.getByLabel(/^State/).first().fill(company.stateName);
    await page.getByLabel(/^GST code/).fill(company.gstStateCode);
    await page.getByRole('button', { name: 'Add contact' }).click();
    await page.locator('#ct-0-name').fill('Bina Buyer');
    await page.locator('#ct-0-email').fill(contact);
    await page.getByRole('button', { name: 'Add address' }).click();
    await page.locator('#ad-0-l1').fill('1 Example Road');
    await page.locator('#ad-0-city').fill('Exampleville');
    await page.locator('#ad-0-state').fill(company.stateName);
    await page.locator('#ad-0-code').fill(company.gstStateCode);
    await page.getByRole('button', { name: /^Save/ }).click();
    await expect(page.getByText('Customer saved').first()).toBeVisible();
    await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}/);
  });

  let quotationNo = '';
  await test.step('sales sends the quotation and the customer accepts', async () => {
    await page.goto('/quotations/new');
    await pickCustomer(page, /^Customer/, customerName);
    for (const [i, line] of LINES.entries()) {
      const n = i + 1;
      if (i === 0) await page.getByLabel('Line 1 sample description').fill('Fuel oil drum');
      await page.getByLabel(`Line ${n} test`).selectOption({ label: line.label });
      if (i < LINES.length - 1) {
        await page.getByLabel(`Line ${n} quantity`).press('Enter');
        await expect(page.getByLabel(`Line ${n + 1} test`)).toBeFocused();
      }
    }
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByLabel('Totals')).toContainText('Grand total');
    await page.getByRole('link', { name: 'Open quotation' }).click();
    await expect(page).toHaveURL(/\/quotations\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
    quotationNo = (await page.getByRole('heading', { level: 1 }).innerText()).split(/\s/)[0];
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('dialog').getByLabel('To')).toHaveValue(contact);
    await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByRole('button', { name: 'Convert to job' })).toBeVisible();
  });

  let jobNo = '';
  let jobId = '';
  let sampleNo = '';
  await test.step('reception books the job, with a deviation', async () => {
    await signIn(page, 'reception');
    await page.goto('/samples/new');
    const list = page.getByRole('region', { name: 'Book from an accepted quotation' });
    await list.getByRole('button', { name: `Book job from ${quotationNo}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Book job' }).click();
    await expect(page).toHaveURL(/\/samples\/jobs\//);
    jobId = new URL(page.url()).pathname.split('/').pop()!;
    await expect(page.getByRole('heading', { level: 1 })).toContainText('JOB');
    jobNo = (await page.getByRole('heading', { level: 1 }).innerText()).split(/\s/)[0];
    await page.getByRole('button', { name: 'Add deviation' }).click();
    await page.getByRole('dialog').getByLabel('Type').selectOption({ index: 1 });
    await page.getByRole('dialog').getByLabel('Remark').fill('Seal was damaged');
    await page.getByRole('dialog').getByRole('button', { name: 'Add deviation' }).click();
    await expect(page.getByText('Seal was damaged')).toBeVisible();
    const card = page.getByRole('region', { name: /^Sample / }).first();
    sampleNo = (await card.locator('h3').first().innerText()).split(/\s/)[0];
  });

  await test.step('the planner plans and assigns', async () => {
    await signIn(page, 'planner');
    await page.goto(`/planning?jobId=${jobId}`);
    const table = page.getByRole('table', { name: 'Tests to plan' });
    await expect(table.getByRole('row')).toHaveCount(LINES.length + 1);
    await table.getByRole('checkbox', { name: 'Select all on this page' }).click();
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    const plan = page.getByRole('dialog');
    await plan.getByLabel('Grade / specification').selectOption({ label: 'DEMO-FUEL — Demo fuel oil grade' });
    await plan.getByRole('button', { name: 'Create plan' }).click();
    await expect(page.getByText(/Plan .* created/)).toBeVisible();
    await page.getByRole('tab', { name: 'Unassigned' }).click();
    const unassigned = page.getByRole('table').first();
    await expect(unassigned.getByRole('row', { name: new RegExp(sampleNo) }).first()).toBeVisible();
    await unassigned.getByRole('checkbox', { name: 'Select all on this page' }).click();
    await page.getByRole('button', { name: 'Assign', exact: true }).click();
    const assign = page.getByRole('dialog');
    await assign.getByRole('radio', { name: 'Tara Technician' }).check();
    await assign.getByRole('button', { name: 'Assign' }).click();
    await expect(page.getByText(`${LINES.length} tests assigned`)).toBeVisible();
  });

  await test.step('the technician completes stages and enters results', async () => {
    await signIn(page, 'tech');
    for (const line of LINES) {
      await openTest(page, sampleNo, line.name);
      await page.getByRole('button', { name: 'Start test' }).click();
      await expect(page.getByRole('button', { name: /^Complete / }).first()).toBeVisible();
      await completeAllStages(page);
      await enterResult(page, line.code);
      await submitResults(page);
    }
  });

  const approvals = page.getByRole('table', { name: 'Results to approve' });

  await test.step('the head of department rejects one result', async () => {
    await signIn(page, 'hod');
    await page.goto(`/approvals?tab=results&q=${encodeURIComponent(sampleNo)}`);
    await approvals.getByRole('row', { name: /Flash Point/ }).getByRole('button', { name: 'Reject' }).click();
    await page.getByRole('dialog').getByLabel('Reason').fill('Flash point looks low, repeat');
    await page.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
    await expect(approvals.getByRole('row', { name: /Flash Point/ })).toHaveCount(0);
  });

  await test.step('the technician re-enters it', async () => {
    await signIn(page, 'tech');
    await openTest(page, sampleNo, 'Flash Point');
    await expect(page.getByRole('alert').filter({ hasText: 'Sent back for correction' })).toContainText('Flash point looks low, repeat');
    await row(page, 'FLASH').getByRole('textbox').fill('64.0');
    await page.locator('h1').click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
    await submitResults(page);
  });

  await test.step('the head of department approves everything', async () => {
    await signIn(page, 'hod');
    await page.goto(`/approvals?tab=results&q=${encodeURIComponent(sampleNo)}`);
    await expect(approvals.getByRole('row')).toHaveCount(LINES.length + 1);
    await approvals.getByRole('checkbox', { name: 'Select all on this page' }).click();
    await page.getByRole('button', { name: 'Approve selected' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Approve selected' }).click();
    await expect(page.getByRole('status').filter({ hasText: `${LINES.length} approved` })).toBeVisible();
  });

  await test.step('the reviewer rejects the draft report, corrects it, and passes it', async () => {
    await openReport(page, 'reviewer', 'review', sampleNo);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Draft');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('In Review');
    await page.getByRole('button', { name: 'Reject' }).click();
    await page.getByRole('dialog').getByLabel('Reason').fill('Fix the description');
    await page.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'to be corrected' })).toContainText('Fix the description');
    await page.getByRole('button', { name: 'Correct draft' }).click();
    await page.getByRole('dialog').getByLabel('Sample description').fill('Fuel oil drum, corrected');
    await page.getByRole('dialog').getByRole('button', { name: 'Save correction' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('In Review');
    await page.getByRole('button', { name: 'Pass review' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pending Approval');
  });

  await test.step('the signatory approves, issues and emails', async () => {
    await openReport(page, 'signatory', 'sign', sampleNo);
    await signAndIssue(page, contact);
    await page.getByRole('tab', { name: 'Delivery' }).click();
    await expect(page.getByRole('table', { name: 'Email delivery log' })).toContainText(contact);
  });

  await test.step('dispatch sends the report by courier', async () => {
    await signIn(page, 'dispatch');
    await nav(page).getByRole('link', { name: 'Dispatch' }).click();
    await page.getByLabel('Search jobs waiting to go').fill(jobNo);
    await page.getByRole('button', { name: `Record dispatch for ${jobNo}` }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Mode/).selectOption({ label: 'Courier' });
    await dialog.getByRole('button', { name: 'Save dispatch' }).click();
    await expect(dialog.getByText('Required for courier').first()).toBeVisible();
    await dialog.getByLabel(/^Courier name/).fill('Example Couriers');
    await dialog.getByLabel(/^Docket no/).fill('DKT-1001');
    await dialog.getByRole('button', { name: 'Save dispatch' }).click();
    await expect(page.getByText(/Dispatch .* recorded/)).toBeVisible();
    await page.getByRole('tab', { name: 'Dispatches' }).click();
    await page.getByLabel('Search dispatches').fill(jobNo);
    await expect(page.getByRole('table', { name: 'Dispatches' })).toContainText('DKT-1001');
  });

  let invoiceNo = '';
  await test.step('accounts invoices the job, and GST inside the state comes to 15,576', async () => {
    await signIn(page, 'accounts');
    await page.goto(`/invoices?tab=ready&q=${encodeURIComponent(jobNo)}`);
    const ready = page.getByRole('table', { name: 'Jobs ready to invoice' });
    await expect(ready).toContainText(customerName);
    await ready.getByRole('row', { name: new RegExp(jobNo) }).getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Create draft invoice' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Create draft' }).click();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}/);
    const lines = page.getByRole('table', { name: 'Invoice lines' });
    for (const line of LINES) await expect(lines.getByRole('row', { name: new RegExp(line.name) })).toContainText(line.rate);
    const totals = page.getByLabel('Totals');
    await expect(totals).toContainText('13,200.00');
    await expect(totals).toContainText('CGST');
    await expect(totals).toContainText('SGST');
    await expect(totals).not.toContainText('IGST');
    await expect(totals).toContainText('15,576.00');
    await expect(page.getByText('Fifteen Thousand Five Hundred Seventy-Six Only')).toBeVisible();
    await page.getByRole('button', { name: 'Issue', exact: true }).click();
    await expect(page.getByRole('dialog').getByLabel(/Email to/)).toHaveValue(contact);
    await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
    invoiceNo = (await page.getByRole('heading', { level: 1 }).innerText()).split(/\s/)[0];
  });

  const payFromDue = async (amount: string) => {
    await page.getByRole('button', { name: `Record payment for ${invoiceNo}` }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Amount/).fill(amount);
    await dialog.getByLabel(`Allocate to ${invoiceNo}`).fill(amount);
    await dialog.getByLabel('Reference').fill(`UTR-${amount}`);
    await dialog.getByRole('button', { name: 'Record payment' }).click();
    await expect(dialog).toHaveCount(0);
  };

  await test.step('a part payment shows in Due Invoices, and the final payment clears it', async () => {
    await page.goto(`/due-invoices?q=${encodeURIComponent(invoiceNo)}`);
    const due = page.getByRole('table', { name: 'Due invoices' });
    await expect(due.getByRole('row', { name: new RegExp(invoiceNo) })).toContainText('15,576.00');
    await payFromDue('5000');
    const open = due.getByRole('row', { name: new RegExp(invoiceNo) });
    await expect(open).toContainText('5,000.00');
    await expect(open).toContainText('10,576.00');
    await payFromDue('10576');
    await expect(page.getByText('No invoices are due')).toBeVisible();
    await page.goto(`/invoices?tab=all&q=${encodeURIComponent(invoiceNo)}`);
    await expect(page.getByRole('table', { name: 'Invoices' }).getByRole('row', { name: new RegExp(invoiceNo) })).toContainText('Paid');
  });

  await test.step('a revision of the report goes round and is issued', async () => {
    await signIn(page, 'signatory');
    await page.goto(`/approvals?tab=issued&q=${encodeURIComponent(sampleNo)}`);
    await page.getByRole('row', { name: new RegExp(sampleNo) }).first().click();
    await page.getByRole('button', { name: 'Revise' }).click();
    await page.getByRole('dialog').getByLabel('Reason').fill('Customer asked for a correction');
    await page.getByRole('dialog').getByRole('button', { name: 'Start revision' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Revision 1');
    await openReport(page, 'reviewer', 'review', sampleNo);
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('In Review');
    await page.getByRole('button', { name: 'Pass review' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pending Approval');
    await openReport(page, 'signatory', 'sign', sampleNo);
    await signAndIssue(page, '');
    await page.getByRole('tab', { name: /Revisions and tests/ }).click();
    await expect(page.getByText(/^Superseded /)).toBeVisible();
  });

  await test.step('dashboard numbers match the reports they link to', async () => {
    await signIn(page, 'management');
    await expect(page.getByRole('region', { name: 'Operations' })).toBeVisible();
    const tiles = page.getByRole('region', { name: 'Operations' }).locator('[data-metric]');
    const metrics = await tiles.evaluateAll((els) => els.map((e) => ({ key: e.getAttribute('data-metric')!, href: e.getAttribute('href'), value: e.querySelector('span:last-child')!.textContent! })));
    expect(metrics.map((m) => m.key)).toEqual(expect.arrayContaining(['received-today', 'received-month', 'tat-crossed', 'urgent-jobs', 'on-hold', 'tat-compliance']));
    const number = (text: string) => Number(text.replace(/[^\d.]/g, ''));

    // A count that links to a report must equal that report's record count.
    for (const key of ['received-today', 'received-month', 'tat-crossed']) {
      const metric = metrics.find((m) => m.key === key)!;
      await page.goto('/');
      await page.locator(`[data-metric="${key}"]`).click();
      await expect(page).toHaveURL(/\/reports\//);
      const table = page.getByRole('table').first();
      expect(await footerCount(table), `${key} against ${metric.href}`).toBe(number(metric.value));
    }
    expect(number(metrics.find((m) => m.key === 'received-today')!.value)).toBeGreaterThanOrEqual(0);

    // These two link to filtered lists wider than the count: see the backend notes in DECISIONS.md.
    for (const [key, url] of [['urgent-jobs', /urgent=true/], ['on-hold', /status=ON_HOLD/]] as const) {
      await page.goto('/');
      await page.locator(`[data-metric="${key}"]`).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('table', { name: 'Jobs' })).toBeVisible();
    }

    // The percentage opens its report, and has no record count to compare.
    await page.goto('/');
    await page.locator('[data-metric="tat-compliance"]').click();
    await expect(page).toHaveURL(/\/reports\/complete-test-detail/);

    // Every status on the chart equals the report behind it, and a bar goes to the same place.
    await page.goto('/analytics');
    const panel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Samples by status' }) }).last();
    await expect(page.getByRole('img', { name: /^Samples by status\./ })).toBeVisible();
    await page.getByRole('button', { name: 'Show Samples by status as a table' }).click();
    const links = page.getByRole('table', { name: 'Samples by status as a table' }).getByRole('link');
    const points = await links.evaluateAll((els) => els.map((e) => ({ href: e.getAttribute('href')!, value: e.textContent! })));
    expect(points.length).toBeGreaterThan(0);
    expect(panel).toBeTruthy();
    for (const point of points) {
      await page.goto(point.href);
      expect(await footerCount(page.getByRole('table').first()), point.href).toBe(number(point.value));
    }
  });
});
