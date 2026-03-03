import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE2.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  assertDurabilityEnvelope,
  buildStoryE2NeighborId,
  fetchThreadTimeline,
  mapStoryE2InboundNumber,
  postSignedInboundWebhook,
  resolveThreadIdFromEnvelope,
} from './e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.shared';

test.describe(
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (ATDD API RED) - Core Flows',
  () => {
    test.beforeEach(async ({
      request,
      storyE2Context,
      storyE2AdminHeaders,
      storyE2NumberMappingPayload,
    }) => {
      await mapStoryE2InboundNumber({
        request,
        context: storyE2Context,
        adminHeaders: storyE2AdminHeaders,
        numberMappingPayload: storyE2NumberMappingPayload,
      });
    });

    test(
      '[E2-ATDD-API-001][P0] mapped inbound sms ensures one active thread for tenant-orgUnit-neighbor and appends inbound message artifact @P0',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
      }, testInfo) => {
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
          neighborId: buildStoryE2NeighborId(
            storyE2Context.neighborIds.inboundCreate,
            testInfo,
            'e2-atdd-api-001-neighbor',
            'new',
          ),
        };

        const webhookResponse = await postSignedInboundWebhook({
          request,
          path: storyE2Context.paths.inboundWebhook,
          adminHeaders: storyE2AdminHeaders,
          webhookPayload,
          testInfo,
          signatureLabel: 'e2-atdd-api-001',
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
              neighborId: webhookPayload.neighborId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.stringContaining('provider-event:'),
            },
            thread: {
              tenantId: storyE2Context.tenantId,
              orgUnitId: storyE2Context.orgUnitId,
              neighborId: webhookPayload.neighborId,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              ensuredActiveThread: true,
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
            },
          },
        });

        const resolvedThreadId = resolveThreadIdFromEnvelope(webhookBody);
        expect(resolvedThreadId.length).toBeGreaterThan(0);
        assertDurabilityEnvelope({
          body: webhookBody,
          tenantId: storyE2Context.tenantId,
          threadId: resolvedThreadId,
          expectedEventName: storyE2Context.eventNames.inboundSmsAppended,
        });
      },
    );

    test(
      '[E2-ATDD-API-002][P0] existing active thread is reused without duplicate creation and ordering remains deterministic @P0',
      async ({
        request,
        storyE2Context,
        storyE2OperatorHeaders,
        storyE2AdminHeaders,
        storyE2EnsurePayload,
      }, testInfo) => {
        const existingNeighborId = buildStoryE2NeighborId(
          storyE2Context.neighborIds.existingActive,
          testInfo,
          'e2-atdd-api-002-neighbor',
          'existing',
        );

        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE2Context.paths.threads,
          headers: storyE2OperatorHeaders,
          data: {
            ...storyE2EnsurePayload,
            neighborId: existingNeighborId,
          },
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
          neighborId: existingNeighborId,
        };

        const webhookResponse = await postSignedInboundWebhook({
          request,
          path: storyE2Context.paths.inboundWebhook,
          adminHeaders: storyE2AdminHeaders,
          webhookPayload,
          testInfo,
          signatureLabel: 'e2-atdd-api-002',
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

        const timeline = await fetchThreadTimeline({
          request,
          context: storyE2Context,
          operatorHeaders: storyE2OperatorHeaders,
          threadId: existingThreadId,
        });
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

    test(
      '[E2-ATDD-API-004][P1] create-and-append path writes inbound message artifact atomically with audit and outbox metadata @P1',
      async ({
        request,
        storyE2Context,
        storyE2OperatorHeaders,
        storyE2AdminHeaders,
      }, testInfo) => {
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
          neighborId: buildStoryE2NeighborId(
            storyE2Context.neighborIds.inboundCreate,
            testInfo,
            'e2-atdd-api-004-neighbor',
            'atomic',
          ),
        };

        const response = await postSignedInboundWebhook({
          request,
          path: storyE2Context.paths.inboundWebhook,
          adminHeaders: storyE2AdminHeaders,
          webhookPayload,
          testInfo,
          signatureLabel: 'e2-atdd-api-004',
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
            },
            inboundMessageArtifact: {
              artifactId: expect.any(String),
              channel: 'sms',
              direction: 'inbound',
            },
            sideEffects: {
              canonicalEventPersisted: true,
            },
          },
        });

        const resolvedThreadId = resolveThreadIdFromEnvelope(body);
        expect(resolvedThreadId.length).toBeGreaterThan(0);
        assertDurabilityEnvelope({
          body,
          tenantId: storyE2Context.tenantId,
          threadId: resolvedThreadId,
          expectedEventName: storyE2Context.eventNames.inboundSmsAppended,
        });

        const timeline = await fetchThreadTimeline({
          request,
          context: storyE2Context,
          operatorHeaders: storyE2OperatorHeaders,
          threadId: resolvedThreadId,
        });
        expect(timeline.length).toBeGreaterThan(0);
      },
    );
  },
);
