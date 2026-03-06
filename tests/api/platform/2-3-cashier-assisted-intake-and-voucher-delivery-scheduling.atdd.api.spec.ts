import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/moneyShyftStory23.fixture';

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

test.describe('Story 2-3 Cashier-Assisted Intake and Voucher Delivery Scheduling (ATDD API RED)', () => {
  test.skip('[P0] applies donor-equivalent validation and capacity rules to cashier-assisted intake @P0', async ({ request, story23Context, story23Headers, story23HappyPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story23Context.paths.resourceCollection,
      headers: story23Headers,
      data: story23HappyPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story23Context.successCode,
      data: {
        requestId: expect.any(String),
        status: story23Context.statusLabel,
      },
    });
  });

  test.skip('[P0] returns deterministic refusal outcomes with structured alternatives for cashier flow @P0', async ({ request, story23Context, story23Headers, story23RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story23Context.paths.resourceCollection,
      headers: story23Headers,
      data: story23RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      refusalType: 'business',
      code: story23Context.refusalCode,
      data: {
        alternatives: expect.any(Array),
        nextSteps: expect.anything(),
      },
    });
  });

  test.skip('[P0] creates request-to-commitment linkage for accepted cashier-assisted outcomes @P0', async ({ request, story23Context, story23Headers, story23HappyPayload }) => {
    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: story23Context.paths.resourceCollection,
      headers: story23Headers,
      data: story23HappyPayload,
    });
    const createBody = await createResponse.json();
    const requestId = createBody?.data?.requestId ?? story23Context.requestId;

    const response = await apiRequest(request, {
      method: 'GET',
      path: detailPath(story23Context.paths.resourceCollection, requestId),
      headers: story23Headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: story23Context.linkageCode,
      data: {
        requestId,
        commitmentId: expect.any(String),
      },
    });
  });

  test.skip('[P1] preserves donor/cashier parity contract fields for equivalent intake inputs @P1', async ({ request, story23Context, story23Headers, story23RefusalPayload }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: story23Context.paths.resourceCollection,
      headers: story23Headers,
      data: story23RefusalPayload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: story23Context.refusalCode,
      data: {
        nextSteps: expect.anything(),
      },
    });
  });

  test.skip('[P1] keeps envelope keys stable for cashier intake success and refusal outcomes @P1', async ({ request, story23Context, story23Headers, story23HappyPayload, story23RefusalPayload }) => {
    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: story23Context.paths.resourceCollection,
      headers: story23Headers,
      data: story23HappyPayload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: story23Context.paths.resourceCollection,
      headers: story23Headers,
      data: story23RefusalPayload,
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
