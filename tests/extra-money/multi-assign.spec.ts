import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, selectDifferentOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Extra money multi-category', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await login(page);
  });

  test('assigns extra money across multiple categories', async ({ page }) => {
    const source = `QA Extra Multi ${Date.now()}`;
    let entryId: string | undefined;

    try {
      await page.goto('/extra-money');
      await page.getByTestId('extra-money-add-button').click();

      await page.getByTestId('extra-money-source').fill(source);
      await page.getByTestId('extra-money-amount').fill('10.00');
      await page.getByTestId('extra-money-date').fill(todayISO());
      await page.getByTestId('extra-money-submit').click();

      const entryCard = page.locator('[data-testid^="extra-money-entry-"]', { hasText: source });
      await expect(entryCard).toBeVisible();

      await entryCard.getByTestId('extra-money-assign-button').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeVisible();

      await page.getByTestId('extra-money-clear-assignments').click();
      const firstCategoryId = await selectFirstNonEmptyOption(page.getByTestId('extra-money-category'));
      await page.getByTestId('extra-money-category-amount').fill('6.00');

      await page.getByTestId('extra-money-add-category').click();
      await selectDifferentOption(page.getByTestId('extra-money-category').nth(1), firstCategoryId);
      await page.getByTestId('extra-money-category-amount').nth(1).fill('4.00');

      await page.getByTestId('extra-money-savings-reserve').fill('0');
      await expect(page.getByTestId('extra-money-assign-submit')).toBeEnabled();
      await page.getByTestId('extra-money-assign-submit').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeHidden();

      const entriesResponse = await page.request.get('/api/v1/extra-money?status=assigned');
      const entriesData = await entriesResponse.json();
      const assignedEntry = entriesData.data.find((entry: { source: string }) => entry.source === source);

      expect(assignedEntry).toBeTruthy();
      entryId = assignedEntry.id;
      expect(assignedEntry.status).toBe('assigned');
      expect(Number(assignedEntry.amount)).toBe(10);
      expect(assignedEntry.assignments?.length).toBe(2);
      const totalAssigned = assignedEntry.assignments.reduce((sum: number, assignment: { amount: string | number }) => {
        return sum + Number(assignment.amount);
      }, 0);
      expect(totalAssigned).toBeCloseTo(10, 2);
    } finally {
      await deleteById(page.request, '/api/v1/extra-money', entryId);
    }
  });
});
