import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';

test.describe('Story 1.3 automate - first-party auth sessions and csrf enforcement E2E coverage', () => {
  test('[P0] authenticated operator can refresh token and remain in valid session posture @P0', async ({ page, request }) => {
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

  test('[P0] csrf guard denies state-changing action when csrf evidence is missing @P0', async ({ page, request }) => {
    await page.goto('/login');

    await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');

    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        'x-platform-tenant-id': 'tenant-auth-alpha',
        'x-platform-user-id': 'user-auth-alpha',
        'x-platform-user-role': 'TENANT_ADMIN',
      },
      data: {
        csrfToken: 'csrf-proof-without-header',
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

  test('[P1] csrf guard allows state-changing action when csrf evidence is valid @P1', async ({ page, request }) => {
    await page.goto('/login');

    await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');

    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

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
