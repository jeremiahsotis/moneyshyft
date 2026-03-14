import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/moneyShyftStory24.fixture';

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

function transitionPath(commitmentId: string): string {
  return `/api/v1/route/commitments/${commitmentId}/transitions`;
}

test.describe('Story 2-4 Request-to-Commitment Linkage and Terminal Enforcement (ATDD API)', () => {
  test('[P0] enforces explicit request terminal states with canonical commitment linkage @P0', async ({
    request,
    story24Context,
    story24Headers,
    story24HappyPayload,
  }) => {
    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24HappyPayload,
    });

    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody).toMatchObject({
      ok: true,
      code: story24Context.successCode,
      data: {
        requestId: expect.any(String),
        commitmentId: expect.any(String),
        status: story24Context.statusLabel,
      },
    });

    const requestId = createBody?.data?.requestId as string;

    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story24Context.paths.resourceCollection, requestId),
      headers: story24Headers,
    });

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({
      ok: true,
      code: story24Context.linkageCode,
      data: {
        requestId,
        requestLifecycleStatus: 'committed',
        commitmentLifecycleStatus: 'scheduled',
      },
    });
  });

  test('[P0] returns explicit refusal outcomes and terminal lifecycle semantics without commitment leakage @P0', async ({
    request,
    story24Context,
    story24Headers,
    story24RefusalPayload,
  }) => {
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24RefusalPayload,
    });

    expect(refusalResponse.status()).toBe(200);
    const refusalBody = await refusalResponse.json();
    expect(refusalBody).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: story24Context.refusalCode,
      data: {
        requestId: expect.any(String),
        alternatives: expect.any(Array),
        nextSteps: expect.any(String),
      },
    });
    expect(refusalBody).not.toHaveProperty('data.commitmentId');

    const requestId = refusalBody?.data?.requestId as string;
    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story24Context.paths.resourceCollection, requestId),
      headers: story24Headers,
    });

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({
      ok: true,
      code: story24Context.refusalCode,
      data: {
        requestId,
        commitmentId: null,
        requestLifecycleStatus: expect.stringMatching(/^(refused|cancelled)$/),
      },
    });
  });

  test('[P0] preserves independent commitment lifecycle state after request terminalization @P0', async ({
    request,
    story24Context,
    story24Headers,
    story24HappyPayload,
  }) => {
    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24HappyPayload,
    });
    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    const requestId = createBody?.data?.requestId as string;
    const commitmentId = createBody?.data?.commitmentId as string;

    const transitionResponse = await apiRequest(request, {
      method: 'POST',
      path: transitionPath(commitmentId),
      headers: story24Headers,
      data: {
        nextStatus: 'in_progress',
        reason: 'Story 2.4 ATDD commitment lifecycle independence',
      },
    });
    expect(transitionResponse.status()).toBe(200);
    const transitionBody = await transitionResponse.json();
    expect(transitionBody).toMatchObject({
      ok: true,
      code: 'ROUTE_COMMITMENT_TRANSITION_APPLIED',
      data: {
        commitment: {
          commitmentId,
          status: 'in_progress',
        },
      },
    });

    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story24Context.paths.resourceCollection, requestId),
      headers: story24Headers,
    });
    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({
      ok: true,
      code: story24Context.linkageCode,
      data: {
        requestId,
        requestLifecycleStatus: 'committed',
        commitmentLifecycleStatus: 'in_progress',
      },
    });
  });

  test('[P1] exposes reconciliation actions and lifecycle status via unresolved queue endpoint @P1', async ({
    request,
    story24Headers,
  }) => {
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/route/intake/reconciliation/unresolved?staleMinutes=60',
      headers: story24Headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'MONEYSHYFT_INTAKE_RECONCILIATION_QUEUE',
      data: {
        staleThresholdMinutes: 60,
        guardrailStatus: expect.stringMatching(/^(clear|action_required)$/),
        items: expect.any(Array),
      },
    });
  });

  test('[P1] keeps envelope keys stable for success refusal and detail outcomes @P1', async ({
    request,
    story24Context,
    story24Headers,
    story24HappyPayload,
    story24RefusalPayload,
  }) => {
    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24HappyPayload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24RefusalPayload,
    });

    expect(successResponse.status()).toBe(200);
    expect(refusalResponse.status()).toBe(200);

    const successBody = await successResponse.json();
    const refusalBody = await refusalResponse.json();
    const detailRequestId = successBody?.data?.requestId as string;
    const detailResponse = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story24Context.paths.resourceCollection, detailRequestId),
      headers: story24Headers,
    });
    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

    for (const payload of [successBody, refusalBody, detailBody]) {
      expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(payload, key))).toBe(true);
    }
  });
});
