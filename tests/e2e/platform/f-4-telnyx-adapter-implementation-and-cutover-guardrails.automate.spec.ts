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
import { createCiPolicyContext } from '../../support/factories/ciPolicyContextFactory';
import { runPolicyScriptInTempRepo } from '../../support/utils/policyScriptTestHarness';
import { deterministicProviderEventId } from '../../support/utils/deterministicTestIds';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story f.4 Telnyx Adapter Implementation and Cutover Guardrails (Automate E2E Expansion)',
  () => {

    test(
      '[P0] staged cutover journey fails closed outside allow-list and succeeds when allow-list includes tenant and org-unit rollback scope @P0',
      async ({ request }) => {
        const context = createStoryF1Context();
        const operatorHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });

        const blockedHeaders = {
          ...operatorHeaders,
          'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
            telnyx: {
              tenantIds: ['tenant-connectshyft-outside-cutover'],
              orgUnitIds: ['org-connectshyft-outside-cutover'],
              tenantOrgUnitPairs: ['tenant-connectshyft-outside-cutover::org-connectshyft-outside-cutover'],
            },
          }),
        };

        const blockedResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: blockedHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(blockedResponse.status()).toBe(200);
        const blockedBody = (await blockedResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(blockedBody)).toBe(true);
        expect(blockedBody).toMatchObject({
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

        const allowlistedHeaders = {
          ...operatorHeaders,
          'x-test-connectshyft-provider-rollout-allowlist': JSON.stringify({
            telnyx: {
              tenantIds: [],
              orgUnitIds: [],
              tenantOrgUnitPairs: [`${context.tenantId}::${context.orgUnitId}`],
            },
          }),
        };

        const allowlistedResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: allowlistedHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(allowlistedResponse.status()).toBe(200);
        const allowlistedBody = (await allowlistedResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(allowlistedBody)).toBe(true);
        expect(allowlistedBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            providerResolution: {
              requestedProvider: context.providers.enabledPrimary,
              resolvedProvider: context.providers.enabledPrimary,
              deterministic: true,
            },
            dispatch: {
              providerKey: context.providers.enabledPrimary,
              channel: 'call',
              adapterInvoked: true,
            },
          },
        });
      },
    );

    test(
      '[P0] inbound webhook journey preserves deterministic correlation, canonical translation, and replay-safe duplicate suppression for telnyx cutover flows @P0',
      async ({ request }, testInfo) => {
        const context = createStoryF2Context();
        const operatorHeaders = createStoryF2Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF2Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story f.4 E2E replay-safety and canonical translation coverage message.',
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
            'provider-event-f4-e2e',
            testInfo,
            'inbound-webhook',
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
            correlation: {
              deterministic: true,
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
      '[P1] maintainer CI journey receives explicit guardrail diagnostics when direct Twilio coupling bypasses provider adapter contracts @P1',
      async () => {
        const ciPolicyContext = createCiPolicyContext();
        const result = runPolicyScriptInTempRepo(
          ciPolicyContext.policyScript,
          ciPolicyContext.policyFile,
          {
            branch: 'codex/story-0-9-routeshyft-ci-policy-gate-as-blocking-first-stage',
            event: 'local',
            commitSubject: '0-9: enforce f4 cutover guardrails in e2e',
            seedFiles: {
              'apps/routeshyft-api/src/modules/connectshyft/twilio-direct-coupling-e2e.ts': [
                "import twilio from 'twilio';",
                '',
                "export const createLeakyProviderClient = () => twilio('sid', 'token');",
                '',
              ].join('\n'),
            },
          },
        );

        const hasGuardFailure =
          /ConnectShyft provider abstraction guard failed: direct Twilio coupling detected/.test(result.output);
        const hasViolationPath =
          /src\/src\/modules\/connectshyft\/twilio-direct-coupling-e2e\.ts/.test(result.output);
        const hasRemediationHint =
          /Route provider-specific implementation through src\/src\/modules\/connectshyft\/providerRegistry\.ts/.test(
            result.output,
          );
        expect(result.status !== 0 && hasGuardFailure && hasViolationPath && hasRemediationHint).toBe(true);
      },
    );
  },
);
