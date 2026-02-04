import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Core navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates through primary sections', async ({ page }) => {
    await page.getByRole('link', { name: 'Accounts' }).click();
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();

    await page.getByRole('link', { name: 'Transactions' }).click();
    await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Manage Recurring' }).click();
    await expect(page.getByRole('heading', { name: 'Recurring Transactions', level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Budget' }).click();
    await expect(page.getByText('Ready to Assign')).toBeVisible();

    await page.getByRole('link', { name: 'Extra Money' }).click();
    await expect(page.getByRole('heading', { name: /Extra Money Tracker/ })).toBeVisible();

    await page.getByRole('link', { name: 'Debts' }).click();
    await expect(page.getByRole('heading', { name: 'Debt Progress Planner' })).toBeVisible();

    await page.getByRole('link', { name: 'Goals' }).click();
    await expect(page.getByRole('heading', { name: 'Goals', level: 1 })).toBeVisible();

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Household Settings' })).toBeVisible();
  });
});
