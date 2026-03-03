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
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (ATDD API RED) - Concurrency',
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
      '[E2-ATDD-API-005][P0] concurrent inbound deliveries converge to a single active thread identity while appending both artifacts @P0',
      async ({
        request,
        storyE2Context,
        storyE2OperatorHeaders,
        storyE2AdminHeaders,
      }, testInfo) => {
        const concurrentNeighborId = buildStoryE2NeighborId(
          storyE2Context.neighborIds.inboundCreate,
          testInfo,
          'e2-atdd-api-005-neighbor',
          'concurrent',
        );

        const webhookPayloadA = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-005-a-${deterministicToken(testInfo, 'e2-atdd-api-005-message-a')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-api',
              testInfo,
              'concurrent-a',
            ),
          }),
          neighborId: concurrentNeighborId,
        };

        const webhookPayloadB = {
          ...buildSmsWebhookPayload({
            providerKey: storyE2Context.providers.enabledPrimary,
            to: storyE2Context.numbers.mappedInbound,
            from: storyE2Context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-api-005-b-${deterministicToken(testInfo, 'e2-atdd-api-005-message-b')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-api',
              testInfo,
              'concurrent-b',
            ),
          }),
          neighborId: concurrentNeighborId,
        };

        const [firstResponse, secondResponse] = await Promise.all([
          postSignedInboundWebhook({
            request,
            path: storyE2Context.paths.inboundWebhook,
            adminHeaders: storyE2AdminHeaders,
            webhookPayload: webhookPayloadA,
            testInfo,
            signatureLabel: 'e2-atdd-api-005-a',
          }),
          postSignedInboundWebhook({
            request,
            path: storyE2Context.paths.inboundWebhook,
            adminHeaders: storyE2AdminHeaders,
            webhookPayload: webhookPayloadB,
            testInfo,
            signatureLabel: 'e2-atdd-api-005-b',
          }),
        ]);

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(secondBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            lifecycle: {
              ensuredActiveThread: true,
            },
            replaySafe: {
              duplicate: false,
            },
          },
        });
        expect(secondBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            lifecycle: {
              ensuredActiveThread: true,
            },
            replaySafe: {
              duplicate: false,
            },
          },
        });

        const firstThreadId = resolveThreadIdFromEnvelope(firstBody);
        const secondThreadId = resolveThreadIdFromEnvelope(secondBody);
        expect(firstThreadId.length).toBeGreaterThan(0);
        expect(secondThreadId.length).toBeGreaterThan(0);
        expect(firstThreadId).toBe(secondThreadId);

        const timeline = await fetchThreadTimeline({
          request,
          context: storyE2Context,
          operatorHeaders: storyE2OperatorHeaders,
          threadId: firstThreadId,
        });

        const inboundSmsEvents = timeline.filter(
          (entry) => entry.eventName === storyE2Context.eventNames.inboundSmsAppended,
        );
        expect(inboundSmsEvents.length).toBeGreaterThanOrEqual(2);
      },
    );
  },
);
