import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, daysFromTodayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Recurring transactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('approves and posts a recurring instance', async ({ page }) => {
    const payee = `QA Recurring ${Date.now()}`;
    let templateId: string | undefined;

    try {
      await page.goto('/recurring-transactions');
      await page.getByTestId('recurring-add-button').click();

      await selectFirstNonEmptyOption(page.getByTestId('recurring-account'));
      await page.getByTestId('recurring-payee').fill(payee);
      await page.getByTestId('recurring-amount').fill('-5.00');
      await selectFirstNonEmptyOption(page.getByTestId('recurring-category'));
      await page.getByTestId('recurring-frequency').selectOption('daily');
      await page.getByTestId('recurring-start-date').fill(daysFromTodayISO(-1));

      await page.getByTestId('recurring-submit').click();
      await expect(page.getByTestId('recurring-modal')).toBeHidden();

      const templatesResponse = await page.request.get('/api/v1/recurring-transactions');
      const templatesData = await templatesResponse.json();
      const created = templatesData.data.find((template: { payee: string }) => template.payee === payee);
      if (created?.id) {
        templateId = created.id;
        await page.request.post(`/api/v1/recurring-transactions/${created.id}/generate-instances`, {
          data: { days_ahead: 30 }
        });
      }

      const pendingResponse = await page.request.get('/api/v1/recurring-transactions/instances/pending?days=30');
      const pendingData = await pendingResponse.json();
      if (!pendingData.data.some((instance: { payee: string }) => instance.payee === payee)) {
        throw new Error('Recurring instance not generated for pending approvals.');
      }

      await page.reload();
      await page.getByTestId('recurring-tab-pending').click();

      const row = page.locator('[data-testid="recurring-instance-row"]', { hasText: `${payee}Today` });
      await expect(row).toBeVisible({ timeout: 15000 });

      await row.getByTestId('recurring-approve').click();
      await expect(row.getByTestId('recurring-post')).toBeVisible();

      await row.getByTestId('recurring-post').click();
      await expect(row).toHaveCount(0);

      await page.getByTestId('recurring-tab-history').click();
      await page.getByTestId('recurring-history-status-posted').click();
      const historyRow = page.locator('[data-testid^="recurring-history-row-"]', { hasText: payee }).first();
      await expect(historyRow).toBeVisible();
      await expect(historyRow.getByTestId('recurring-history-status')).toHaveText('posted');
    } finally {
      await deleteById(page.request, '/api/v1/recurring-transactions', templateId);
    }
  });
});
