import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE1.fixture';
import {
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (ATDD API)',
  () => {
    test(
      '[E1-ATDD-API-003][P0] normalizes provider-specific event identifiers into canonical replay-safe identity fields for duplicate suppression @P0',
      async ({
        request,
        storyE1Context,
        storyE1AdminHeaders,
        storyE1NumberMappingPayload,
      }, testInfo) => {
        await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.numbersCollection,
          headers: storyE1AdminHeaders,
          data: storyE1NumberMappingPayload,
        });

        const providerEventId = `PROVIDER-EVENT-E1-${deterministicToken(testInfo, 'atdd-api-replay-event').toUpperCase()}`;
        const providerMessageId = `msg-e1-identity-${deterministicToken(testInfo, 'atdd-api-replay-message')}`;
        const providerLegId = `call-leg-e1-identity-${deterministicToken(testInfo, 'atdd-api-replay-leg')}`;

        const firstPayload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.mappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId,
          providerEventId,
          providerLegId,
        });

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignedWebhookHeaders(firstPayload, testInfo, 'atdd-api-replay-first'),
          },
          data: firstPayload,
        });

        const duplicatePayload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.mappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId,
          providerEventId: providerEventId.toLowerCase(),
          providerLegId,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignedWebhookHeaders(duplicatePayload, testInfo, 'atdd-api-replay-duplicate'),
          },
          data: duplicatePayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);
        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);

        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              providerEventId,
              providerMessageId,
              providerLegId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: `provider-event:${providerEventId.toLowerCase()}`,
            },
          },
        });

        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: `provider-event:${providerEventId.toLowerCase()}`,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
        expect(duplicateBody.data).not.toHaveProperty('canonicalEvent');
        expect(duplicateBody.data).not.toHaveProperty('timeline');
        expect(duplicateBody.data).not.toHaveProperty('audit');
        expect(duplicateBody.data).not.toHaveProperty('outbox');
      },
    );

    test(
      '[E1-ATDD-API-004][P1] refuses unmapped inbound routing deterministically with auditable refusal metadata and zero operational artifact writes @P1',
      async ({
        request,
        storyE1Context,
        storyE1AdminHeaders,
      }, testInfo) => {
        const webhookPayload = buildSmsWebhookPayload({
          providerKey: storyE1Context.providers.enabledPrimary,
          to: storyE1Context.numbers.unmappedInbound,
          from: storyE1Context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-unmapped-${deterministicToken(testInfo, 'atdd-api-unmapped-message')}`,
          providerEventId: `provider-event-e1-unmapped-${deterministicToken(testInfo, 'atdd-api-unmapped-event')}`,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'atdd-api-unmapped'),
          },
          data: webhookPayload,
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
            timelineOutcome: {
              eventName: null,
              routingDecision: 'refused',
            },
          },
        });
        expect(body.data).not.toHaveProperty('canonicalEvent');
        expect(body.data).not.toHaveProperty('timeline');
        expect(body.data).not.toHaveProperty('audit');
        expect(body.data).not.toHaveProperty('outbox');
      },
    );
  },
);
