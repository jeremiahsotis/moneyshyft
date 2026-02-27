import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory25.fixture';

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

test.describe('Story 2-5 Refusal Outcomes with Structured Alternatives (ATDD API RED)', () => {
  test.skip('[P0] persists refusal reason taxonomy and structured alternatives on refusal issuance @P0', async ({ request, story25Context, story25Headers, story25HappyPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story25Context.paths.resourceCollection,
      headers: story25Headers,
      data: story25HappyPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story25Context.successCode,
      data: {
        requestId: expect.any(String),
        status: story25Context.statusLabel,
      },
    });
  });

  test.skip('[P0] supports refusal persistence before and after commitment creation paths @P0', async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story25Context.paths.resourceCollection,
      headers: story25Headers,
      data: story25RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: story25Context.refusalCode,
      data: {
        alternatives: expect.any(Array),
        alternatives: expect.anything(),
      },
    });
  });

  test.skip('[P0] exposes refusal history as auditable lifecycle events @P0', async ({ request, story25Context, story25Headers, story25HappyPayload }) => {
    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: story25Context.paths.resourceCollection,
      headers: story25Headers,
      data: story25HappyPayload,
    });
    const createBody = await createResponse.json();
    const requestId = createBody?.data?.requestId ?? story25Context.requestId;

    const response = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story25Context.paths.resourceCollection, requestId),
      headers: story25Headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story25Context.linkageCode,
      data: {
        requestId,
        commitmentId: expect.any(String),
      },
    });
  });

  test.skip('[P1] returns explicit actionable alternatives and next-step contract fields @P1', async ({ request, story25Context, story25Headers, story25RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story25Context.paths.resourceCollection,
      headers: story25Headers,
      data: story25RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: story25Context.refusalCode,
      data: {
        alternatives: expect.anything(),
      },
    });
  });

  test.skip('[P1] keeps envelope keys stable for refusal persistence and validation-refusal outcomes @P1', async ({ request, story25Context, story25Headers, story25HappyPayload, story25RefusalPayload }) => {
    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: story25Context.paths.resourceCollection,
      headers: story25Headers,
      data: story25HappyPayload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: story25Context.paths.resourceCollection,
      headers: story25Headers,
      data: story25RefusalPayload,
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
