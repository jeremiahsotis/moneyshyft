import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/routeShyftStory21.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

type CreateCommitmentResult = {
  commitmentId: string;
};

function transitionPath(commitmentsCollection: string, commitmentId: string): string {
  return commitmentsCollection + '/' + commitmentId + '/transition';
}

async function createCommitment(
  request: Parameters<typeof apiRequest>[0],
  story21Context: {
    paths: { commitmentsCollection: string };
    commitmentId: string;
  },
  story21Headers: Record<string, string>,
  story21CreatePayload: Record<string, unknown>,
): Promise<CreateCommitmentResult> {
  const response = await apiRequest(request, {
    method: 'POST',
    path: story21Context.paths.commitmentsCollection,
    headers: story21Headers,
    data: story21CreatePayload,
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    code: 'ROUTESHYFT_COMMITMENT_CREATED',
    data: {
      commitment: {
        status: 'draft',
      },
    },
  });

  const commitmentId = body?.data?.commitment?.id ?? story21Context.commitmentId;
  expect(typeof commitmentId).toBe('string');

  return {
    commitmentId,
  };
}

test.describe(
  'Story 2.1 automate - commitment domain model and transition rules API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] applies valid draft->scheduled transitions with explicit next-state details in response contract @P0',
      async ({
        request,
        story21Context,
        story21Headers,
        story21CreatePayload,
        story21ValidTransitionPayload,
      }) => {
        const seeded = await createCommitment(
          request,
          story21Context,
          story21Headers,
          story21CreatePayload,
        );

        const response = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
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
              id: seeded.commitmentId,
              previousStatus: story21Context.validTransition.from,
              status: story21Context.validTransition.to,
              actionableState: expect.any(String),
            },
          },
        });
      },
    );

    test(
      '[P0] refuses invalid transition attempts with deterministic refusal semantics and actionable details @P0',
      async ({
        request,
        story21Context,
        story21Headers,
        story21CreatePayload,
        story21InvalidTransitionPayload,
      }) => {
        const seeded = await createCommitment(
          request,
          story21Context,
          story21Headers,
          story21CreatePayload,
        );

        const response = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
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
            commitmentId: seeded.commitmentId,
            actionableState: expect.any(String),
            refusalDetails: expect.any(Object),
          },
        });
      },
    );

    test(
      '[P0] blocks further state changes once commitment reaches terminal status @P0',
      async ({
        request,
        story21Context,
        story21Headers,
        story21CreatePayload,
        story21ValidTransitionPayload,
        story21TerminalTransitionPayload,
      }) => {
        const seeded = await createCommitment(
          request,
          story21Context,
          story21Headers,
          story21CreatePayload,
        );

        const completePayload = {
          toStatus: 'completed',
          reason: 'Dispatcher marked commitment complete',
          actorType: 'dispatcher',
        };

        const toScheduledResponse = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
          headers: story21Headers,
          data: story21ValidTransitionPayload,
        });
        expect(toScheduledResponse.status()).toBe(200);

        const toCompletedResponse = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
          headers: story21Headers,
          data: completePayload,
        });
        expect(toCompletedResponse.status()).toBe(200);

        const terminalMutationResponse = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
          headers: story21Headers,
          data: story21TerminalTransitionPayload,
        });

        expect(terminalMutationResponse.status()).toBe(200);
        const terminalMutationBody = await terminalMutationResponse.json();
        expect(terminalMutationBody).toMatchObject({
          ok: false,
          refusalType: 'business',
          code: 'ROUTESHYFT_COMMITMENT_TERMINAL_STATE_IMMUTABLE',
          data: {
            commitmentId: seeded.commitmentId,
            terminalStatus: story21Context.terminalStatus,
            actionableState: expect.any(String),
          },
        });
      },
    );

    test(
      '[P1] refuses transition mutations with missing reason and keeps refusal path explicit @P1',
      async ({ request, story21Context, story21Headers, story21CreatePayload }) => {
        const seeded = await createCommitment(
          request,
          story21Context,
          story21Headers,
          story21CreatePayload,
        );

        const response = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
          headers: story21Headers,
          data: {
            toStatus: 'scheduled',
            reason: '',
            actorType: 'dispatcher',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'business',
          message: expect.stringContaining('reason'),
          data: {
            commitmentId: seeded.commitmentId,
            actionableState: expect.any(String),
          },
        });
      },
    );

    test(
      '[P1] includes transition audit metadata for accepted transitions in canonical response envelope @P1',
      async ({
        request,
        story21Context,
        story21Headers,
        story21CreatePayload,
        story21ValidTransitionPayload,
      }) => {
        const seeded = await createCommitment(
          request,
          story21Context,
          story21Headers,
          story21CreatePayload,
        );

        const response = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
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

    test(
      '[P1] preserves canonical envelope keys across success and refusal transition outcomes @P1',
      async ({
        request,
        story21Context,
        story21Headers,
        story21CreatePayload,
        story21ValidTransitionPayload,
      }) => {
        const seeded = await createCommitment(
          request,
          story21Context,
          story21Headers,
          story21CreatePayload,
        );

        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(story21Context.paths.commitmentsCollection, seeded.commitmentId),
          headers: story21Headers,
          data: story21ValidTransitionPayload,
        });

        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: transitionPath(
            story21Context.paths.commitmentsCollection,
            seeded.commitmentId + '-missing',
          ),
          headers: story21Headers,
          data: story21ValidTransitionPayload,
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();

        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(successBody, key),
          ),
        ).toBe(true);

        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(refusalBody, key),
          ),
        ).toBe(true);

        expect(refusalBody.ok).toBe(false);
      },
    );
  },
);
