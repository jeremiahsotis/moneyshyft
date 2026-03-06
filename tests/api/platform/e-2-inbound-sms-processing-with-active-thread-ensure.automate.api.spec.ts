import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE2.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (Automate API Expansion)',
  () => {
    test(
      '[E2-AUTOMATE-API-101][P0] metadata-correlated inbound sms without neighbor field resolves neighbor from active thread and reuses thread identity @P0',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
        storyE2OperatorHeaders,
        storyE2NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.numbersCollection,
          headers: storyE2AdminHeaders,
          data: storyE2NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const neighborId = `${storyE2Context.neighborIds.existingActive}-automate-meta-${deterministicToken(testInfo, 'e2-automate-api-101-neighbor')}`;
        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.threads,
          headers: storyE2OperatorHeaders,
          data: {
            orgUnitId: storyE2Context.orgUnitId,
            neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e2-automate-101',
            preferredOutboundCsNumberId: 'cs-outbound-e2-automate-101',
          },
        });
        expect(ensureResponse.status()).toBe(201);
        const ensureBody = await ensureResponse.json();
        const existingThreadId = String(ensureBody?.data?.thread?.threadId || '');
        expect(existingThreadId.length).toBeGreaterThan(0);

        const providerEventId = deterministicProviderEventId(
          'provider-event-e2-automate',
          testInfo,
          'metadata-neighbor-fallback',
        );
        const providerMessageId = `msg-e2-automate-101-${deterministicToken(testInfo, 'e2-automate-api-101-message')}`;
        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId,
            providerEventId,
          }),
          tenantId: storyE2Context.tenantId,
          orgUnitId: storyE2Context.orgUnitId,
          threadId: existingThreadId,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-api-101'),
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
            correlation: {
              source: 'metadata',
              deterministic: true,
              threadId: existingThreadId,
              tenantId: storyE2Context.tenantId,
              orgUnitId: storyE2Context.orgUnitId,
              neighborId,
              providerEventId,
              providerMessageId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: `provider-event:${providerEventId.toLowerCase()}`,
            },
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: false,
              reusedThreadId: existingThreadId,
            },
            inboundMessageArtifact: {
              channel: 'sms',
              direction: 'inbound',
              providerEventId,
              providerMessageId,
            },
            timeline: {
              eventName: storyE2Context.eventNames.inboundSmsAppended,
              routingDecision: 'accepted',
              deterministicOrdering: true,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE2Context.paths.threads}/${existingThreadId}`,
          headers: storyE2OperatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const timeline = detailBody?.data?.thread?.timeline as Array<{ eventName: string }>;
        const inboundSmsEvents = timeline.filter(
          (entry) => entry.eventName === storyE2Context.eventNames.inboundSmsAppended,
        );
        expect(inboundSmsEvents.length).toBeGreaterThan(0);
      },
    );

    test(
      '[E2-AUTOMATE-API-102][P1] invalid neighbor field is ignored and metadata-correlated thread neighbor remains authoritative @P1',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
        storyE2OperatorHeaders,
        storyE2NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.numbersCollection,
          headers: storyE2AdminHeaders,
          data: storyE2NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const neighborId = `${storyE2Context.neighborIds.existingActive}-automate-invalid-neighbor-${deterministicToken(testInfo, 'e2-automate-api-102-neighbor')}`;
        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.threads,
          headers: storyE2OperatorHeaders,
          data: {
            orgUnitId: storyE2Context.orgUnitId,
            neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e2-automate-102',
            preferredOutboundCsNumberId: 'cs-outbound-e2-automate-102',
          },
        });
        expect(ensureResponse.status()).toBe(201);
        const ensureBody = await ensureResponse.json();
        const existingThreadId = String(ensureBody?.data?.thread?.threadId || '');
        expect(existingThreadId.length).toBeGreaterThan(0);

        const providerEventId = deterministicProviderEventId(
          'provider-event-e2-automate',
          testInfo,
          'invalid-neighbor-fallback',
        );
        const providerMessageId = `msg-e2-automate-102-${deterministicToken(testInfo, 'e2-automate-api-102-message')}`;
        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId,
            providerEventId,
          }),
          tenantId: storyE2Context.tenantId,
          orgUnitId: storyE2Context.orgUnitId,
          threadId: existingThreadId,
          neighborId: 'invalid neighbor id !',
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-api-102'),
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
            correlation: {
              source: 'metadata',
              threadId: existingThreadId,
              neighborId,
            },
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: false,
              reusedThreadId: existingThreadId,
            },
            timeline: {
              eventName: storyE2Context.eventNames.inboundSmsAppended,
            },
          },
        });
      },
    );

    test(
      '[E2-AUTOMATE-API-103][P1] message-id dedupe fallback suppresses duplicate inbound sms when providerEventId is absent @P1',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
        storyE2NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.numbersCollection,
          headers: storyE2AdminHeaders,
          data: storyE2NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const neighborId = `${storyE2Context.neighborIds.inboundDuplicate}-automate-dedupe-${deterministicToken(testInfo, 'e2-automate-api-103-neighbor')}`;
        const providerMessageId = `MSG-E2-AUTOMATE-103-${deterministicToken(testInfo, 'e2-automate-api-103-message').toUpperCase()}`;
        const messageBody = `Inbound fallback body ${deterministicToken(testInfo, 'e2-automate-api-103-body')}`;
        const webhookPayload = {
          eventType: 'sms.delivered',
          providerKey: storyE2Context.providers.enabledPrimary,
          providerPayload: {
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            message_uuid: providerMessageId,
            body: messageBody,
          },
          neighborId,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-api-103-first'),
          },
          data: webhookPayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-api-103-duplicate'),
          },
          data: webhookPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);

        const dedupeKey = `message:${providerMessageId.toLowerCase()}|event:messagedelivered`;
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey,
            },
            correlation: {
              source: 'number_mapping',
              neighborId,
              providerEventId: null,
              providerMessageId,
            },
            inboundMessageArtifact: {
              body: messageBody,
              providerEventId: null,
              providerMessageId,
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
              dedupeKey,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
        expect(duplicateBody.data).not.toHaveProperty('timeline');
        expect(duplicateBody.data).not.toHaveProperty('canonicalEvent');
        expect(duplicateBody.data).not.toHaveProperty('audit');
        expect(duplicateBody.data).not.toHaveProperty('outbox');
      },
    );
  },
);
