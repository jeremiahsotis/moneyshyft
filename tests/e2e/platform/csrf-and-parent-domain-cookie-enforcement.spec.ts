import { test, expect } from '../../support/fixtures/csrfCookiePolicy.fixture';
import { apiRequest } from '../../support/helpers/apiClient';

test.describe('Story 0.4 automate - csrf and parent-domain cookie enforcement journey', () => {
  test('blocks cross-subdomain state-changing fetch when csrf header is missing @P0', async ({
    request,
    csrfGuardRequestWithoutToken,
  }) => {
    // Given app-origin request headers without CSRF proof token
    // When the state-changing kernel endpoint evaluates the request
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: csrfGuardRequestWithoutToken.headers,
      data: csrfGuardRequestWithoutToken.payload,
    });

    // Then CSRF guard rejects the request deterministically
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_REQUIRED',
      refusalType: 'security',
    });
  });

  test('accepts cross-subdomain state-changing fetch when csrf proof pair is valid @P1', async ({
    request,
    csrfGuardRequest,
  }) => {
    // Given app-origin request headers include valid CSRF header/body token pair
    // When the state-changing kernel endpoint evaluates the request
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: csrfGuardRequest.headers,
      data: csrfGuardRequest.payload,
    });

    // Then request is accepted and mutation proceeds safely
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'CSRF_GUARD_PASSED',
    });
  });

  test('sets parent-domain cookie attributes that are shared by app and api hosts @P1', async ({
    request,
    cookiePolicyProbe,
  }) => {
    // Given production cookie policy bootstrap for sibling subdomains
    const bootstrapResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/cookies/bootstrap',
      headers: cookiePolicyProbe.headers,
      data: cookiePolicyProbe.payload,
    });

    // Then bootstrap succeeds and emits parent-domain cookies
    expect(bootstrapResponse.status()).toBe(200);
    const body = await bootstrapResponse.json();
    expect(body).toMatchObject({
      ok: true,
      cookies: {
        accessToken: {
          domain: cookiePolicyProbe.expected.parentDomain,
          httpOnly: true,
          secure: cookiePolicyProbe.expected.secure,
          sameSite: 'Strict',
        },
        refreshToken: {
          domain: cookiePolicyProbe.expected.parentDomain,
          httpOnly: true,
          secure: cookiePolicyProbe.expected.secure,
          sameSite: 'Strict',
        },
      },
    });
  });
});
