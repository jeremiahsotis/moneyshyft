import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  createStoryE2Context,
  createStoryE2Headers,
} from '../../support/factories/connectShyftStoryE2Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.2 Inbound SMS Processing with Active-Thread Ensure (ATDD E2E RED)',
  () => {
    test.skip(
      '[E2-ATDD-E2E-001][P0] mapped inbound sms journey creates active thread when absent and appends inbound artifact to timeline @P0',
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
            label: 'Story e.2 inbound mapped number',
            isActive: true,
          },
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: context.providers.enabledPrimary,
            to: context.numbers.mappedInbound,
            from: context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-e2e-001-${deterministicToken(testInfo, 'e2-atdd-e2e-001-message')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-e2e',
              testInfo,
              'create-and-append',
            ),
          }),
          neighborId: context.neighborIds.inboundCreate,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-e2e-001'),
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
              source: 'number_mapping',
              deterministic: true,
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
              neighborId: context.neighborIds.inboundCreate,
            },
            lifecycle: {
              ensuredActiveThread: true,
              createdNewThread: true,
            },
            timeline: {
              eventName: context.eventNames.inboundSmsAppended,
            },
          },
        });

        const threadId = String(webhookBody?.data?.thread?.threadId || webhookBody?.data?.threadId || '');
        expect(threadId.length).toBeGreaterThan(0);
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${threadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            thread: {
              threadId,
              state: 'UNCLAIMED',
              timeline: expect.any(Array),
            },
          },
        });
      },
    );

    test.skip(
      '[E2-ATDD-E2E-002][P0] concurrent inbound deliveries for same tenant-orgUnit-neighbor converge to one active thread identity @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE2Context();
        const adminHeaders = createStoryE2Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.2 concurrent ingress number',
            isActive: true,
          },
        });

        const webhookPayloadA = {
          ...buildSmsWebhookPayload({
            providerKey: context.providers.enabledPrimary,
            to: context.numbers.mappedInbound,
            from: context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-e2e-002-${deterministicToken(testInfo, 'e2-atdd-e2e-002-message-a')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-e2e',
              testInfo,
              'concurrent-a',
            ),
          }),
          neighborId: context.neighborIds.existingActive,
        };
        const webhookPayloadB = {
          ...buildSmsWebhookPayload({
            providerKey: context.providers.enabledPrimary,
            to: context.numbers.mappedInbound,
            from: context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-e2e-002-${deterministicToken(testInfo, 'e2-atdd-e2e-002-message-b')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e2-atdd-e2e',
              testInfo,
              'concurrent-b',
            ),
          }),
          neighborId: context.neighborIds.existingActive,
        };

        const [firstResponse, secondResponse] = await Promise.all([
          apiRequest(request, {
            method: 'POST',
            path: context.paths.inboundWebhook,
            headers: {
              ...adminHeaders,
              ...buildSignedWebhookHeaders(webhookPayloadA, testInfo, 'e2-atdd-e2e-002-a'),
            },
            data: webhookPayloadA,
          }),
          apiRequest(request, {
            method: 'POST',
            path: context.paths.inboundWebhook,
            headers: {
              ...adminHeaders,
              ...buildSignedWebhookHeaders(webhookPayloadB, testInfo, 'e2-atdd-e2e-002-b'),
            },
            data: webhookPayloadB,
          }),
        ]);

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(secondBody)).toBe(true);

        const firstThreadId = String(firstBody?.data?.thread?.threadId || firstBody?.data?.threadId || '');
        const secondThreadId = String(secondBody?.data?.thread?.threadId || secondBody?.data?.threadId || '');
        expect(firstThreadId.length).toBeGreaterThan(0);
        expect(secondThreadId.length).toBeGreaterThan(0);
        expect(firstThreadId).toBe(secondThreadId);
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
              createdNewThread: false,
              reusedThreadId: firstThreadId,
            },
          },
        });
      },
    );

    test.skip(
      '[E2-ATDD-E2E-003][P1] duplicate webhook replay journey returns duplicate suppression metadata and does not append duplicate timeline rows @P1',
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

        await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.2 duplicate replay number',
            isActive: true,
          },
        });

        const providerEventId = deterministicProviderEventId(
          'provider-event-e2-atdd-e2e',
          testInfo,
          'duplicate-replay',
        );
        const webhookPayload = {
          ...buildSmsWebhookPayload({
            providerKey: context.providers.enabledPrimary,
            to: context.numbers.mappedInbound,
            from: context.numbers.mappedOutbound,
            providerMessageId: `msg-e2-atdd-e2e-003-${deterministicToken(testInfo, 'e2-atdd-e2e-003-message')}`,
            providerEventId,
          }),
          neighborId: context.neighborIds.inboundDuplicate,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-e2e-003-first'),
          },
          data: webhookPayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e2-atdd-e2e-003-duplicate'),
          },
          data: webhookPayload,
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

        const threadId = String(firstBody?.data?.thread?.threadId || firstBody?.data?.threadId || '');
        expect(threadId.length).toBeGreaterThan(0);
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${threadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
      },
    );
  },
);
