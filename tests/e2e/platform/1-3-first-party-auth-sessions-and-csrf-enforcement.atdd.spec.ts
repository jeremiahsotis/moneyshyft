import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';

test.describe('Story 1.3 First-Party Auth Sessions and CSRF Enforcement (ATDD E2E RED)', () => {
  test.skip('[P0] operator login flow rotates refresh session and keeps authenticated posture @P0', async ({ page, request }) => {
    await page.goto('/login');

    await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const refreshResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      headers: {
        cookie: 'refresh_token=story-1-3-refresh-token',
      },
    });

    expect(refreshResponse.status()).toBe(200);
    const body = await refreshResponse.json();
    expect(body).toMatchObject({
      message: 'Token refreshed successfully',
    });
  });

  test.skip('[P0] state-changing request from app context is refused when csrf token is missing @P0', async ({ page, request }) => {
    await page.goto('/login');

    await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        'x-platform-tenant-id': 'tenant-auth-alpha',
        'x-platform-user-id': 'user-auth-alpha',
        'x-platform-user-role': 'TENANT_ADMIN',
      },
      data: {
        csrfToken: 'proof-token-without-header',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_REQUIRED',
      refusalType: 'security',
    });
  });

  test.skip('[P1] state-changing request succeeds when csrf header and proof token are valid @P1', async ({ page, request }) => {
    await page.goto('/login');

    await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        'x-platform-tenant-id': 'tenant-auth-alpha',
        'x-platform-user-id': 'user-auth-alpha',
        'x-platform-user-role': 'TENANT_ADMIN',
        'x-csrf-token': 'csrf-token-story-1-3-valid',
      },
      data: {
        csrfToken: 'csrf-token-story-1-3-valid',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'CSRF_GUARD_PASSED',
    });
  });
});
