import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Debts', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await login(page);
  });

  test('creates a debt and records a payment @P1', async ({ page }) => {
    const debtName = `QA Debt ${Date.now()}`;
    let debtId: string | undefined;

    try {
      await page.goto('/debts');
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
