import { expect, type Page } from '@playwright/test';

export const ensureAtLeastOneActiveBudgetAccount = async (page: Page): Promise<void> => {
  let accountsBody: { data?: unknown } = { data: [] };
  let accountsStatus = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const accountsResponse = await page.request.get('/api/v1/accounts');
    accountsStatus = accountsResponse.status();
    if (accountsResponse.ok()) {
      accountsBody = await accountsResponse.json();
      break;
    }
    await page.waitForTimeout(200);
  }
  expect(accountsStatus).toBe(200);
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
      name: `QA Test Account ${Date.now()}`,
      type: 'checking',
      starting_balance: 0,
      is_on_budget: true,
      is_active: true,
    },
  });
  expect([200, 201]).toContain(createAccountResponse.status());
};
