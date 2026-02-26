import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryC5Headers } from '../../support/factories/connectShyftStoryC5Factory';
import { test, expect } from '../../support/fixtures/connectShyftStoryC5.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story c.5 deterministic escalation scheduler with claim-only reset (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] scheduler evaluate responses preserve canonical envelope keys and deterministic transition multipliers @P0',
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
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
        });

        const transitions = Array.isArray(body?.data?.transitions)
          ? body.data.transitions
          : [];
        expect(transitions.length).toBeGreaterThan(0);

        const threadTransitions = transitions.filter(
          (entry: { threadId?: string }) => entry.threadId === storyC5Context.threadId,
        ) as Array<{ threadId: string; stage: number; nextDueOffsetHours: number }>;

        expect(threadTransitions.length).toBeGreaterThanOrEqual(1);

        const seenThreadStageKeys = new Set<string>();
        for (const transition of threadTransitions) {
          expect(Number.isInteger(transition.stage)).toBe(true);
          expect(Number.isInteger(transition.nextDueOffsetHours)).toBe(true);
          expect(transition.nextDueOffsetHours % storyC5Context.escalationBaselineHours.valid).toBe(0);

          const key = `${transition.threadId}:${transition.stage}`;
          expect(seenThreadStageKeys.has(key)).toBe(false);
          seenThreadStageKeys.add(key);
        }
      },
    );

    test(
      '[P0] explicit claim resets escalation state and cancels pending notifications for the claimed thread @P0',
      async ({ request, storyC5Context, storyC5ClaimHeaders, storyC5ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.threadClaim,
          headers: storyC5ClaimHeaders,
          data: storyC5ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
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
      '[P1] escalation baseline validation enforces integer hour range boundaries and rejects fractional values @P1',
      async ({
        request,
        storyC5Context,
        storyC5ValidBaselinePayload,
      }) => {
        const configAdminHeaders = createStoryC5Headers(storyC5Context, {
          role: 'ORGUNIT_ADMIN',
          userId: `${storyC5Context.userId}-admin`,
          orgUnitMemberships: [storyC5Context.orgUnitId],
        });

        const validResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: storyC5ValidBaselinePayload,
        });
        const lowResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: {
            orgUnitId: storyC5Context.orgUnitId,
            escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidLow,
          },
        });
        const highResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: {
            orgUnitId: storyC5Context.orgUnitId,
            escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidHigh,
          },
        });
        const fractionalResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyC5Context.paths.escalationConfig,
          headers: configAdminHeaders,
          data: {
            orgUnitId: storyC5Context.orgUnitId,
            escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidFractional,
          },
        });

        expect(validResponse.status()).toBe(200);
        expect(lowResponse.status()).toBe(200);
        expect(highResponse.status()).toBe(200);
        expect(fractionalResponse.status()).toBe(200);

        const validBody = await validResponse.json();
        const lowBody = await lowResponse.json();
        const highBody = await highResponse.json();
        const fractionalBody = await fractionalResponse.json();

        expect(validBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            escalationBaselineHours: storyC5Context.escalationBaselineHours.valid,
          },
        });
        expect(lowBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
          refusalType: 'business',
        });
        expect(highBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
          refusalType: 'business',
        });
        expect(fractionalBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
          refusalType: 'business',
        });
      },
    );

    test(
      '[P1] repeated scheduler evaluations for the same due window are replay-safe and suppress duplicate side effects @P1',
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

        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(secondBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
          data: {
            effects: {
              emittedCount: expect.any(Number),
            },
          },
        });
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

    test(
      '[P1] claim attempts without orgUnit membership are refused with deterministic business envelopes and no mutation payload @P1',
      async ({ request, storyC5Context, storyC5ClaimPayload }) => {
        const nonMemberHeaders = createStoryC5Headers(storyC5Context, {
          role: 'ORGUNIT_MEMBER',
          userId: `${storyC5Context.userId}-no-membership`,
          orgUnitMemberships: [],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC5Context.paths.threadClaim,
          headers: nonMemberHeaders,
          data: storyC5ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          refusalType: 'business',
        });
        expect([
          'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
          'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
        ]).toContain(body.code);
        expect(body).not.toHaveProperty('data.thread');
      },
    );
  },
);
