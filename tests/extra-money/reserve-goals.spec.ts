import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, todayISO } from '../helpers/forms';
import { deleteById } from '../helpers/cleanup';

test.describe('Extra money savings reserve to goals', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await login(page);
  });

  test('allocates savings reserve to a goal @P1', async ({ page }) => {
    const source = `QA Extra Reserve ${Date.now()}`;
    const goalName = `QA Goal Reserve ${Date.now()}`;
    let entryId: string | undefined;
    let goalId: string | undefined;

    const csrfToken = (await page.context().cookies()).find((cookie) => cookie.name === 'csrf_token')?.value;
    expect(csrfToken).toBeTruthy();

    const goalResponse = await page.request.post('/api/v1/goals', {
      headers: {
        'x-csrf-token': csrfToken!,
      },
      data: {
        name: goalName,
        target_amount: 100,
        current_amount: 0,
        description: null,
        target_date: null
      }
    });
    expect(goalResponse.ok()).toBeTruthy();
    const goalData = await goalResponse.json();
    goalId = goalData?.data?.id as string | undefined;
    expect(goalId).toBeTruthy();

    try {
      await page.goto('/extra-money');
      await page.getByTestId('extra-money-add-button').click();

      await page.getByTestId('extra-money-source').fill(source);
      await page.getByTestId('extra-money-amount').fill('20.00');
      await page.getByTestId('extra-money-date').fill(todayISO());
      await page.getByTestId('extra-money-submit').click();

      let createdEntry:
        | { id: string; status: string; source: string }
        | undefined;
      await expect
        .poll(
          async () => {
            const entriesResponse = await page.request.get('/api/v1/extra-money');
            if (!entriesResponse.ok()) {
              return '';
            }
            const entriesData = await entriesResponse.json();
            createdEntry = entriesData.data.find((entry: { source: string }) => entry.source === source) as
              | { id: string; status: string; source: string }
              | undefined;
            return createdEntry?.status ?? '';
          },
          { timeout: 15000 },
        )
        .toBe('pending');

      expect(createdEntry?.id).toBeTruthy();
      entryId = createdEntry?.id;

      await page.reload();
      const entryCard = page.getByTestId(`extra-money-entry-${entryId}`);
      await expect(entryCard).toBeVisible();
      await expect(entryCard).toContainText(source);

      await entryCard.getByTestId('extra-money-assign-button').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeVisible();

      await page.getByTestId('extra-money-clear-assignments').click();
      await selectFirstNonEmptyOption(page.getByTestId('extra-money-category'));
      await page.getByTestId('extra-money-category-amount').fill('10.00');
      await page.getByTestId('extra-money-savings-reserve').fill('10.00');

      await page.getByTestId('extra-money-assign-submit').click();
      await expect(page.getByTestId('extra-money-assign-modal')).toBeHidden();

      const assignedEntriesResponse = await page.request.get('/api/v1/extra-money?status=assigned');
      const assignedEntriesData = await assignedEntriesResponse.json();
      const assignedEntry = assignedEntriesData.data.find((entry: { source: string }) => entry.source === source);
      expect(assignedEntry).toBeTruthy();
      entryId = assignedEntry.id;

      await page.getByTestId('extra-money-tab-assigned').click();
      await expect(entryCard).toBeVisible();
      const recommendationRequest = page
        .waitForResponse(
          (response) =>
            response.request().method() === 'POST' && response.url().includes('/api/v1/extra-money/recommendations'),
          { timeout: 3000 },
        )
        .catch(() => null);
      await entryCard.getByTestId('extra-money-allocate-button').click();
      const allocationModal = page.getByTestId('extra-money-assign-modal').filter({ hasText: source });
      await expect(allocationModal).toBeVisible();
      await recommendationRequest;

      const reserveInput = allocationModal.getByTestId('extra-money-savings-reserve');
      await reserveInput.fill('10.00');
      await expect(reserveInput).toHaveValue(/^10(?:\.0+)?$/);
      const goalSelect = allocationModal.getByTestId('extra-money-goal-select').first();
      await expect(goalSelect).toBeVisible();
      await goalSelect.selectOption(goalId);
      await allocationModal.getByTestId('extra-money-goal-amount').first().fill('10.00');

      const applyGoalsButton = allocationModal.getByTestId('extra-money-apply-goals');
      await expect(applyGoalsButton).toBeEnabled();
      await applyGoalsButton.click();

      await expect
        .poll(
          async () => {
            const updatedGoalResponse = await page.request.get(`/api/v1/goals/${goalId}`);
            if (!updatedGoalResponse.ok()) {
              return -1;
            }
            const updatedGoalData = await updatedGoalResponse.json();
            return Number(updatedGoalData.data.current_amount);
          },
          { timeout: 15000 },
        )
        .toBe(10);

      await expect
        .poll(
          async () => {
            const refreshedEntriesResponse = await page.request.get('/api/v1/extra-money?status=assigned');
            if (!refreshedEntriesResponse.ok()) {
              return Number.NaN;
            }
            const refreshedEntriesData = await refreshedEntriesResponse.json();
            const refreshedEntry = refreshedEntriesData.data.find(
              (entry: { source: string }) => entry.source === source,
            );
            return refreshedEntry ? Number(refreshedEntry.savings_reserve) : Number.NaN;
          },
          { timeout: 15000 },
        )
        .toBe(0);
    } finally {
      await deleteById(page.request, '/api/v1/extra-money', entryId);
      await deleteById(page.request, '/api/v1/goals', goalId);
    }
  });
});
