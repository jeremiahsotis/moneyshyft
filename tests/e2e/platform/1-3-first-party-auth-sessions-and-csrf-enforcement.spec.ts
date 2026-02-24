import { test, expect, type Page } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';

type SessionCookies = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

const loginAsOperator = async (page: Page) => {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_EMAIL || 'operator@example.com');
  await page.fill('#password', process.env.TEST_PASSWORD || 'SecurePass123!');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/($|[#?])/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
};

const readSessionCookies = async (page: Page): Promise<SessionCookies> => {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === 'access_token')?.value ?? '';
  const refreshToken = cookies.find((cookie) => cookie.name === 'refresh_token')?.value ?? '';
  const csrfToken = cookies.find((cookie) => cookie.name === 'csrf_token')?.value ?? '';

  expect(accessToken).not.toBe('');
  expect(refreshToken).not.toBe('');
  expect(csrfToken).not.toBe('');

  return {
    accessToken,
    refreshToken,
    csrfToken,
  };
};

const buildCookieHeader = ({ accessToken, refreshToken, csrfToken }: SessionCookies): string =>
  `access_token=${accessToken}; refresh_token=${refreshToken}; csrf_token=${csrfToken}`;

test.describe('Story 1.3 automate - first-party auth sessions and csrf enforcement E2E coverage', () => {
  test('[P0] authenticated operator can refresh token and remain in valid session posture @P0', async ({ page, request }) => {
    await loginAsOperator(page);
    const sessionCookies = await readSessionCookies(page);

    const refreshResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      headers: {
        cookie: buildCookieHeader(sessionCookies),
        'x-csrf-token': sessionCookies.csrfToken,
      },
    });

    expect(refreshResponse.status()).toBe(200);
    const body = await refreshResponse.json();
    expect(body).toMatchObject({
      message: 'Token refreshed successfully',
    });
  });

  test('[P0] csrf middleware denies authenticated state-changing action when csrf header is missing @P0', async ({ page, request }) => {
    await loginAsOperator(page);
    const sessionCookies = await readSessionCookies(page);

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers: {
        cookie: buildCookieHeader(sessionCookies),
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

  test('[P1] csrf middleware allows authenticated state-changing action when csrf evidence is valid @P1', async ({ page, request }) => {
    await loginAsOperator(page);
    const sessionCookies = await readSessionCookies(page);

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers: {
        cookie: buildCookieHeader(sessionCookies),
        'x-csrf-token': sessionCookies.csrfToken,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Logged out successfully',
    });
  });
});
