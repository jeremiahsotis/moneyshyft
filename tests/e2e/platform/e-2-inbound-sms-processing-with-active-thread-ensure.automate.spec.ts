import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  createStoryE2Context,
  createStoryE2Headers,
} from '../../support/factories/connectShyftStoryE2Factory';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (Automate E2E Expansion)',
  () => {
    test(
      '[E2-AUTOMATE-E2E-201][P0] metadata correlation journey reuses ensured thread and appends inbound sms timeline entry without explicit neighbor field @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE2Context();
        const operatorHeaders = createStoryE2Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE2Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.2 automate e2e metadata mapping',
            isActive: true,
          },
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const neighborId = `${context.neighborIds.existingActive}-automate-e2e-meta-${deterministicToken(testInfo, 'e2-automate-e2e-201-neighbor')}`;
        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threads,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e2-automate-e2e-201',
            preferredOutboundCsNumberId: 'cs-outbound-e2-automate-e2e-201',
          },
        });
        expect(ensureResponse.status()).toBe(201);
        const ensureBody = await ensureResponse.json();
        const existingThreadId = String(ensureBody?.data?.thread?.threadId || '');
        expect(existingThreadId.length).toBeGreaterThan(0);

        const providerMessageId = `msg-e2-automate-e2e-201-${deterministicToken(testInfo, 'e2-automate-e2e-201-message')}`;
        const providerEventId = `provider-event-e2-automate-e2e-201-${deterministicToken(testInfo, 'e2-automate-e2e-201-event')}`;
        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: context.providers.enabledPrimary,
            to: context.numbers.mappedInbound,
            from: context.numbers.mappedOutbound,
            providerMessageId,
            providerEventId,
          }),
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          threadId: existingThreadId,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-e2e-201'),
          },
          data: webhookPayload,
        });
        expect(webhookResponse.status()).toBe(200);

        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'metadata',
              threadId: existingThreadId,
              neighborId,
            },
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: false,
              reusedThreadId: existingThreadId,
            },
            timeline: {
              eventName: context.eventNames.inboundSmsAppended,
              routingDecision: 'accepted',
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${existingThreadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        const timeline = detailBody?.data?.thread?.timeline as Array<{ eventName: string }>;
        const inboundSmsEvents = timeline.filter(
          (entry) => entry.eventName === context.eventNames.inboundSmsAppended,
        );
        expect(inboundSmsEvents.length).toBeGreaterThan(0);
      },
    );

    test(
      '[E2-AUTOMATE-E2E-202][P1] message-id replay-safe journey suppresses duplicate inbound delivery when providerEventId is absent @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE2Context();
        const operatorHeaders = createStoryE2Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE2Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.2 automate e2e replay-safe mapping',
            isActive: true,
          },
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const neighborId = `${context.neighborIds.inboundDuplicate}-automate-e2e-dedupe-${deterministicToken(testInfo, 'e2-automate-e2e-202-neighbor')}`;
        const providerMessageId = `MSG-E2-AUTOMATE-E2E-202-${deterministicToken(testInfo, 'e2-automate-e2e-202-message').toUpperCase()}`;
        const contentBody = `Fallback content ${deterministicToken(testInfo, 'e2-automate-e2e-202-body')}`;
        const webhookPayload = {
          eventType: 'sms.delivered',
          providerKey: context.providers.enabledPrimary,
          providerPayload: {
            to: context.numbers.mappedInbound,
            from: context.numbers.mappedOutbound,
            message_uuid: providerMessageId,
            content: contentBody,
          },
          neighborId,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-e2e-202-first'),
          },
          data: webhookPayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-automate-e2e-202-duplicate'),
          },
          data: webhookPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);

        const dedupeKey = `message:${providerMessageId.toLowerCase()}|event:messagedelivered`;
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey,
            },
            inboundMessageArtifact: {
              body: contentBody,
              providerEventId: null,
              providerMessageId,
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
              dedupeKey,
            },
          },
        });

        const firstThreadId = String(firstBody?.data?.thread?.threadId || firstBody?.data?.threadId || '');
        expect(firstThreadId.length).toBeGreaterThan(0);
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${firstThreadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const timeline = detailBody?.data?.thread?.timeline as Array<{ eventName: string }>;
        const inboundSmsEvents = timeline.filter(
          (entry) => entry.eventName === context.eventNames.inboundSmsAppended,
        );
        expect(inboundSmsEvents.length).toBe(1);
      },
    );
  },
);
