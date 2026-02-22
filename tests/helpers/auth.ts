import { expect, Page } from '@playwright/test';

export async function login(page: Page) {
  const email = process.env.TEST_EMAIL || 'operator@example.com';
  const password = process.env.TEST_PASSWORD || 'SecurePass123!';

  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
