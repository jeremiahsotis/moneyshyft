import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryE1Context,
  createStoryE1Headers,
} from '../../support/factories/connectShyftStoryE1Factory';
import {
  deterministicE164,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate E2E Expansion)',
  () => {
    test(
      '[E1-AUTOMATE-E2E-201][P0] signed mapped ingress journey resolves deterministic tenant and orgUnit routing and preserves thread detail contracts @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context({
          orgUnitId: 'org-connectshyft-f1-west',
        });
        const operatorHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const systemAdminHeaders = createStoryE1Headers(context, {
          role: 'SYSTEM_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const mappedInboundNumber = deterministicE164(testInfo, 'e1-automate-e2e-mapped-number');
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: systemAdminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: mappedInboundNumber,
            label: 'Story e.1 automate e2e mapped inbound number',
            isActive: true,
          },
        });

        expect([200, 201]).toContain(mappingResponse.status());

        const payload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: mappedInboundNumber,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-e2e-mapped-${deterministicToken(testInfo, 'mapped-message')}`,
          providerEventId: `provider-event-e1-automate-e2e-${deterministicToken(testInfo, 'mapped-journey')}`,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...systemAdminHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'automate-e2e-mapped-journey'),
          },
          data: payload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = (await webhookResponse.json()) as Record<string, unknown>;
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
              threadId: expect.any(String),
              providerNumberE164: mappedInboundNumber,
            },
            canonicalTranslation: {
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
              providerBranchingInDomain: false,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });

        const routedThreadId = String(webhookBody?.data?.correlation?.threadId || '');
        expect(routedThreadId.length).toBeGreaterThan(0);

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${routedThreadId}`,
          headers: operatorHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = (await detailResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: routedThreadId,
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
            },
          },
        });
      },
    );

    test(
      '[E1-AUTOMATE-E2E-202][P0] replay-safe ingress journey normalizes provider event identity for duplicate suppression across case variants @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context({
          orgUnitId: 'org-connectshyft-f1-west',
        });
        const systemAdminHeaders = createStoryE1Headers(context, {
          role: 'SYSTEM_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const mappedInboundNumber = deterministicE164(testInfo, 'e1-automate-e2e-replay-mapped-number');
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: systemAdminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: mappedInboundNumber,
            label: 'Story e.1 automate e2e replay-safe mapping',
            isActive: true,
          },
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const providerEventId = `PROVIDER-EVENT-E1-${deterministicToken(testInfo, 'replay-event').toUpperCase()}`;
        const providerMessageId = `msg-e1-automate-e2e-${deterministicToken(testInfo, 'replay-message')}`;
        const providerLegId = `call-leg-e1-automate-e2e-${deterministicToken(testInfo, 'replay-leg')}`;

        const firstPayload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: mappedInboundNumber,
          from: context.numbers.mappedOutbound,
          providerMessageId,
          providerEventId,
          providerLegId,
        });
        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...systemAdminHeaders,
            ...buildSignedWebhookHeaders(firstPayload, testInfo, 'automate-e2e-replay-first'),
          },
          data: firstPayload,
        });

        const duplicatePayload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: mappedInboundNumber,
          from: context.numbers.mappedOutbound,
          providerMessageId,
          providerEventId: providerEventId.toLowerCase(),
          providerLegId,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...systemAdminHeaders,
            ...buildSignedWebhookHeaders(duplicatePayload, testInfo, 'automate-e2e-replay-duplicate'),
          },
          data: duplicatePayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);

        const firstBody = (await firstResponse.json()) as Record<string, unknown>;
        const duplicateBody = (await duplicateResponse.json()) as Record<string, unknown>;
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
  },
);
