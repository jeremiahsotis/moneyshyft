import { expect, Page } from '@playwright/test';

type LoginOptions = {
  email?: string;
  password?: string;
};

export async function login(page: Page, options: LoginOptions = {}) {
  const email = options.email || process.env.TEST_EMAIL || 'operator@example.com';
  const password = options.password || process.env.TEST_PASSWORD || 'SecurePass123!';

  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await expect(page).not.toHaveURL(/\/login$/);
}
