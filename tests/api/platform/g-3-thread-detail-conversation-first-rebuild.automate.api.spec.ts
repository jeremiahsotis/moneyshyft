import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG3.fixture';

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  refusalType?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
      voicemailIndicator?: boolean;
    };
    actionMatrix?: {
      lockedByState?: boolean;
    };
    timeline?: Array<{
      conversationType?: string;
      renderMode?: string;
      firstClass?: boolean;
    }>;
    lifecycleEvent?: string;
    lifecycle?: {
      priorState?: string;
      nextState?: string;
      reopenedFromClosed?: boolean;
      reopenedByInbound?: boolean;
      sameThreadId?: boolean;
      noInboundAutoReopenSideEffects?: boolean;
    };
    preferencePolicy?: {
      prefersTexting?: string;
      overrideRequired?: boolean;
      overrideAccepted?: boolean;
      allowedOverrideReasons?: string[];
    };
    uiFeedback?: {
      severity?: string;
      ariaLive?: string;
      messageKey?: string;
      presentation?: string;
      requiresAction?: boolean;
      hiddenTransition?: boolean;
    };
    chrome?: {
      persistentOperationsBannerVisible?: boolean;
      heavyOperationsDefaultLayout?: boolean;
    };
    sideEffects?: {
      messageDispatched?: boolean;
      lifecycleMutationApplied?: boolean;
      auditPersisted?: boolean;
    };
  };
};

test.describe('Story g.3 Thread Detail Conversation-First Rebuild (Automate API Expansion)', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[G3-AUTO-API-201][P0] invalid override reason is refused with deterministic policy metadata and no outbound side effects @P0',
    async ({
      request,
      storyG3Context,
      storyG3OperatorHeaders,
      storyG3MessageWithOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyG3OperatorHeaders,
        data: {
          ...storyG3MessageWithOverridePayload,
          overrideReason: 'invalid-reason-not-allowed',
        },
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;

      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
        refusalType: 'business',
        data: {
          preferencePolicy: {
            prefersTexting: 'NO',
            overrideRequired: true,
            overrideAccepted: false,
          },
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: 'connectshyft.override.invalid',
            presentation: 'contextual-action-feedback',
            requiresAction: true,
          },
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied: false,
            auditPersisted: false,
          },
        },
      });

      expect(body.data?.preferencePolicy?.allowedOverrideReasons).toEqual(
        expect.arrayContaining(['safety-follow-up', 'care-plan-exception']),
      );
    },
  );

  test(
    '[G3-AUTO-API-202][P0] closed outbound message without override reopens same thread but refuses dispatch until override is provided @P0',
    async ({
      request,
      storyG3Context,
      storyG3OperatorHeaders,
      storyG3MessageWithoutOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyG3Context.paths.threads}/${storyG3Context.threadIds.closedPrefersNo}/messages`,
        headers: storyG3OperatorHeaders,
        data: storyG3MessageWithoutOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;

      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
        refusalType: 'business',
        data: {
          thread: {
            threadId: storyG3Context.threadIds.closedPrefersNo,
            state: 'UNCLAIMED',
          },
          lifecycleEvent: 'connectshyft.thread_reopened_by_user',
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
            reopenedByInbound: false,
            sameThreadId: true,
            noInboundAutoReopenSideEffects: true,
          },
          preferencePolicy: {
            prefersTexting: 'NO',
            overrideRequired: true,
            overrideAccepted: false,
          },
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: 'connectshyft.override.required',
            presentation: 'contextual-action-feedback',
            requiresAction: true,
          },
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied: true,
            auditPersisted: false,
          },
        },
      });
    },
  );

  test(
    '[G3-AUTO-API-203][P1] voicemail classification remains event-driven and does not leak to non-voicemail thread detail timelines @P1',
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

      const claimedBody = (await claimedResponse.json()) as ConnectShyftEnvelope;
      const voicemailBody = (await voicemailResponse.json()) as ConnectShyftEnvelope;

      expect(claimedBody.data?.actionMatrix?.lockedByState).toBe(true);
      expect(voicemailBody.data?.actionMatrix?.lockedByState).toBe(true);

      const claimedTimeline = Array.isArray(claimedBody.data?.timeline)
        ? claimedBody.data?.timeline
        : [];
      const voicemailTimeline = Array.isArray(voicemailBody.data?.timeline)
        ? voicemailBody.data?.timeline
        : [];
      const voicemailInlineEvents = voicemailTimeline.filter(
        (event) => event.conversationType === 'voicemail',
      );

      expect(
        claimedTimeline.some((event) => event.conversationType === 'voicemail'),
      ).toBe(false);
      expect(
        voicemailInlineEvents.length > 0 || voicemailBody.data?.thread?.voicemailIndicator === true,
      ).toBe(true);
      if (voicemailInlineEvents.length > 0) {
        expect(voicemailInlineEvents).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              conversationType: 'voicemail',
              renderMode: 'inline',
              firstClass: true,
            }),
          ]),
        );
      }
    },
  );
});
