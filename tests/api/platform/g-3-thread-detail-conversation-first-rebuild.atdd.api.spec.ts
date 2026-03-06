import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG3.fixture';

type ConnectShyftThreadEnvelope = {
  ok?: boolean;
  code?: string;
  data?: {
    actions?: string[];
    actionMatrix?: {
      lockedByState?: boolean;
    };
    chrome?: {
      persistentOperationsBannerVisible?: boolean;
      heavyOperationsDefaultLayout?: boolean;
    };
    lifecycle?: {
      priorState?: string;
      nextState?: string;
      reopenedByInbound?: boolean;
      reopenedFromClosed?: boolean;
      sameThreadId?: boolean;
      noInboundAutoReopenSideEffects?: boolean;
    };
    lifecycleEvent?: string;
    uiFeedback?: {
      severity?: string;
      ariaLive?: string;
      requiresAction?: boolean;
      presentation?: string;
      hiddenTransition?: boolean;
      message?: string;
    };
    thread?: {
      threadId?: string;
      state?: string;
      claimedByUserId?: string | null;
      display?: {
        title?: string;
        neighborContext?: string;
        conferenceContext?: string;
        claimContext?: string;
      };
      timeline?: Array<{
        eventName?: string;
        conversationType?: string;
        renderMode?: string;
        firstClass?: boolean;
      }>;
    };
  };
};

test.describe('Story g.3 Thread Detail Conversation-First Rebuild (ATDD API RED)', () => {
  test(
    '[G3-ATDD-API-001][P0] thread detail contract prioritizes neighbor conference and claim context while voicemail renders inline as first-class conversation content @P0',
    async ({ request, storyG3Context, storyG3OperatorHeaders }) => {
      const [claimedResponse, voicemailResponse] = await Promise.all([
        apiRequest(request, {
          method: 'GET',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.claimed}`,
          headers: storyG3OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.voicemailClaimed}`,
          headers: storyG3OperatorHeaders,
        }),
      ]);

      expect(claimedResponse.status()).toBe(200);
      expect(voicemailResponse.status()).toBe(200);

      const claimedBody = (await claimedResponse.json()) as ConnectShyftThreadEnvelope;
      const voicemailBody = (await voicemailResponse.json()) as ConnectShyftThreadEnvelope;

      expect(claimedBody.ok).toBe(true);
      expect((claimedBody.data?.thread?.display?.neighborContext ?? '').trim().length).toBeGreaterThan(0);
      expect((claimedBody.data?.thread?.display?.conferenceContext ?? '').trim().length).toBeGreaterThan(0);
      expect((claimedBody.data?.thread?.display?.claimContext ?? '').trim().length).toBeGreaterThan(0);

      const voicemailTimeline = Array.isArray(voicemailBody.data?.thread?.timeline)
        ? voicemailBody.data?.thread?.timeline
        : [];
      expect(voicemailTimeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            conversationType: 'voicemail',
            renderMode: 'inline',
            firstClass: true,
          }),
        ]),
      );
    },
  );

  test(
    '[G3-ATDD-API-002][P0] thread detail action matrix is explicitly locked by canonical lifecycle state contracts @P0',
    async ({ request, storyG3Context, storyG3OperatorHeaders }) => {
      const [unclaimedResponse, claimedResponse, closedResponse] = await Promise.all([
        apiRequest(request, {
          method: 'GET',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.unclaimed}`,
          headers: storyG3OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.claimed}`,
          headers: storyG3OperatorHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.closed}`,
          headers: storyG3OperatorHeaders,
        }),
      ]);

      expect(unclaimedResponse.status()).toBe(200);
      expect(claimedResponse.status()).toBe(200);
      expect(closedResponse.status()).toBe(200);

      const [unclaimedBody, claimedBody, closedBody] = (await Promise.all([
        unclaimedResponse.json(),
        claimedResponse.json(),
        closedResponse.json(),
      ])) as ConnectShyftThreadEnvelope[];

      expect(unclaimedBody.data?.actions).toEqual([...storyG3Context.expectedActions.unclaimed]);
      expect(claimedBody.data?.actions).toEqual([...storyG3Context.expectedActions.claimed]);
      expect(closedBody.data?.actions).toEqual([...storyG3Context.expectedActions.closed]);

      expect(unclaimedBody.data?.actionMatrix?.lockedByState).toBe(true);
      expect(claimedBody.data?.actionMatrix?.lockedByState).toBe(true);
      expect(closedBody.data?.actionMatrix?.lockedByState).toBe(true);
    },
  );

  test(
    '[G3-ATDD-API-003][P1] refusal and policy feedback is contextual at action time and avoids persistent operations-heavy default chrome @P1',
    async ({
      request,
      storyG3Context,
      storyG3OperatorHeaders,
      storyG3MessageWithoutOverridePayload,
      storyG3MessageWithOverridePayload,
    }) => {
      const [refusalResponse, successResponse] = await Promise.all([
        apiRequest(request, {
          method: 'POST',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.unclaimedPrefersNo}/messages`,
          headers: storyG3OperatorHeaders,
          data: storyG3MessageWithoutOverridePayload,
        }),
        apiRequest(request, {
          method: 'POST',
          path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.unclaimedPrefersNo}/messages`,
          headers: storyG3OperatorHeaders,
          data: storyG3MessageWithOverridePayload,
        }),
      ]);

      expect(refusalResponse.status()).toBe(200);
      expect(successResponse.status()).toBe(200);

      const refusalBody = (await refusalResponse.json()) as ConnectShyftThreadEnvelope;
      const successBody = (await successResponse.json()) as ConnectShyftThreadEnvelope;

      expect(refusalBody.ok).toBe(false);
      expect(refusalBody.code).toBe('CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED');
      expect(refusalBody.data?.uiFeedback).toMatchObject({
        severity: 'warning',
        ariaLive: 'assertive',
        requiresAction: true,
        presentation: 'contextual-action-feedback',
      });
      expect(refusalBody.data?.chrome).toMatchObject({
        persistentOperationsBannerVisible: false,
        heavyOperationsDefaultLayout: false,
      });

      expect(successBody.ok).toBe(true);
      expect(successBody.data?.uiFeedback).toMatchObject({
        severity: 'success',
        ariaLive: 'polite',
        presentation: 'contextual-action-feedback',
      });
      expect(successBody.data?.chrome).toMatchObject({
        persistentOperationsBannerVisible: false,
        heavyOperationsDefaultLayout: false,
      });
    },
  );

  test(
    '[G3-ATDD-API-004][P0] CLOSED outbound action reopens same thread id to UNCLAIMED with deterministic lifecycle messaging and no inbound auto-reopen side effects @P0',
    async ({
      request,
      storyG3Context,
      storyG3OperatorHeaders,
      storyG3CallPayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.closedPrefersNo}/call`,
        headers: storyG3OperatorHeaders,
        data: storyG3CallPayload,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftThreadEnvelope;

      expect(body.ok).toBe(true);
      expect(body.data?.thread).toMatchObject({
        threadId: storyG3Context.threadIds.closedPrefersNo,
        state: 'UNCLAIMED',
      });
      expect(body.data?.lifecycle).toMatchObject({
        priorState: 'CLOSED',
        nextState: 'UNCLAIMED',
        reopenedFromClosed: true,
        reopenedByInbound: false,
        sameThreadId: true,
        noInboundAutoReopenSideEffects: true,
      });
      expect(body.data?.lifecycleEvent).toBe('connectshyft.thread_reopened_by_user');
      expect(body.data?.uiFeedback).toMatchObject({
        severity: 'success',
        ariaLive: 'polite',
        hiddenTransition: false,
      });
    },
  );
});
