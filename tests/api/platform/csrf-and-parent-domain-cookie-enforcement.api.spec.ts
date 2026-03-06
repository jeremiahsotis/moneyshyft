import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createCookiePolicyProbe,
  createCsrfGuardRequest,
  type EnvironmentName,
} from '../../support/factories/csrfCookiePolicyFactory';

test.describe('Story 0.4 automate - csrf and parent-domain cookie enforcement API coverage', () => {
  test('rejects state-changing requests when csrf token is missing @P0', async ({ request }) => {
    // Given a state-changing authenticated request without a CSRF header
    const csrfGuard = createCsrfGuardRequest({ includeCsrfHeader: false });

    // When the CSRF guard endpoint evaluates the request
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: csrfGuard.headers,
      data: csrfGuard.payload,
    });

    // Then request is rejected with deterministic CSRF refusal semantics
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_REQUIRED',
      refusalType: 'security',
    });
  });

  test('rejects state-changing requests when csrf token is invalid @P0', async ({ request }) => {
    // Given a state-changing authenticated request with mismatched CSRF token values
    const csrfGuard = createCsrfGuardRequest({ csrfToken: 'csrf-token-valid' });

    // When the header token does not match request proof token
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        ...csrfGuard.headers,
        'x-csrf-token': 'csrf-token-invalid',
      },
      data: csrfGuard.payload,
    });

    // Then request is rejected as invalid CSRF evidence
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_INVALID',
      refusalType: 'security',
    });
  });

  (['development', 'production'] as EnvironmentName[]).forEach((environment) => {
    test(`applies ${environment} cookie policy matrix for app.* / api.* topology @P1`, async ({ request }) => {
      // Given a cookie policy matrix evaluation probe for app/api sibling subdomains
      const cookieProbe = createCookiePolicyProbe({ environment });

      // When cookie policy is evaluated for the requested deployment environment
      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/cookies/policy/evaluate',
        headers: cookieProbe.headers,
        data: cookieProbe.payload,
      });

      // Then cookie settings align with the environment-safe policy matrix
      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: true,
        policy: {
          environment: cookieProbe.expected.environment,
          parentDomain: cookieProbe.expected.parentDomain,
          accessToken: {
            httpOnly: true,
            secure: cookieProbe.expected.secure,
            sameSite: cookieProbe.expected.sameSite,
            domain: cookieProbe.expected.parentDomain,
          },
          refreshToken: {
            httpOnly: true,
            secure: cookieProbe.expected.secure,
            sameSite: cookieProbe.expected.sameSite,
            domain: cookieProbe.expected.parentDomain,
          },
        },
      });
    });
  });
});
