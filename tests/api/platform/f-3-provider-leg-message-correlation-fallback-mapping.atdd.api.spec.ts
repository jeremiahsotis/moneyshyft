import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryF3.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const randomToken = (): string => randomUUID().slice(0, 8);

test.describe(
  'Story f.3 Provider Leg/Message Correlation Fallback Mapping (ATDD API)',
  () => {
    test(
      '[P0] inbound webhook resolves correlation through provider leg fallback when metadata is omitted @P0',
      async ({
        request,
        storyF3Context,
        storyF3OperatorHeaders,
        storyF3AdminHeaders,
        storyF3OutboundCallPayload,
      }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF3Context.paths.threads}/${storyF3Context.threadIds.unclaimed}/call`,
          headers: storyF3OperatorHeaders,
          data: storyF3OutboundCallPayload,
        });

        expect(callResponse.status()).toBe(200);
        const callBody = await callResponse.json();
        expect(hasRequiredEnvelopeKeys(callBody)).toBe(true);
        expect(callBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
        });
        const providerLegId = callBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF3Context.paths.inboundWebhook,
          headers: storyF3AdminHeaders,
          data: {
            eventType: 'voice.connected',
            providerKey: storyF3Context.providers.enabledPrimary,
            providerLegId,
            providerEventId: `provider-event-f3-leg-${randomToken()}`,
          },
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              threadId: storyF3Context.threadIds.unclaimed,
              tenantId: storyF3Context.tenantId,
              orgUnitId: storyF3Context.orgUnitId,
              providerLegId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
            canonicalTranslation: {
              eventType: storyF3Context.canonicalEventTypes.callConnected,
            },
            timeline: {
              routingDecision: 'accepted',
            },
          },
        });
      },
    );

    test(
      '[P0] deterministic refusal is returned when metadata thread conflicts with provider fallback mapping @P0',
      async ({
        request,
        storyF3Context,
        storyF3OperatorHeaders,
        storyF3AdminHeaders,
        storyF3OutboundCallPayload,
      }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF3Context.paths.threads}/${storyF3Context.threadIds.unclaimed}/call`,
          headers: storyF3OperatorHeaders,
          data: storyF3OutboundCallPayload,
        });
        expect(callResponse.status()).toBe(200);
        const callBody = await callResponse.json();
        const providerLegId = callBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF3Context.paths.inboundWebhook,
          headers: storyF3AdminHeaders,
          data: {
            eventType: 'voice.connected',
            providerKey: storyF3Context.providers.enabledPrimary,
            tenantId: storyF3Context.tenantId,
            orgUnitId: storyF3Context.orgUnitId,
            threadId: storyF3Context.threadIds.claimed,
            providerLegId,
          },
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: false,
          code: storyF3Context.refusalCodes.correlationConflict,
          refusalType: 'business',
          data: {
            correlation: {
              deterministic: true,
              reason: 'conflict',
              providerLegId,
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
      },
    );

    test(
      '[P0] deterministic refusal is returned when metadata and fallback identifiers are both missing @P0',
      async ({ request, storyF3Context, storyF3AdminHeaders }) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF3Context.paths.inboundWebhook,
          headers: storyF3AdminHeaders,
          data: {
            eventType: 'voice.connected',
            providerKey: storyF3Context.providers.enabledPrimary,
          },
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: false,
          code: storyF3Context.refusalCodes.correlationIdentifiersRequired,
          refusalType: 'business',
          data: {
            correlation: {
              deterministic: true,
              reason: 'missing-identifiers',
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
      },
    );

    test(
      '[P1] duplicate webhook callbacks are suppressed and skip duplicate domain writes for provider message fallback correlation @P1',
      async ({
        request,
        storyF3Context,
        storyF3OperatorHeaders,
        storyF3AdminHeaders,
        storyF3OutboundMessagePayload,
      }) => {
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF3Context.paths.threads}/${storyF3Context.threadIds.unclaimed}/messages`,
          headers: storyF3OperatorHeaders,
          data: storyF3OutboundMessagePayload,
        });

        expect(messageResponse.status()).toBe(200);
        const messageBody = await messageResponse.json();
        expect(hasRequiredEnvelopeKeys(messageBody)).toBe(true);
        expect(messageBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
        });
        const providerMessageId = messageBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const webhookPayload = {
          eventType: 'sms.delivered',
          providerKey: storyF3Context.providers.enabledPrimary,
          providerMessageId,
          providerEventId: `provider-event-f3-message-${randomToken()}`,
        };

        const firstWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF3Context.paths.inboundWebhook,
          headers: storyF3AdminHeaders,
          data: webhookPayload,
        });
        expect(firstWebhookResponse.status()).toBe(200);
        const firstBody = await firstWebhookResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              providerMessageId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });

        const duplicateWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF3Context.paths.inboundWebhook,
          headers: storyF3AdminHeaders,
          data: webhookPayload,
        });
        expect(duplicateWebhookResponse.status()).toBe(200);
        const duplicateBody = await duplicateWebhookResponse.json();
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);
        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
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
        expect(duplicateBody.data).not.toHaveProperty('lifecycle');
      },
    );
  },
);
