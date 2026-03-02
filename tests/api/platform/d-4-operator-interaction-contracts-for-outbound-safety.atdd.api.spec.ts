import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD4.fixture';

test.describe('Story d.4 Operator Interaction Contracts for Outbound Safety (ATDD API)', () => {
  test(
    '[P0] thread detail contracts expose deterministic state-action matrices for unclaimed claimed and closed threads @P0',
    async ({
      request,
      storyD4Context,
      storyD4OperatorHeaders,
    }) => {
      const unclaimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.unclaimed}`,
        headers: storyD4OperatorHeaders,
      });
      const claimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.claimed}`,
        headers: storyD4OperatorHeaders,
      });
      const closedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.closed}`,
        headers: storyD4OperatorHeaders,
      });

      expect(unclaimedResponse.status()).toBe(200);
      expect(claimedResponse.status()).toBe(200);
      expect(closedResponse.status()).toBe(200);

      const unclaimedBody = await unclaimedResponse.json();
      const claimedBody = await claimedResponse.json();
      const closedBody = await closedResponse.json();

      expect(unclaimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'UNCLAIMED',
          },
          actions: ['Call', 'Text', 'Claim'],
        },
      });
      expect(claimedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLAIMED',
          },
          actions: ['Call', 'Text', 'Close'],
        },
      });
      expect(closedBody).toMatchObject({
        ok: true,
        data: {
          thread: {
            state: 'CLOSED',
          },
          actions: ['Call', 'Send Message'],
        },
      });
    },
  );

  test(
    '[P0] claimed thread detail adds Take Over action for tenant-privileged role while preserving canonical order @P0',
    async ({
      request,
      storyD4Context,
      storyD4TenantAdminHeaders,
    }) => {
      const claimedResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.claimed}`,
        headers: storyD4TenantAdminHeaders,
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
        },
      });
    },
  );

  test(
    '[P0] outbound actions from CLOSED thread return explicit same-thread reopen feedback metadata without hidden transitions @P0',
    async ({
      request,
      storyD4Context,
      storyD4OperatorHeaders,
      storyD4OutboundCallPayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.closed}/call`,
        headers: storyD4OperatorHeaders,
        data: storyD4OutboundCallPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
        data: {
          thread: {
            threadId: storyD4Context.threadIds.closed,
            state: 'UNCLAIMED',
          },
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
          },
          lifecycleEvent: storyD4Context.eventNames.reopenedByUser,
          operatorFeedback: expect.stringMatching(/reopened/i),
          operatorFeedbackMeta: expect.objectContaining({
            heading: expect.stringContaining('reopened'),
            hiddenTransition: false,
          }),
          uiFeedback: expect.objectContaining({
            severity: 'success',
            ariaLive: 'polite',
            hiddenTransition: false,
          }),
        },
      });
    },
  );

  test(
    '[P1] prefers_texting NO outbound sms without override returns envelope metadata that maps cleanly to refusal UX @P1',
    async ({
      request,
      storyD4Context,
      storyD4OperatorHeaders,
      storyD4MessageWithoutOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyD4OperatorHeaders,
        data: storyD4MessageWithoutOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: storyD4Context.refusalCodes.overrideRequired,
        refusalType: 'business',
        message: expect.any(String),
        data: {
          preferencePolicy: {
            prefersTexting: 'NO',
            overrideRequired: true,
            overrideAccepted: false,
            allowedOverrideReasons: expect.arrayContaining(['safety-follow-up']),
          },
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: 'connectshyft.override.required',
            requiresAction: true,
            actionLabel: expect.stringContaining('Add override reason'),
            accessibilityHint: expect.any(String),
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
    '[P1] closed prefers_texting NO outbound sms refusal returns explicit same-thread reopen metadata @P1',
    async ({
      request,
      storyD4Context,
      storyD4OperatorHeaders,
      storyD4MessageWithoutOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.closedPrefersNo}/messages`,
        headers: storyD4OperatorHeaders,
        data: storyD4MessageWithoutOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: storyD4Context.refusalCodes.overrideRequired,
        refusalType: 'business',
        data: {
          thread: {
            threadId: storyD4Context.threadIds.closedPrefersNo,
            priorState: 'CLOSED',
            state: 'UNCLAIMED',
          },
          lifecycleEvent: storyD4Context.eventNames.reopenedByUser,
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied: true,
            auditPersisted: false,
          },
          preferencePolicy: {
            prefersTexting: 'NO',
            overrideRequired: true,
            overrideAccepted: false,
          },
        },
      });
    },
  );

  test(
    '[P1] success and refusal envelopes preserve deterministic feedback contract keys for UI mapping across breakpoints @P1',
    async ({
      request,
      storyD4Context,
      storyD4OperatorHeaders,
      storyD4OutboundMessagePayload,
      storyD4MessageWithoutOverridePayload,
    }) => {
      const successResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.claimed}/messages`,
        headers: storyD4OperatorHeaders,
        data: storyD4OutboundMessagePayload,
      });
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyD4Context.paths.threads}/${storyD4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyD4OperatorHeaders,
        data: storyD4MessageWithoutOverridePayload,
      });

      expect(successResponse.status()).toBe(200);
      expect(refusalResponse.status()).toBe(200);

      const successBody = await successResponse.json();
      const refusalBody = await refusalResponse.json();

      expect(successBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
        data: {
          preferencePolicy: {
            overrideAccepted: true,
          },
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            messageKey: expect.any(String),
          },
        },
      });
      expect(refusalBody).toMatchObject({
        ok: false,
        code: storyD4Context.refusalCodes.overrideRequired,
        data: {
          preferencePolicy: {
            overrideAccepted: false,
          },
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
