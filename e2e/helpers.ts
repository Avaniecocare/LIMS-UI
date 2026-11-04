import { expect, request, type Page } from '@playwright/test';

export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo-Password-1!';

export async function signIn(page: Page, user: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${user}@demo.example`);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

/** A signed-in API session, for setting up data a test isn't about. */
export async function apiAs(user: string) {
  const context = await request.newContext({ baseURL: API_URL, extraHTTPHeaders: { origin: process.env.E2E_BASE_URL ?? 'http://localhost:5173' } });
  const email = user.includes('@') ? user : `${user}@demo.example`;
  const login = await context.post('/api/v1/auth/login', { data: { email, password: DEMO_PASSWORD } });
  expect(login.ok(), `sign in as ${user}`).toBeTruthy();
  const { user: session } = await login.json();
  const call = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, data?: unknown) => {
    const res = await context.fetch(`/api/v1${path}`, { method, data: data as never, headers: { 'x-csrf-token': session.csrfToken } });
    const text = await res.text();
    expect(res.ok(), `${method} ${path}: ${text}`).toBeTruthy();
    return text ? JSON.parse(text) : null;
  };
  return { get: (path: string) => call('GET', path), post: (path: string, data?: unknown) => call('POST', path, data), put: (path: string, data?: unknown) => call('PUT', path, data), dispose: () => context.dispose() };
}

/** Books one sample with the given tests, plans it against two grades and assigns it. */
export async function plannedJob(testCodes: string[], opts: { description?: string; technician?: string; urgent?: boolean; assign?: boolean; samples?: number } = {}) {
  const reception = await apiAs('reception');
  const planner = await apiAs('planner');
  const tests = (await planner.get('/masters/tests?pageSize=200')).data as { id: string; code: string }[];
  const testIds = testCodes.map((c) => tests.find((t) => t.code === c)!.id);
  const customer = (await reception.get('/customers?q=Contoso')).data[0];
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
