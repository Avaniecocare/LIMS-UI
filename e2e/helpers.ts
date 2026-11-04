import { expect, type Page } from '@playwright/test';

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
