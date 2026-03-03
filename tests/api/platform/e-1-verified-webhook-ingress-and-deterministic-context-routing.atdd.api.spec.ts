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
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (ATDD API)',
  () => {
    test(
      '[E1-ATDD-API-001][P0] rejects unsigned webhooks with deterministic fail-closed refusal and no domain side effects @P0',
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

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignatureEnforcementHeaders(),
          },
          data: buildSmsWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.mappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId: `msg-e1-unsigned-${deterministicToken(testInfo, 'atdd-api-unsigned-message')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e1-atdd-api',
              testInfo,
              'unsigned-event',
            ),
          }),
        });

        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
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
      '[E1-ATDD-API-002][P0] accepts valid signed ingress and resolves deterministic tenant and orgUnit context from provider-number mapping before downstream handling @P0',
      async ({
        request,
        storyE1Context,
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
        const mappingBody = await mappingResponse.json();
        expect(hasRequiredEnvelopeKeys(mappingBody)).toBe(true);
        expect([
          'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE',
        ]).toContain(mappingBody.code);

        const webhookPayload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.mappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-mapped-${deterministicToken(testInfo, 'atdd-api-mapped-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-atdd-api',
            testInfo,
            'mapped-event',
          ),
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'atdd-api-mapped-routing'),
          },
          data: webhookPayload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            providerResolution: {
              requestedProvider: storyE1Context.providers.enabledPrimary,
              resolvedProvider: storyE1Context.providers.enabledPrimary,
              deterministic: true,
              adapterInvoked: true,
            },
            correlation: {
              source: 'number_mapping',
              deterministic: true,
              tenantId: storyE1Context.tenantId,
              orgUnitId: storyE1Context.orgUnitId,
              threadId: expect.any(String),
            },
            canonicalTranslation: {
              eventType: storyE1Context.canonicalEventTypes.messageDelivered,
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
              providerBranchingInDomain: false,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.stringContaining('provider-event:'),
            },
          },
        });
      },
    );
  },
);
