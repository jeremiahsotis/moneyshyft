import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import {
  ensureStoryE5NumberMapping,
  postStoryE5InboundWebhook,
  withStoryE5RunScope,
} from '../../support/helpers/connectShyftStoryE5TestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (Automate API Expansion) - Case 102',
  () => {
    test(
      '[E5-AUTOMATE-API-102][P1] message id fallback dedupe suppresses same eventType duplicates but allows distinct eventType processing @P1',
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

        const providerMessageId = withStoryE5RunScope(
          storyE5Context,
          `MSG-E5-AUTOMATE-API-102-${deterministicToken(testInfo, 'message-fallback-id').toUpperCase()}`,
        ).toUpperCase();
        const deliveredPayload = {
          eventType: 'sms.delivered',
          providerKey: storyE5Context.providers.enabledPrimary,
          providerPayload: {
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            message_uuid: providerMessageId,
          },
          neighborId: `neighbor-connectshyft-e5-automate-api-102-${deterministicToken(testInfo, 'message-fallback-neighbor')}`,
        };

        const { body: firstBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: deliveredPayload,
          testInfo,
          signatureLabel: 'e5-automate-api-102-first',
        });
        const { body: duplicateBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: deliveredPayload,
          testInfo,
          signatureLabel: 'e5-automate-api-102-duplicate',
        });

        const receivedPayload = {
          ...deliveredPayload,
          eventType: 'sms.received',
        };

        const { body: receivedBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: receivedPayload,
          testInfo,
          signatureLabel: 'e5-automate-api-102-received',
        });

        expect(firstBody).toMatchObject({
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

        expect(duplicateBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: expect.any(String),
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
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
          },
        });

        expect(duplicateBody?.data?.replaySafe?.dedupeKey).toBe(
          firstBody?.data?.replaySafe?.dedupeKey,
        );
        expect(receivedBody?.data?.replaySafe?.dedupeKey).not.toBe(
          duplicateBody?.data?.replaySafe?.dedupeKey,
        );
      },
    );
  },
);
