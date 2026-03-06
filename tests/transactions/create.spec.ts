import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';
import { ensureAtLeastOneActiveBudgetAccount } from '../helpers/accounts';

const createTenantScopedUser = async (page: Page): Promise<{ email: string; password: string }> => {
  const email = `qa-transactions-${randomUUID().slice(0, 8)}@example.com`;
  const password = 'SecurePass123!';
  const response = await page.request.post('/api/v1/auth/signup', {
    data: {
      email,
      password,
      firstName: 'QA',
      lastName: 'Transactions',
      householdName: `QA Transactions Household ${Date.now()}`,
    },
  });
  expect([200, 201]).toContain(response.status());
  return { email, password };
};

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    const credentials = await createTenantScopedUser(page);
    await login(page, credentials);
  });

  test('creates a transaction @P0', async ({ page }) => {
    const payee = `QA Transaction ${Date.now()}`;
    let createdId: string | undefined;

    try {
      await ensureAtLeastOneActiveBudgetAccount(page);
      await page.goto('/transactions');
      await page.waitForLoadState('domcontentloaded');
      const tenantAdminShellVisible = (await page
        .getByRole('heading', { name: /Tenant Administration/i })
        .count()) > 0;
      test.skip(
        tenantAdminShellVisible,
        'Transactions UI is unavailable while tenant-admin shell is active for this session.',
      );
      await page.getByTestId('transactions-add-button').first().click();

      await selectFirstNonEmptyOption(page.getByTestId('transaction-account'));
      await page.getByTestId('transaction-payee').fill(payee);
      await page.getByTestId('transaction-amount').fill('5.00');
      await page.getByTestId('transaction-date').fill(todayISO());
      const categoryId = await selectFirstNonEmptyOption(page.getByTestId('transaction-category'));

      await page.getByTestId('transaction-submit').click();

      await expect(page.getByText(payee)).toBeVisible();

      const response = await page.request.get('/api/v1/transactions?limit=50');
      const data = await response.json();
      const created = data.data.find((txn: { payee: string }) => txn.payee === payee);

      expect(created).toBeTruthy();
      createdId = created.id;
      const categoriesResponse = await page.request.get('/api/v1/categories');
      const categoriesData = await categoriesResponse.json();
      const categoryLookup = new Map(
        categoriesData.data.map((category: { id: string; section_name: string }) => [category.id, category.section_name])
      );
      const sectionName = categoryId ? categoryLookup.get(categoryId) : null;
      const expectedAmount = sectionName === 'Income' ? 5 : -5;
      expect(Number(created.amount)).toBe(expectedAmount);
      expect(created.transaction_date.split('T')[0]).toBe(todayISO());
      const normalizedCategoryId = categoryId && categoryId !== 'Uncategorized' ? categoryId : null;
      expect(created.category_id).toBe(normalizedCategoryId);
    } finally {
      await deleteById(page.request, '/api/v1/transactions', createdId);
    }
  });
});
