import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

const ensureAtLeastOneActiveBudgetAccount = async (page: Page): Promise<void> => {
  const accountsResponse = await page.request.get('/api/v1/accounts');
  expect(accountsResponse.ok()).toBe(true);
  const accountsBody = await accountsResponse.json();
  const accounts = Array.isArray(accountsBody?.data)
    ? accountsBody.data
    : [];
  const hasSelectableAccount = accounts.some((account: Record<string, unknown>) =>
    account.is_active !== false && account.is_on_budget !== false,
  );
  if (hasSelectableAccount) {
    return;
  }

  const csrfToken = (await page.context().cookies())
    .find((cookie) => cookie.name === 'csrf_token')
    ?.value;
  const createAccountResponse = await page.request.post('/api/v1/accounts', {
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
    data: {
      name: `QA Debt Account ${Date.now()}`,
      type: 'checking',
      starting_balance: 0,
      is_on_budget: true,
      is_active: true,
    },
  });
  expect([200, 201]).toContain(createAccountResponse.status());
};

const createTenantScopedUser = async (page: Page): Promise<{ email: string; password: string }> => {
  const email = `qa-debts-${randomUUID().slice(0, 8)}@example.com`;
  const password = 'SecurePass123!';
  const response = await page.request.post('/api/v1/auth/signup', {
    data: {
      email,
      password,
      firstName: 'QA',
      lastName: 'Debts',
      householdName: `QA Debts Household ${Date.now()}`,
    },
  });
  expect([200, 201]).toContain(response.status());
  return { email, password };
};

test.describe.skip('Debts', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    const credentials = await createTenantScopedUser(page);
    await login(page, credentials);
  });

  test('creates a debt and records a payment @P1', async ({ page }) => {
    const debtName = `QA Debt ${Date.now()}`;
    let debtId: string | undefined;

    try {
      await page.goto('/debts');
      const tenantAdminShellVisible = await page
        .getByRole('heading', { name: 'Tenant Administration' })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      test.skip(
        tenantAdminShellVisible,
        'Debts UI is unavailable while tenant-admin shell is active for this session.',
      );

      await ensureAtLeastOneActiveBudgetAccount(page);
      await page.getByTestId('debts-add-button').click();

      await page.getByTestId('debt-name').fill(debtName);
      await page.getByTestId('debt-type').selectOption('credit_card');
      await page.getByTestId('debt-current-balance').fill('100');
      await page.getByTestId('debt-interest-rate').fill('10');
      await page.getByTestId('debt-minimum-payment').fill('5');

      await page.getByTestId('debt-submit').click();

      const debtCard = page.locator('[data-testid^="debt-card-"]', { hasText: debtName });
      await expect(debtCard).toBeVisible();
      await debtCard.click();

      const modal = page.getByTestId('debt-detail-modal');
      await expect(modal).toBeVisible();

      // DebtDetailModal initializes by loading history, then resets form fields.
      // Wait for that initialization cycle to finish to avoid racing with input resets.
      await expect(modal.getByText('Loading payments...')).toHaveCount(0);
      await expect(modal.getByTestId('debt-payment-amount')).toHaveValue('0');

      await modal.getByTestId('debt-payment-amount').fill('5.00');
      await modal.getByTestId('debt-payment-date').fill(todayISO());
      await selectFirstNonEmptyOption(modal.getByTestId('debt-payment-account'));
      await expect(modal.getByTestId('debt-payment-amount')).toHaveValue(/^5(?:\.0+)?$/);

      const addPaymentResponse = page.waitForResponse((response) => (
        response.url().includes('/api/v1/debts/')
        && response.url().includes('/payments')
        && response.request().method() === 'POST'
      ));
      await modal.getByTestId('debt-payment-submit').click();
      await addPaymentResponse;

      await expect(modal.getByText('No payments recorded yet')).toHaveCount(0, { timeout: 10000 });

      const debtsResponse = await page.request.get('/api/v1/debts');
      const debtsData = await debtsResponse.json();
      const created = debtsData.data.debts.find((debt: { name: string }) => debt.name === debtName);
      debtId = created?.id;
    } finally {
      await deleteById(page.request, '/api/v1/debts', debtId);
    }
  });
});
