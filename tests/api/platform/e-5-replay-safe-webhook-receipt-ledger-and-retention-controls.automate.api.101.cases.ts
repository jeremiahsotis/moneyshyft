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
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (Automate API Expansion) - Case 101',
  () => {
    test(
      '[E5-AUTOMATE-API-101][P0] same providerEventId across distinct sms event types processes once per eventType identity @P0',
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

        const providerEventId = deterministicProviderEventId(
          withStoryE5RunScope(storyE5Context, 'provider-event-e5-automate-api'),
          testInfo,
          'event-type-scope',
        );
        const basePayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-automate-api-101-${deterministicToken(testInfo, 'event-type-scope-message')}`,
            providerEventId,
          }),
          neighborId: `neighbor-connectshyft-e5-automate-api-101-${deterministicToken(testInfo, 'event-type-scope-neighbor')}`,
        };

        const { body: deliveredBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: basePayload,
          testInfo,
          signatureLabel: 'e5-automate-api-101-delivered',
        });

        const receivedPayload = {
          ...basePayload,
          eventType: 'sms.received',
        };
        const { body: receivedBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: receivedPayload,
          testInfo,
          signatureLabel: 'e5-automate-api-101-received',
        });

        expect(deliveredBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.any(String),
            },
          },
        });

        expect(receivedBody).toMatchObject({
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
            },
          },
        });

        expect(receivedBody?.data?.replaySafe?.dedupeKey).toBe(
          deliveredBody?.data?.replaySafe?.dedupeKey,
        );
      },
    );
  },
);
