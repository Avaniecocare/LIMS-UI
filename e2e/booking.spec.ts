import { expect, test, type Locator, type Page } from '@playwright/test';
import { signIn, unique } from './helpers';

// A fake camera, so the capture flow runs for real without hardware.
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['camera'] });

const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/screens/${name}.png`, fullPage: true });

async function pick(page: Page, label: RegExp, text: string) {
  await page.getByRole('combobox', { name: label }).fill(text);
  await page.getByRole('option', { name: new RegExp(text) }).first().click();
}

/** Clicks a document button: a tab opens at once, then goes to the signed link when the worker finishes. */
async function expectDocumentOpens(page: Page, button: Locator) {
  const opened = page.context().waitForEvent('page');
  await button.click();
  const tab = await opened;
  // Headless Chromium has no PDF viewer, so the inline PDF arrives as a download. A failed job closes the tab.
  const outcome = await new Promise<string>((resolve) => {
    tab.once('download', () => resolve('opened'));
    tab.once('close', () => resolve('failed'));
    tab.on('framenavigated', (frame) => frame.url().startsWith('http') && resolve('opened'));
  });
  expect(outcome).toBe('opened');
  if (!tab.isClosed()) await tab.close();
}

/** A JPEG the size of a real page photo: noise does not compress. */
async function letterPage(page: Page, name: string) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(400, 400);
    for (let i = 0; i < img.data.length; i++) img.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  });
  return { name, mimeType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };
}

/**
 * Sends keys the way a keyboard-mode scanner does, with no field focused. They are dispatched in the
 * page because Playwright's own typing can pause longer than a scanner while the page is busy.
 */
async function scan(page: Page, code: string) {
  await page.evaluate((text) => {
    (document.activeElement as HTMLElement | null)?.blur();
    for (const key of [...text, 'Enter']) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }, code);
}

test('order to quotation to job, then plan and assign', async ({ page }) => {
  await signIn(page, 'sales');
  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByRole('group', { name: 'Filter by stage' }).getByRole('button', { name: /New \d+/ })).toBeVisible();

  // Order
  const reference = unique('REF');
  await page.getByRole('button', { name: 'New order' }).click();
  await page.getByRole('button', { name: 'Save order' }).click();
  await expect(page.getByText('Choose a customer')).toBeVisible();
  await pick(page, /^Customer/, 'Contoso');
  await page.getByLabel('Source').selectOption('LETTER');
  await page.getByLabel('Reference').fill(reference);
  await page.getByLabel('Owner').selectOption({ label: 'Sameer Sales' });
  await page.getByRole('button', { name: 'Save order' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ORD', { ignoreCase: true });
  await expect(page.getByLabel('Stage')).toHaveValue('NEW');
  await expect(page.getByRole('table', { name: 'Quotations for this order' }).locator('..')).toContainText('No quotations for this order yet');

  // Quotation editor, keyboard first
  await page.getByRole('link', { name: 'Create quotation' }).click();
  await expect(page.getByRole('heading', { name: 'New quotation' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /^Customer/ })).toHaveValue(/Contoso/);
  await expect(page.getByLabel('Order', { exact: true })).not.toHaveValue('');
  await page.getByLabel('Line 1 sample description').fill('Fuel oil drum');
  await page.getByLabel('Line 1 required quantity').fill('2 L');
  await page.getByLabel('Line 1 test').selectOption({ label: 'FP — Flash Point (COC)' });
  await page.getByLabel('Line 1 quantity').press('Enter');
  await expect(page.getByLabel('Line 2 test')).toBeFocused();
  await expect(page.getByLabel('Line 2 sample description')).toHaveValue('Fuel oil drum');
  await page.getByLabel('Line 2 test').selectOption({ label: 'DEN — Density' });
  await page.getByLabel('Line 2 discount percent').fill('10');
  await page.getByRole('button', { name: 'Save draft' }).click();

  // Totals come back from the server
  const totals = page.getByLabel('Totals');
  await expect(totals).toContainText('Subtotal');
  await expect(totals).toContainText('Grand total');
  await expect(totals).toContainText('Round-off');
  await expect(totals).toContainText(/IGST|CGST/);
  await expect(page.getByRole('table', { name: 'Lines of version 1' })).toContainText('Standard');
  await expect(page.getByText(/ Only\.?$/i).first()).toBeVisible();
  await shot(page, 'quotation-editor');

  // Rate override needs a reason, and the server says so
  await page.getByLabel('Line 1 rate override').fill('1234.50');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(/Give a reason for overriding/)).toBeVisible();
  await page.getByLabel('Line 1 override reason').fill('Agreed by phone');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('table', { name: 'Lines of version 1' })).toContainText('Override');

  // Detail: send, revise, send, accept, convert
  await page.getByRole('link', { name: 'Open quotation' }).click();
  await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const send = page.getByRole('dialog');
  await expect(send.getByLabel('To')).toHaveValue('rohan@contoso.example');
  await send.getByLabel('Message').fill('Please find the quotation attached.');
  await send.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();

  await page.getByRole('button', { name: 'Revise' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('Customer asked for a change');
  await page.getByRole('dialog').getByRole('button', { name: 'Revise' }).click();
  await expect(page.getByRole('heading', { name: 'Version 2 (current)' })).toBeVisible();
  await page.getByRole('tab', { name: /Version history/ }).click();
  await expect(page.getByRole('table', { name: 'Lines of version 1' })).toBeVisible();
  await page.getByRole('tab', { name: 'Current version' }).click();
  await expect(page.getByText('Customer asked for a change')).toBeVisible();

  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expectDocumentOpens(page, page.getByRole('button', { name: 'PDF' }));
  await page.getByRole('tab', { name: 'Sent' }).click();
  await expect(page.getByRole('table', { name: 'Email delivery log' })).toContainText('rohan@contoso.example');
  await page.getByRole('tab', { name: 'Status history' }).click();
  await expect(page.getByText('Customer asked for a change')).toBeVisible();

  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByRole('button', { name: 'Convert to job' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revise' })).toHaveCount(0);
  await shot(page, 'quotation-detail');
  await page.getByRole('button', { name: 'Convert to job' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Convert to job' }).click();

  // Job
  await expect(page).toHaveURL(/\/samples\/jobs\//);
  const jobUrl = new URL(page.url()).pathname;
  const jobId = jobUrl.split('/').pop()!;
  const sampleCard = page.getByRole('region', { name: /^Sample / });
  await expect(sampleCard).toHaveCount(1);
  await expect(sampleCard).toContainText('Fuel oil drum');
  await expect(sampleCard.getByRole('table')).toContainText('Flash Point');
  await expect(sampleCard.getByRole('table')).toContainText('Density');
  await expect(page.getByRole('link', { name: 'Open quotation' })).toBeVisible();

  // Documents, produced by the worker
  await page.getByRole('tab', { name: 'Documents' }).click();
  await expectDocumentOpens(page, page.getByRole('button', { name: 'Sample request form' }));
  await expectDocumentOpens(page, page.getByRole('button', { name: 'Acknowledgement', exact: true }));
  await expectDocumentOpens(page, page.getByRole('button', { name: 'All labels' }));
  await expect(page.getByText(/^SRF /)).toBeVisible();

  // Plan as the planner
  await signIn(page, 'planner');
  await page.goto(`/planning?jobId=${jobId}`);
  const table = page.getByRole('table', { name: 'Tests to plan' });
  await expect(table.getByRole('row')).toHaveCount(3);
  await table.getByRole('checkbox', { name: 'Select all on this page' }).click();
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  const plan = page.getByRole('dialog');
  await expect(plan.getByRole('group', { name: 'Test FP' })).toContainText('Flash point');
  await expect(plan.getByRole('group', { name: 'Test DEN' })).toContainText('Density');
  await plan.getByLabel('Grade / specification').selectOption({ label: 'DEMO-FUEL — Demo fuel oil grade' });
  await plan.getByRole('button', { name: 'Suggest tests' }).click();
  await expect(plan.getByRole('group', { name: 'Test KV40' })).toBeVisible();
  await plan.getByRole('button', { name: 'Remove KV40' }).click();
  await plan.getByRole('button', { name: 'Remove MOIST' }).click();
  await expect(plan.getByRole('group', { name: 'Test FP' }).getByLabel('Analysis mode')).toHaveCount(0);
  await plan.getByLabel('Add a test').selectOption({ label: 'GCMS — Qualitative Analysis (GC-MSD)' });
  await plan.getByRole('group', { name: 'Test FP' }).getByLabel('Office instructions').fill('Handle with care');
  await shot(page, 'plan-dialog');
  await plan.getByRole('button', { name: 'Create plan' }).click();
  await expect(page.getByText(/Plan .* created/)).toBeVisible();

  // Assign with workload shown
  await page.getByRole('tab', { name: 'Unassigned' }).click();
  await expect(table.getByRole('row')).toHaveCount(4);
  await table.getByRole('checkbox', { name: 'Select all on this page' }).click();
  await page.getByRole('button', { name: 'Assign', exact: true }).click();
  const assign = page.getByRole('dialog');
  await expect(assign.getByRole('table', { name: 'Technician workload' })).toContainText('Tara Technician');
  await expect(assign.getByRole('table', { name: 'Instrument workload' })).toContainText('Calibration overdue');
  await assign.getByRole('radio', { name: /IMP-01/ }).check();
  await expect(assign.getByRole('alert')).toContainText('overdue');
  await assign.getByRole('radio', { name: /VISC-01/ }).check();
  await assign.getByRole('radio', { name: 'Tara Technician' }).check();
  await shot(page, 'assign-dialog');
  await assign.getByRole('button', { name: 'Assign' }).click();
  await expect(page.getByText('3 tests assigned')).toBeVisible();

  // Reassign the same way, then the job card
  await page.getByRole('tab', { name: 'Assigned', exact: true }).click();
  await expect(table.getByRole('row')).toHaveCount(4);
  await expect(table).toContainText('Tara Technician');
  await shot(page, 'planning');
  await table.getByRole('row').nth(1).getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Reassign' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'Tushar Technician' }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Reassign' }).click();
  await expect(table).toContainText('Tushar Technician');
  await expectDocumentOpens(page, page.getByRole('button', { name: 'Job card' }));

  // Timeline shows every stage on the job
  await page.goto(jobUrl);
  await page.getByRole('tab', { name: 'Timeline' }).click();
  const timeline = page.getByRole('list', { name: 'Job timeline' });
  await expect(timeline).toContainText('Received');
  await expect(timeline).toContainText('Assigned');
});

test('booking without a quotation, deviations, camera, letter and scanning', async ({ page }) => {
  await signIn(page, 'reception');
  await expect(page.getByRole('link', { name: 'Quotations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Orders' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Samples' }).click();
  await page.getByRole('button', { name: 'Book samples' }).click();

  // The client catches the missing reason at once
  await page.getByRole('button', { name: 'Book job', exact: true }).click();
  await expect(page.getByText('Say why there is no quotation')).toBeVisible();

  await pick(page, /^Customer/, 'Contoso');
  await expect(page.getByLabel('Contact email')).toHaveValue('rohan@contoso.example');
  await expect(page.getByLabel('Kind attention')).toHaveValue('Rohan Shah');
  await page.getByLabel('Reason for no quotation').fill('Walk-in customer, urgent retest');
  await page.getByLabel('Letter / challan reference').fill(unique('CH'));
  await page.getByLabel('Receipt mode').selectOption({ label: 'By hand' });
  await page.getByLabel('Urgent').click();

  const description = unique('Steel coupon');
  const first = page.getByRole('region', { name: 'Sample 1' });
  await first.getByLabel('Description').fill(description);
  await first.getByLabel('Condition').fill('Sealed');
  await first.getByLabel('Returnable').click();
  await first.getByRole('button', { name: 'Add attribute' }).click();
  await first.getByLabel('Attribute 1 label').fill('Heat no');
  await first.getByLabel('Attribute 1 value').fill('H-1001');
  await first.getByLabel('Filter requested tests').fill('flash');
  await first.getByRole('checkbox', { name: /Flash Point/ }).click();

  await page.getByRole('button', { name: 'Add sample' }).click();
  const second = page.getByRole('region', { name: 'Sample 2' });
  await second.getByLabel('Description').fill(`${description} B`);

  await page.getByRole('button', { name: 'Add deviation' }).click();
  await page.getByLabel('Type').selectOption({ index: 1 });
  await page.getByLabel('Applies to').selectOption({ label: `Sample 1 — ${description}` });
  await page.getByLabel('Remark').fill('Seal was damaged');
  await shot(page, 'booking');
  await page.getByRole('button', { name: 'Book job', exact: true }).click();

  await expect(page).toHaveURL(/\/samples\/jobs\//);
  const jobId = new URL(page.url()).pathname.split('/').pop()!;
  await expect(page.getByText('Booked without a quotation: Walk-in customer, urgent retest')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Urgent');
  const firstCard = page.getByRole('region', { name: /^Sample / }).first();
  await expect(firstCard).toContainText('H-1001');
  await expect(page.getByText('Seal was damaged')).toBeVisible();
  const sampleNo = (await firstCard.locator('h3').first().innerText()).split(/\s/)[0];
  await shot(page, 'job-detail');

  // Edit a sample, with optimistic concurrency from the loaded version
  await firstCard.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByLabel('Condition').fill('Seal broken on arrival');
  await page.getByRole('button', { name: 'Save sample' }).click();
  await expect(firstCard).toContainText('Seal broken on arrival');

  // Webcam capture to sample images
  await firstCard.getByRole('button', { name: 'Use camera' }).click();
  const camera = page.getByRole('dialog');
  await expect(camera.getByRole('button', { name: 'Capture', exact: true })).toBeVisible();
  await expect.poll(() => camera.getByLabel('Camera preview').evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  await camera.getByRole('button', { name: 'Capture', exact: true }).click();
  await expect(camera.getByRole('status')).toContainText('1 image ready');
  await shot(page, 'webcam');
  await camera.getByRole('button', { name: /Save 1 image/ }).click();
  await expect(firstCard.getByRole('button', { name: /^capture-.*\.jpg$/ })).toBeVisible();

  // Add a deviation after booking
  await page.getByRole('button', { name: 'Add deviation' }).click();
  await page.getByRole('dialog').getByLabel('Type').selectOption({ index: 1 });
  await page.getByRole('dialog').getByRole('button', { name: 'Add deviation' }).click();
  await expect(page.getByRole('heading', { name: 'Deviations (2)' })).toBeVisible();

  // Header fields and hold / release
  await page.getByRole('tab', { name: 'Job details' }).click();
  await page.getByLabel('PO number').fill('PO-77');
  await page.getByRole('button', { name: 'Save job details' }).click();
  await expect(page.getByText('Job saved')).toBeVisible();
  await page.getByRole('button', { name: 'Put on hold' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Put on hold' }).isDisabled();
  await page.getByRole('dialog').getByLabel('Reason').fill('Awaiting customer reply');
  await page.getByRole('dialog').getByRole('button', { name: 'Put on hold' }).click();
  await expect(page.getByText('On hold: Awaiting customer reply')).toBeVisible();
  await page.getByRole('button', { name: 'Release hold' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Release hold' }).click();
  await expect(page.getByRole('button', { name: 'Put on hold' })).toBeVisible();

  // Letter pages captured and combined; labels; email acknowledgement
  await page.getByRole('tab', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'Capture pages' }).click();
  const pages = page.getByRole('dialog');
  await expect(pages.getByRole('button', { name: 'Capture', exact: true })).toBeVisible();
  await expect.poll(() => pages.getByLabel('Camera preview').evaluate((v: HTMLVideoElement) => v.videoWidth)).toBeGreaterThan(0);
  // The fake camera's frames are tiny, so real-sized pages go in through the file fallback.
  await pages.getByLabel('Choose image files for Capture letter pages').setInputFiles([await letterPage(page, 'page-1.jpg'), await letterPage(page, 'page-2.jpg')]);
  await expect(pages.getByRole('status')).toContainText('2 images ready');
  await pages.getByRole('button', { name: /Save 2 images/ }).click();
  await expect(page.getByRole('button', { name: /^page-\d\.jpg$/ })).toHaveCount(2);
  await expectDocumentOpens(page, page.getByRole('button', { name: 'Combine pages into PDF' }));
  await expect(page.getByRole('button', { name: 'Customer letter.pdf', exact: true })).toBeVisible();
  await page.locator('input[aria-label="Upload to Scanned letter (PDF)"]').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') });
  await expect(page.getByRole('button', { name: 'scan.pdf', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Email acknowledgement' }).click();
  await expect(page.getByRole('dialog').getByLabel('To')).toHaveValue('rohan@contoso.example');
  await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Acknowledgement queued')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Email delivery log' })).toContainText('rohan@contoso.example', { timeout: 60_000 });
  await shot(page, 'job-documents');
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByText('Job.update')).toBeVisible();

  // A scan from any screen, with no field focused, lands on the sample
  await page.getByRole('link', { name: 'Home' }).click();
  await scan(page, sampleNo);
  await expect(page).toHaveURL(new RegExp(`/samples/jobs/${jobId}\\?sample=`));
  const selected = page.getByRole('region', { name: `Sample ${sampleNo}` });
  await expect(selected).toHaveAttribute('aria-current', 'true');
  await expect(selected).toContainText('Selected');
  await expect(selected).toBeInViewport();

  // A scan into the search box too, and into another field it stays typing
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Samples' }).click();
  await page.getByRole('tab', { name: 'Samples' }).click();
  await page.getByLabel('Search samples').fill('zz');
  await page.keyboard.type('Q-1');
  await expect(page.getByLabel('Search samples')).toHaveValue('zzQ-1');
  await expect(page).toHaveURL(/\/samples\?/);
  await page.getByLabel('Search samples').fill('');

  const search = page.getByRole('combobox', { name: 'Search or scan' });
  await search.fill(sampleNo);
  await search.press('Enter');
  await expect(page.getByRole('region', { name: `Sample ${sampleNo}` })).toHaveAttribute('aria-current', 'true');

  // Unknown code: tells the user, from the search box as well as globally
  await scan(page, 'NO-SUCH-CODE-1');
  await expect(page.getByRole('listbox', { name: 'Search results' })).toContainText('Nothing found');
  await expect(search).toHaveValue('NO-SUCH-CODE-1');
  await search.press('Escape');
  await expect(page.getByRole('listbox', { name: 'Search results' })).toBeHidden();

  // Search dropdown with the keyboard
  await search.fill('Contoso');
  const option = page.getByRole('option', { name: /Contoso Forgings/ });
  await expect(option).toBeVisible();
  await shot(page, 'search');
  await search.press('ArrowDown');
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/customers\//);
});

test('a planner never sees the customer', async ({ page }) => {
  await signIn(page, 'reception');
  await page.goto('/samples/new');
  await pick(page, /^Customer/, 'Contoso');
  await page.getByLabel('Reason for no quotation').fill('Impartiality check');
  await page.getByLabel('Letter / challan reference').fill('SECRET-LETTER');
  const description = unique('Blind sample');
  await page.getByRole('region', { name: 'Sample 1' }).getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Book job', exact: true }).click();
  await expect(page).toHaveURL(/\/samples\/jobs\//);
  await expect(page.getByText('Booked without a quotation: Impartiality check')).toBeVisible();
  const jobPath = new URL(page.url()).pathname;
  const jobId = jobPath.split('/').pop()!;
  const sampleNo = (await page.getByRole('region', { name: /^Sample / }).first().locator('h3').first().innerText()).split(/\s/)[0];

  await signIn(page, 'planner');
  await expect(page.getByRole('link', { name: 'Customers' })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Samples' }).click();
  const jobs = page.getByRole('table', { name: 'Jobs' });
  await expect(jobs.getByRole('row').nth(1)).toBeVisible();
  await expect(jobs.getByRole('columnheader', { name: 'Customer' })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Contoso');
  await page.getByRole('tab', { name: 'Samples' }).click();
  await expect(page.getByRole('table', { name: 'Samples' }).getByRole('columnheader', { name: 'Customer' })).toHaveCount(0);

  await page.goto(jobPath);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Sample / })).toContainText(description);
  await expect(page.locator('main')).not.toContainText('Contoso');
  await expect(page.locator('main')).not.toContainText('DEMO-0002');
  await page.getByRole('tab', { name: 'Job details' }).click();
  await expect(page.getByLabel('Material specification')).toBeVisible();
  await expect(page.getByLabel('Kind attention')).toHaveCount(0);
  await expect(page.getByLabel('PO number')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('SECRET-LETTER');
  await shot(page, 'planner-job');

  // A sample with no requested tests can still be planned from the job.
  await page.goto(`/planning?jobId=${jobId}`);
  await expect(page.getByRole('table', { name: 'Tests to plan' }).locator('..')).toContainText('No tests waiting to be planned');
  await page.getByRole('button', { name: 'Plan samples' }).click();
  const plan = page.getByRole('dialog');
  await expect(plan.getByRole('checkbox', { name: new RegExp(sampleNo) })).toBeChecked();
  await expect(plan.getByRole('button', { name: 'Create plan' })).toBeDisabled();
  await plan.getByLabel('Test or chemical group').selectOption({ index: 1 });
  await plan.getByRole('button', { name: 'Suggest tests' }).click();
  await expect(plan.getByRole('group', { name: /^Test / }).first()).toBeVisible();
  await plan.getByRole('button', { name: 'Create plan' }).click();
  await expect(page.getByText(/Plan .* created/)).toBeVisible();
  await page.getByRole('tab', { name: 'Unassigned' }).click();
  await expect(page.getByRole('table', { name: 'Tests to plan' }).getByRole('row').nth(1)).toBeVisible();

  // Searching by name finds nothing for this role, while the sample number works.
  const search = page.getByRole('combobox', { name: 'Search or scan' });
  await search.fill('Contoso');
  await expect(page.getByRole('listbox', { name: 'Search results' })).toContainText('Nothing found');
  await search.fill('');
  await page.getByRole('link', { name: 'Home' }).click();
  await scan(page, sampleNo);
  await expect(page).toHaveURL(new RegExp(`/samples/jobs/${jobId}`));
  await expect(page.locator('main')).not.toContainText('Contoso');
});

test('a technician can scan, but only reaches their own work', async ({ page }) => {
  await signIn(page, 'tech');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Samples' })).toHaveCount(0);
  await scan(page, 'NOT-MY-SAMPLE');
  await expect(page.getByRole('listbox', { name: 'Search results' })).toContainText('Nothing found');
});
