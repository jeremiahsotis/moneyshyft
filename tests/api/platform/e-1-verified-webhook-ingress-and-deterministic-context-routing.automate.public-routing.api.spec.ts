import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryE1Context,
  createStoryE1Headers,
} from '../../support/factories/connectShyftStoryE1Factory';
import {
  deterministicE164,
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate API Expansion)',
  () => {
    test(
      '[E1-AUTOMATE-API-103][P0] public ingress resolves deterministic tenant and orgUnit via globally unique active number mapping when identifiers are unavailable @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const systemAdminHeaders = createStoryE1Headers(context, {
          role: 'SYSTEM_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const publicHeaders = createStoryE1Headers(context, {
          tenantId: 'public',
          orgUnitId: null,
          role: 'SYSTEM_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [],
        });
        const mappedInboundNumber = deterministicE164(testInfo, 'e1-automate-public-unique-number');

        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: systemAdminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: mappedInboundNumber,
            label: 'Story e.1 automate public-routing unique mapping',
            isActive: true,
          },
        });

        expect([200, 201]).toContain(mappingResponse.status());
        const mappingBody = await mappingResponse.json();
        expect(hasRequiredEnvelopeKeys(mappingBody)).toBe(true);
        expect([
          'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE',
        ]).toContain(mappingBody.code);

        const payload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: mappedInboundNumber,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-public-${deterministicToken(testInfo, 'public-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'public-unique',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...publicHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'automate-api-public-unique'),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
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
          },
        });
      },
    );

    test(
      '[E1-AUTOMATE-API-104][P0] public ingress refuses deterministically when number mapping fallback is ambiguous across tenants @P0',
      async ({ request }, testInfo) => {
        const primaryContext = createStoryE1Context();
        const secondaryContext = createStoryE1Context({
          tenantId: 'tenant-connectshyft-f2',
          orgUnitId: 'org-connectshyft-f2-east',
          userId: 'user-connectshyft-e1-f2-operator',
        });

        const sharedInboundNumber = deterministicE164(testInfo, 'e1-automate-public-ambiguous-number');

        const primarySystemAdminHeaders = createStoryE1Headers(primaryContext, {
          role: 'SYSTEM_ADMIN',
          userId: primaryContext.adminUserId,
          orgUnitMemberships: [primaryContext.orgUnitId],
        });
        const secondarySystemAdminHeaders = createStoryE1Headers(secondaryContext, {
          role: 'SYSTEM_ADMIN',
          userId: 'user-connectshyft-e1-f2-admin',
          orgUnitMemberships: [secondaryContext.orgUnitId],
        });

        const firstMapping = await apiRequest(request, {
          method: 'POST',
          path: primaryContext.paths.numbersCollection,
          headers: primarySystemAdminHeaders,
          data: {
            orgUnitId: primaryContext.orgUnitId,
            providerNumberE164: sharedInboundNumber,
            label: 'Story e.1 automate ambiguous mapping tenant f1',
            isActive: true,
          },
        });
        const secondMapping = await apiRequest(request, {
          method: 'POST',
          path: secondaryContext.paths.numbersCollection,
          headers: secondarySystemAdminHeaders,
          data: {
            orgUnitId: secondaryContext.orgUnitId,
            providerNumberE164: sharedInboundNumber,
            label: 'Story e.1 automate ambiguous mapping tenant f2',
            isActive: true,
          },
        });

        expect([200, 201]).toContain(firstMapping.status());
        expect([200, 201]).toContain(secondMapping.status());

        const publicHeaders = createStoryE1Headers(primaryContext, {
          tenantId: 'public',
          orgUnitId: null,
          role: 'SYSTEM_ADMIN',
          userId: primaryContext.adminUserId,
          orgUnitMemberships: [],
        });
        const payload = buildSmsWebhookPayload({
          providerKey: primaryContext.providers.enabledPrimary,
          to: sharedInboundNumber,
          from: primaryContext.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-ambiguous-${deterministicToken(testInfo, 'ambiguous-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'ambiguous-routing',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: primaryContext.paths.inboundWebhook,
          headers: {
            ...publicHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'automate-api-public-ambiguous'),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_AMBIGUOUS',
          refusalType: 'business',
          data: {
            correlation: {
              deterministic: true,
              reason: 'ambiguous',
              providerNumberE164: sharedInboundNumber,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
      },
    );
  },
);
