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
  buildStoryE2NeighborId,
  fetchThreadTimeline,
  mapStoryE2InboundNumber,
  postSignedInboundWebhook,
  resolveThreadIdFromEnvelope,
} from './e-2-inbound-sms-processing-with-active-thread-ensure.atdd.api.shared';

test.describe(
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (ATDD API RED) - Replay and Refusal',
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
      '[E2-ATDD-API-003][P0] duplicate inbound webhook deliveries suppress duplicate timeline entries via provider event replay identity @P0',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
        storyE2OperatorHeaders,
      }, testInfo) => {
        const providerEventId = deterministicProviderEventId(
          'provider-event-e2-atdd-api',
          testInfo,
          'duplicate-suppression',
        );
        const duplicateNeighborId = buildStoryE2NeighborId(
          storyE2Context.neighborIds.inboundDuplicate,
          testInfo,
          'e2-atdd-api-003-neighbor',
          'duplicate',
        );
        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-003-${deterministicToken(testInfo, 'e2-atdd-api-003-message')}`,
            providerEventId,
          }),
          neighborId: duplicateNeighborId,
        };

        const firstResponse = await postSignedInboundWebhook({
          request,
          path: storyE2Context.paths.inboundWebhook,
          adminHeaders: storyE2AdminHeaders,
          webhookPayload,
          testInfo,
          signatureLabel: 'e2-atdd-api-003-first',
        });
        const duplicateResponse = await postSignedInboundWebhook({
          request,
          path: storyE2Context.paths.inboundWebhook,
          adminHeaders: storyE2AdminHeaders,
          webhookPayload,
          testInfo,
          signatureLabel: 'e2-atdd-api-003-duplicate',
        });

        expect(firstResponse.status()).toBe(200);
        const firstBody = await firstResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
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

        const threadId = resolveThreadIdFromEnvelope(firstBody);
        expect(threadId.length).toBeGreaterThan(0);

        const timelineAfterFirst = await fetchThreadTimeline({
          request,
          context: storyE2Context,
          operatorHeaders: storyE2OperatorHeaders,
          threadId,
        });
        const inboundCountAfterFirst = timelineAfterFirst.filter(
          (entry) => entry.eventName === storyE2Context.eventNames.inboundSmsAppended,
        ).length;
        expect(inboundCountAfterFirst).toBeGreaterThanOrEqual(1);

        expect(duplicateResponse.status()).toBe(200);
        const duplicateBody = await duplicateResponse.json();
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);
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

        const timelineAfterDuplicate = await fetchThreadTimeline({
          request,
          context: storyE2Context,
          operatorHeaders: storyE2OperatorHeaders,
          threadId,
        });
        const inboundCountAfterDuplicate = timelineAfterDuplicate.filter(
          (entry) => entry.eventName === storyE2Context.eventNames.inboundSmsAppended,
        ).length;
        expect(inboundCountAfterDuplicate).toBe(inboundCountAfterFirst);
      },
    );

    test(
      '[E2-ATDD-API-006][P1] inbound sms without prior neighbor context creates a new neighbor and appends inbound timeline artifacts @P1',
      async ({
        request,
        storyE2Context,
        storyE2AdminHeaders,
        storyE2OperatorHeaders,
      }, testInfo) => {
        const webhookPayload = buildSmsWebhookPayload({
          providerKey: storyE2Context.providers.enabledPrimary,
          to: storyE2Context.numbers.mappedInbound,
          from: storyE2Context.numbers.mappedOutbound,
          providerMessageId: `msg-e2-atdd-api-006-${deterministicToken(testInfo, 'e2-atdd-api-006-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e2-atdd-api',
            testInfo,
            'neighbor-unresolved',
          ),
        });

        const webhookResponse = await postSignedInboundWebhook({
          request,
          path: storyE2Context.paths.inboundWebhook,
          adminHeaders: storyE2AdminHeaders,
          webhookPayload,
          testInfo,
          signatureLabel: 'e2-atdd-api-006',
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              tenantId: storyE2Context.tenantId,
              orgUnitId: storyE2Context.orgUnitId,
              neighborId: expect.any(String),
            },
            lifecycle: {
              ensuredActiveThread: true,
            },
            thread: {
              tenantId: storyE2Context.tenantId,
              orgUnitId: storyE2Context.orgUnitId,
              neighborId: expect.any(String),
              state: 'UNCLAIMED',
            },
            sideEffects: {
              lifecycleMutationApplied: true,
              canonicalEventPersisted: true,
              outboxPersisted: false,
            },
            timeline: {
              eventName: storyE2Context.eventNames.inboundSmsAppended,
              routingDecision: 'accepted',
            },
          },
        });

        const threadId = resolveThreadIdFromEnvelope(webhookBody);
        expect(threadId.length).toBeGreaterThan(0);
        expect(webhookBody.data.thread.neighborId).toBe(webhookBody.data.correlation.neighborId);

        const timeline = await fetchThreadTimeline({
          request,
          context: storyE2Context,
          operatorHeaders: storyE2OperatorHeaders,
          threadId,
        });
        expect(timeline).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              eventName: storyE2Context.eventNames.inboundSmsAppended,
            }),
          ]),
        );
      },
    );
  },
);
