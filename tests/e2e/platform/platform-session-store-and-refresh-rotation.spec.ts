import { test, expect } from '../../support/fixtures/sessionRotation.fixture';
import { apiRequest } from '../../support/helpers/apiClient';

test.describe('Story 0.3 automate - platform session store and refresh rotation journey', () => {
  test('issues refresh session, rotates it, and marks prior session revoked @P0', async ({
    request,
    sessionHeaders,
    refreshIssuePayload,
    refreshRotatePayload,
  }) => {
    // Given a first-party refresh issue contract request
    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers: sessionHeaders,
      data: refreshIssuePayload,
    });

    // Then session metadata is persisted
    expect(issueResponse.status()).toBe(201);
    const issueBody = await issueResponse.json();
    expect(issueBody).toMatchObject({
      ok: true,
      session: {
        refreshTokenHash: expect.any(String),
        revokedAt: null,
      },
    });

    // When refresh rotation runs for the same lifecycle
    const rotateResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers: sessionHeaders,
      data: {
        ...refreshRotatePayload,
        sessionId: issueBody.session.sessionId,
      },
    });

    // Then previous session state is revoked and replacement is issued
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

  test('rejects replay of an already-rotated refresh token in journey flow @P1', async ({
    request,
    sessionHeaders,
    refreshIssuePayload,
    refreshRotatePayload,
  }) => {
    // Given a session is issued and rotated once
    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers: sessionHeaders,
      data: refreshIssuePayload,
    });
    expect(issueResponse.status()).toBe(201);
    const issueBody = await issueResponse.json();

    const firstRotate = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers: sessionHeaders,
      data: {
        ...refreshRotatePayload,
        sessionId: issueBody.session.sessionId,
      },
    });
    expect(firstRotate.status()).toBe(200);

    // When the same prior refresh token is presented again
    const replayResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers: sessionHeaders,
      data: {
        ...refreshRotatePayload,
        sessionId: issueBody.session.sessionId,
      },
    });

    // Then replay detection rejects it deterministically
    expect(replayResponse.status()).toBe(401);
    const replayBody = await replayResponse.json();
    expect(replayBody).toMatchObject({
      ok: false,
      code: 'REFRESH_TOKEN_REPLAY_DETECTED',
      refusalType: 'security',
    });
  });

  test('rejects refresh rotation after explicit revocation in journey flow @P1', async ({
    request,
    sessionHeaders,
    refreshIssuePayload,
    refreshRotatePayload,
    refreshRevokePayload,
  }) => {
    // Given a session has been issued
    const issueResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/issue',
      headers: sessionHeaders,
      data: refreshIssuePayload,
    });
    expect(issueResponse.status()).toBe(201);
    const issueBody = await issueResponse.json();

    // And explicitly revoked
    const revokeResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/revoke',
      headers: sessionHeaders,
      data: {
        ...refreshRevokePayload,
        sessionId: issueBody.session.sessionId,
      },
    });
    expect(revokeResponse.status()).toBe(200);

    // When refresh rotation is attempted after revocation
    const rotateAfterRevoke = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/sessions/refresh/rotate',
      headers: sessionHeaders,
      data: {
        ...refreshRotatePayload,
        sessionId: issueBody.session.sessionId,
      },
    });

    // Then request is rejected with revoked token semantics
    expect(rotateAfterRevoke.status()).toBe(401);
    const body = await rotateAfterRevoke.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'REFRESH_TOKEN_REVOKED',
      refusalType: 'security',
    });
  });
});
