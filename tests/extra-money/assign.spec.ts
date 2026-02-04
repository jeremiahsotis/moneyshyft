import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Extra money', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await login(page);
  });

  test('creates an entry and assigns it to a category', async ({ page }) => {
    const source = `QA Extra ${Date.now()}`;
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
      await selectFirstNonEmptyOption(page.getByTestId('extra-money-category'));
      const selectedCategoryName = await page.getByTestId('extra-money-category').evaluate((node) => {
        const select = node as HTMLSelectElement;
        return select.selectedOptions[0]?.textContent?.trim() || '';
      });
      await page.getByTestId('extra-money-savings-reserve').fill('0');
      await page.getByTestId('extra-money-category-amount').fill('10.00');

      await expect(page.getByTestId('extra-money-assign-submit')).toBeEnabled();
      await page.getByTestId('extra-money-assign-submit').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeHidden();

      await page.getByTestId('extra-money-tab-assigned').click();
      await expect(entryCard).toBeVisible();
      await expect(entryCard.getByText('$10.00')).toBeVisible();

      const entriesResponse = await page.request.get('/api/v1/extra-money?status=assigned');
      const entriesData = await entriesResponse.json();
      const assignedEntry = entriesData.data.find((entry: { source: string }) => entry.source === source);

      expect(assignedEntry).toBeTruthy();
      entryId = assignedEntry.id;
      expect(assignedEntry.status).toBe('assigned');
      expect(Number(assignedEntry.amount)).toBe(10);
      expect(assignedEntry.assignments?.length).toBeGreaterThan(0);
      expect(Number(assignedEntry.assignments?.[0]?.amount)).toBe(10);
      if (selectedCategoryName) {
        expect(assignedEntry.assignments?.[0]?.category_name).toBe(selectedCategoryName);
      }
    } finally {
      await deleteById(page.request, '/api/v1/extra-money', entryId);
    }
  });
});
