import { expect, test, type Locator, type Page } from '@playwright/test';
import { apiAs, DEMO_PASSWORD, issuedJob, plannedJob, signIn, unique } from './helpers';

/** The main area scrolls by itself, so a tall window is what shows the whole screen. */
async function shot(page: Page, name: string, size = { width: 1280, height: 1500 }) {
  const before = page.viewportSize();
  await page.setViewportSize(size);
  await page.screenshot({ path: `test-results/screens/${name}.png` });
  if (before) await page.setViewportSize(before);
}
const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });
const row = (page: Page, code: string) => page.locator(`tr[data-parameter="${code}"]`);
const reading = (row_: Locator) => row_.getByRole('textbox');
// A two-page PDF, as an instrument's software exports it.
const PDF = Buffer.from(
  'JVBERi0xLjcKJYGBgYEKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgNSAwIFIgNyAwIFIgXQovQ291bnQgMgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSCj4+CmVuZG9iagoKMyAwIG9iago8PAovUHJvZHVjZXIgPEZFRkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyMDAwMjgwMDY4MDA3NDAwNzQwMDcwMDA3MzAwM0EwMDJGMDAyRjAwNjcwMDY5MDA3NDAwNjgwMDc1MDA2MjAwMkUwMDYzMDA2RjAwNkQwMDJGMDA0ODAwNkYwMDcwMDA2NDAwNjkwMDZFMDA2NzAwMkYwMDcwMDA2NDAwNjYwMDJEMDA2QzAwNjkwMDYyMDAyOT4KL01vZERhdGUgKEQ6MjAyNjExMTIxNjMxNDBaKQovQ3JlYXRvciA8RkVGRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDIwMDAyODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2NzAwNjkwMDc0MDA2ODAwNzUwMDYyMDAyRTAwNjMwMDZGMDA2RDAwMkYwMDQ4MDA2RjAwNzAwMDY0MDA2OTAwNkUwMDY3MDAyRjAwNzAwMDY0MDA2NjAwMkQwMDZDMDA2OTAwNjIwMDI5PgovQ3JlYXRpb25EYXRlIChEOjIwMjYxMTEyMTYzMTQwWikKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAxIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtNzA5ODQ4MDc4OSA0IDAgUgo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0KL0Fubm90cyBbIF0KL0NvbnRlbnRzIFsgNiAwIFIgXQo+PgplbmRvYmoKCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxMTgKPj4Kc3RyZWFtCnicHYoxCgJBDEX7nCK1ICbZmfwZEAtxxcJGyAVEVnFZC0U8/87K4xfv8960DxJe+Dxocxqm3/B93q5rSC2pCEplLRx3ssRxJv2nyi6MtnjRNlXv0SHBkP3guVkygXmG+LG9i4mrw7NJpzuOkWJFfdCFZlFrG+kKZW5kc3RyZWFtCmVuZG9iagoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDEgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0hlbHZldGljYS05NzQyNjgyNTY4IDQgMCBSCj4+Ci9YT2JqZWN0IDw8Cj4+Ci9FeHRHU3RhdGUgPDwKPj4KPj4KL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQovQW5ub3RzIFsgXQovQ29udGVudHMgWyA4IDAgUiBdCj4+CmVuZG9iagoKOCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDExNwo+PgpzdHJlYW0KeJwdirEKAlEMBPt8RWpBzMslm3cgFuKJhY2QHxA5xUMLRfx+38mwxSzzom2S8Mz7RqvD+PiOn/vlvOzDFFUdlUvlvJIa55HKPy0M4WjLJ62txxBdWGg4dvBmphIKD8G+vbMJCgKu0umGc6Jc0JB0oh9QbBvnCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA5CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDgyIDAwMDAwIG4gCjAwMDAwMDAxMzIgMDAwMDAgbiAKMDAwMDAwMDYwMiAwMDAwMCBuIAowMDAwMDAwNzAwIDAwMDAwIG4gCjAwMDAwMDA4OTUgMDAwMDAgbiAKMDAwMDAwMTA4NiAwMDAwMCBuIAowMDAwMDAxMjgxIDAwMDAwIG4gCgp0cmFpbGVyCjw8Ci9TaXplIDkKL1Jvb3QgMiAwIFIKL0luZm8gMyAwIFIKPj4KCnN0YXJ0eHJlZgoxNDcxCiUlRU9G',
  'base64',
);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/hZ9X5gAAAABJRU5ErkJggg==', 'base64');

async function completeStages(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    const complete = page.getByRole('button', { name: /^Complete / });
    await expect(complete).toHaveCount(1);
    const name = await complete.getAttribute('aria-label');
    await complete.click();
    await expect(page.getByRole('button', { name: name!, exact: true })).toHaveCount(0);
  }
}

/** Signs in and opens the report for this sample from an approvals tab. */
async function openReport(page: Page, user: string, tab: string, sampleNo: string) {
  await signIn(page, user);
  await page.goto(`/approvals?tab=${tab}&q=${encodeURIComponent(sampleNo)}`);
  await page
    .getByRole('row', { name: new RegExp(sampleNo) })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Revision');
}

test('from result entry to an issued, then revised, report', async ({ page }) => {
  const { sample } = await plannedJob(['TENS']);

  // The worklist: technician sees codes, never the customer
  await signIn(page, 'tech');
  await expect(nav(page).getByRole('link')).toHaveText(['Dashboard', 'My Tests']);
  await nav(page).getByRole('link', { name: 'My Tests' }).click();
  await page.getByLabel('Search my tests').fill(sample.sampleNo);
  const worklist = page.getByRole('table', { name: 'My tests' });
  await expect(worklist).toContainText(sample.sampleNo);
  await expect(worklist).toContainText('Sample Received by Analyst');
  await expect(worklist).not.toContainText('Contoso');
  await worklist.getByRole('row', { name: new RegExp(sample.sampleNo) }).click();

  // Before starting everything is read-only
  await expect(page.getByText('Start the test to enter results.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('TENS');
  await expect(page.getByText('Handle with care')).toBeVisible();
  await expect(page.getByText('Machined flat')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Contoso');
  await expect(row(page, 'WIDTH').getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start test' }).click();

  // Stages go in order, one Complete at a time
  await expect(page.getByRole('button', { name: /^Complete / })).toHaveCount(1);
  await expect(page.getByText('Test conducted by').locator('..')).toContainText('Tara Technician');
  await completeStages(page, 2);
  await expect(page.getByText(/Done by Tara Technician/)).toHaveCount(2);

  // Calculated values come from the server, including what they wait for
  await expect(row(page, 'A0')).toContainText('Waiting for WIDTH, THICK');
  await reading(row(page, 'WIDTH')).fill('12.5');
  await reading(row(page, 'WIDTH')).press('Enter');
  await expect(reading(row(page, 'THICK'))).toBeFocused();
  await page.keyboard.type('6.2');
  await page.keyboard.press('Tab');
  await expect(row(page, 'A0')).toContainText('77.500');
  await expect(row(page, 'A0')).toContainText('(12.5 * 6.2) = 77.5');
  await expect(row(page, 'A0')).toContainText('width = 12.50, thickness = 6.20');
  await expect(row(page, 'A0').getByRole('textbox')).toHaveCount(0);
  await expect(reading(row(page, 'WIDTH'))).toHaveValue('12.50');
  await expect(reading(row(page, 'WIDTH'))).toHaveAttribute('inputmode', 'decimal');

  // Limits for both grades, with pass or fail for each
  await reading(row(page, 'LOAD')).fill('41000');
  await reading(row(page, 'LOAD')).blur();
  const uts = row(page, 'UTS');
  await expect(uts).toContainText('529.03');
  await expect(uts).toContainText('DEMO-S355');
  await expect(uts).toContainText('470 to 630');
  await expect(uts).toContainText('DEMO-S420');
  await expect(uts).toContainText('520 to 680');
  await expect(uts.locator('td').nth(3)).toContainText(/DEMO-S355: *Pass/);
  await reading(row(page, 'LOAD')).fill('38000');
  await reading(row(page, 'LOAD')).blur();
  await expect(uts).toContainText('490.32');
  await expect(uts.locator('td').nth(3)).toContainText(/DEMO-S355: *Pass/);
  await expect(uts.locator('td').nth(3)).toContainText(/DEMO-S420: *Fail/);

  // Half-typed numbers are flagged and not sent
  await reading(row(page, 'L0')).fill('5x');
  await expect(row(page, 'L0')).toContainText('Enter a number');
  await reading(row(page, 'L0')).fill('50');
  await reading(row(page, 'Lf')).fill('65');
  await reading(row(page, 'Af')).fill('40');
  await reading(row(page, 'PROOFLOAD')).fill('30000');
  await reading(row(page, 'PROOFLOAD')).blur();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await expect(row(page, 'EL')).toContainText('30.00');

  // Instrument, with overdue ones flagged and the warning shown
  const instrument = page.getByLabel('Instrument', { exact: true });
  await expect(instrument.locator('option', { hasText: 'calibration overdue' }).first()).toBeAttached();
  await instrument.selectOption({ label: 'IMP-01 — Impact tester (demo) (calibration overdue)' });
  await expect(page.getByText(/was due for calibration on/)).toBeVisible();
  await instrument.selectOption({ label: 'SPEC-01 — Optical emission spectrometer (demo)' });
  await expect(page.getByText(/was due for calibration on/)).toHaveCount(0);

  // Remarks from a template, suggestions first
  const templates = page.getByLabel('Add a template to remarks');
  await expect(templates.locator('optgroup').first()).toHaveAttribute('label', 'Suggested for this result');
  await templates.selectOption({ index: 1 });
  await expect(page.getByLabel('Remarks', { exact: true })).not.toHaveValue('');
  await page.getByLabel('Observations', { exact: true }).fill('Ductile fracture');
  await page.getByLabel('Observations', { exact: true }).blur();

  // Unit helper
  await page.getByLabel('Conversion').selectOption({ label: 'J to kgf·m' });
  await page.getByLabel('Value in J').fill('10');
  await page.getByRole('button', { name: 'Convert', exact: true }).click();
  await expect(page.getByText(/kgf·m$/).last()).toBeVisible();
  await shot(page, 'result-entry');
  await shot(page, 'result-entry-tablet', { width: 1024, height: 1400 });

  // Autosave survives a reload
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.reload();
  await expect(reading(row(page, 'LOAD'))).toHaveValue('38000');
  await expect(uts).toContainText('490.32');
  await expect(page.getByLabel('Observations', { exact: true })).toHaveValue('Ductile fracture');
  await expect(page.getByLabel('Instrument', { exact: true })).toHaveValue(/.+/);

  // The server refuses to submit with stages open
  await page.getByRole('button', { name: 'Submit results' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit results' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Complete every stage' })).toBeVisible();
  await completeStages(page, 2);

  // Attachments while editable
  await page.getByRole('tab', { name: 'Images, graphs and files' }).click();
  await page.getByLabel('Upload to Result images and graphs').setInputFiles({ name: 'micrograph.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'micrograph.png', exact: true })).toBeVisible();
  const image = page.getByRole('list', { name: 'Result images and graphs' }).getByRole('listitem').first();
  await expect(image.getByRole('checkbox', { name: 'Print on report' })).toBeChecked();
  await image.getByLabel('Caption').fill('Fracture surface');
  await image.getByLabel('Caption').blur();
  await image.getByRole('checkbox', { name: 'Print on report' }).click();
  await expect(image.getByRole('checkbox', { name: 'Print on report' })).not.toBeChecked();
  await image.getByRole('checkbox', { name: 'Print on report' }).click();
  await expect(image.getByText('On report')).toBeVisible();
  // The instrument's own PDF prints as an annexure; a protected or oversized one is refused by the server
  await page.getByLabel('Upload to Instrument reports (PDF)').setInputFiles({ name: 'utm-report.pdf', mimeType: 'application/pdf', buffer: PDF });
  const annex = page.getByRole('list', { name: 'Instrument reports (PDF)' }).getByRole('listitem').first();
  await expect(annex).toContainText('2 pages');
  await expect(annex.getByRole('checkbox', { name: 'Print on report' })).toBeChecked();
  await annex.getByLabel('Annexure title').fill('UTM load–extension curves');
  await annex.getByLabel('Annexure title').blur();
  // Raw data: any format, fingerprinted, never printed
  await page.getByLabel('Upload to Raw data files').setInputFiles({ name: 'run-01.csv', mimeType: 'text/csv', buffer: Buffer.from('load,extension\n0,0\n10,0.2\n') });
  const raw = page.getByRole('list', { name: 'Raw data files' }).getByRole('listitem').first();
  await expect(raw).toContainText('SHA-256');
  await expect(raw.getByRole('checkbox')).toHaveCount(0);
  await page.getByLabel('Upload to Worksheets').setInputFiles({ name: 'sheet.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'sheet.png', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Results' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('SampleTest.stage').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Results' }).click();

  // Submit, and everything locks
  await page.getByRole('button', { name: 'Submit results' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit results' }).click();
  await expect(page.getByText(/waiting for approval/)).toBeVisible();
  await expect(page.locator('main input:not([type=file])')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Submit results' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Images, graphs and files' }).click();
  await expect(page.getByRole('button', { name: 'Add file' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Results' }).click();
  await shot(page, 'result-locked');

  // Head of department: own-result items cannot be approved
  await signIn(page, 'hod');
  await page.route('**/api/v1/tests/approvals?*', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    await route.fulfill({ response: res, json: { ...body, data: body.data.map((d: object) => ({ ...d, ownResult: true })) } });
  });
  await page.goto(`/approvals?tab=results&q=${encodeURIComponent(sample.sampleNo)}`);
  const approvals = page.getByRole('table', { name: 'Results to approve' });
  await expect(approvals).toContainText(sample.sampleNo);
  await expect(approvals.getByRole('button', { name: 'Approve' })).toBeDisabled();
  await expect(approvals).toContainText('You entered these results');
  await page.unroute('**/api/v1/tests/approvals?*');

  // Reject with a reason
  await page.reload();
  await expect(approvals.getByRole('button', { name: 'Approve' })).toBeEnabled();
  await expect(approvals).toContainText('Tara Technician');
  await approvals.getByRole('button', { name: new RegExp(`Show results of TENS on ${sample.sampleNo}`) }).click();
  const detail = page.getByRole('table', { name: `Results of TENS on ${sample.sampleNo}` });
  await expect(detail.locator('tr[data-parameter="UTS"]')).toContainText('490.32');
  await expect(detail.locator('tr[data-parameter="UTS"]')).toContainText('Fail');
  await shot(page, 'approvals-results');
  // Actions and the words Pass and Fail must not fall off the side, on a desktop or a tablet
  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    const onScreen = async (target: Locator) => {
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    };
    await onScreen(approvals.getByRole('button', { name: 'Reject' }));
    await onScreen(detail.locator('tr[data-parameter="UTS"]').getByText('Fail'));
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await approvals.getByRole('button', { name: 'Reject' }).click();
  const rejectDialog = page.getByRole('dialog');
  await rejectDialog.getByLabel('Reason').fill('Load looks wrong, measure again');
  await rejectDialog.getByRole('button', { name: 'Reject' }).click();
  await expect(approvals.locator('..').locator('..')).toContainText('No results are waiting for approval');

  // The technician sees why, in the worklist and on the test, with a notification
  await signIn(page, 'tech');
  await page.goto(`/my-tests?q=${encodeURIComponent(sample.sampleNo)}`);
  await expect(page.getByRole('table', { name: 'My tests' })).toContainText('Load looks wrong, measure again');
  await page.getByRole('button', { name: /Notifications, \d+ unread/ }).click();
  await page
    .getByRole('region', { name: 'Notifications' })
    .getByRole('link', { name: new RegExp(`Tensile test on ${sample.sampleNo} was sent back`) })
    .first()
    .click();
  await expect(page.getByRole('alert').filter({ hasText: 'Sent back for correction' })).toContainText('Load looks wrong, measure again');
  await reading(row(page, 'LOAD')).fill('41000');
  await reading(row(page, 'LOAD')).blur();
  await expect(uts).toContainText('529.03');
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit results' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Submit results' }).click();
  await expect(page.getByText(/waiting for approval/)).toBeVisible();

  // Bulk approve
  await signIn(page, 'hod');
  await page.goto(`/approvals?tab=results&q=${encodeURIComponent(sample.sampleNo)}`);
  await approvals
    .getByRole('row', { name: new RegExp(sample.sampleNo) })
    .getByRole('checkbox')
    .click();
  await page.getByRole('button', { name: 'Approve selected' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Approve selected' }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 approved' })).toBeVisible();

  // Reviewers have no worklist of their own
  await signIn(page, 'reviewer');
  await expect(nav(page).getByRole('link', { name: 'My Tests' })).toHaveCount(0);

  // Review: drafts first, then reject, correct and resubmit
  await page.goto(`/approvals?tab=review&q=${encodeURIComponent(sample.sampleNo)}`);
  await expect(page.getByRole('tab')).toHaveText(['Review', 'Issued']);
  await page
    .getByRole('row', { name: new RegExp(sample.sampleNo) })
    .first()
    .click();
  const report = () => page.frameLocator('iframe[title^="Preview of"]');
  await expect(report().getByText(sample.sampleNo).first()).toBeVisible();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('In Review');
  await page.getByRole('button', { name: 'Reject' }).click();
  const reject = page.getByRole('dialog');
  await reject.getByLabel('Reason').fill('Fix the description');
  await reject.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'to be corrected' })).toContainText('Fix the description');
  await page.getByRole('button', { name: 'Correct draft' }).click();
  const correct = page.getByRole('dialog');
  const corrected = unique('Corrected plate');
  await correct.getByLabel('Sample description').fill(corrected);
  await correct.getByLabel('Report remarks').fill('Corrected on review');
  await correct.getByRole('button', { name: 'Save correction' }).click();
  await expect(report().getByText(corrected).first()).toBeVisible();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('In Review');
  await page.getByRole('button', { name: 'Pass review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pending Approval');
  await page.getByRole('tab', { name: /Revisions and tests/ }).click();
  await expect(page.getByText('Fix the description').first()).toBeVisible();
  await expect(page.getByText('Ritu Reviewer').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Preview' }).click();
  await shot(page, 'report-detail-review');

  // Signatory: a wrong password is refused, the right one signs
  await openReport(page, 'signatory', 'sign', sample.sampleNo);
  await page.getByRole('button', { name: 'Approve and sign' }).click();
  const sign = page.getByRole('dialog');
  await expect(sign).toContainText('This is your electronic signature');
  await sign.getByLabel('Your password').fill('not-the-password');
  await sign.getByRole('button', { name: 'Sign and approve' }).click();
  await expect(sign).toContainText('Incorrect password');
  await sign.getByLabel('Your password').fill(DEMO_PASSWORD);
  await sign.getByRole('button', { name: 'Sign and approve' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Approved');

  // The worker renders the PDF; Issue opens up by itself
  const issue = page.getByRole('button', { name: 'Issue', exact: true });
  await expect(issue).toBeEnabled({ timeout: 90_000 });
  await page.getByRole('tab', { name: /Revisions and tests/ }).click();
  await expect(page.getByText('Electronic signature')).toBeVisible();
  await expect(page.getByText(/Content SHA-256: [0-9a-f]{64}/)).toBeVisible();
  await expect(page.getByText(/^[0-9a-f]{64}$/)).toBeVisible();
  await shot(page, 'report-detail-signed');
  await page.getByRole('tab', { name: 'Preview' }).click();
  await issue.click();
  const issueDialog = page.getByRole('dialog');
  await expect(issueDialog.getByLabel(/Email to/)).toHaveValue(/@/);
  await issueDialog.getByLabel(/Email to/).fill('buyer@customer.example');
  await issueDialog.getByRole('button', { name: 'Issue report' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');

  // Delivery log and sending again
  await page.getByRole('tab', { name: 'Delivery' }).click();
  await expect(page.getByRole('table', { name: 'Email delivery log' })).toContainText('buyer@customer.example');
  await page.getByRole('button', { name: 'Email again' }).click();
  const again = page.getByRole('dialog');
  await again.getByLabel(/Email to/).fill('second@customer.example');
  await again.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('table', { name: 'Email delivery log' })).toContainText('second@customer.example');

  // The PDF downloads through a signed link, opened in a tab reserved during the click
  await page.getByRole('tab', { name: /Revisions and tests/ }).click();
  const opened = page.context().waitForEvent('page');
  const signed = page.waitForResponse((r) => /\/reports\/revisions\/[^/]+\/pdf$/.test(r.url()));
  await page.getByRole('button', { name: 'Download revision 0' }).click();
  const { url } = await (await signed).json();
  await (await opened).close();
  const pdf = await page.request.get(url);
  expect(pdf.ok()).toBeTruthy();
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

  // Revise: a new draft goes round again, the old revision is superseded when it issues
  await page.getByRole('button', { name: 'Revise' }).click();
  const revise = page.getByRole('dialog');
  await revise.getByLabel('Reason').fill('Customer asked for a correction');
  await revise.getByRole('button', { name: 'Start revision' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Revision 1');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Draft');
  await expect(page.getByText('Customer asked for a correction')).toBeVisible();

  await openReport(page, 'reviewer', 'review', sample.sampleNo);
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('In Review');
  await page.getByRole('button', { name: 'Pass review' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pending Approval');

  await openReport(page, 'signatory', 'sign', sample.sampleNo);
  await page.getByRole('button', { name: 'Approve and sign' }).click();
  await page.getByRole('dialog').getByLabel('Your password').fill(DEMO_PASSWORD);
  await page.getByRole('dialog').getByRole('button', { name: 'Sign and approve' }).click();
  await expect(issue).toBeEnabled({ timeout: 90_000 });
  await issue.click();
  await page
    .getByRole('dialog')
    .getByLabel(/Email to/)
    .fill('');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue report' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
  await page.getByRole('tab', { name: /Revisions and tests/ }).click();
  await expect(page.getByText(/^Superseded /)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download revision 0' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download revision 1' })).toBeVisible();
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.getByLabel('Revision', { exact: true })).toHaveValue('1');
  await page.getByLabel('Revision', { exact: true }).selectOption('0');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Revision 1');
  await shot(page, 'report-detail-issued');
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('Customer asked for a correction').first()).toBeVisible();
});

test('autosave: keeps what is being typed, warns on leaving, and reloads on a conflict', async ({ page }) => {
  const { sampleTestIds } = await plannedJob(['TENS'], { technician: 'Tushar Technician' });
  const id = sampleTestIds[0];
  await signIn(page, 'tech2');
  await page.goto(`/my-tests/${id}`);
  await page.getByRole('button', { name: 'Start test' }).click();
  await expect(reading(row(page, 'WIDTH'))).toBeVisible();

  // A slow answer never overwrites a field still being typed in
  const slow = '**/api/v1/tests/*/results';
  await page.route(slow, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  const box = reading(row(page, 'WIDTH'));
  await box.click();
  await page.keyboard.type('12');
  await expect(page.getByRole('status').filter({ hasText: 'Saving' })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.keyboard.type('.75');
  await page.waitForResponse((r) => r.url().endsWith('/results'));
  await expect(box).toHaveValue('12.75');
  await box.blur();
  await page.waitForResponse((r) => r.url().endsWith('/results'));
  await expect(box).toHaveValue('12.75');
  await page.unroute(slow);
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

  // A failed save says so, keeps the entry, and warns before leaving
  await page.route(slow, (route) => route.abort());
  await reading(row(page, 'THICK')).fill('6.2');
  await reading(row(page, 'THICK')).blur();
  await expect(page.getByRole('status').filter({ hasText: 'Failed' })).toBeVisible();
  await nav(page).getByRole('link', { name: 'My Tests' }).click();
  const warning = page.getByRole('alertdialog');
  await expect(warning).toContainText('could not be saved');
  await warning.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(new RegExp(`/my-tests/${id}`));
  await page.unroute(slow);
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await expect(row(page, 'A0')).toContainText('79.050');

  // With everything saved, leaving needs no prompt
  await nav(page).getByRole('link', { name: 'My Tests' }).click();
  await expect(page.getByRole('table', { name: 'My tests' })).toBeVisible();
  await page.goto(`/my-tests/${id}`);

  // Someone else changes the test: the user is told and it reloads
  await expect(reading(row(page, 'LOAD'))).toBeVisible();
  const tech = await apiAs('tech2');
  const current = await tech.get(`/tests/${id}`);
  await tech.post(`/tests/${id}/stages/0/complete`, { version: current.version });
  await tech.dispose();
  await reading(row(page, 'LOAD')).fill('41000');
  await reading(row(page, 'LOAD')).blur();
  await expect(page.getByText(/changed elsewhere/)).toBeVisible();
  await expect(page.getByText(/Done by Tushar Technician/)).toBeVisible();
  await expect(reading(row(page, 'LOAD'))).toHaveValue('');

  // Hold and release, with the reason shown on the worklist
  await page.getByRole('button', { name: 'Put on hold' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Waiting for a fixture');
  await page.getByRole('dialog').getByRole('button', { name: 'Put on hold' }).click();
  await expect(page.getByText('Waiting for a fixture')).toBeVisible();
  await expect(row(page, 'LOAD').getByRole('textbox')).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'My Tests' }).click();
  await expect(page.getByRole('table', { name: 'My tests' })).toContainText('Waiting for a fixture');
  await page.goto(`/my-tests/${id}`);
  await page.getByRole('button', { name: 'Release hold' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Release hold' }).click();
  await expect(reading(row(page, 'LOAD'))).toBeVisible();

  // Someone who may view all tests opens it read-only
  await signIn(page, 'planner');
  await page.goto(`/my-tests/${id}`);
  await expect(page.getByText(/read-only/)).toBeVisible();
  await expect(page.locator('main').getByRole('button', { name: 'Submit results' })).toHaveCount(0);
  await expect(row(page, 'WIDTH')).toContainText('12.75');
});

test('moving from one test to another in the app saves each entry to its own test', async ({ page }) => {
  const { sampleTestIds } = await plannedJob(['TENS'], { technician: 'Tushar Technician', samples: 2 });
  const [first, second] = sampleTestIds;
  const tech = await apiAs('tech2');
  for (const id of [first, second]) {
    const t = await tech.get(`/tests/${id}`);
    await tech.post(`/tests/${id}/start`, { version: t.version });
  }
  await signIn(page, 'tech2');
  await page.goto(`/my-tests/${first}`);
  await reading(row(page, 'WIDTH')).fill('11.5');
  await reading(row(page, 'WIDTH')).blur();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

  // In-app navigation, as a scan or a notification link does it: no page load.
  await page.evaluate((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, `/my-tests/${second}`);
  await expect(page).toHaveURL(new RegExp(`/my-tests/${second}`));
  await expect(reading(row(page, 'WIDTH'))).toHaveValue('');
  const saved = page.waitForResponse((r) => r.url().includes(`/tests/${second}/results`) && r.ok());
  await reading(row(page, 'WIDTH')).fill('22.5');
  await reading(row(page, 'WIDTH')).blur();
  await saved;

  const width = async (id: string) => (await tech.get(`/tests/${id}`)).results.find((r: { code: string }) => r.code === 'WIDTH').numericValue;
  expect(await width(first)).toMatch(/^11\.5/);
  expect(await width(second)).toMatch(/^22\.5/);
  await tech.dispose();
});

test('an entry the server refuses is shown on its own input, and the rest still saves', async ({ page }) => {
  const { sampleTestIds } = await plannedJob(['TENS'], { technician: 'Tushar Technician' });
  await signIn(page, 'tech2');
  await page.goto(`/my-tests/${sampleTestIds[0]}`);
  await page.getByRole('button', { name: 'Start test' }).click();
  await expect(reading(row(page, 'WIDTH'))).toBeVisible();

  // The browser's own check stops text reaching the server, so this swaps the value on its way out.
  // The refusal is the real server's.
  const results = '**/api/v1/tests/*/results';
  await page.route(results, (route) => route.continue({ postData: route.request().postData()!.replace('"9.99"', '"not a number"') }));
  const saved = page.waitForResponse((r) => r.url().endsWith('/results') && r.status() === 400);
  await reading(row(page, 'WIDTH')).fill('9.99');
  await reading(row(page, 'THICK')).fill('6.2');
  await reading(row(page, 'THICK')).blur();
  const refused = await (await saved).json();
  expect(refused.error.code).toBe('RESULT_INVALID');
  await page.unroute(results);
  await expect(reading(row(page, 'WIDTH'))).toHaveAttribute('aria-invalid', 'true');
  await expect(row(page, 'WIDTH')).toContainText(refused.error.fields[0].message);
  await expect(reading(row(page, 'WIDTH'))).toHaveValue('9.99');
  await expect(reading(row(page, 'THICK'))).toHaveAttribute('aria-invalid', 'false');

  // The other value goes through on the retry without the refused one
  await expect
    .poll(
      async () => {
        const tech = await apiAs('tech2');
        const test_ = await tech.get(`/tests/${sampleTestIds[0]}`);
        await tech.dispose();
        return test_.results.find((r: { code: string }) => r.code === 'THICK').numericValue;
      },
      { timeout: 15_000 },
    )
    .toMatch(/^6\.2/);

  // Correcting it clears the message and saves
  await reading(row(page, 'WIDTH')).fill('12.5');
  await reading(row(page, 'WIDTH')).blur();
  await expect(reading(row(page, 'WIDTH'))).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await expect(reading(row(page, 'WIDTH'))).toHaveValue('12.50');
});

test('a planner without tests.viewAll can still cancel a test from the job page', async ({ page }) => {
  // No demo role can cancel without also holding tests.viewAll, so the session is narrowed for this one check.
  const { job, sample } = await plannedJob(['DEN', 'FP'], { assign: false });
  await page.route('**/api/v1/auth/*', async (route) => {
    const res = await route.fetch();
    if (route.request().method() === 'OPTIONS' || !res.ok()) return route.fulfill({ response: res });
    const body = await res.json();
    const narrow = (u: { permissions: string[] }) => ({ ...u, permissions: u.permissions.filter((p) => p !== 'tests.viewAll') });
    return route.fulfill({ response: res, json: body.user ? { ...body, user: narrow(body.user) } : narrow(body) });
  });
  let readTest = false;
  page.on('request', (r) => {
    if (/\/tests\/[0-9a-f-]{36}$/.test(r.url())) readTest = true;
  });
  await signIn(page, 'planner');
  await page.goto(`/samples/jobs/${job.id}`);
  await page.getByRole('button', { name: `Cancel FP on ${sample.sampleNo}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByLabel(/Reason/).fill('Customer withdrew this test');
  await dialog.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByRole('table', { name: `Tests on ${sample.sampleNo}` }).getByRole('row', { name: /FP/ })).toContainText('Cancelled');
  expect(readTest).toBe(false);
});

test('cancelling shows the effect first, and blockers stop it', async ({ page }) => {
  const { job } = await plannedJob(['FP', 'DEN'], { samples: 2, assign: false });
  await signIn(page, 'planner');
  await page.goto(`/samples/jobs/${job.id}`);

  // One test, from the job page
  const first = job.samples[0];
  await page.getByRole('button', { name: `Cancel FP on ${first.sampleNo}` }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/^Tests \(1\)/)).toBeVisible();
  await expect(dialog).toContainText('Flash Point');
  await expect(dialog.getByLabel(/Reason/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByLabel(/Reason/).fill('Customer withdrew this test');
  await dialog.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByRole('table', { name: `Tests on ${first.sampleNo}` }).getByRole('row', { name: /FP/ })).toContainText('Cancelled');
  await expect(page.getByRole('button', { name: `Cancel FP on ${first.sampleNo}` })).toHaveCount(0);

  // One sample
  const second = job.samples[1];
  await page
    .getByRole('region', { name: `Sample ${second.sampleNo}` })
    .getByRole('button', { name: 'Cancel sample' })
    .click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/^Samples \(1\)/)).toBeVisible();
  await expect(dialog.getByText(/^Tests \(2\)/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByLabel(/Reason/).fill('Sample damaged');
  await dialog.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByRole('region', { name: `Sample ${second.sampleNo}` })).toContainText('Cancelled');

  // A test from planning
  await page.goto(`/planning?view=unassigned&jobId=${job.id}`);
  await page.getByRole('button', { name: `Cancel DEN on ${first.sampleNo}` }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Density');
  await dialog.getByRole('button', { name: 'Keep it' }).click();

  // The whole job
  await page.goto(`/samples/jobs/${job.id}`);
  await page.getByRole('button', { name: 'Cancel job' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/^Samples \(1\)/)).toBeVisible();
  await shot(page, 'cancel-effect');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByLabel(/Reason/).fill('Order withdrawn');
  await dialog.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cancelled');
  await expect(page.getByText('Cancelled: Order withdrawn')).toBeVisible();

  // An issued report blocks it
  const finished = await issuedJob();
  await page.goto(`/samples/jobs/${finished.job.id}`);
  // A completed job cannot be cancelled at all, so its button is gone; its sample shows why.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Completed');
  await expect(page.getByRole('button', { name: 'Cancel job' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel sample' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText(/have been approved or issued/);
  await expect(dialog.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('notifications: bell, mark read, and email preferences', async ({ page }) => {
  // Two assignments: "Mark all read" is disabled once nothing is unread, so one must remain after the first is marked.
  const { sample } = await plannedJob(['DEN', 'FP']);
  await signIn(page, 'tech');
  const bell = page.getByRole('button', { name: /^Notifications/ });
  await expect(bell).toHaveAccessibleName(/\d+ unread/);
  await bell.click();
  const panel = page.getByRole('region', { name: 'Notifications' });
  const item = panel.getByRole('listitem').filter({ hasText: `Assigned: Density on ${sample.sampleNo}` });
  await expect(item).toContainText('Unread');
  await item.getByRole('button', { name: /^Mark read/ }).click();
  await expect(item).not.toContainText('Unread');
  await expect(item.getByRole('button', { name: /^Mark read/ })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Mark all read' }).click();
  await expect(bell).toHaveAccessibleName('Notifications');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(bell).toBeFocused();

  await page.goto('/account');
  const preferences = page.getByRole('checkbox').first();
  const before = await preferences.getAttribute('data-state');
  await preferences.click();
  await expect(page.getByText('Email preferences saved').first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox').first()).not.toHaveAttribute('data-state', before!);
  await page.getByRole('checkbox').first().click();
  await expect(page.getByText('Email preferences saved').first()).toBeVisible();
});

test('a required password change offers nothing else', async ({ page }) => {
  const admin = await apiAs('admin');
  const roles = (await admin.get('/admin/roles')) as { id: string; name: string }[];
  const email = `${unique('temp').toLowerCase()}@demo.example`;
  await admin.post('/admin/users', { email, name: 'Temp Technician', password: DEMO_PASSWORD, roleIds: [roles.find((r) => r.name === 'Technician / Analyst')!.id] });
  await admin.dispose();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/change-password$/);
  await expect(nav(page)).toHaveCount(0);
  await page.goto('/my-tests');
  await expect(page).toHaveURL(/\/change-password$/);
  const fresh = 'Fresh-Password-2!';
  await page.getByLabel('Current password').fill(DEMO_PASSWORD);
  await page.getByLabel(/^New password/).fill(fresh);
  await page.getByLabel('Repeat new password').fill('something else');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('The passwords do not match')).toBeVisible();
  await page.getByLabel('Repeat new password').fill(fresh);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Sign in with your new password')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(fresh);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(nav(page).getByRole('link', { name: 'My Tests' })).toBeVisible();
});

test('reception books from an accepted quotation without seeing quotations', async ({ page }) => {
  const sales = await apiAs('sales');
  const customer = (await sales.get('/customers?q=Contoso')).data[0];
  const tests = (await sales.get('/masters/tests?pageSize=200')).data as { id: string; code: string }[];
  let quotation = await sales.post('/quotations', { customerId: customer.id, lines: [{ sampleDescription: unique('Quoted oil'), testId: tests.find((t) => t.code === 'FP')!.id, quantity: 1 }] });
  quotation = await sales.post(`/quotations/${quotation.id}/send`, { version: quotation.version, to: 'buyer@customer.example' });
  quotation = await sales.post(`/quotations/${quotation.id}/accept`, { version: quotation.version });
  await sales.dispose();

  await signIn(page, 'reception');
  await expect(nav(page).getByRole('link', { name: 'Quotations' })).toHaveCount(0);
  await expect(nav(page).getByRole('link')).toHaveText(['Dashboard', 'Samples', 'Reports', 'Customers', 'Masters']);
  await page.getByRole('link', { name: 'Samples' }).click();
  await page.getByRole('button', { name: 'Book samples' }).click();
  const list = page.getByRole('region', { name: 'Book from an accepted quotation' });
  await expect(list).toContainText(quotation.quotationNo);
  await expect(page.getByRole('region', { name: 'Book without a quotation' })).toBeVisible();
  await expect(list.getByRole('link')).toHaveCount(0);
  await list.getByRole('button', { name: `Book job from ${quotation.quotationNo}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Book job' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('JOB');
  await expect(page.getByRole('link', { name: 'Open quotation' })).toHaveCount(0);
  await expect(page.getByText('Not planned yet').first()).toBeVisible();
});

test('samples filter by urgency and returnability; assignment sends the versions seen', async ({ page }) => {
  const { job, sample } = await plannedJob(['DEN'], { urgent: true, assign: false });
  await signIn(page, 'planner');
  await page.goto(`/samples?tab=samples&q=${encodeURIComponent(sample.sampleNo)}`);
  const table = page.getByRole('table', { name: 'Samples' });
  await expect(table).toContainText(sample.sampleNo);
  await page.getByLabel('Urgent filter').selectOption('false');
  await expect(table.locator('..').locator('..')).toContainText('No samples found');
  await page.getByLabel('Urgent filter').selectOption('true');
  await expect(table).toContainText(sample.sampleNo);
  await page.getByLabel('Returnable filter').selectOption('true');
  await expect(table.locator('..').locator('..')).toContainText('No samples found');
  await page.getByLabel('Returnable filter').selectOption('false');
  await expect(table).toContainText(sample.sampleNo);

  await page.goto(`/planning?view=unassigned&jobId=${job.id}`);
  await page
    .getByRole('row', { name: new RegExp(sample.sampleNo) })
    .getByRole('checkbox')
    .click();
  await page.getByRole('button', { name: 'Assign' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Tara Technician' }).check();
  const sent = page.waitForRequest((r) => r.url().endsWith('/planning/assign'));
  await dialog.getByRole('button', { name: 'Assign' }).click();
  const body = (await sent).postDataJSON();
  expect(Object.keys(body.versions)).toEqual(body.sampleTestIds);
  await expect(page.getByText(/1 test assigned/)).toBeVisible();
});

test('an admin uploads a signature image for a user', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin');
  await page
    .getByLabel(/Search/)
    .first()
    .fill('tech2@demo.example');
  await page.getByRole('row', { name: /tech2@demo.example/ }).click();
  const dialog = page.getByRole('dialog');
  const section = dialog.getByRole('region', { name: 'Signature image' });
  await expect(section).toBeVisible();
  await section.getByLabel(/Upload a signature image/).setInputFiles({ name: 'signature.png', mimeType: 'image/png', buffer: PNG });
  await expect(section).toContainText('Signature on file');
  await expect(section.getByRole('img')).toHaveJSProperty('complete', true);
  await expect.poll(() => section.getByRole('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(section.getByRole('button', { name: 'Replace signature' })).toBeVisible();
  // The dialog carries the new version, so saving after uploading is not refused.
  await dialog.getByRole('button', { name: 'Save user' }).click();
  await expect(page.getByText('User saved').first()).toBeVisible();
});
