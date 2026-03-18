import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryF1Context,
  createStoryF1Headers,
} from '../../support/factories/connectShyftStoryF1Factory';
import {
  createStoryF2Context,
  createStoryF2Headers,
} from '../../support/factories/connectShyftStoryF2Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../../support/helpers/connectShyftNumberMappingTestHelpers';
import { deterministicProviderEventId } from '../../support/utils/deterministicTestIds';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story f.4 Telnyx Adapter Implementation and Cutover Guardrails (Automate API Cutover)',
  () => {
    test(
      '[P0] telnyx outbound dispatch from closed threads preserves lifecycle reopen semantics and provider-neutral envelope contracts during cutover @P0',
      async ({ request }) => {
        const context = createStoryF1Context();
        const operatorHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
          enabledProviders: [
            context.providers.enabledPrimary,
            context.providers.enabledSecondary,
          ],
          disabledProviders: [context.providers.disabled],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.closed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            lifecycle: {
              priorState: 'CLOSED',
              reopenedFromClosed: true,
            },
            providerResolution: {
              requestedProvider: context.providers.enabledPrimary,
              resolvedProvider: context.providers.enabledPrimary,
              deterministic: true,
              providerBranchingInDomain: false,
            },
            dispatch: {
              providerKey: context.providers.enabledPrimary,
              channel: 'call',
              adapterInvoked: true,
              providerBranchingInDomain: false,
            },
            operatorFeedbackMeta: {
              hiddenTransition: false,
            },
          },
        });
      },
    );

    test(
      '[P0] telnyx webhook processing remains deterministic with canonical translation and replay-safe duplicate suppression @P0',
      async ({ request }, testInfo) => {
        const context = createStoryF1Context();
        const operatorHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        await ensureSingleActiveConnectShyftSmsSenderMapping({
          request,
          headers: adminHeaders,
          orgUnitId: context.orgUnitId,
          preferredNumber: '+12605550191',
          preferredLabel: 'Story F4 SMS sender',
        });

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story f.4 webhook replay safety coverage message.',
          },
        });

        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerMessageId = outboundBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const webhookPayload = {
          eventType: 'sms.delivered',
          providerKey: context.providers.enabledPrimary,
          providerMessageId,
          providerEventId: deterministicProviderEventId(
            'provider-event-f4',
            testInfo,
            'webhook-delivered',
          ),
        };

        const firstWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: webhookPayload,
        });

        expect(firstWebhookResponse.status()).toBe(200);
        const firstBody = (await firstWebhookResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
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

        const duplicateWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: webhookPayload,
        });

        expect(duplicateWebhookResponse.status()).toBe(200);
        const duplicateBody = (await duplicateWebhookResponse.json()) as Record<string, unknown>;
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
      },
    );

    test(
      '[P0] staged rollout allow-list excludes out-of-scope tenant and org-unit contexts with explicit fail-closed refusal metadata @P0',
      async ({ request }) => {
        const context = createStoryF1Context();
        const blockedHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        blockedHeaders['x-test-connectshyft-provider-rollout-allowlist'] = JSON.stringify({
          telnyx: {
            tenantIds: ['tenant-connectshyft-cutover-allow'],
            orgUnitIds: ['org-connectshyft-cutover-allow'],
            tenantOrgUnitPairs: ['tenant-connectshyft-cutover-allow::org-connectshyft-cutover-allow'],
          },
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: blockedHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_PROVIDER_DISABLED',
          refusalType: 'business',
          data: {
            providerResolution: {
              requestedProvider: context.providers.enabledPrimary,
              resolvedProvider: null,
              deterministic: true,
              reason: 'provider-not-allowlisted',
            },
            sideEffects: {
              dispatchAttempted: false,
              lifecycleMutationApplied: false,
              auditPersisted: false,
            },
          },
        });
      },
    );
  },
);
