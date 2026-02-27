import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory22.fixture';

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

test.describe('Story 2-2 Donor Self-Service Pickup Intake with Capacity Check (ATDD API RED)', () => {
  test.skip('[P0] returns schedulable slots for eligible donor intake and capacity pass @P0', async ({ request, story22Context, story22Headers, story22HappyPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story22Context.paths.resourceCollection,
      headers: story22Headers,
      data: story22HappyPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story22Context.successCode,
      data: {
        requestId: expect.any(String),
        status: story22Context.statusLabel,
      },
    });
  });

  test.skip('[P0] returns explicit refusal with structured alternatives when capacity fails @P0', async ({ request, story22Context, story22Headers, story22RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story22Context.paths.resourceCollection,
      headers: story22Headers,
      data: story22RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: story22Context.refusalCode,
      data: {
        alternatives: expect.any(Array),
        nextSteps: expect.anything(),
      },
    });
  });

  test.skip('[P0] creates and returns request-to-commitment linkage for accepted intake outcomes @P0', async ({ request, story22Context, story22Headers, story22HappyPayload }) => {
    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: story22Context.paths.resourceCollection,
      headers: story22Headers,
      data: story22HappyPayload,
    });
    const createBody = await createResponse.json();
    const requestId = createBody?.data?.requestId ?? story22Context.requestId;

    const response = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story22Context.paths.resourceCollection, requestId),
      headers: story22Headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story22Context.linkageCode,
      data: {
        requestId,
        commitmentId: expect.any(String),
      },
    });
  });

  test.skip('[P1] includes actionable next steps in both schedulable and refusal outcomes @P1', async ({ request, story22Context, story22Headers, story22RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story22Context.paths.resourceCollection,
      headers: story22Headers,
      data: story22RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: story22Context.refusalCode,
      data: {
        nextSteps: expect.anything(),
      },
    });
  });

  test.skip('[P1] keeps envelope keys stable for donor intake success and refusal outcomes @P1', async ({ request, story22Context, story22Headers, story22HappyPayload, story22RefusalPayload }) => {
    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: story22Context.paths.resourceCollection,
      headers: story22Headers,
      data: story22HappyPayload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: story22Context.paths.resourceCollection,
      headers: story22Headers,
      data: story22RefusalPayload,
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
