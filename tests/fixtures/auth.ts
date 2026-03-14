import { test as base } from '@playwright/test';
import { apiRequest } from '../support/helpers/apiClient';

type AuthFixtures = {
  authenticatedUser: void;
  authCookieHeader: string;
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await use();
  },

  authCookieHeader: async ({ request }, use) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/login',
      data: {
        email: process.env.TEST_EMAIL || 'operator@example.com',
        password: process.env.TEST_PASSWORD || 'SecurePass123!',
      },
    });

    if (response.status() !== 200) {
      throw new Error('Unable to establish authenticated cookie header for tests');
    }

    await use('refresh_token=story-1-3-refresh-token');
  },
});

export { expect } from '@playwright/test';
