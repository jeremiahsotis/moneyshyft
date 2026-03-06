import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryC5Headers } from '../../support/factories/connectShyftStoryC5Factory';
import { test, expect } from '../../support/fixtures/connectShyftStoryC5.fixture';

test.describe(
  'Story c.5 Deterministic Escalation Scheduler with Claim-Only Reset (ATDD API RED)',
  () => {
    test(
      '[P0] scheduler progresses unclaimed threads with persisted X-2X-3X timing and no in-memory timer dependency @P0',
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

        expect(firstResponse.status()).toBe(200);
        const firstBody = await firstResponse.json();
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
        });

        const baselineHours = Number(firstBody?.data?.baselineHours);
        expect(Number.isInteger(baselineHours)).toBe(true);
        expect(baselineHours).toBeGreaterThanOrEqual(1);
        expect(baselineHours).toBeLessThanOrEqual(24);

        const firstTransition = Array.isArray(firstBody?.data?.transitions)
          ? firstBody.data.transitions.find(
            (entry: { threadId?: string }) => entry.threadId === storyC5Context.threadId,
          )
          : undefined;
        expect(firstTransition).toMatchObject({
          threadId: storyC5Context.threadId,
          previousStage: 0,
          stage: 1,
          nextDueOffsetHours: baselineHours,
        });

        const secondResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.schedulerEvaluate,
          headers: storyC5SchedulerHeaders,
          data: {
            ...storyC5SchedulerRunPayload,
            asOfUtc: String(firstTransition?.nextDueAtUtc || storyC5SchedulerRunPayload.asOfUtc),
          },
        });
        expect(secondResponse.status()).toBe(200);
        const secondBody = await secondResponse.json();
        const secondTransition = Array.isArray(secondBody?.data?.transitions)
          ? secondBody.data.transitions.find(
            (entry: { threadId?: string }) => entry.threadId === storyC5Context.threadId,
          )
          : undefined;
        expect(secondTransition).toMatchObject({
          threadId: storyC5Context.threadId,
          previousStage: 1,
          stage: 2,
          nextDueOffsetHours: baselineHours * 2,
        });

        const thirdResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.schedulerEvaluate,
          headers: storyC5SchedulerHeaders,
          data: {
            ...storyC5SchedulerRunPayload,
            asOfUtc: String(secondTransition?.nextDueAtUtc || storyC5SchedulerRunPayload.asOfUtc),
          },
        });
        expect(thirdResponse.status()).toBe(200);
        const thirdBody = await thirdResponse.json();
        const thirdTransition = Array.isArray(thirdBody?.data?.transitions)
          ? thirdBody.data.transitions.find(
            (entry: { threadId?: string }) => entry.threadId === storyC5Context.threadId,
          )
          : undefined;
        expect(thirdTransition).toMatchObject({
          threadId: storyC5Context.threadId,
          previousStage: 2,
          stage: 3,
          nextDueOffsetHours: baselineHours * 3,
        });
      },
    );

    test(
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

    test(
      '[P1] escalation baseline config accepts integer 1-24 values and refuses fractional or out-of-range values deterministically @P1',
      async ({
        request,
        storyC5Context,
        storyC5ValidBaselinePayload,
      }) => {
        const configAdminHeaders = createStoryC5Headers(storyC5Context, {
          role: 'ORGUNIT_ADMIN',
          userId: storyC5Context.schedulerUserId,
          orgUnitMemberships: [storyC5Context.orgUnitId],
        });

        const validResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: storyC5ValidBaselinePayload,
        });
        const invalidLowResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: {
            ...storyC5ValidBaselinePayload,
            escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidLow,
          },
        });
        const invalidHighResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: {
            ...storyC5ValidBaselinePayload,
            escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidHigh,
          },
        });
        const invalidFractionalResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: {
            ...storyC5ValidBaselinePayload,
            escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidFractional,
          },
        });

        expect(validResponse.status()).toBe(200);
        expect(invalidLowResponse.status()).toBe(200);
        expect(invalidHighResponse.status()).toBe(200);
        expect(invalidFractionalResponse.status()).toBe(200);

        const validBody = await validResponse.json();
        const invalidLowBody = await invalidLowResponse.json();
        const invalidHighBody = await invalidHighResponse.json();
        const invalidFractionalBody = await invalidFractionalResponse.json();
        expect(validBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            escalationBaselineHours: storyC5Context.escalationBaselineHours.valid,
          },
        });

        expect(invalidLowBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
          refusalType: 'business',
        });
        expect(invalidHighBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
          refusalType: 'business',
        });
        expect(invalidFractionalBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
          refusalType: 'business',
        });
      },
    );

    test(
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
