import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { apiAs, issuedJob, signIn, unique } from './helpers';

// The API server runs with EINVOICE_PROVIDER=mock locally and in CI: test IRNs, nothing leaves the machine.
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** A valid GSTIN in the given state (GSTN mod-36 check character). */
function gstin(stateCode: string): string {
  const pan = `AB${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}E${String(Math.floor(Math.random() * 9000) + 1000)}F`;
  const first14 = `${stateCode}${pan}1Z`;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return first14 + CHARS[(36 - (sum % 36)) % 36];
}

/** A real PIN code in the lab's state, so the test document is one the IRP would accept. */
const PIN_IN: Record<string, { pin: string; city: string }> = {
  '09': { pin: '201301', city: 'Noida' },
  '27': { pin: '411026', city: 'Pune' },
  '29': { pin: '560058', city: 'Bengaluru' },
  '07': { pin: '110020', city: 'New Delhi' },
};

let restore: (() => Promise<void>) | null = null;

test.beforeAll(async () => {
  const admin = await apiAs('admin');
  const mods = await admin.get('/admin/lab/modules');
  const wasOn = mods.modules.find((m: { key: string }) => m.key === 'einvoice')?.enabled ?? false;
  await admin.put('/admin/lab/modules', { version: mods.version, enabled: { einvoice: true } });
  const settings = (await admin.get('/admin/settings')) as { key: string; value: Record<string, string>; version: number }[];
  const formats = settings.find((s) => s.key === 'numbering.formats')!;
  const saved = await admin.put('/admin/settings/numbering.formats', {
    value: { ...formats.value, INVOICE: '{PREFIX}/{FY}/{SEQ:5}', CREDIT_NOTE: '{PREFIX}/CN{FY}/{SEQ:4}' },
    version: formats.version,
  });
  const ei = await admin.get('/admin/lab/einvoice');
  await admin.put('/admin/lab/einvoice', {
    seller: { line1: 'Plot 4, Industrial Estate', line2: '', city: 'Pune', pincode: '411019' },
    autoOnIssue: true,
    sellerVersion: ei.sellerVersion,
    autoOnIssueVersion: ei.autoOnIssueVersion,
  });
  const formatsVersion = (saved as { key: string; version: number }[]).find((s) => s.key === 'numbering.formats')!.version;
  await admin.dispose();
  restore = async () => {
    const a = await apiAs('admin');
    await a.put('/admin/settings/numbering.formats', { value: formats.value, version: formatsVersion });
    const m = await a.get('/admin/lab/modules');
    await a.put('/admin/lab/modules', { version: m.version, enabled: { einvoice: wasOn } });
    await a.dispose();
  };
});
test.afterAll(async () => restore?.());

test('a B2B invoice is registered when issued: IRN, QR code, test marking, and cancelling with the GST portal reason', async ({ page }) => {
  const admin = await apiAs('admin');
  const company = await admin.get('/admin/company');
  await admin.dispose();
  const sales = await apiAs('sales');
  const customer = await sales.post('/customers', {
    name: `GST ${unique('Buyer')}`,
    gstin: gstin(company.gstStateCode),
    stateName: company.stateName,
    stateCode: company.gstStateCode,
    creditDays: 30,
    withholdReportUntilPaid: false,
    addresses: [
      {
        kind: 'BILLING',
        line1: '7 Industrial Area',
        city: (PIN_IN[company.gstStateCode] ?? PIN_IN['27']).city,
        stateName: company.stateName,
        stateCode: company.gstStateCode,
        pincode: (PIN_IN[company.gstStateCode] ?? PIN_IN['27']).pin,
      },
    ],
    contacts: [{ name: 'Ravi Buyer', email: 'ravi@buyer.example', isPrimary: true }],
  });
  await sales.dispose();
  const { job } = await issuedJob({ customerId: customer.id });
  const accounts = await apiAs('accounts');
  const draft = await accounts.post('/invoices', { customerId: customer.id, jobIds: [job.id] });
  const issued = await accounts.post(`/invoices/${draft.id}/issue`, { version: draft.version });
  await accounts.dispose();
  expect(issued.einvoice.status).toBe('GENERATED');

  await signIn(page, 'accounts');
  await page.goto(`/invoices/${issued.id}`);
  const panel = page.getByRole('region', { name: /GST e-invoice/ });
  await expect(panel.getByRole('heading', { name: /GST e-invoice/ })).toBeVisible();
  await expect(panel.getByText('Test IRN', { exact: true })).toBeVisible();
  await expect(panel.getByText(/not valid for GST/)).toBeVisible();
  await expect(panel.getByText(issued.einvoice.irn)).toBeVisible();
  await expect(panel.getByRole('img', { name: 'Signed QR code of the e-invoice' })).toBeVisible();
  await expect(panel.getByText(/can be cancelled with the invoice until/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include('[aria-labelledby="einvoice-title"]').analyze()).violations).toEqual([]);
  await expect(page.getByRole('button', { name: 'Email', exact: true })).toBeVisible();

  // Cancelling asks for the GST portal's reason as well as the lab's own
  await page.getByRole('button', { name: 'Cancel invoice' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Reason for the GST portal')).toBeVisible();
  await dialog.locator('#reason-input').fill('Billed to the wrong branch');
  await dialog.getByLabel('Reason for the GST portal').selectOption({ label: 'Data entry mistake' });
  await dialog.getByRole('button', { name: 'Cancel invoice' }).click();
  await expect(panel.getByText('IRN cancelled', { exact: true })).toBeVisible();
  await expect(panel.getByText(/Data entry mistake: Billed to the wrong branch/)).toBeVisible();
});

test('the E-invoicing admin tab shows what the server is set up for and that nothing is missing', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin?tab=einvoice');
  await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  await expect(page.getByText(/Test IRNs made on this server/)).toBeVisible();
  await expect(page.getByText('Nothing is stopping registration.')).toBeVisible();
  await expect(page.getByLabel('PIN code')).toHaveValue('411019');
  await page.getByLabel('PIN code').fill('0123');
  await expect(page.getByText('A PIN code has 6 digits')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});
