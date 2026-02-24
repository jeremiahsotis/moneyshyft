import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC5.fixture';

test.describe(
  'Story c.5 Deterministic Escalation Scheduler with Claim-Only Reset (ATDD API RED)',
  () => {
    test.skip(
      '[P0] scheduler progresses unclaimed threads with persisted X-2X-3X timing and no in-memory timer dependency @P0',
      async ({
        request,
        storyC5Context,
        storyC5SchedulerHeaders,
        storyC5SchedulerRunPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.schedulerEvaluate,
          headers: storyC5SchedulerHeaders,
          data: storyC5SchedulerRunPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
          data: {
            baselineHours: storyC5Context.escalationBaselineHours.valid,
            transitions: expect.arrayContaining([
              expect.objectContaining({
                threadId: storyC5Context.threadId,
                stage: 1,
                nextDueOffsetHours: storyC5Context.escalationBaselineHours.valid,
              }),
              expect.objectContaining({
                threadId: storyC5Context.threadId,
                stage: 2,
                nextDueOffsetHours: storyC5Context.escalationBaselineHours.valid * 2,
              }),
              expect.objectContaining({
                threadId: storyC5Context.threadId,
                stage: 3,
                nextDueOffsetHours: storyC5Context.escalationBaselineHours.valid * 3,
              }),
            ]),
          },
        });
      },
    );

    test.skip(
      '[P0] explicit claim resets escalation stage and suppresses pending notifications as the only reset path @P0',
      async ({ request, storyC5Context, storyC5ClaimHeaders, storyC5ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.threadClaim,
          headers: storyC5ClaimHeaders,
          data: storyC5ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLAIMED',
          data: {
            thread: {
              threadId: storyC5Context.threadId,
              state: 'CLAIMED',
              escalationStage: 0,
              nextEvaluationAtUtc: null,
            },
            escalation: {
              resetReason: 'claimed',
              notificationsCanceled: expect.any(Number),
            },
          },
        });
      },
    );

    test.skip(
      '[P1] escalation baseline config accepts integer 1-24 values and refuses fractional or out-of-range values deterministically @P1',
      async ({
        request,
        storyC5Context,
        storyC5ClaimHeaders,
        storyC5ValidBaselinePayload,
        storyC5InvalidBaselinePayload,
      }) => {
        const validResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: storyC5ClaimHeaders,
          data: storyC5ValidBaselinePayload,
        });
        const invalidResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: storyC5ClaimHeaders,
          data: storyC5InvalidBaselinePayload,
        });

        expect(validResponse.status()).toBe(200);
        const validBody = await validResponse.json();
        expect(validBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_UPDATED',
          data: {
            escalationBaselineHours: storyC5Context.escalationBaselineHours.valid,
          },
        });

        expect(invalidResponse.status()).toBe(200);
        const invalidBody = await invalidResponse.json();
        expect(invalidBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID',
          refusalType: 'validation',
          message: expect.stringContaining('integer hours between 1 and 24'),
        });
      },
    );

    test.skip(
      '[P1] repeated scheduler retries are replay-safe and avoid duplicate escalation side effects for the same due window @P1',
      async ({
        request,
        storyC5Context,
        storyC5SchedulerHeaders,
        storyC5SchedulerRunPayload,
      }) => {
        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.schedulerEvaluate,
          headers: storyC5SchedulerHeaders,
          data: storyC5SchedulerRunPayload,
        });
        const secondResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.schedulerEvaluate,
          headers: storyC5SchedulerHeaders,
          data: storyC5SchedulerRunPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(firstBody.data.effects.emittedCount).toBeGreaterThanOrEqual(1);
        expect(secondBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
          data: {
            replaySafe: true,
            skippedAlreadyProcessed: true,
            effects: {
              emittedCount: 0,
            },
          },
        });
      },
    );
  },
);
