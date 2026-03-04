import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR4.fixture';

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD API)', () => {
  test(
    '[P0] thread detail contract exposes explicit action controls per lifecycle state with no hidden policy paths @P0',
    async ({ request, storyUxR4Context, storyUxR4OperatorHeaders }) => {
      const [unclaimedResponse, claimedResponse, closedResponse] = await Promise.all([
        apiRequest(request, {
          method: 'GET',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimed}`,
          headers: storyUxR4OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.claimed}`,
          headers: storyUxR4OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.closed}`,
          headers: storyUxR4OperatorHeaders,
        }),
      ]);

      expect(unclaimedResponse.status()).toBe(200);
      expect(claimedResponse.status()).toBe(200);
      expect(closedResponse.status()).toBe(200);

      const [unclaimedBody, claimedBody, closedBody] = await Promise.all([
        unclaimedResponse.json(),
        claimedResponse.json(),
        closedResponse.json(),
      ]);

      expect(unclaimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'UNCLAIMED',
          },
          actions: ['Call', 'Text', 'Claim'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
      expect(claimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLAIMED',
          },
          actions: ['Call', 'Text', 'Close'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
      expect(closedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLOSED',
          },
          actions: ['Call', 'Send Message'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
    },
  );

  test(
    '[P1] role-admin path preserves explicit action ordering and exposes Take Over on claimed threads @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4TenantAdminHeaders,
    }) => {
      const claimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.claimed}`,
        headers: storyUxR4TenantAdminHeaders,
      });

      expect(claimedResponse.status()).toBe(200);
      const claimedBody = await claimedResponse.json();
      expect(claimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLAIMED',
          },
          actions: ['Call', 'Take Over', 'Text', 'Close'],
          outboundPolicy: {
            hiddenPolicyPaths: [],
            explicitActionSurface: true,
          },
        },
      });
    },
  );

  test(
    '[P0] prefers_texting NO outbound SMS without override reason returns refusal and blocks dispatch @P0',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithoutOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4MessageWithoutOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: false,
        code: storyUxR4Context.refusalCodes.overrideRequired,
        refusalType: 'business',
        message: expect.any(String),
        data: {
          preferencePolicy: {
            prefersTexting: 'NO',
            overrideRequired: true,
            overrideAccepted: false,
          },
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: 'connectshyft.override.required',
            requiresAction: true,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied: false,
            auditPersisted: false,
          },
        },
      });
    },
  );

  test(
    '[P0] valid override reason on prefers_texting NO thread dispatches message with policy audit metadata @P0',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithValidOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4MessageWithValidOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: true,
        code: storyUxR4Context.envelopeCodes.success,
        data: {
          thread: {
            threadId: storyUxR4Context.threadIds.unclaimedPrefersNo,
            state: 'UNCLAIMED',
          },
          preferencePolicy: {
            overrideRequired: true,
            overrideAccepted: true,
            override: {
              reason: storyUxR4MessageWithValidOverridePayload.overrideReason,
            },
          },
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            messageKey: expect.any(String),
          },
          sideEffects: {
            messageDispatched: true,
            lifecycleMutationApplied: false,
            auditPersisted: true,
          },
        },
      });
    },
  );

  test(
    '[P0] outbound action from CLOSED thread reopens the same thread to UNCLAIMED before dispatch @P0',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4OutboundCallPayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.closed}/call`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4OutboundCallPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: true,
        code: storyUxR4Context.envelopeCodes.callSuccess,
        data: {
          thread: {
            threadId: storyUxR4Context.threadIds.closed,
            state: 'UNCLAIMED',
          },
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
          },
          lifecycleEvent: storyUxR4Context.eventNames.reopenedByUser,
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            hiddenTransition: false,
          },
        },
      });
    },
  );

  test(
    '[P1] success and refusal envelopes expose deterministic accessible feedback metadata @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithoutOverridePayload,
    }) => {
      const [successResponse, refusalResponse] = await Promise.all([
        apiRequest(request, {
          method: 'POST',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.claimed}/messages`,
          headers: storyUxR4OperatorHeaders,
          data: {
            orgUnitId: storyUxR4Context.orgUnitId,
            channel: 'sms',
            body: 'Deterministic policy-safe outbound follow-up.',
          },
        }),
        apiRequest(request, {
          method: 'POST',
          path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
          headers: storyUxR4OperatorHeaders,
          data: storyUxR4MessageWithoutOverridePayload,
        }),
      ]);

      expect(successResponse.status()).toBe(200);
      expect(refusalResponse.status()).toBe(200);

      const [successBody, refusalBody] = await Promise.all([
        successResponse.json(),
        refusalResponse.json(),
      ]);

      expect(successBody).toMatchObject({
        ok: true,
        data: {
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            messageKey: expect.any(String),
            hiddenTransition: false,
          },
        },
      });
      expect(refusalBody).toMatchObject({
        ok: false,
        refusalType: 'business',
        data: {
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: expect.any(String),
          },
        },
      });
    },
  );
});
