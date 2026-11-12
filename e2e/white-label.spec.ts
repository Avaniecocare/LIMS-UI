import { expect, test, type Page } from '@playwright/test';
import { apiAs, issuedJob, plannedJob, signIn } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const cssVar = (page: Page, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
type Lab = { profile: Record<string, unknown>; branding: Record<string, unknown>; profileVersion: number; brandingVersion: number };
const editable = (b: Record<string, unknown>) => ({ appName: b.appName, primaryColor: b.primaryColor, accentColor: b.accentColor, surfaceColor: b.surfaceColor, navColor: b.navColor, loginTagline: b.loginTagline, poweredBy: b.poweredBy });

test('the admin rebrands the lab twice from the admin panel; screens, sign-in, emails and PDFs follow without a restart', async ({ page }) => {
  test.setTimeout(180_000);
  const admin = await apiAs('admin');
  const original: Lab = await admin.get('/admin/lab');
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000';
  const originalLogo = await page.request.get(`${apiUrl}/api/v1/public/branding/logo`);
  const logoType = originalLogo.headers()['content-type'];
  const logoBytes = Buffer.from(await originalLogo.body());
  try {
    for (const brand of [
      { app: 'Greenfield Lab Suite', lab: 'Greenfield Testing Services', palette: 'Ocean', primary: '#0f4c81', tagline: 'Testing you can trust' },
      { app: 'Shree Analytical Cloud', lab: 'Shree Analytical Laboratories', palette: 'Maroon', primary: '#7f1d1d', tagline: 'Results on time, every time' },
    ]) {
      // Branding, in the admin panel.
      await signIn(page, 'admin');
      await page.goto('/admin?tab=branding');
      await page.getByLabel('App name').fill(brand.app);
      await page.getByRole('button', { name: brand.palette }).click();
      // The page previews the colours before saving.
      await expect.poll(() => cssVar(page, '--brand-primary')).toBe(brand.primary);
      await page.getByLabel('Sign-in page line').fill(brand.tagline);
      await page.getByRole('button', { name: 'Save branding' }).click();
      await expect(page.getByText('Branding saved. Everyone sees it now.')).toBeVisible();
      await page.getByLabel('Upload logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
      await expect(page.getByText('Picture saved. It shows everywhere now.')).toBeVisible();

      // Lab profile: the name on documents (the password is confirmed first).
      const lab: Lab = await admin.get('/admin/lab');
      await admin.post('/auth/confirm-password', { password: process.env.E2E_PASSWORD ?? 'Demo-Password-1!' });
      await admin.put('/admin/lab/profile', { version: lab.profileVersion, profile: { ...lab.profile, companyName: brand.lab, legalName: `${brand.lab} Private Limited` } });

      // Everywhere, straight away: the browser tab, the menu, the sign-in page.
      await page.reload();
      await expect(page).toHaveTitle(new RegExp(brand.app));
      await expect(page.getByRole('link', { name: `${brand.app} home` })).toBeVisible();
      expect(await cssVar(page, '--brand-primary')).toBe(brand.primary);
      expect(await page.locator('link[rel="icon"]').getAttribute('href')).toContain('/public/branding/favicon');
      await page.context().clearCookies();
      await page.goto('/login');
      await expect(page.getByText(brand.app).first()).toBeVisible();
      await expect(page.getByText(brand.lab)).toBeVisible();
      await expect(page.getByText(brand.tagline)).toBeVisible();
      const logo = await page.getByRole('img', { name: `${brand.lab} logo` }).getAttribute('src');
      expect((await page.request.get(logo!)).headers()['content-type']).toBe('image/png');

      // Emails and PDFs: an acknowledgement emailed now carries the new name, in the email and on the letter.
      const { job } = await plannedJob(['DEN']);
      const reception = await apiAs('reception');
      await reception.post(`/jobs/${job.id}/acknowledgement`, { to: 'buyer@customer.example' });
      await expect.poll(async () => (await reception.get(`/jobs/${job.id}/emails`))[0]?.status, { timeout: 60_000 }).toBe('SENT');
      const mail = (await reception.get(`/jobs/${job.id}/emails`))[0];
      expect(mail.subject).toContain(brand.lab);
      // The report template prints the lab as it is now (a draft renders from the live profile; issued ones keep theirs).
      const { reportId } = await issuedJob({ until: 'draft' });
      const reviewer = await apiAs('reviewer');
      const { html } = await reviewer.get(`/reports/${reportId}/preview`);
      expect(html).toContain(brand.lab);
      expect(html).toContain(brand.primary);
    }
  } finally {
    // Put the lab back as it was, for the other tests: profile, branding and the original logo.
    const now: Lab = await admin.get('/admin/lab');
    await admin.post('/auth/confirm-password', { password: process.env.E2E_PASSWORD ?? 'Demo-Password-1!' });
    await admin.put('/admin/lab/profile', { version: now.profileVersion, profile: original.profile });
    await admin.put('/admin/lab/branding', { version: now.brandingVersion, branding: editable(original.branding) });
    await signIn(page, 'admin');
    await page.goto('/admin?tab=branding');
    if (original.branding.logoFileId && !logoType.includes('svg')) {
      await page.getByLabel('Upload logo').setInputFiles({ name: 'logo', mimeType: logoType, buffer: logoBytes });
      await expect(page.getByText('Picture saved. It shows everywhere now.')).toBeVisible();
    } else if (!original.branding.logoFileId) {
      await page.getByRole('button', { name: 'Remove logo' }).click();
      await expect(page.getByText('Picture removed')).toBeVisible();
    }
  }
});
