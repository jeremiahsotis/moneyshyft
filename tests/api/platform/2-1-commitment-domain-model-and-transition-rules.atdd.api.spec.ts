import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory21.fixture';

function transitionPath(commitmentsCollection: string, commitmentId: string): string {
  return `${commitmentsCollection}/${commitmentId}/transition`;
}

test.describe('Story 2.1 Commitment Domain Model and Transition Rules (ATDD API RED)', () => {
  test.skip(
    '[P0] allows valid lifecycle transition draft->scheduled and returns explicit next-state details @P0',
    async ({ request, story21Context, story21Headers, story21CreatePayload, story21ValidTransitionPayload }) => {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: story21Context.paths.commitmentsCollection,
        headers: story21Headers,
        data: story21CreatePayload,
      });

      expect(createResponse.status()).toBe(201);
      const createBody = await createResponse.json();
      expect(createBody).toMatchObject({
        ok: true,
        code: 'ROUTESHYFT_COMMITMENT_CREATED',
        data: {
          commitment: {
            status: 'draft',
          },
        },
      });

      const commitmentId = createBody?.data?.commitment?.id ?? story21Context.commitmentId;
      const response = await apiRequest(request, {
        method: 'POST',
        path: transitionPath(story21Context.paths.commitmentsCollection, commitmentId),
        headers: story21Headers,
        data: story21ValidTransitionPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        code: 'ROUTESHYFT_COMMITMENT_TRANSITION_APPLIED',
        data: {
          commitment: {
            id: commitmentId,
            previousStatus: story21Context.validTransition.from,
            status: story21Context.validTransition.to,
            actionableState: expect.any(String),
          },
        },
      });
    },
  );

  test.skip(
    '[P0] refuses invalid lifecycle transitions with deterministic business refusal details @P0',
    async ({ request, story21Context, story21Headers, story21InvalidTransitionPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: transitionPath(story21Context.paths.commitmentsCollection, story21Context.commitmentId),
        headers: story21Headers,
        data: story21InvalidTransitionPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        refusalType: 'business',
        code: 'ROUTESHYFT_COMMITMENT_TRANSITION_INVALID',
        message: expect.stringContaining('transition'),
        data: {
          commitmentId: story21Context.commitmentId,
          fromStatus: story21Context.invalidTransition.from,
          toStatus: story21Context.invalidTransition.to,
          actionableState: expect.any(String),
          refusalDetails: expect.any(Object),
        },
      });
    },
  );

  test.skip(
    '[P0] enforces terminal-state immutability after commitment reaches completed status @P0',
    async ({ request, story21Context, story21Headers, story21TerminalTransitionPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: transitionPath(story21Context.paths.commitmentsCollection, story21Context.commitmentId),
        headers: story21Headers,
        data: story21TerminalTransitionPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        refusalType: 'business',
        code: 'ROUTESHYFT_COMMITMENT_TERMINAL_STATE_IMMUTABLE',
        data: {
          commitmentId: story21Context.commitmentId,
          terminalStatus: story21Context.terminalStatus,
          actionableState: expect.any(String),
        },
      });
    },
  );

  test.skip(
    '[P1] surfaces transition audit metadata (actor, reason, timestamp, previous/new state) in API contract @P1',
    async ({ request, story21Context, story21Headers, story21ValidTransitionPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: transitionPath(story21Context.paths.commitmentsCollection, story21Context.commitmentId),
        headers: story21Headers,
        data: story21ValidTransitionPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        code: 'ROUTESHYFT_COMMITMENT_TRANSITION_APPLIED',
        data: {
          audit: {
            actorId: expect.any(String),
            actorType: 'dispatcher',
            reason: story21ValidTransitionPayload.reason,
            previousStatus: story21Context.validTransition.from,
            newStatus: story21Context.validTransition.to,
            timestampUtc: expect.any(String),
          },
        },
      });
    },
  );

  test.skip(
    '[P1] keeps shared response envelope keys consistent across success and refusal transition paths @P1',
    async ({ request, story21Context, story21Headers, story21ValidTransitionPayload, story21InvalidTransitionPayload }) => {
      const successResponse = await apiRequest(request, {
        method: 'POST',
        path: transitionPath(story21Context.paths.commitmentsCollection, story21Context.commitmentId),
        headers: story21Headers,
        data: story21ValidTransitionPayload,
      });
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: transitionPath(story21Context.paths.commitmentsCollection, story21Context.commitmentId),
        headers: story21Headers,
        data: story21InvalidTransitionPayload,
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
});
