import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory24.fixture';

const REQUEST_ROUTE_IMPLEMENTATION_GAP =
  "Story 2.4 API implementation is not present yet ('/api/v1/route/requests').";
const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

function detailPath(resourceCollection: string, requestId: string): string {
  return resourceCollection + '/' + requestId;
}

function commitmentTransitionPath(commitmentId: string): string {
  return '/api/v1/route/commitments/' + commitmentId + '/transitions';
}

test.describe('Story 2.4 automate - request-to-commitment linkage API coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P0] enforces explicit terminal outcomes and rejects undefined request terminal states @P0',
    async ({ request, story24Context, story24Headers, story24HappyPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: story24Context.paths.resourceCollection,
        headers: story24Headers,
        data: story24HappyPayload,
      });

      expect(REQUEST_ROUTE_IMPLEMENTATION_GAP).toContain('/api/v1/route/requests');
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
      expect(body?.data?.terminalOutcome).toEqual(
        expect.stringMatching(/^(refused|cancelled|committed)$/),
      );
    },
  );

  test.fixme(
    '[P0] links accepted request outcomes to canonical commitment identifiers retrievable by request detail @P0',
    async ({ request, story24Context, story24Headers, story24HappyPayload }) => {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: story24Context.paths.resourceCollection,
        headers: story24Headers,
        data: story24HappyPayload,
      });

      expect(createResponse.status()).toBe(200);
      const createBody = await createResponse.json();
      const requestId = createBody?.data?.requestId ?? story24Context.requestId;
      const commitmentId = createBody?.data?.commitmentId ?? story24Context.commitmentId;

      expect(commitmentId).toEqual(expect.any(String));

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
          commitmentId,
        },
      });
    },
  );

  test.fixme(
    '[P0] preserves independent commitment lifecycle transitions after request terminalization @P0',
    async ({ request, story24Context, story24Headers, story24HappyPayload }) => {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: story24Context.paths.resourceCollection,
        headers: story24Headers,
        data: story24HappyPayload,
      });

      expect(createResponse.status()).toBe(200);
      const createBody = await createResponse.json();
      const commitmentId = createBody?.data?.commitmentId ?? story24Context.commitmentId;

      const transitionResponse = await apiRequest(request, {
        method: 'POST',
        path: commitmentTransitionPath(commitmentId),
        headers: story24Headers,
        data: {
          nextStatus: 'completed',
          reason: 'story-2-4-terminal-independence-check',
        },
      });

      expect(transitionResponse.status()).toBe(200);
      const transitionBody = await transitionResponse.json();
      expect(transitionBody).toMatchObject({
        ok: true,
        data: {
          commitmentId,
          status: 'completed',
        },
      });
    },
  );

  test.fixme(
    '[P1] returns reconciliation metadata for refusal outcomes and omits commitment linkage identifiers @P1',
    async ({ request, story24Context, story24Headers, story24RefusalPayload }) => {
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
          reconciliationActions: expect.anything(),
          lifecycleStatus: expect.any(String),
        },
      });
      expect(body).not.toHaveProperty('data.commitmentId');
    },
  );

  test.fixme(
    '[P1] refuses cross-tenant request detail access without leaking commitment linkage data @P1',
    async ({ request, story24Context, story24Headers, story24HappyPayload }) => {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: story24Context.paths.resourceCollection,
        headers: story24Headers,
        data: story24HappyPayload,
      });
      const createBody = await createResponse.json();
      const requestId = createBody?.data?.requestId ?? story24Context.requestId;

      const crossTenantHeaders = {
        ...story24Headers,
        'x-tenant-id': 'tenant-routeshyft-bravo',
      };

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: detailPath(story24Context.paths.resourceCollection, requestId),
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

  test.fixme(
    '[P1] preserves canonical top-level envelope keys across success refusal and detail contract responses @P1',
    async ({ request, story24Context, story24Headers, story24HappyPayload, story24RefusalPayload }) => {
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

      const successBody = await successResponse.json();
      const refusalBody = await refusalResponse.json();
      const detailRequestId = successBody?.data?.requestId ?? story24Context.requestId;

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: detailPath(story24Context.paths.resourceCollection, detailRequestId),
        headers: story24Headers,
      });
      const detailBody = await detailResponse.json();

      expect(successResponse.status()).toBe(200);
      expect(refusalResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      for (const payload of [successBody, refusalBody, detailBody]) {
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(payload, key)),
        ).toBe(true);
      }
    },
  );
});
