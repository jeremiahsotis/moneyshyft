import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/moneyShyftStory22.fixture';

test.describe('Story 2-2 Donor Self-Service Pickup Intake with Capacity Check (Automate API Expansion)', () => {
  test.skip(
    '[P0] returns deterministic slot ordering and stable envelope keys for accepted intake @P0',
    async ({ request, story22Context, story22Headers, story22HappyPayload }) => {
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
          commitmentId: expect.any(String),
          slots: expect.any(Array),
        },
      });
      expect(Array.isArray(body?.data?.slots)).toBe(true);
    },
  );

  test.skip(
    '[P0] returns structured refusal alternatives with explicit reason metadata when capacity fails @P0',
    async ({ request, story22Context, story22Headers, story22RefusalPayload }) => {
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
          refusalReason: expect.any(String),
        },
      });
    },
  );

  test.skip(
    '[P0] preserves request-to-commitment lineage for repeated accepted intake submissions with same idempotency key @P0',
    async ({ request, story22Context, story22Headers, story22HappyPayload }) => {
      const headersWithIdempotency = {
        ...story22Headers,
        'x-idempotency-key': 'story22-intake-idempotency-key',
      };

      const firstResponse = await apiRequest(request, {
        method: 'POST',
        path: story22Context.paths.resourceCollection,
        headers: headersWithIdempotency,
        data: story22HappyPayload,
      });
      const secondResponse = await apiRequest(request, {
        method: 'POST',
        path: story22Context.paths.resourceCollection,
        headers: headersWithIdempotency,
        data: story22HappyPayload,
      });

      expect(firstResponse.status()).toBe(200);
      expect(secondResponse.status()).toBe(200);

      const firstBody = await firstResponse.json();
      const secondBody = await secondResponse.json();

      expect(firstBody?.data?.requestId).toBe(secondBody?.data?.requestId);
      expect(firstBody?.data?.commitmentId).toBe(secondBody?.data?.commitmentId);
    },
  );

  test.skip(
    '[P1] refuses missing required intake fields with business refusal and validation metadata @P1',
    async ({
      request,
      story22Context,
      story22Headers,
      story22InvalidPayloadMissingRequired,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: story22Context.paths.resourceCollection,
        headers: story22Headers,
        data: story22InvalidPayloadMissingRequired,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        refusalType: 'business',
        data: {
          fieldErrors: expect.any(Array),
        },
      });
    },
  );

  test.skip(
    '[P1] blocks cross-tenant request detail access and prevents commitment lineage leakage @P1',
    async ({ request, story22Context, story22Headers, story22HappyPayload }) => {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: story22Context.paths.resourceCollection,
        headers: story22Headers,
        data: story22HappyPayload,
      });
      const createBody = await createResponse.json();

      const crossTenantHeaders = {
        ...story22Headers,
        'x-tenant-id': 'tenant-moneyshyft-bravo',
      };

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: story22Context.paths.detail(createBody?.data?.requestId ?? story22Context.requestId),
        headers: crossTenantHeaders,
      });

      expect(detailResponse.status()).toBe(200);
      const detailBody = await detailResponse.json();
      expect(detailBody).toMatchObject({
        ok: false,
        refusalType: 'business',
      });
      expect(detailBody?.data?.commitmentId).toBeUndefined();
    },
  );
});