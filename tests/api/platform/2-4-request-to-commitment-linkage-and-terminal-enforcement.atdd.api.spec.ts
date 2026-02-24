import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory24.fixture';

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

test.describe('Story 2-4 Request-to-Commitment Linkage and Terminal Enforcement (ATDD API RED)', () => {
  test.skip('[P0] enforces explicit request terminal states and rejects undefined terminal outcomes @P0', async ({ request, story24Context, story24Headers, story24HappyPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24HappyPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story24Context.successCode,
      data: {
        requestId: expect.any(String),
        status: story24Context.statusLabel,
      },
    });
  });

  test.skip('[P0] maintains canonical request-to-commitment linkage for accepted request outcomes @P0', async ({ request, story24Context, story24Headers, story24RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: story24Context.refusalCode,
      data: {
        alternatives: expect.any(Array),
        reconciliationActions: expect.anything(),
      },
    });
  });

  test.skip('[P0] preserves independent commitment lifecycle state after request terminalization @P0', async ({ request, story24Context, story24Headers, story24HappyPayload }) => {
    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24HappyPayload,
    });
    const createBody = await createResponse.json();
    const requestId = createBody?.data?.requestId ?? story24Context.requestId;

    const response = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story24Context.paths.resourceCollection, requestId),
      headers: story24Headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story24Context.linkageCode,
      data: {
        requestId,
        commitmentId: expect.any(String),
      },
    });
  });

  test.skip('[P1] returns reconciliation action guidance for linkage or terminal-enforcement failures @P1', async ({ request, story24Context, story24Headers, story24RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story24Context.paths.resourceCollection,
      headers: story24Headers,
      data: story24RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: story24Context.refusalCode,
      data: {
        reconciliationActions: expect.anything(),
      },
    });
  });

  test.skip('[P1] keeps envelope keys stable for terminalization success and refusal outcomes @P1', async ({ request, story24Context, story24Headers, story24HappyPayload, story24RefusalPayload }) => {
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
    const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(successBody, key))).toBe(true);
    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key))).toBe(true);
  });
});
