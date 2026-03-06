import type { Page } from '@playwright/test';

export const mockCsrfGuardPass = async (page: Page) => {
  await page.route('**/api/v1/platform/_kernel/security/csrf/guard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, code: 'CSRF_GUARD_PASSED' }),
    });
  });
};
