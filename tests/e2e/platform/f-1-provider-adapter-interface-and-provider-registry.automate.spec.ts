import { test, expect } from '../../support/fixtures/connectShyftStoryF1.fixture';
import {
  createStoryF1Context,
  createStoryF1Headers,
} from '../../support/factories/connectShyftStoryF1Factory';
import { deterministicProviderEventId } from '../../support/utils/deterministicTestIds';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story f.1 Provider Adapter Interface and Provider Registry (Automate E2E Expansion)',
  () => {
    test.beforeEach(async ({ storyF1AdminHeaders: _storyF1AdminHeaders }) => {
      void _storyF1AdminHeaders;
    });

    test(
      '[P0] operator-triggered outbound actions without provider key remain deterministic across call and message contracts using the same registry ordering @P0',
      async ({ request }) => {
        const context = createStoryF1Context();
        const operatorHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.userId,
          orgUnitMemberships: [context.orgUnitId],
          enabledProviders: [
            context.providers.enabledSecondary,
            context.providers.enabledPrimary,
          ],
          disabledProviders: [context.providers.disabled],
        });

        const callResponse = await request.post(
          `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          {
            headers: operatorHeaders,
            data: {
              orgUnitId: context.orgUnitId,
            },
          },
        );

        const messageResponse = await request.post(
          `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          {
            headers: operatorHeaders,
            data: {
              orgUnitId: context.orgUnitId,
              channel: 'sms',
              body: 'Operator-triggered deterministic provider fallback continuity check.',
            },
          },
        );

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = (await callResponse.json()) as Record<string, unknown>;
        const messageBody = (await messageResponse.json()) as Record<string, unknown>;

        expect(hasRequiredEnvelopeKeys(callBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(messageBody)).toBe(true);

        expect(callBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            providerResolution: {
              requestedProvider: context.providers.enabledSecondary,
              resolvedProvider: context.providers.enabledSecondary,
              deterministic: true,
            },
            dispatch: {
              providerKey: context.providers.enabledSecondary,
              channel: 'call',
            },
          },
        });

        expect(messageBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            providerResolution: {
              requestedProvider: context.providers.enabledSecondary,
              resolvedProvider: context.providers.enabledSecondary,
              deterministic: true,
            },
            dispatch: {
              providerKey: context.providers.enabledSecondary,
              channel: 'message',
            },
          },
        });
      },
    );

    test(
      '[P0] disabled-provider refusal on a closed thread is explicit and actionable and a subsequent enabled dispatch shows controlled reopen semantics @P0',
      async ({ request }) => {
        const context = createStoryF1Context();
        const operatorHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.userId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const refusalResponse = await request.post(
          `${context.paths.threads}/${context.threadIds.closed}/call`,
          {
            headers: operatorHeaders,
            data: {
              orgUnitId: context.orgUnitId,
              providerKey: context.providers.disabled,
            },
          },
        );

        expect(refusalResponse.status()).toBe(200);
        const refusalBody = (await refusalResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(refusalBody)).toBe(true);
        expect(refusalBody).toMatchObject({
          ok: false,
          code: context.refusalCodes.disabled,
          refusalType: 'business',
          data: {
            operatorFeedbackMeta: {
              actionable: true,
              hiddenTransition: false,
              messageKey: 'connectshyft.provider.disabled',
            },
            sideEffects: {
              dispatchAttempted: false,
              lifecycleMutationApplied: false,
              auditPersisted: false,
            },
          },
        });

        const successResponse = await request.post(
          `${context.paths.threads}/${context.threadIds.closed}/call`,
          {
            headers: operatorHeaders,
            data: {
              orgUnitId: context.orgUnitId,
              providerKey: context.providers.enabledPrimary,
            },
          },
        );

        expect(successResponse.status()).toBe(200);
        const successBody = (await successResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(successBody)).toBe(true);
        expect(successBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            lifecycle: {
              priorState: 'CLOSED',
              reopenedFromClosed: true,
            },
            uiFeedback: {
              hiddenTransition: false,
            },
            providerResolution: {
              resolvedProvider: context.providers.enabledPrimary,
              deterministic: true,
            },
          },
        });
      },
    );

    test(
      '[P1] unavailable-provider refusal includes deterministic operator remediation guidance and no hidden lifecycle mutation evidence @P1',
      async ({ request }) => {
        const context = createStoryF1Context();
        const operatorHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.userId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await request.post(
          `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          {
            headers: operatorHeaders,
            data: {
              orgUnitId: context.orgUnitId,
              providerKey: context.providers.missing,
              channel: 'sms',
              body: 'Operator unavailable-provider remediation guidance journey check.',
            },
          },
        );

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: context.refusalCodes.unavailable,
          refusalType: 'business',
          data: {
            providerResolution: {
              requestedProvider: context.providers.missing,
              resolvedProvider: null,
              deterministic: true,
              reason: 'provider-not-registered',
            },
            operatorFeedbackMeta: {
              actionable: true,
              hiddenTransition: false,
              messageKey: 'connectshyft.provider.unavailable',
              remediation: expect.stringContaining('Select a registered enabled provider'),
            },
            sideEffects: {
              dispatchAttempted: false,
              lifecycleMutationApplied: false,
              auditPersisted: false,
            },
          },
        });
      },
    );

    test(
      '[P1] inbound webhook contracts preserve provider-adapter translation metadata and deterministic routing decisions for operator observability @P1',
      async ({ request }, testInfo) => {
        const context = createStoryF1Context();
        const adminHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await request.post(context.paths.inboundWebhook, {
          headers: adminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: context.threadIds.unclaimed,
            orgUnitId: context.orgUnitId,
            tenantId: context.tenantId,
            providerKey: context.providers.enabledPrimary,
            providerEventId: deterministicProviderEventId(
              'telnyx-call-event-f1',
              testInfo,
              'inbound-webhook',
            ),
            callStatus: 'CONNECTED',
          },
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            providerResolution: {
              resolvedProvider: context.providers.enabledPrimary,
              deterministic: true,
              adapterInvoked: true,
            },
            canonicalTranslation: {
              providerBranchingInDomain: false,
              eventType: 'CallConnected',
            },
            timeline: {
              routingDecision: expect.stringMatching(/accepted|voicemail_only|intake_fallback/),
            },
          },
        });
      },
    );
  },
);
