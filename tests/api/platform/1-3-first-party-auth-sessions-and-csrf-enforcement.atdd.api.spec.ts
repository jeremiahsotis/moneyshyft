import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';

test.describe('Story 1.3 First-Party Auth Sessions and CSRF Enforcement (ATDD API RED)', () => {
  test.skip('[P0] persists refresh rotation with revocation metadata in session records @P0', async ({ request }) => {
    const headers = {
      'x-platform-tenant-id': 'tenant-auth-alpha',
      'x-platform-user-id': 'user-auth-alpha',
      'x-platform-user-role': 'SYSTEM_ADMIN',
    };

    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers,
      data: {
        refreshTokenId: 'refresh-token-story-1-3-alpha',
        userId: 'user-auth-alpha',
        expiresInSeconds: 3600,
      },
    });

    expect(issueResponse.status()).toBe(201);
    const issueBody = await issueResponse.json();
    expect(issueBody).toMatchObject({
      ok: true,
      session: {
        sessionId: expect.any(String),
        refreshTokenHash: expect.any(String),
        revokedAt: null,
      },
    });

    const rotateResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: {
        sessionId: issueBody.session.sessionId,
        presentedRefreshToken: 'refresh-token-story-1-3-alpha',
        replacementRefreshTokenId: 'refresh-token-story-1-3-beta',
      },
    });

    expect(rotateResponse.status()).toBe(200);
    const rotateBody = await rotateResponse.json();
    expect(rotateBody).toMatchObject({
      ok: true,
      rotated: {
        priorSessionId: issueBody.session.sessionId,
        priorRevokedAt: expect.any(String),
        replacementSessionId: expect.any(String),
      },
    });
  });

  test.skip('[P0] rejects replayed refresh token usage after successful rotation @P0', async ({ request }) => {
    const headers = {
      'x-platform-tenant-id': 'tenant-auth-alpha',
      'x-platform-user-id': 'user-auth-alpha',
      'x-platform-user-role': 'SYSTEM_ADMIN',
    };

    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers,
      data: {
        refreshTokenId: 'refresh-token-story-1-3-replay',
        userId: 'user-auth-alpha',
        expiresInSeconds: 3600,
      },
    });

    expect(issueResponse.status()).toBe(201);
    const issueBody = await issueResponse.json();

    const firstRotate = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: {
        sessionId: issueBody.session.sessionId,
        presentedRefreshToken: 'refresh-token-story-1-3-replay',
        replacementRefreshTokenId: 'refresh-token-story-1-3-replay-next',
      },
    });

    expect(firstRotate.status()).toBe(200);

    const replayRotate = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: {
        sessionId: issueBody.session.sessionId,
        presentedRefreshToken: 'refresh-token-story-1-3-replay',
        replacementRefreshTokenId: 'refresh-token-story-1-3-replay-third',
      },
    });

    expect(replayRotate.status()).toBe(401);
    const replayBody = await replayRotate.json();
    expect(replayBody).toMatchObject({
      ok: false,
      code: 'REFRESH_TOKEN_REPLAY_DETECTED',
      refusalType: 'security',
    });
  });

  test.skip('[P0] blocks state-changing requests without csrf token evidence @P0', async ({ request }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        'x-platform-tenant-id': 'tenant-auth-alpha',
        'x-platform-user-id': 'user-auth-alpha',
        'x-platform-user-role': 'TENANT_ADMIN',
      },
      data: {
        csrfToken: 'csrf-proof-token-alpha',
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

  test.skip('[P0] blocks state-changing requests when csrf header and proof mismatch @P0', async ({ request }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        'x-platform-tenant-id': 'tenant-auth-alpha',
        'x-platform-user-id': 'user-auth-alpha',
        'x-platform-user-role': 'TENANT_ADMIN',
        'x-csrf-token': 'csrf-header-token-invalid',
      },
      data: {
        csrfToken: 'csrf-proof-token-valid',
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

  test.skip('[P1] enforces parent-domain secure cookie policy matrix for app/api topology @P1', async ({ request }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/cookies/policy/evaluate',
      headers: {
        'x-platform-tenant-id': 'tenant-auth-alpha',
        'x-platform-user-id': 'user-auth-alpha',
        'x-platform-user-role': 'SYSTEM_ADMIN',
      },
      data: {
        environment: 'production',
        appHost: 'app.moneyshyft.test',
        apiHost: 'api.moneyshyft.test',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      policy: {
        parentDomain: '.moneyshyft.test',
        accessToken: {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          domain: '.moneyshyft.test',
        },
        refreshToken: {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          domain: '.moneyshyft.test',
        },
      },
    });
  });
});
