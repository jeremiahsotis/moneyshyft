import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { login } from '../helpers/auth';
import { selectFirstNonEmptyOption, daysFromTodayISO } from '../helpers/forms';
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
      name: `QA Recurring Account ${Date.now()}`,
      type: 'checking',
      starting_balance: 0,
      is_on_budget: true,
      is_active: true,
    },
  });
  expect([200, 201]).toContain(createAccountResponse.status());
};

const ensureAtLeastOneActiveCategory = async (page: Page): Promise<void> => {
  const categoriesResponse = await page.request.get('/api/v1/categories');
  expect(categoriesResponse.ok()).toBe(true);
  const categoriesBody = await categoriesResponse.json();
  const sections = Array.isArray(categoriesBody?.data)
    ? categoriesBody.data
    : [];

  const hasSelectableCategory = sections.some((section: Record<string, unknown>) =>
    Array.isArray(section.categories)
      && section.categories.some((category: Record<string, unknown>) => category.is_archived !== true),
  );
  if (hasSelectableCategory) {
    return;
  }

  const csrfToken = (await page.context().cookies())
    .find((cookie) => cookie.name === 'csrf_token')
    ?.value;
  const csrfHeaders = csrfToken ? { 'x-csrf-token': csrfToken } : undefined;
  let sectionId = '';
  const existingSection = sections.find((section: Record<string, unknown>) => typeof section.id === 'string');
  if (existingSection && typeof existingSection.id === 'string') {
    sectionId = existingSection.id;
  } else {
    const createSectionResponse = await page.request.post('/api/v1/categories/sections', {
      headers: csrfHeaders,
      data: {
        name: `QA Recurring Section ${Date.now()}`,
        type: 'flexible',
      },
    });
    expect([200, 201]).toContain(createSectionResponse.status());
    const createSectionBody = await createSectionResponse.json();
    sectionId = String(createSectionBody?.data?.id ?? '');
  }

  expect(sectionId.length).toBeGreaterThan(0);
  const createCategoryResponse = await page.request.post('/api/v1/categories', {
    headers: csrfHeaders,
    data: {
      section_id: sectionId,
      name: `QA Recurring Category ${Date.now()}`,
    },
  });
  expect([200, 201]).toContain(createCategoryResponse.status());
};

const createTenantScopedUser = async (page: Page): Promise<{ email: string; password: string }> => {
  const email = `qa-recurring-${randomUUID().slice(0, 8)}@example.com`;
  const password = 'SecurePass123!';
  const response = await page.request.post('/api/v1/auth/signup', {
    data: {
      email,
      password,
      firstName: 'QA',
      lastName: 'Recurring',
      householdName: `QA Recurring Household ${Date.now()}`,
    },
  });
  expect([200, 201]).toContain(response.status());
  return { email, password };
};

test.describe.skip('Recurring transactions', () => {
  test.beforeEach(async ({ page }) => {
    const credentials = await createTenantScopedUser(page);
    await login(page, credentials);
  });

  test('approves and posts a recurring instance @P1', async ({ page }) => {
    const payee = `QA Recurring ${Date.now()}`;
    let templateId: string | undefined;

    try {
      await page.goto('/recurring-transactions');
      const tenantAdminShellVisible = await page
        .getByRole('heading', { name: 'Tenant Administration' })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      test.skip(
        tenantAdminShellVisible,
        'Recurring transactions UI is unavailable while tenant-admin shell is active for this session.',
      );

      await ensureAtLeastOneActiveBudgetAccount(page);
      await ensureAtLeastOneActiveCategory(page);
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

      const rows = page.locator('[data-testid="recurring-instance-row"]', { hasText: payee });
      await expect(rows.first()).toBeVisible({ timeout: 15000 });
      const pendingCountBefore = await rows.count();
      const row = rows.first();

      await row.getByTestId('recurring-approve').click();
      await expect(row.getByTestId('recurring-post')).toBeVisible();

      await row.getByTestId('recurring-post').click();
      await expect
        .poll(async () => page.locator('[data-testid="recurring-instance-row"]', { hasText: payee }).count())
        .toBe(Math.max(0, pendingCountBefore - 1));

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
