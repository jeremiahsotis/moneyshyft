import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { deleteById } from '../helpers/cleanup';

test.describe('Goals', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('creates a goal and adds a contribution', async ({ page }) => {
    const goalName = `QA Goal ${Date.now()}`;
    let goalId: string | undefined;

    try {
      await page.goto('/goals');
      await page.getByTestId('goals-add-button').click();

      await page.getByTestId('goal-name').fill(goalName);
      await page.getByTestId('goal-target-amount').fill('100');
      await page.getByTestId('goal-submit').click();

      const goalCard = page.locator('[data-testid^="goal-card-"]', { hasText: goalName });
      await expect(goalCard).toBeVisible();

      await goalCard.getByTestId('goal-contribution-button').click();
      await page.getByTestId('goal-contribution-amount').fill('10');
      await page.getByTestId('goal-contribution-submit').click();

      await expect(goalCard.getByText('$10 / $100')).toBeVisible();

      const goalsResponse = await page.request.get('/api/v1/goals');
      const goalsData = await goalsResponse.json();
      const created = goalsData.data.find((goal: { name: string }) => goal.name === goalName);
      goalId = created?.id;
    } finally {
      await deleteById(page.request, '/api/v1/goals', goalId);
    }
  });
});
