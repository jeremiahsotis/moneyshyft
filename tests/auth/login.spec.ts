import { test, expect } from '@playwright/test';

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

test.describe('Login', () => {
  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', email || '');
    await page.fill('#password', password || '');
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
