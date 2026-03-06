import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import { buildSmsWebhookPayload } from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  ensureStoryE5NumberMapping,
  postStoryE5InboundWebhook,
  withStoryE5RunScope,
} from '../../support/helpers/connectShyftStoryE5TestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD API RED) - Case 002',
  () => {
    test(
      '[E5-ATDD-API-002][P0] first-seen receipt insertion allows downstream webhook processing and expected domain artifacts @P0',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
      }, testInfo) => {
        await ensureStoryE5NumberMapping({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          numberMappingPayload: storyE5NumberMappingPayload,
        });

        const firstSeenPayload = buildSmsWebhookPayload({
          providerKey: storyE5Context.providers.enabledPrimary,
          to: storyE5Context.numbers.mappedInbound,
          from: storyE5Context.numbers.mappedOutbound,
          providerMessageId: `msg-e5-first-seen-${deterministicToken(testInfo, 'first-seen-message')}`,
          providerEventId: deterministicProviderEventId(
            withStoryE5RunScope(storyE5Context, 'provider-event-e5-atdd-api'),
            testInfo,
            'first-seen',
          ),
        });
        const acceptedPayload = {
          ...firstSeenPayload,
          neighborId: 'neighbor-connectshyft-e5-first-seen-1001',
        };

        const { body } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: acceptedPayload,
          testInfo,
          signatureLabel: 'e5-atdd-api-002',
        });

        expect(body).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.any(String),
            },
            sideEffects: {
              lifecycleMutationApplied: true,
              canonicalEventPersisted: true,
              outboxPersisted: false,
            },
            timelineOutcome: {
              routingDecision: 'accepted',
              eventName: expect.any(String),
            },
          },
        });
      },
    );
  },
);
