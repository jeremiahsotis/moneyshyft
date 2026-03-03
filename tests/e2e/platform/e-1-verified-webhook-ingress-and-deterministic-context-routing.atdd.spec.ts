import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE1.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignatureEnforcementHeaders,
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (ATDD E2E)',
  () => {
    test(
      '[E1-ATDD-E2E-001][P0] end-to-end ingress journey accepts valid signed webhook and preserves deterministic tenant orgUnit context on thread contracts @P0',
      async ({
        request,
        storyE1Context,
        storyE1OperatorHeaders,
        storyE1AdminHeaders,
        storyE1NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.numbersCollection,
          headers: storyE1AdminHeaders,
          data: storyE1NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}/messages`,
          headers: storyE1OperatorHeaders,
          data: {
            orgUnitId: storyE1Context.orgUnitId,
            providerKey: storyE1Context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story e.1 ingress context-routing end-to-end verification message.',
          },
        });
        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerMessageId = outboundBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const payload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.mappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-atdd-e2e',
            testInfo,
            'mapped-ingress',
          ),
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'atdd-e2e-mapped-ingress'),
          },
          data: payload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              deterministic: true,
              tenantId: storyE1Context.tenantId,
              orgUnitId: storyE1Context.orgUnitId,
              threadId: storyE1Context.threadIds.unclaimed,
            },
            canonicalTranslation: {
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}`,
          headers: storyE1OperatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: storyE1Context.threadIds.unclaimed,
              tenantId: storyE1Context.tenantId,
              orgUnitId: storyE1Context.orgUnitId,
            },
          },
        });
      },
    );

    test(
      '[E1-ATDD-E2E-002][P0] end-to-end spoofed ingress journey is refused fail-closed and leaves thread lifecycle unchanged @P0',
      async ({
        request,
        storyE1Context,
        storyE1OperatorHeaders,
        storyE1AdminHeaders,
      }, testInfo) => {
        const beforeDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}`,
          headers: storyE1OperatorHeaders,
        });
        expect(beforeDetailResponse.status()).toBe(200);
        const beforeDetailBody = await beforeDetailResponse.json();
        const beforeState = beforeDetailBody?.data?.thread?.state;

        const payload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.mappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-e2e-unsigned-${deterministicToken(testInfo, 'atdd-e2e-unsigned-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-atdd-e2e',
            testInfo,
            'unsigned-ingress',
          ),
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignatureEnforcementHeaders(),
          },
          data: payload,
        });

        expect(webhookResponse.status()).toBe(401);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: false,
          code: storyE1Context.refusalCodes.signatureMissing,
          refusalType: 'client',
          data: {
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });

        const afterDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}`,
          headers: storyE1OperatorHeaders,
        });
        expect(afterDetailResponse.status()).toBe(200);
        const afterDetailBody = await afterDetailResponse.json();
        expect(afterDetailBody?.data?.thread?.state).toBe(beforeState);
      },
    );

    test(
      '[E1-ATDD-E2E-003][P1] end-to-end unmapped-number journey refuses deterministically with auditable metadata and no canonical writes @P1',
      async ({
        request,
        storyE1Context,
        storyE1AdminHeaders,
      }, testInfo) => {
        const payload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.unmappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-e2e-unmapped-${deterministicToken(testInfo, 'atdd-e2e-unmapped-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-atdd-e2e',
            testInfo,
            'unmapped-ingress',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'atdd-e2e-unmapped-ingress'),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: storyE1Context.refusalCodes.correlationNotFound,
          refusalType: 'business',
          data: {
            correlation: {
              deterministic: true,
              reason: 'not-found',
            },
            operatorFeedbackMeta: {
              actionable: true,
              hiddenTransition: false,
              messageKey: 'connectshyft.webhook.correlation.unresolved',
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
        expect(body.data).not.toHaveProperty('canonicalEvent');
      },
    );
  },
);
