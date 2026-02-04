import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Split transactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('splits a transaction across two categories', async ({ page }) => {
    const payee = `QA Split ${Date.now()}`;
    let createdId: string | undefined;

    try {
      await page.goto('/transactions');
      await page.getByTestId('transactions-add-button').first().click();

      await selectFirstNonEmptyOption(page.getByTestId('transaction-account'));
      await page.getByTestId('transaction-payee').fill(payee);
      await page.getByTestId('transaction-amount').fill('12.00');
      await page.getByTestId('transaction-date').fill(todayISO());
      await selectFirstNonEmptyOption(page.getByTestId('transaction-category'));

      await page.getByTestId('transaction-submit').click();
      await expect(page.getByText(payee)).toBeVisible();

      const transactionsResponse = await page.request.get('/api/v1/transactions?limit=50');
      const transactionsData = await transactionsResponse.json();
      const created = transactionsData.data.find((txn: { payee: string }) => txn.payee === payee);

      expect(created).toBeTruthy();
      createdId = created.id;

      const row = page.getByTestId(`transaction-row-${created.id}`);
      await expect(row).toBeVisible();
      const splitButton = row.getByTestId('transaction-split-button');
      const isNewSplit = (await splitButton.count()) > 0;
      if (isNewSplit) {
        await splitButton.click();
      } else {
        await row.getByTestId('transaction-edit-split-button').click();
      }

      await expect(page.getByTestId('split-modal')).toBeVisible();

      await selectFirstNonEmptyOption(page.getByTestId('split-category').nth(0));
      await page.getByTestId('split-amount').nth(0).fill('7.00');

      await selectFirstNonEmptyOption(page.getByTestId('split-category').nth(1));
      await page.getByTestId('split-amount').nth(1).fill('5.00');

      const splitResponsePromise = page.waitForResponse((response) => {
        if (isNewSplit) {
          return response.url().includes(`/api/v1/transactions/${created.id}/split`) && response.request().method() === 'POST';
        }
        return response.url().includes(`/api/v1/transactions/${created.id}/splits`) && response.request().method() === 'PATCH';
      });
      await page.getByTestId('split-submit').click();
      await splitResponsePromise;
      await expect(page.getByTestId('split-modal')).toBeHidden();

      const splitsResponse = await page.request.get(`/api/v1/transactions/${created.id}/splits`);
      const splitsData = await splitsResponse.json();
      expect(splitsData.data.splits.length).toBe(2);

      const totalSplit = splitsData.data.splits.reduce((sum: number, split: { amount: string | number }) => {
        return sum + Number(split.amount);
      }, 0);

      expect(totalSplit).toBe(-12);
    } finally {
      await deleteById(page.request, '/api/v1/transactions', createdId);
    }
  });
});
