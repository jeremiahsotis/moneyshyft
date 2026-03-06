import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR4.fixture';

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD API) - Override Flows', () => {
  test(
    '[UXR4-ATDD-API-003][P0] prefers_texting NO outbound SMS without override reason returns refusal and blocks dispatch @P0',
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
    '[UXR4-ATDD-API-004][P0] valid override reason on prefers_texting NO thread dispatches message with policy audit metadata @P0',
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
    '[UXR4-ATDD-API-005][P1] nested override payload fields are accepted for prefers_texting NO dispatches @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: {
          orgUnitId: storyUxR4Context.orgUnitId,
          channel: 'sms',
          body: 'Outbound guardrail action with nested override payload.',
          override: {
            reasonCode: 'SAFETY-FOLLOW-UP',
            note: 'Nested override payload accepted for audit-safe dispatch.',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toMatchObject({
        ok: true,
        code: storyUxR4Context.envelopeCodes.success,
        data: {
          preferencePolicy: {
            overrideRequired: true,
            overrideAccepted: true,
            override: {
              reason: 'safety-follow-up',
              note: 'Nested override payload accepted for audit-safe dispatch.',
            },
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
    '[UXR4-ATDD-API-006][P1] invalid override reason returns deterministic refusal metadata with no dispatch side effects @P1',
    async ({
      request,
      storyUxR4Context,
      storyUxR4OperatorHeaders,
      storyUxR4MessageWithInvalidOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyUxR4Context.paths.threads}/${storyUxR4Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyUxR4OperatorHeaders,
        data: storyUxR4MessageWithInvalidOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

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
});
