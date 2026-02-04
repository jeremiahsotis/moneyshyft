import { expect, Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_EMAIL || '');
  await page.fill('#password', process.env.TEST_PASSWORD || '');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
