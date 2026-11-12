import { expect, test, type Page } from '@playwright/test';
import { apiAs, DEMO_PASSWORD, freshCustomer, issuedJob, plannedJob, signIn } from './helpers';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

/** Makes a draft invoice for a job through the Ready to invoice tab and opens it. */
async function draftFromReady(page: Page, jobNo: string) {
  await page.goto(`/invoices?tab=ready&q=${encodeURIComponent(jobNo)}`);
  await page
    .getByRole('table', { name: 'Jobs ready to invoice' })
    .getByRole('row', { name: new RegExp(jobNo) })
    .getByRole('checkbox')
    .click();
  await page.getByRole('button', { name: 'Create draft invoice' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Create draft' }).click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}/);
}

async function issueOpen(page: Page) {
  await page.getByRole('button', { name: 'Issue', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
  return (await page.getByRole('heading', { level: 1 }).innerText()).split(/\s/)[0];
}

test('the navigation follows permissions, in the product order', async ({ page }) => {
  const expected: Record<string, string[]> = {
    admin: [
      'Dashboard',
      'Orders',
      'Quotations',
      'Samples',
      'Planning',
      'Approvals',
      'Reports',
      'Dispatch',
      'Invoices',
      'Due Invoices',
      'Analytics',
      'Customers',
      'Quality',
      'Files',
      'Masters',
      'Admin',
    ],
    accounts: ['Dashboard', 'Samples', 'Approvals', 'Reports', 'Invoices', 'Due Invoices', 'Analytics', 'Customers', 'Masters'],
    dispatch: ['Dashboard', 'Samples', 'Approvals', 'Dispatch', 'Customers', 'Masters'],
    tech: ['Dashboard', 'My Tests'],
    docs: ['Dashboard', 'Customers', 'Files'],
    quality: ['Dashboard', 'Samples', 'Quality', 'Files', 'Masters'],
  };
  for (const [user, links] of Object.entries(expected)) {
    await signIn(page, user);
    await expect(nav(page).getByRole('link')).toHaveText(links);
  }
});

test('the menu shrinks to icons and expands with the hamburger', async ({ page }) => {
  await signIn(page, 'admin');
  const samples = nav(page).getByRole('link', { name: 'Samples' });
  const label = samples.locator('span');
  await expect(samples.locator('svg')).toBeVisible();
  await expect(label).toHaveClass(/sr-only/);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(label).not.toHaveClass(/sr-only/);
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(label).toHaveClass(/sr-only/);
  await samples.click();
  await expect(page).toHaveURL(/\/samples$/);
});

test('a route the role lacks says so', async ({ page }) => {
  await signIn(page, 'tech');
  for (const path of ['/invoices', '/due-invoices', '/dispatch', '/reports', '/analytics']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: "You don't have access to this page" })).toBeVisible();
  }
});

test('dispatch: choosing what goes, by-hand fields, withheld reports, and returnable samples', async ({ page }) => {
  // Issuing is refused while withheld, so the hold is switched on after the report has gone out.
  const customer = await freshCustomer();
  const withheld = await issuedJob({ customerId: customer.id });
  const sales = await apiAs('sales');
  const record = await sales.get(`/customers/${customer.id}`);
  await sales.patch(`/customers/${customer.id}`, {
    version: record.version,
    isActive: true,
    name: record.name,
    stateName: record.stateName,
    stateCode: record.stateCode,
    creditDays: record.creditDays,
    withholdReportUntilPaid: true,
  });
  const open = await issuedJob();

  await signIn(page, 'dispatch');
  await page.goto(`/dispatch?q=${encodeURIComponent(withheld.job.jobNo)}`);
  const pending = page.getByRole('table', { name: 'Jobs waiting to go' });
  await expect(pending).toContainText('Withheld until paid');
  await page.getByRole('button', { name: `Record dispatch for ${withheld.job.jobNo}` }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Withheld: this customer has report release held');
  await expect(dialog.getByRole('checkbox', { name: new RegExp(withheld.reportNo) })).toBeDisabled();
  await dialog.getByLabel(/^Mode/).selectOption({ label: 'Post' });
  await dialog.getByRole('button', { name: 'Save dispatch' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Choose at least one report or sample');
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.goto(`/dispatch?q=${encodeURIComponent(open.job.jobNo)}`);
  await page.getByRole('button', { name: `Record dispatch for ${open.job.jobNo}` }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('checkbox', { name: new RegExp(open.reportNo) })).toBeChecked();
  await dialog.getByLabel(/^Mode/).selectOption({ label: 'By hand' });
  await dialog.getByRole('button', { name: 'Save dispatch' }).click();
  await expect(dialog.getByText('Required when sent by hand').first()).toBeVisible();
  await dialog.getByLabel(/^Carrier name/).fill('Ravi Runner');
  await dialog.getByLabel(/^Carrier contact/).fill('+91 90000 00000');
  await dialog.getByRole('button', { name: 'Save dispatch' }).click();
  await expect(page.getByText(/Dispatch .* recorded/)).toBeVisible();
  await expect(page.getByText('Nothing is waiting to go out')).toBeVisible();

  await page.getByRole('tab', { name: 'Dispatches' }).click();
  await page.getByLabel('Search dispatches').fill(open.job.jobNo);
  const dispatches = page.getByRole('table', { name: 'Dispatches' });
  await expect(dispatches).toContainText('Ravi Runner');
  const tab = page.context().waitForEvent('page');
  const made = page.waitForResponse((r) => r.url().endsWith('/documents') && r.request().method() === 'POST');
  await dispatches
    .getByRole('row', { name: new RegExp(open.job.jobNo) })
    .getByRole('button', { name: /^Challan for/ })
    .click();
  expect((await (await made).request().postDataJSON()).kind).toBe('dispatch-challan');
  await (await tab).close();

  // A returnable sample, marked returned, then a second one disposed of
  const reception = await apiAs('reception');
  const tests = (await reception.get('/masters/tests?pageSize=200')).data as { id: string; code: string }[];
  const description = `Returnable ${Date.now()}`;
  const job = await reception.post('/jobs', {
    customerId: customer.id,
    noQuotationReason: 'E2E setup',
    urgent: false,
    samples: [1, 2].map((n) => ({ description: `${description} ${n}`, returnable: true, attributes: [], testIds: [tests.find((t) => t.code === 'DEN')!.id] })),
    deviations: [],
  });
  await reception.dispose();
  const [first, second] = job.samples as { sampleNo: string }[];
  await page.goto(`/dispatch?tab=returnables&q=${encodeURIComponent(job.jobNo)}`);
  const samples = page.getByRole('table', { name: 'Returnable samples' });
  await expect(samples).toContainText(first.sampleNo);
  await page.getByRole('button', { name: `Mark ${first.sampleNo} returned` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark returned' }).click();
  await expect(page.getByText(`${first.sampleNo} marked returned`)).toBeVisible();
  await page.getByRole('button', { name: `Mark ${second.sampleNo} disposed` }).click();
  await expect(page.getByRole('alertdialog')).toContainText('cannot be undone');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mark disposed' }).click();
  await expect(page.getByText(`${second.sampleNo} marked disposed`)).toBeVisible();
  await page.getByLabel('Which samples').selectOption({ label: 'Returned' });
  await expect(samples).toContainText(first.sampleNo);
  await page.getByLabel('Which samples').selectOption({ label: 'Disposed' });
  await expect(samples).toContainText(second.sampleNo);
});

test('invoices: one customer per draft, discount, rate override, cancel, credit note, reminder, history', async ({ page }) => {
  const customer = await freshCustomer();
  const other = await freshCustomer();
  const a = await issuedJob({ customerId: customer.id });
  const b = await issuedJob({ customerId: customer.id });
  const c = await issuedJob({ customerId: other.id });

  await signIn(page, 'accounts');
  // Jobs of another customer cannot join the selection
  await page.goto('/invoices?tab=ready&pageSize=200');
  const ready = page.getByRole('table', { name: 'Jobs ready to invoice' });
  await ready
    .getByRole('row', { name: new RegExp(a.job.jobNo) })
    .getByRole('checkbox')
    .click();
  await expect(ready.getByRole('row', { name: new RegExp(c.job.jobNo) }).getByRole('checkbox')).toBeDisabled();
  await ready
    .getByRole('row', { name: new RegExp(b.job.jobNo) })
    .getByRole('checkbox')
    .click();
  await page.getByRole('button', { name: 'Create draft invoice' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Create draft' }).click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Draft');
  const lines = page.getByRole('table', { name: 'Invoice lines' });
  await expect(lines.getByRole('row')).toHaveCount(3);

  // Totals come back from the server after each change
  const totals = page.getByLabel('Totals');
  await expect(totals).toContainText('1,100.00');
  await page.getByLabel('Discount %').fill('10');
  await page.getByRole('textbox', { name: 'Notes' }).fill('Agreed discount');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
  await expect(totals.getByText('Taxable amount').locator('..')).toContainText('990.00');

  await page.getByRole('button', { name: 'Change rate of line 1' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^Rate/).fill('600');
  await dialog.getByRole('button', { name: 'Save rate' }).click();
  await expect(dialog.getByText('Give a reason')).toBeVisible();
  await dialog.getByLabel(/^Reason/).fill('Agreed by phone');
  await dialog.getByRole('button', { name: 'Save rate' }).click();
  await expect(lines.getByRole('row').nth(1)).toContainText('600.00');
  await expect(lines.getByRole('row').nth(1)).toContainText(/Override/i);

  // A changed record is refused and reloaded
  const accounts = await apiAs('accounts');
  const id = new URL(page.url()).pathname.split('/').pop()!;
  const current = await accounts.get(`/invoices/${id}`);
  await accounts.patch(`/invoices/${id}`, { version: current.version, notes: 'Changed elsewhere' });
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(/changed by someone else/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('Changed elsewhere');

  // Cancelling needs a reason
  await page.getByRole('button', { name: 'Cancel invoice' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill('Raised on the wrong job');
  await dialog.getByRole('button', { name: 'Cancel invoice' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cancelled');
  await expect(page.getByText('Cancelled: Raised on the wrong job')).toBeVisible();

  // Cancelled lines are billable again; issue, then a credit note, email, PDF and reminder
  await draftFromReady(page, a.job.jobNo);
  const invoiceNo = await issueOpen(page);
  await expect(page.getByText('Fifteen Thousand')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Credit note' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^Taxable amount/).fill('100');
  await dialog.getByLabel(/^Reason/).fill('Part of the work was not needed');
  await dialog.getByRole('button', { name: 'Raise credit note' }).click();
  await expect(page.getByText('Credit note raised')).toBeVisible();
  await page.getByRole('tab', { name: /Credit notes \(1\)/ }).click();
  const notes = page.getByRole('table', { name: 'Credit notes' });
  await expect(notes).toContainText('Part of the work was not needed');
  await expect(notes).toContainText('118.00');
  const made = page.waitForResponse((r) => r.url().endsWith('/documents') && r.request().method() === 'POST');
  const tab = page.context().waitForEvent('page');
  await notes.getByRole('button', { name: /^PDF of/ }).click();
  expect((await (await made).request().postDataJSON()).kind).toBe('credit-note-pdf');
  await (await tab).close();

  await page.getByRole('button', { name: 'Email', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel(/Email to/)).toHaveValue('buyer@customer.example');
  await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Invoice queued for email')).toBeVisible();
  await page.getByRole('tab', { name: 'Delivery' }).click();
  await expect(page.getByRole('table', { name: 'Email delivery log' })).toContainText('buyer@customer.example');

  await page.getByRole('button', { name: 'Send reminder' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Send reminder' }).click();
  await expect(page.getByText('Reminder sent')).toBeVisible();
  await page.getByRole('tab', { name: /Reminders \(1\)/ }).click();
  await expect(page.getByRole('table', { name: 'Reminders' })).toContainText('Manual');

  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText(/Invoice\./).first()).toBeVisible();

  // The list filters by status and customer, from the URL
  await page.goto(`/invoices?tab=all&status=CANCELLED&q=${encodeURIComponent(invoiceNo)}`);
  await expect(page.getByLabel('Status filter')).toHaveValue('CANCELLED');
  await expect(page.getByText('No invoices found')).toBeVisible();
  await page.getByLabel('Status filter').selectOption('');
  await expect(page.getByRole('table', { name: 'Invoices' })).toContainText(invoiceNo);
});

test('payments: an advance held on account, applied, then a payment reversed', async ({ page }) => {
  const customer = await freshCustomer();
  const { job } = await issuedJob({ customerId: customer.id });

  await signIn(page, 'accounts');
  await draftFromReady(page, job.jobNo);
  const invoiceNo = await issueOpen(page);

  await page.goto('/invoices?tab=payments');
  await page.getByRole('button', { name: 'Record payment' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: /Customer/ }).fill(customer.name);
  await dialog
    .getByRole('option', { name: new RegExp(customer.name) })
    .first()
    .click();
  await expect(dialog.getByRole('table', { name: 'Allocate to open invoices' })).toContainText(invoiceNo);
  await dialog.getByLabel(/^Amount/).fill('200');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText(/kept as an advance/)).toBeVisible();

  await page.getByLabel('Search payments').fill(customer.name);
  const payments = page.getByRole('table', { name: 'Payments' });
  await expect(payments).toContainText('Advance');
  await payments.getByRole('button', { name: /^Apply advance from/ }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel(`Allocate to ${invoiceNo}`).fill('5000');
  await dialog.getByRole('button', { name: 'Apply advance' }).click();
  await expect(dialog.getByRole('alert')).toContainText('left on this payment');
  await dialog.getByLabel(`Allocate to ${invoiceNo}`).fill('200');
  await dialog.getByRole('button', { name: 'Apply advance' }).click();
  await expect(page.getByText(/Advance applied/)).toBeVisible();
  await expect(payments).toContainText(invoiceNo);

  await page.goto(`/due-invoices?q=${encodeURIComponent(invoiceNo)}`);
  await expect(page.getByRole('table', { name: 'Due invoices' })).toContainText('449.00');

  await page.goto(`/invoices?tab=payments&q=${encodeURIComponent(customer.name)}`);
  await payments.getByRole('button', { name: /^Reverse / }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Entered by mistake');
  await page.getByRole('dialog').getByRole('button', { name: 'Reverse payment' }).click();
  await expect(payments).toContainText('Reversed');
  await page.goto(`/due-invoices?q=${encodeURIComponent(invoiceNo)}`);
  await expect(page.getByRole('table', { name: 'Due invoices' })).toContainText('649.00');
});

test('due invoices: honours URL filters, chips, statement and export', async ({ page }) => {
  const customer = await freshCustomer();
  const { job } = await issuedJob({ customerId: customer.id });
  await signIn(page, 'accounts');
  await draftFromReady(page, job.jobNo);
  const invoiceNo = await issueOpen(page);

  await page.goto(`/due-invoices?bucket=${encodeURIComponent('90+')}&q=${encodeURIComponent(invoiceNo)}`);
  const table = page.getByRole('table', { name: 'Due invoices' });
  await expect(page.getByLabel('Ageing filter')).toHaveValue('90+');
  await expect(page.getByRole('button', { name: /^90\+/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('No invoices are due')).toBeVisible();

  await page.getByRole('button', { name: /^Not Due/ }).click();
  await expect(table).toContainText(invoiceNo);
  await expect(table.getByRole('row', { name: new RegExp(invoiceNo) })).toContainText('Not Due');

  await page.goto(`/due-invoices?overdue=true&q=${encodeURIComponent(invoiceNo)}`);
  await expect(page.getByLabel('Overdue filter')).toHaveValue('true');
  await expect(page.getByText('No invoices are due')).toBeVisible();
  await page.getByLabel('Overdue filter').selectOption('false');
  await expect(table).toContainText(invoiceNo);

  await page.goto(`/due-invoices?customerId=${customer.id}`);
  await expect(page.getByRole('combobox', { name: 'Customer filter' })).toHaveValue(customer.name);
  await expect(table.getByRole('row')).toHaveCount(2);
  const outstanding = page.getByRole('table', { name: 'Outstanding by customer' });
  await expect(outstanding).toContainText(customer.name);
  await expect(outstanding).toContainText('649.00');

  let made = page.waitForResponse((r) => r.url().endsWith('/documents') && r.request().method() === 'POST');
  let tab = page.context().waitForEvent('page');
  await page.getByRole('button', { name: 'Excel' }).click();
  expect((await made).request().postDataJSON()).toMatchObject({ kind: 'due-invoices-export', params: { customerId: customer.id } });
  // A bulk export of money owed asks for the password first, then goes through.
  const confirm = page.getByRole('dialog', { name: 'Confirm your password' });
  made = page.waitForResponse((r) => r.url().endsWith('/documents') && r.request().method() === 'POST' && r.ok());
  await confirm.getByLabel('Your password').fill(DEMO_PASSWORD);
  await confirm.getByRole('button', { name: 'Confirm' }).click();
  await made;
  await (await tab).close();

  await outstanding.getByRole('button', { name: `Statement of account for ${customer.name}` }).click();
  await page.getByRole('dialog').getByLabel('From').fill('2020-01-01');
  made = page.waitForResponse((r) => r.url().endsWith('/documents') && r.request().method() === 'POST');
  tab = page.context().waitForEvent('page');
  await page.getByRole('dialog').getByRole('button', { name: 'Produce statement' }).click();
  expect((await made).request().postDataJSON()).toMatchObject({ kind: 'statement-of-account', params: { customerId: customer.id, from: '2020-01-01' } });
  await (await tab).close();
});

test('reports: catalog by permission, default month, filters from the URL, formats and exports', async ({ page }) => {
  await plannedJob(['DEN']);
  await signIn(page, 'planner');
  await nav(page).getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Samples' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Invoice Register with GST Summary' })).toHaveCount(0);

  // A bare link gets the current month; a link with parameters is left as it came
  await page.getByRole('link', { name: 'Sample Status Detail' }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-01&to=\d{4}-\d{2}-\d{2}/);
  const table = page.getByRole('table', { name: 'Sample Status Detail' });
  await expect(table.getByRole('row').first()).toContainText('Sample no.');
  await expect(table.getByRole('row').nth(1)).toBeVisible();
  await expect(table.getByRole('row').nth(1)).toContainText(/\d{2}-[A-Z][a-z]{2}-\d{4} \d{2}:\d{2}/);

  await page.goto('/reports/sample-status?status=PLANNED');
  await expect(page).toHaveURL(/\/reports\/sample-status\?status=PLANNED$/);
  await expect(page.getByLabel('Status filter')).toHaveValue('PLANNED');
  await expect(page.getByLabel('Date from')).toHaveValue('');
  await expect(table.getByRole('row').nth(1)).toContainText('PLANNED');

  // Without a date filter, nothing is added
  await page.goto('/reports/tat-crossed');
  await expect(page).toHaveURL(/\/reports\/tat-crossed$/);
  await expect(page.getByLabel('Date from')).toHaveCount(0);

  await page.goto('/reports/sample-status?status=PLANNED');
  for (const [name, format] of [
    ['Excel', 'excel'],
    ['PDF', 'pdf'],
  ]) {
    const made = page.waitForResponse((r) => r.url().endsWith('/documents') && r.request().method() === 'POST');
    const tab = page.context().waitForEvent('page');
    await page.getByRole('button', { name, exact: true }).click();
    expect((await made).request().postDataJSON()).toEqual({ kind: 'mis:sample-status', params: { format, status: 'PLANNED' } });
    await (await tab).close();
  }

  // A commercial report is not on offer to this role
  await page.goto('/reports/invoice-register');
  await expect(page.getByText('This report is not available to you')).toBeVisible();

  // Money is grouped by the screen, as the server calculated it
  const { job } = await issuedJob({ customerId: (await freshCustomer()).id });
  await signIn(page, 'accounts');
  await draftFromReady(page, job.jobNo);
  const invoiceNo = await issueOpen(page);
  await page.goto('/reports/invoice-register');
  await expect(page.getByRole('table', { name: 'Invoice Register with GST Summary' }).getByRole('row', { name: new RegExp(invoiceNo) })).toContainText('649.00');
});

test('dashboard: what each role gets, working links, and charts only where they belong', async ({ page }) => {
  await plannedJob(['DEN']);
  const charts: string[] = [];
  page.on('response', (r) => {
    if (/\/charts[-.]/.test(r.url()) || r.url().includes('recharts')) charts.push(r.url());
  });

  // A technician sees their work, and does not download the charts
  await signIn(page, 'tech');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const work = page.locator('[data-work="my-open"]');
  await expect(work).toContainText('Tests assigned to me');
  await expect(page.getByRole('region', { name: 'Operations' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open analytics' })).toHaveCount(0);
  await work.click();
  await expect(page).toHaveURL(/\/my-tests$/);
  await page.goto('/');
  await expect(work).toBeVisible();
  expect(charts).toEqual([]);

  // A planner's work links honour their parameters
  await signIn(page, 'planner');
  await expect(page.getByRole('region', { name: 'Operations' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Commercial' })).toHaveCount(0);

  // A reviewer's report links would be refused, so they are plain numbers; their approvals link works
  await signIn(page, 'reviewer');
  await expect(page.getByRole('region', { name: 'Quality' })).toBeVisible();
  await expect(page.locator('a[data-metric="rejection-rate"]')).toHaveCount(0);
  await expect(page.locator('div[data-metric="rejection-rate"]')).toBeVisible();
  await page.locator('a[data-metric="awaiting-review"]').click();
  await expect(page).toHaveURL(/\/approvals\?tab=review/);
  await expect(page.getByRole('tab', { name: 'Review' })).toHaveAttribute('aria-selected', 'true');

  // Management: every section, the date range in the URL, charts on Analytics, and bars and tables that link
  await signIn(page, 'management');
  for (const region of ['Operations', 'Quality', 'Commercial']) await expect(page.getByRole('region', { name: region })).toBeVisible();
  expect(charts).toEqual([]);
  const request = page.waitForRequest((r) => r.url().includes('/dashboard?') && r.url().includes('from=2020-01-01'));
  await page.getByLabel('Period from').fill('2020-01-01');
  await request;
  await expect(page).toHaveURL(/from=2020-01-01/);
  await expect(page.getByLabel('Period from')).toHaveValue('2020-01-01');

  await page.goto('/analytics');
  await expect(page.getByRole('img', { name: /^Samples by status\./ })).toBeVisible();
  expect(charts.length).toBeGreaterThan(0);
  await expect(
    page
      .getByRole('img', { name: /^Samples by status\./ })
      .locator('.recharts-bar-rectangle')
      .first(),
  ).toBeVisible();
  await page
    .getByRole('img', { name: /^Samples by status\./ })
    .locator('.recharts-bar-rectangle path')
    .first()
    .click();
  await expect(page).toHaveURL(/\/reports\/sample-status\?status=/);

  await page.goto('/analytics');
  await page.getByRole('button', { name: 'Show Samples by status as a table' }).click();
  await page.getByRole('table', { name: 'Samples by status as a table' }).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/reports\/sample-status\?status=/);

  // The ageing chart's links reach Due Invoices, and accounts land on the matching filter
  await signIn(page, 'accounts');
  await page.goto('/analytics');
  await page.getByRole('button', { name: 'Show Ageing of what is outstanding as a table' }).click();
  await page.getByRole('link', { name: /^90\+:/ }).click();
  await expect(page).toHaveURL(/\/due-invoices\?bucket=90%2B/);
  await expect(page.getByLabel('Ageing filter')).toHaveValue('90+');
  await page.goto('/');
  await page.locator('a[data-metric="outstanding"]').click();
  await expect(page).toHaveURL(/\/reports\/outstanding-ageing/);
});

test('a crash in a page shows a friendly message with a reload button', async ({ page }) => {
  await signIn(page, 'tech');
  // Answer the dashboard with something it cannot draw.
  await page.route('**/api/v1/dashboard*', (route) =>
    route.fulfill({ json: { from: '2026-01-01', to: '2026-01-02', myWork: 'not a list', operations: null, quality: null, people: null, commercial: null } }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Something went wrong on this page');
  // The crash stays inside the page: the menu still works.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.unroute('**/api/v1/dashboard*');
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
