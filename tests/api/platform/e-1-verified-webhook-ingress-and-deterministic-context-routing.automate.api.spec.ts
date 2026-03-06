import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryE1Context,
  createStoryE1Headers,
} from '../../support/factories/connectShyftStoryE1Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildInvalidSignedWebhookHeaders,
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  buildVoiceWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate API Expansion)',
  () => {
    test(
      '[E1-AUTOMATE-API-101][P0] invalid webhook signatures are refused fail-closed with explicit verification metadata and zero domain writes @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const payload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: context.numbers.mappedInbound,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-invalid-${deterministicToken(testInfo, 'invalid-signature-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'invalid-signature-event',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildInvalidSignedWebhookHeaders(payload, testInfo, 'automate-api-invalid-signature'),
          },
          data: payload,
        });

        expect(response.status()).toBe(401);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: context.refusalCodes.signatureInvalid,
          refusalType: 'client',
          data: {
            providerResolution: {
              requestedProvider: context.providers.enabledPrimary,
              resolvedProvider: context.providers.enabledPrimary,
              deterministic: true,
              adapterInvoked: true,
            },
            signatureValidation: {
              deterministic: true,
              verified: false,
              provider: context.providers.enabledPrimary,
            },
            operatorFeedbackMeta: {
              actionable: true,
              hiddenTransition: false,
              messageKey: 'connectshyft.webhook.signature.invalid',
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
      },
    );

    test(
      '[E1-AUTOMATE-API-102][P0] provider-identifier fallback resolves deterministic context when metadata is absent and accepts signed connected-call webhooks @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const operatorHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerLegId = outboundBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const payload = buildVoiceWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          providerLegId,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'provider-fallback',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'automate-api-provider-fallback'),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
              threadId: context.threadIds.unclaimed,
              providerLegId,
            },
            canonicalTranslation: {
              eventType: context.canonicalEventTypes.callConnected,
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });
      },
    );
  },
);
