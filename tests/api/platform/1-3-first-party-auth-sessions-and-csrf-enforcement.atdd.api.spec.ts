import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';

type AuthSessionCookies = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

const TEST_EMAIL = process.env.TEST_EMAIL || 'operator@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'SecurePass123!';

const getSetCookieHeaders = (response: APIResponse): string[] =>
  response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);

const extractCookie = (setCookieHeaders: string[], cookieName: string): string => {
  for (const cookieHeader of setCookieHeaders) {
    const [nameValue] = cookieHeader.split(';');
    const separatorIndex = nameValue.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const name = nameValue.slice(0, separatorIndex).trim();
    const value = nameValue.slice(separatorIndex + 1).trim();
    if (name === cookieName) {
      return value;
    }
  }

  return '';
};

const buildCookieHeader = ({ accessToken, refreshToken, csrfToken }: AuthSessionCookies): string =>
  `access_token=${accessToken}; refresh_token=${refreshToken}; csrf_token=${csrfToken}`;

const expectErrorMessage = (body: Record<string, unknown>, expectedMessage: string): void => {
  const candidates = [body.error, body.message];
  expect(candidates).toContain(expectedMessage);
};

const loginAndCaptureSessionCookies = async (request: APIRequestContext): Promise<AuthSessionCookies> => {
  const loginResponse = await apiRequest(request, {
    method: 'POST',
    path: '/api/v1/auth/login',
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rememberMe: false,
    },
  });

  expect(loginResponse.status()).toBe(200);
  const setCookieHeaders = getSetCookieHeaders(loginResponse);
  const accessToken = extractCookie(setCookieHeaders, 'access_token');
  const refreshToken = extractCookie(setCookieHeaders, 'refresh_token');
  const csrfToken = extractCookie(setCookieHeaders, 'csrf_token');

  expect(accessToken).not.toBe('');
  expect(refreshToken).not.toBe('');
  expect(csrfToken).not.toBe('');

  return {
    accessToken,
    refreshToken,
    csrfToken,
  };
};

test.describe('Story 1.3 First-Party Auth Sessions and CSRF Enforcement (ATDD API)', () => {
  test('[P0] rotates refresh session and rejects replay of prior refresh token @P0', async ({ request }) => {
    const session = await loginAndCaptureSessionCookies(request);

    const refreshResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      headers: {
        cookie: buildCookieHeader(session),
        'x-csrf-token': session.csrfToken,
      },
    });

    expect(refreshResponse.status()).toBe(200);
    const refreshSetCookies = getSetCookieHeaders(refreshResponse);
    const rotatedRefreshToken = extractCookie(refreshSetCookies, 'refresh_token');
    expect(rotatedRefreshToken).not.toBe('');
    expect(rotatedRefreshToken).not.toBe(session.refreshToken);

    const replayResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      headers: {
        cookie: `refresh_token=${session.refreshToken}; csrf_token=${session.csrfToken}`,
        'x-csrf-token': session.csrfToken,
      },
    });

    expect(replayResponse.status()).toBe(403);
    const replayBody = await replayResponse.json();
    expectErrorMessage(replayBody as Record<string, unknown>, 'Refresh token rejected');
  });

  test('[P0] blocks authenticated state-changing requests without CSRF header @P0', async ({ request }) => {
    const session = await loginAndCaptureSessionCookies(request);

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers: {
        cookie: buildCookieHeader(session),
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

  test('[P0] blocks authenticated state-changing requests on CSRF mismatch @P0', async ({ request }) => {
    const session = await loginAndCaptureSessionCookies(request);

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers: {
        cookie: buildCookieHeader(session),
        'x-csrf-token': 'csrf-mismatch-token',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_INVALID',
      refusalType: 'security',
    });
  });

  test('[P1] allows authenticated state-changing requests with valid CSRF evidence @P1', async ({ request }) => {
    const session = await loginAndCaptureSessionCookies(request);

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers: {
        cookie: buildCookieHeader(session),
        'x-csrf-token': session.csrfToken,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Logged out successfully',
    });
  });
});
