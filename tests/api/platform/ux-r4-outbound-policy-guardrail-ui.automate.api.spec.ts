import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR4.fixture';

test.describe('Story ux-r4 automate - outbound policy guardrail API coverage expansion', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[UXR4-AUTOMATE-API-201][P0] invalid override reason is refused with deterministic policy metadata and no dispatch side effects @P0',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithInvalidOverridePayload,
    }) => {
      // Given a prefers_texting=NO thread and an invalid override reason payload.
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4MessageWithInvalidOverridePayload,
      });

      // When outbound SMS is attempted with an invalid override.
      expect(response.status()).toBe(200);
      const body = await response.json();

      // Then the API returns a deterministic invalid-override refusal with no dispatch side effects.
      expect(body).toMatchObject({
        ok: false,
        code: storyUxR4Context.refusalCodes.overrideInvalid,
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
            requiresAction: true,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied: false,
            auditPersisted: false,
          },
        },
      });
      expect(body?.data?.preferencePolicy?.allowedOverrideReasons).toEqual(
        expect.arrayContaining(['safety-follow-up', 'care-plan-exception']),
      );
    },
  );

  test(
    '[UXR4-AUTOMATE-API-202][P0] closed prefers_texting NO outbound message without override reopens same thread but refuses dispatch @P0',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithoutOverridePayload,
    }) => {
      // Given a CLOSED thread where prefers_texting=NO.
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.closedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4MessageWithoutOverridePayload,
      });

      // When outbound SMS is attempted without an override reason.
      expect(response.status()).toBe(200);
      const body = await response.json();

      // Then the thread is reopened on the same thread ID but dispatch is refused pending override input.
      expect(body).toMatchObject({
        ok: false,
        code: storyUxR4Context.refusalCodes.overrideRequired,
        refusalType: 'business',
        data: {
          thread: {
            threadId: storyUxR4Context.threadIds.closedPrefersNo,
            state: 'UNCLAIMED',
          },
          lifecycleEvent: storyUxR4Context.eventNames.reopenedByUser,
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
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
            requiresAction: true,
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
    '[UXR4-AUTOMATE-API-203][P1] closed prefers_texting NO outbound message with valid override dispatches with audit metadata after same-thread reopen @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithValidOverridePayload,
    }) => {
      // Given a CLOSED prefers_texting=NO thread and a valid override payload.
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.closedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4MessageWithValidOverridePayload,
      });

      // When outbound SMS is dispatched with an approved override reason.
      expect(response.status()).toBe(200);
      const body = await response.json();

      // Then dispatch succeeds, the thread is reopened in place, and override audit metadata is returned.
      expect(body).toMatchObject({
        ok: true,
        code: storyUxR4Context.envelopeCodes.success,
        data: {
          thread: {
            threadId: storyUxR4Context.threadIds.closedPrefersNo,
            state: 'UNCLAIMED',
          },
          lifecycleEvent: storyUxR4Context.eventNames.reopenedByUser,
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
          },
          preferencePolicy: {
            prefersTexting: 'NO',
            overrideRequired: true,
            overrideAccepted: true,
            override: {
              reason: storyUxR4MessageWithValidOverridePayload.overrideReason,
              note: storyUxR4MessageWithValidOverridePayload.overrideNote,
              overrideId: expect.any(String),
            },
          },
          uiFeedback: {
            severity: 'success',
            ariaLive: 'polite',
            messageKey: 'connectshyft.thread.reopened_dispatch_success',
            hiddenTransition: false,
          },
          sideEffects: {
            messageDispatched: true,
            lifecycleMutationApplied: true,
            auditPersisted: true,
          },
        },
      });
      expect(body?.data?.preferencePolicy?.override?.audit).toMatchObject({
        eventName: 'connectshyft.thread.outbound_message_dispatched',
        metadata: expect.objectContaining({
          thread_id: storyUxR4Context.threadIds.closedPrefersNo,
          override_reason: storyUxR4MessageWithValidOverridePayload.overrideReason,
        }),
      });
    },
  );
});
