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
  // In local Playwright harness, signature checks may be bypassed in override mode.
  // Keep this value deterministic so green-phase can swap in real signed fixtures.
  'telnyx-signature-ed25519': `story-e1-signature-${randomToken()}`,
});

const buildWebhookPayload = (input: {
  providerKey: string;
  to: string;
  from: string;
  providerMessageId: string;
  providerEventId: string;
  providerLegId?: string;
}) => ({
  eventType: 'sms.delivered' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerPayload: {
    to: input.to,
    from: input.from,
    message_uuid: input.providerMessageId,
    call_control_id: input.providerLegId ?? null,
  },
});

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (ATDD API RED)',
  () => {
    test.skip(
      '[P0] rejects unsigned webhooks with deterministic fail-closed refusal and no domain side effects @P0',
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

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: storyE1AdminHeaders,
          data: buildWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.mappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId: `msg-e1-unsigned-${randomToken()}`,
            providerEventId: `provider-event-e1-unsigned-${randomToken()}`,
          }),
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
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
      '[P0] accepts valid signed ingress and resolves deterministic tenant and orgUnit context from provider-number mapping before downstream handling @P0',
      async ({
        request,
        storyE1Context,
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
        const mappingBody = await mappingResponse.json();
        expect(hasRequiredEnvelopeKeys(mappingBody)).toBe(true);
        expect(mappingBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          data: {
            orgUnitId: storyE1Context.orgUnitId,
            providerNumberE164: storyE1Context.numbers.mappedInbound,
          },
        });

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
            providerMessageId: `msg-e1-mapped-${randomToken()}`,
            providerEventId: `provider-event-e1-mapped-${randomToken()}`,
          }),
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            providerResolution: {
              requestedProvider: storyE1Context.providers.enabledPrimary,
              resolvedProvider: storyE1Context.providers.enabledPrimary,
              deterministic: true,
              adapterInvoked: true,
            },
            correlation: {
              source: 'number_mapping',
              deterministic: true,
              tenantId: storyE1Context.tenantId,
              orgUnitId: storyE1Context.orgUnitId,
              threadId: expect.any(String),
            },
            canonicalTranslation: {
              eventType: storyE1Context.canonicalEventTypes.messageDelivered,
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
              providerBranchingInDomain: false,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.stringContaining('provider-event:'),
            },
          },
        });
      },
    );

    test.skip(
      '[P0] normalizes provider-specific event identifiers into canonical replay-safe identity fields for duplicate suppression @P0',
      async ({
        request,
        storyE1Context,
        storyE1AdminHeaders,
        storyE1NumberMappingPayload,
      }) => {
        await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.numbersCollection,
          headers: storyE1AdminHeaders,
          data: storyE1NumberMappingPayload,
        });

        const providerEventId = `PROVIDER-EVENT-E1-${randomToken().toUpperCase()}`;
        const providerMessageId = `msg-e1-identity-${randomToken()}`;
        const providerLegId = `call-leg-e1-identity-${randomToken()}`;
        const signatureHeaders = buildSignatureHeaders();

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...signatureHeaders,
          },
          data: buildWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.mappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId,
            providerEventId,
            providerLegId,
          }),
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE1Context.paths.inboundWebhook,
          headers: {
            ...storyE1AdminHeaders,
            ...signatureHeaders,
          },
          data: buildWebhookPayload({
            providerKey: storyE1Context.providers.enabledPrimary,
            to: storyE1Context.numbers.mappedInbound,
            from: storyE1Context.numbers.mappedOutbound,
            providerMessageId,
            providerEventId: providerEventId.toLowerCase(),
            providerLegId,
          }),
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

    test.skip(
      '[P1] refuses unmapped inbound routing deterministically with auditable refusal metadata and zero operational artifact writes @P1',
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
            providerMessageId: `msg-e1-unmapped-${randomToken()}`,
            providerEventId: `provider-event-e1-unmapped-${randomToken()}`,
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
