import { expect, request, type Page } from '@playwright/test';

export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo-Password-1!';

const RATE_LIMIT_WAIT_MS = 61_000;

export async function signIn(page: Page, user: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${user}@demo.example`);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  const main = page.getByRole('navigation', { name: 'Main' });
  const limited = page.getByRole('alert').filter({ hasText: 'Too many attempts' });
  await page.getByRole('button', { name: 'Sign in' }).click();
  // The API limits sign-ins per address per minute, successful ones included, and these tests sign in a lot.
  await expect(main.or(limited).first()).toBeVisible();
  if (await limited.isVisible()) {
    await page.waitForTimeout(RATE_LIMIT_WAIT_MS);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(main).toBeVisible();
}

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

type ApiSession = ReturnType<typeof openApiSession>;
const sessions = new Map<string, ApiSession>();

/** A signed-in API session, for setting up data a test isn't about. Kept for the run, as sign-ins are rate limited. */
export function apiAs(user: string): ApiSession {
  const existing = sessions.get(user);
  if (existing) return existing;
  const opened = openApiSession(user);
  sessions.set(user, opened);
  return opened;
}

async function openApiSession(user: string) {
  const context = await request.newContext({ baseURL: API_URL, extraHTTPHeaders: { origin: process.env.E2E_BASE_URL ?? 'http://localhost:5173' } });
  const email = user.includes('@') ? user : `${user}@demo.example`;
  let login = await context.post('/api/v1/auth/login', { data: { email, password: DEMO_PASSWORD } });
  if (login.status() === 429) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
    login = await context.post('/api/v1/auth/login', { data: { email, password: DEMO_PASSWORD } });
  }
  expect(login.ok(), `sign in as ${user}`).toBeTruthy();
  const { user: session } = await login.json();
  const call = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, data?: unknown) => {
    const res = await context.fetch(`/api/v1${path}`, { method, data: data as never, headers: { 'x-csrf-token': session.csrfToken } });
    const text = await res.text();
    expect(res.ok(), `${method} ${path}: ${text}`).toBeTruthy();
    return text ? JSON.parse(text) : null;
  };
  return { get: (path: string) => call('GET', path), post: (path: string, data?: unknown) => call('POST', path, data), put: (path: string, data?: unknown) => call('PUT', path, data), patch: (path: string, data?: unknown) => call('PATCH', path, data), dispose: () => undefined };
}

/** Books one sample with the given tests, plans it against two grades and assigns it. */
export async function plannedJob(testCodes: string[], opts: { description?: string; technician?: string; urgent?: boolean; assign?: boolean; samples?: number; customerId?: string } = {}) {
  const reception = await apiAs('reception');
  const planner = await apiAs('planner');
  const tests = (await planner.get('/masters/tests?pageSize=200')).data as { id: string; code: string }[];
  const testIds = testCodes.map((c) => tests.find((t) => t.code === c)!.id);
  const customer = opts.customerId ? { id: opts.customerId } : (await reception.get('/customers?q=Contoso')).data[0];
  const description = opts.description ?? unique('Plate');
  const job = await reception.post('/jobs', {
    customerId: customer.id,
    noQuotationReason: 'E2E setup',
    urgent: opts.urgent ?? false,
    samples: Array.from({ length: opts.samples ?? 1 }, (_, i) => ({ description: `${description}${i ? ` ${i + 1}` : ''}`, returnable: false, attributes: [], testIds })),
    deviations: [],
  });
  const specs = (await planner.get('/masters/specifications?pageSize=50')).data as { id: string; code: string }[];
  const technicians = (await planner.get('/planning/technicians')) as { id: string; name: string }[];
  const technician = technicians.find((t) => t.name === (opts.technician ?? 'Tara Technician'))!;
  const plan = await planner.post('/planning/plans', {
    sampleIds: job.samples.map((s: { id: string }) => s.id),
    specificationId: specs.find((s) => s.code === 'DEMO-S355')!.id,
    dualSpecificationId: specs.find((s) => s.code === 'DEMO-S420')!.id,
    tests: testIds.map((testId) => ({ testId, officeInstructions: 'Handle with care', technicalData: 'Machined flat', ...(opts.assign === false ? {} : { assignedToId: technician.id }) })),
  });
  await reception.dispose();
  await planner.dispose();
  return { job, sample: job.samples[0] as { id: string; sampleNo: string; version: number }, sampleTestIds: plan.sampleTestIds as string[], technicianId: technician.id };
}

/** Takes a planned job with one Density test through to an issued report, for tests about what comes after. */
export async function issuedJob(opts: { customerId?: string; density?: string } = {}) {
  const planned = await plannedJob(['DEN'], { customerId: opts.customerId });
  const id = planned.sampleTestIds[0];
  const tech = await apiAs('tech');
  let test = await tech.post(`/tests/${id}/start`, { version: (await tech.get(`/tests/${id}`)).version });
  const parameter = test.results.find((r: { code: string }) => r.code === 'DENSITY');
  test = await tech.put(`/tests/${id}/results`, { version: test.version, values: [{ parameterId: parameter.parameterId, value: opts.density ?? '0.85' }] });
  for (const stage of test.stages as { seq: number; completedAt: string | null }[]) {
    if (!stage.completedAt) test = await tech.post(`/tests/${id}/stages/${stage.seq}/complete`, { version: test.version });
  }
  test = await tech.post(`/tests/${id}/submit`, { version: test.version });
  await tech.dispose();
  const hod = await apiAs('hod');
  await hod.post(`/tests/${id}/approve`, { version: test.version });
  await hod.dispose();

  const latest = (r: { revisions: { version: number; pdfReady: boolean; revisionNo: number }[] }) => r.revisions.reduce((a, b) => (b.revisionNo > a.revisionNo ? b : a));
  const reviewer = await apiAs('reviewer');
  const reportId = (await reviewer.get(`/reports?q=${encodeURIComponent(planned.sample.sampleNo)}`)).data[0].id as string;
  let report = await reviewer.get(`/reports/${reportId}`);
  report = await reviewer.post(`/reports/${reportId}/submit`, { version: latest(report).version });
  report = await reviewer.post(`/reports/${reportId}/pass-review`, { version: latest(report).version });
  await reviewer.dispose();
  const signatory = await apiAs('signatory');
  report = await signatory.post(`/reports/${reportId}/approve`, { version: latest(report).version, password: DEMO_PASSWORD });
  await expect.poll(async () => latest(await signatory.get(`/reports/${reportId}`)).pdfReady, { timeout: 90_000 }).toBeTruthy();
  report = await signatory.get(`/reports/${reportId}`);
  await signatory.post(`/reports/${reportId}/issue`, { version: latest(report).version });
  await signatory.dispose();
  return { ...planned, reportId, reportNo: report.reportNo as string };
}

/** A new customer in the lab's own state, so nothing a test does touches anyone else's balances. */
export async function freshCustomer(opts: { email?: string | null } = {}) {
  const admin = await apiAs('admin');
  const company = await admin.get('/admin/company');
  await admin.dispose();
  const sales = await apiAs('sales');
  const name = `Test ${unique('Customer')}`;
  const customer = await sales.post('/customers', {
    name,
    stateName: company.stateName,
    stateCode: company.gstStateCode,
    creditDays: 30,
    withholdReportUntilPaid: false,
    contacts: opts.email === null ? [] : [{ name: 'Bina Buyer', email: opts.email ?? 'buyer@customer.example', isPrimary: true }],
    addresses: [
      { kind: 'BILLING', line1: '1 Example Road', city: 'Exampleville', stateName: company.stateName, stateCode: company.gstStateCode },
      { kind: 'REPORT', line1: '1 Example Road', city: 'Exampleville', stateName: company.stateName, stateCode: company.gstStateCode },
    ],
  });
  await sales.dispose();
  return { id: customer.id as string, name };
}
