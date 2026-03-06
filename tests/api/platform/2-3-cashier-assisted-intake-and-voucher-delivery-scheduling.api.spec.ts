import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory23.fixture';

const CASHIER_ROUTE_IMPLEMENTATION_GAP =
  "Story 2.3 API implementation is not present yet ('/api/v1/route/intake/cashier-requests').";

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

test.describe('Story 2.3 automate - cashier-assisted intake API coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P0] applies donor-equivalent validation and capacity rules for cashier-assisted intake @P0',
    async ({ request, story23Context, story23Headers, story23HappyPayload }) => {
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
    },
  );

  test.fixme(
    '[P0] returns deterministic refusal alternatives and next-steps for constrained cashier scheduling @P0',
    async ({ request, story23Context, story23Headers, story23RefusalPayload }) => {
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
      expect(body).not.toHaveProperty('data.commitmentId');
    },
  );

  test.fixme(
    '[P0] links accepted cashier-assisted requests to commitment identifiers through detail lookup @P0',
    async ({ request, story23Context, story23Headers, story23HappyPayload }) => {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: story23Context.paths.resourceCollection,
        headers: story23Headers,
        data: story23HappyPayload,
      });
      const createBody = await createResponse.json();
      const requestId = createBody?.data?.requestId ?? story23Context.requestId;

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: detailPath(story23Context.paths.resourceCollection, requestId),
        headers: story23Headers,
      });

      expect(detailResponse.status()).toBe(200);
      const detailBody = await detailResponse.json();
      expect(detailBody).toMatchObject({
        ok: true,
        code: story23Context.linkageCode,
        data: {
          requestId,
          commitmentId: expect.any(String),
        },
      });
    },
  );

  test.fixme(
    '[P1] enforces pickup-first delivery insertion constraints with business refusal on invalid windows @P1',
    async ({ request, story23Context, story23Headers, story23HappyPayload }) => {
      const deliveryConstraintPayload = {
        ...story23HappyPayload,
        requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
        forceRefusal: true,
        notes: 'Automate P1 constrained delivery insertion refusal check',
      };

      const response = await apiRequest(request, {
        method: 'POST',
        path: story23Context.paths.resourceCollection,
        headers: story23Headers,
        data: deliveryConstraintPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: story23Context.refusalCode,
        refusalType: 'business',
      });
    },
  );

  test.fixme(
    '[P1] preserves donor/cashier parity envelope fields for equivalent intake payloads @P1',
    async ({ request, story23Context, story23Headers, story23HappyPayload, story23RefusalPayload }) => {
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
    },
  );

  test.fixme(
    '[P1] keeps refusal outcomes isolated from commitment-linkage fields when intake cannot be scheduled @P1',
    async ({ request, story23Context, story23Headers, story23RefusalPayload }) => {
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: story23Context.paths.resourceCollection,
        headers: story23Headers,
        data: story23RefusalPayload,
      });

      expect(refusalResponse.status()).toBe(200);
      const refusalBody = await refusalResponse.json();
      expect(refusalBody).toMatchObject({
        ok: false,
        code: story23Context.refusalCode,
      });
      expect(refusalBody).not.toHaveProperty('data.commitmentId');
      expect(refusalBody).toHaveProperty('data.nextSteps');
    },
  );
});
