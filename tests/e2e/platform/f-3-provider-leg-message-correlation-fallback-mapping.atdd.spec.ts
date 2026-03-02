import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryF3Context,
  createStoryF3Headers,
} from '../../support/factories/connectShyftStoryF3Factory';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const randomToken = (): string => randomUUID().slice(0, 8);

test.describe(
  'Story f.3 Provider Leg/Message Correlation Fallback Mapping (ATDD E2E)',
  () => {
    test(
      '[P0] end-to-end webhook ingestion resolves both provider leg and provider message fallback correlations deterministically @P0',
      async ({ request }) => {
        const context = createStoryF3Context();
        const operatorHeaders = createStoryF3Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF3Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story f.3 ATDD E2E provider-message fallback correlation coverage.',
          },
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);
        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();
        expect(hasRequiredEnvelopeKeys(callBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(messageBody)).toBe(true);

        const providerLegId = callBody?.data?.dispatch?.providerLegId as string;
        const providerMessageId = messageBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const callWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: {
            eventType: 'voice.connected',
            providerKey: context.providers.enabledPrimary,
            providerLegId,
            providerEventId: `provider-event-f3-e2e-leg-${randomToken()}`,
          },
        });
        const messageWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: {
            eventType: 'sms.delivered',
            providerKey: context.providers.enabledPrimary,
            providerMessageId,
            providerEventId: `provider-event-f3-e2e-message-${randomToken()}`,
          },
        });

        expect(callWebhookResponse.status()).toBe(200);
        expect(messageWebhookResponse.status()).toBe(200);

        const callWebhookBody = await callWebhookResponse.json();
        const messageWebhookBody = await messageWebhookResponse.json();
        expect(hasRequiredEnvelopeKeys(callWebhookBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(messageWebhookBody)).toBe(true);
        expect(callWebhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              threadId: context.threadIds.unclaimed,
              providerLegId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });
        expect(messageWebhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              threadId: context.threadIds.unclaimed,
              providerMessageId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });
      },
    );

    test(
      '[P0] end-to-end webhook routing returns deterministic correlation conflict refusal when partial metadata disagrees with fallback mapping @P0',
      async ({ request }) => {
        const context = createStoryF3Context();
        const operatorHeaders = createStoryF3Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF3Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });
        expect(callResponse.status()).toBe(200);
        const callBody = await callResponse.json();
        const providerLegId = callBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: {
            eventType: 'voice.connected',
            providerKey: context.providers.enabledPrimary,
            threadId: context.threadIds.closed,
            providerLegId,
          },
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: false,
          code: context.refusalCodes.correlationConflict,
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
      '[P1] duplicate webhook replay is suppressed with deterministic side-effect prevention metadata @P1',
      async ({ request }) => {
        const context = createStoryF3Context();
        const operatorHeaders = createStoryF3Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF3Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story f.3 ATDD E2E duplicate callback suppression coverage.',
          },
        });
        expect(messageResponse.status()).toBe(200);
        const messageBody = await messageResponse.json();
        const providerMessageId = messageBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const webhookPayload = {
          eventType: 'sms.delivered',
          providerKey: context.providers.enabledPrimary,
          providerMessageId,
          providerEventId: `provider-event-f3-e2e-duplicate-${randomToken()}`,
        };

        const firstWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: webhookPayload,
        });
        const duplicateWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: webhookPayload,
        });

        expect(firstWebhookResponse.status()).toBe(200);
        expect(duplicateWebhookResponse.status()).toBe(200);
        const firstBody = await firstWebhookResponse.json();
        const duplicateBody = await duplicateWebhookResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
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
  },
);
