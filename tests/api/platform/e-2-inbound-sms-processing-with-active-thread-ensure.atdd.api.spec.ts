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
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (ATDD API RED)',
  () => {
    test.skip(
      '[E2-ATDD-API-001][P0] mapped inbound sms ensures one active thread for tenant-orgUnit-neighbor and appends inbound message artifact @P0',
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

        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-001-${deterministicToken(testInfo, 'e2-atdd-api-001-message')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-api',
              testInfo,
              'mapped-ensure-append',
            ),
          }),
          neighborId: storyE2Context.neighborIds.inboundCreate,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-api-001'),
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
              source: 'number_mapping',
              deterministic: true,
              tenantId: storyE2Context.tenantId,
              orgUnitId: storyE2Context.orgUnitId,
              neighborId: storyE2Context.neighborIds.inboundCreate,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.stringContaining('provider-event:'),
            },
            thread: {
              tenantId: storyE2Context.tenantId,
              orgUnitId: storyE2Context.orgUnitId,
              neighborId: storyE2Context.neighborIds.inboundCreate,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: true,
            },
            inboundMessageArtifact: {
              channel: 'sms',
              direction: 'inbound',
              providerEventId: expect.any(String),
              body: expect.any(String),
            },
            timeline: {
              eventName: storyE2Context.eventNames.inboundSmsAppended,
              routingDecision: 'accepted',
            },
            sideEffects: {
              canonicalEventPersisted: true,
              auditPersisted: true,
              outboxPersisted: true,
            },
          },
        });
      },
    );

    test.skip(
      '[E2-ATDD-API-002][P0] existing active thread is reused without duplicate creation and ordering remains deterministic @P0',
      async ({
        request,
        storyE2Context,
        storyE2OperatorHeaders,
        storyE2AdminHeaders,
        storyE2NumberMappingPayload,
        storyE2EnsurePayload,
      }, testInfo) => {
        await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.numbersCollection,
          headers: storyE2AdminHeaders,
          data: storyE2NumberMappingPayload,
        });

        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.threads,
          headers: storyE2OperatorHeaders,
          data: storyE2EnsurePayload,
        });
        expect(ensureResponse.status()).toBe(201);
        const ensureBody = await ensureResponse.json();
        const existingThreadId = String(ensureBody?.data?.thread?.threadId || '');
        expect(existingThreadId.length).toBeGreaterThan(0);

        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-002-${deterministicToken(testInfo, 'e2-atdd-api-002-message')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-api',
              testInfo,
              'existing-thread-reuse',
            ),
          }),
          neighborId: storyE2Context.neighborIds.existingActive,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-api-002'),
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
            thread: {
              threadId: existingThreadId,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: false,
              reusedThreadId: existingThreadId,
            },
            timeline: {
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
        const timeline = detailBody?.data?.thread?.timeline as Array<{
          eventName: string;
          occurredAtUtc: string;
          eventId: string;
        }>;
        const inboundSmsEvents = timeline.filter(
          (entry) => entry.eventName === storyE2Context.eventNames.inboundSmsAppended,
        );
        expect(inboundSmsEvents.length).toBeGreaterThan(0);
        const sorted = [...inboundSmsEvents].sort((left, right) => {
          const timeDelta =
            new Date(left.occurredAtUtc).getTime() -
            new Date(right.occurredAtUtc).getTime();
          return timeDelta !== 0 ? timeDelta : left.eventId.localeCompare(right.eventId);
        });
        expect(inboundSmsEvents).toEqual(sorted);
      },
    );

    test.skip(
      '[E2-ATDD-API-003][P0] duplicate inbound webhook deliveries suppress duplicate timeline entries via provider event replay identity @P0',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
        storyE2NumberMappingPayload,
      }, testInfo) => {
        await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.numbersCollection,
          headers: storyE2AdminHeaders,
          data: storyE2NumberMappingPayload,
        });

        const providerEventId = deterministicProviderEventId(
          'provider-event-e2-atdd-api',
          testInfo,
          'duplicate-suppression',
        );
        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-003-${deterministicToken(testInfo, 'e2-atdd-api-003-message')}`,
            providerEventId,
          }),
          neighborId: storyE2Context.neighborIds.inboundDuplicate,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-api-003-first'),
          },
          data: webhookPayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-api-003-duplicate'),
          },
          data: webhookPayload,
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
        expect(duplicateBody.data).not.toHaveProperty('timeline');
        expect(duplicateBody.data).not.toHaveProperty('audit');
        expect(duplicateBody.data).not.toHaveProperty('outbox');
      },
    );

    test.skip(
      '[E2-ATDD-API-004][P1] create-and-append path writes inbound message artifact atomically with audit and outbox metadata @P1',
      async ({
        request,
        storyE2Context,
        storyE2OperatorHeaders,
        storyE2AdminHeaders,
        storyE2NumberMappingPayload,
      }, testInfo) => {
        await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.numbersCollection,
          headers: storyE2AdminHeaders,
          data: storyE2NumberMappingPayload,
        });

        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-004-${deterministicToken(testInfo, 'e2-atdd-api-004-message')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-api',
              testInfo,
              'atomic-create-append',
            ),
          }),
          neighborId: storyE2Context.neighborIds.inboundCreate,
        };

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.inboundWebhook,
          headers: {
            ...storyE2AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-api-004'),
          },
          data: webhookPayload,
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: true,
            },
            inboundMessageArtifact: {
              artifactId: expect.any(String),
              channel: 'sms',
              direction: 'inbound',
            },
            transaction: {
              atomic: true,
              auditPersisted: true,
              outboxPersisted: true,
            },
            audit: {
              eventName: storyE2Context.eventNames.inboundSmsAppended,
            },
            outbox: {
              eventName: storyE2Context.eventNames.inboundSmsAppended,
            },
          },
        });

        const resolvedThreadId = String(body?.data?.thread?.threadId || body?.data?.threadId || '');
        expect(resolvedThreadId.length).toBeGreaterThan(0);
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE2Context.paths.threads}/${resolvedThreadId}`,
          headers: storyE2OperatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
      },
    );
  },
);
