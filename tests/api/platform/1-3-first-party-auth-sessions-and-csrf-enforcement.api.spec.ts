import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createRefreshIssuePayload,
  createRefreshRotatePayload,
  createSessionHeaders,
} from '../../support/factories/sessionRotationFactory';
import { createCsrfGuardRequest } from '../../support/factories/csrfCookiePolicyFactory';

test.describe('Story 1.3 automate - first-party auth sessions and csrf enforcement API coverage', () => {
  test('[P0] persists refresh metadata and revokes prior session on rotation @P0', async ({ request }) => {
    const headers = createSessionHeaders({ tenantId: 'tenant-auth-alpha' });

    const issuePayload = createRefreshIssuePayload({
      userId: 'user-auth-alpha',
      refreshTokenId: 'refresh-auth-alpha',
      expiresInSeconds: 1800,
    });

    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers,
      data: issuePayload,
    });

    expect(issueResponse.status()).toBe(201);
    const issueBody = await issueResponse.json();
    expect(issueBody).toMatchObject({
      ok: true,
      session: {
        sessionId: expect.any(String),
        refreshTokenHash: expect.any(String),
        refreshTokenExpiresAt: expect.any(String),
        revokedAt: null,
      },
    });

    const rotatePayload = createRefreshRotatePayload({
      sessionId: issueBody.session.sessionId,
      presentedRefreshToken: 'refresh-auth-alpha',
      replacementRefreshTokenId: 'refresh-auth-beta',
    });

    const rotateResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: rotatePayload,
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

  test('[P0] rejects replayed refresh tokens after successful rotation @P0', async ({ request }) => {
    const headers = createSessionHeaders({ tenantId: 'tenant-auth-alpha' });

    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers,
      data: createRefreshIssuePayload({
        userId: 'user-auth-alpha',
        refreshTokenId: 'refresh-replay-alpha',
      }),
    });

    expect(issueResponse.status()).toBe(201);
    const issued = await issueResponse.json();

    const firstRotate = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: createRefreshRotatePayload({
        sessionId: issued.session.sessionId,
        presentedRefreshToken: 'refresh-replay-alpha',
        replacementRefreshTokenId: 'refresh-replay-beta',
      }),
    });

    expect(firstRotate.status()).toBe(200);

    const replayRotate = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: createRefreshRotatePayload({
        sessionId: issued.session.sessionId,
        presentedRefreshToken: 'refresh-replay-alpha',
        replacementRefreshTokenId: 'refresh-replay-gamma',
      }),
    });

    expect(replayRotate.status()).toBe(401);
    const replayBody = await replayRotate.json();
    expect(replayBody).toMatchObject({
      ok: false,
      code: 'REFRESH_TOKEN_REPLAY_DETECTED',
      refusalType: 'security',
    });
  });

  test('[P0] rejects csrf-guard mutation when csrf evidence is missing @P0', async ({ request }) => {
    const guard = createCsrfGuardRequest({ includeCsrfHeader: false });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: guard.headers,
      data: guard.payload,
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_REQUIRED',
      refusalType: 'security',
    });
  });

  test('[P0] rejects csrf-guard mutation on header/body mismatch @P0', async ({ request }) => {
    const guard = createCsrfGuardRequest({ csrfToken: 'csrf-story-1-3-valid' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        ...guard.headers,
        'x-csrf-token': 'csrf-story-1-3-invalid',
      },
      data: guard.payload,
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'CSRF_TOKEN_INVALID',
      refusalType: 'security',
    });
  });

  test('[P1] accepts csrf-guard mutation when header and proof token match @P1', async ({ request }) => {
    const guard = createCsrfGuardRequest({ csrfToken: 'csrf-story-1-3-pass' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: {
        ...guard.headers,
        'x-csrf-token': 'csrf-story-1-3-pass',
      },
      data: {
        ...guard.payload,
        csrfToken: 'csrf-story-1-3-pass',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'CSRF_GUARD_PASSED',
    });
  });

  test('[P2] rejects refresh rotation requests missing replacement token id @P2', async ({ request }) => {
    const headers = createSessionHeaders({ tenantId: 'tenant-auth-alpha' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers,
      data: createRefreshRotatePayload({
        sessionId: 'sess-invalid-alpha',
        presentedRefreshToken: 'refresh-alpha',
        replacementRefreshTokenId: '',
      }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'REFRESH_ROTATION_INVALID_REQUEST',
    });
  });
});
