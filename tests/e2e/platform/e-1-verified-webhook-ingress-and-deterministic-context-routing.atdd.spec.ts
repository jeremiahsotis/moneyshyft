import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE1.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const randomToken = (): string => randomUUID().slice(0, 8);

const buildSignatureHeaders = (): Record<string, string> => ({
  'telnyx-timestamp': String(Math.trunc(Date.now() / 1000)),
  'telnyx-signature-ed25519': `story-e1-signature-${randomToken()}`,
});

const buildWebhookPayload = (input: {
  providerKey: string;
  to: string;
  from: string;
  providerMessageId: string;
  providerEventId: string;
}) => ({
  eventType: 'sms.delivered' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerPayload: {
    to: input.to,
    from: input.from,
    message_uuid: input.providerMessageId,
  },
});

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] end-to-end ingress journey accepts valid signed webhook and preserves deterministic tenant orgUnit context on thread contracts @P0',
      async ({
        request,
        storyE1Context,
        storyE1OperatorHeaders,
        storyE1AdminHeaders,
        storyE1NumberMappingPayload,
      }) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.numbersCollection,
          headers: storyE1AdminHeaders,
          data: storyE1NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}/messages`,
          headers: storyE1OperatorHeaders,
          data: {
            orgUnitId: storyE1Context.orgUnitId,
            providerKey: storyE1Context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story e.1 ingress context-routing end-to-end verification message.',
          },
        });
        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerMessageId = outboundBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignatureHeaders(),
          },
          data: buildWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.mappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId,
            providerEventId: `provider-event-e1-e2e-${randomToken()}`,
          }),
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              deterministic: true,
              tenantId: storyE1Context.tenantId,
              orgUnitId: storyE1Context.orgUnitId,
              threadId: storyE1Context.threadIds.unclaimed,
            },
            canonicalTranslation: {
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}`,
          headers: storyE1OperatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: storyE1Context.threadIds.unclaimed,
              tenantId: storyE1Context.tenantId,
              orgUnitId: storyE1Context.orgUnitId,
            },
          },
        });
      },
    );

    test.skip(
      '[P0] end-to-end spoofed ingress journey is refused fail-closed and leaves thread lifecycle unchanged @P0',
      async ({
        request,
        storyE1Context,
        storyE1OperatorHeaders,
        storyE1AdminHeaders,
      }) => {
        const beforeDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE1Context.paths.threads}/${storyE1Context.threadIds.unclaimed}`,
          headers: storyE1OperatorHeaders,
        });
        expect(beforeDetailResponse.status()).toBe(200);
        const beforeDetailBody = await beforeDetailResponse.json();
        const beforeState = beforeDetailBody?.data?.thread?.state;

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: storyE1AdminHeaders,
          data: buildWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.mappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId: `msg-e1-e2e-unsigned-${randomToken()}`,
            providerEventId: `provider-event-e1-e2e-unsigned-${randomToken()}`,
          }),
        });

        expect(webhookResponse.status()).toBe(403);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
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

    test.skip(
      '[P1] end-to-end unmapped-number journey refuses deterministically with auditable metadata and no canonical writes @P1',
      async ({
        request,
        storyE1Context,
        storyE1AdminHeaders,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...buildSignatureHeaders(),
          },
          data: buildWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.unmappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId: `msg-e1-e2e-unmapped-${randomToken()}`,
            providerEventId: `provider-event-e1-e2e-unmapped-${randomToken()}`,
          }),
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
          },
        });
        expect(body.data).not.toHaveProperty('canonicalEvent');
      },
    );
  },
);
