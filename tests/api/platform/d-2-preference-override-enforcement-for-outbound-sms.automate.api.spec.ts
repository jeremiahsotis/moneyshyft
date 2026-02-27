import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';

test.describe(
  'Story d.2 preference override enforcement for outbound sms (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] refuses outbound sms when prefers_texting=NO and override reason is missing with no partial side effects @P0',
      async ({ request, storyDContext, storyDMemberHeaders, storyDOutboundMessagePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoClosed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideRequired,
          data: {
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: false,
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
      '[P0] refuses outbound sms for invalid override reason and preserves refusal-only envelope semantics @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDInvalidOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoUnclaimed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDInvalidOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideInvalid,
          data: {
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: false,
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
      '[P0] accepts valid override, persists override+audit metadata, and dispatches outbound sms when prefers_texting=NO @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoUnclaimed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: true,
              override: {
                reason: storyDOverrideMessagePayload.overrideReason,
                note: storyDOverrideMessagePayload.overrideNote,
              },
            },
            sideEffects: {
              messageDispatched: true,
              auditPersisted: true,
            },
          },
        });
      },
    );

    test(
      '[P1] CLOSED outbound sms with valid override reopens same thread before dispatch and still enforces override policy @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.prefersNoClosed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            thread: {
              threadId: storyDContext.threadIds.prefersNoClosed,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              priorState: 'CLOSED',
              reopenedFromClosed: true,
            },
            lifecycleEvent: storyDContext.eventNames.reopenedByUser,
            preferencePolicy: {
              prefersTexting: 'NO',
              overrideRequired: true,
              overrideAccepted: true,
            },
            sideEffects: {
              messageDispatched: true,
              lifecycleMutationApplied: true,
            },
          },
        });
      },
    );
  },
);
