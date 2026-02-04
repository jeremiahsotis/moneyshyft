import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Extra money savings reserve to goals', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await login(page);
  });

  test('allocates savings reserve to a goal', async ({ page }) => {
    const source = `QA Extra Reserve ${Date.now()}`;
    const goalName = `QA Goal Reserve ${Date.now()}`;
    let entryId: string | undefined;

    const goalResponse = await page.request.post('/api/v1/goals', {
      data: {
        name: goalName,
        target_amount: 100,
        current_amount: 0,
        description: null,
        target_date: null
      }
    });
    const goalData = await goalResponse.json();
    const goalId = goalData.data.id as string;

    try {
      await page.goto('/extra-money');
      await page.getByTestId('extra-money-add-button').click();

      await page.getByTestId('extra-money-source').fill(source);
      await page.getByTestId('extra-money-amount').fill('20.00');
      await page.getByTestId('extra-money-date').fill(todayISO());
      await page.getByTestId('extra-money-submit').click();

      const entryCard = page.locator('[data-testid^="extra-money-entry-"]', { hasText: source });
      await expect(entryCard).toBeVisible();

      await entryCard.getByTestId('extra-money-assign-button').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeVisible();

      await page.getByTestId('extra-money-clear-assignments').click();
      await selectFirstNonEmptyOption(page.getByTestId('extra-money-category'));
      await page.getByTestId('extra-money-category-amount').fill('10.00');
      await page.getByTestId('extra-money-savings-reserve').fill('10.00');

      await page.getByTestId('extra-money-assign-submit').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeHidden();

      await page.getByTestId('extra-money-tab-assigned').click();
      await expect(entryCard).toBeVisible();
      await entryCard.getByTestId('extra-money-allocate-button').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeVisible();

      await page.getByTestId('extra-money-savings-reserve').fill('10.00');
      await page.getByTestId('extra-money-goal-select').first().selectOption(goalId);
      await page.getByTestId('extra-money-goal-amount').first().fill('10.00');

      await expect(page.getByTestId('extra-money-apply-goals')).toBeEnabled();
      const applyResponsePromise = page.waitForResponse((response) => {
        return response.url().includes(`/api/v1/extra-money/`) && response.url().includes('/assign-goals');
      });
      await page.getByTestId('extra-money-apply-goals').click();
      await applyResponsePromise;

      const updatedGoalResponse = await page.request.get(`/api/v1/goals/${goalId}`);
      const updatedGoalData = await updatedGoalResponse.json();
      expect(Number(updatedGoalData.data.current_amount)).toBe(10);

      const entriesResponse = await page.request.get('/api/v1/extra-money?status=assigned');
      const entriesData = await entriesResponse.json();
      const assignedEntry = entriesData.data.find((entry: { source: string }) => entry.source === source);
      expect(assignedEntry).toBeTruthy();
      entryId = assignedEntry.id;
      expect(Number(assignedEntry.savings_reserve)).toBe(0);
    } finally {
      await deleteById(page.request, '/api/v1/extra-money', entryId);
      await deleteById(page.request, '/api/v1/goals', goalId);
    }
  });
});
