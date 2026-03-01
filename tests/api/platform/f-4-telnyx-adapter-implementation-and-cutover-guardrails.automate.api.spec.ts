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

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story f.4 Telnyx Adapter Implementation and Cutover Guardrails (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

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
      async ({ request }) => {
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
          providerEventId: `provider-event-f4-${Date.now().toString().slice(-8)}`,
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

    test(
      '[P1] invalid rollout allow-list configuration fails closed before dispatch and surfaces actionable remediation guidance @P1',
      async ({ request }) => {
        const context = createStoryF1Context();
        const invalidAllowlistHeaders = createStoryF1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        invalidAllowlistHeaders['x-test-connectshyft-provider-rollout-allowlist'] = '{not-valid-json';

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          headers: invalidAllowlistHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Invalid rollout allow-list should fail closed.',
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
            operatorFeedbackMeta: {
              actionable: true,
              hiddenTransition: false,
            },
          },
        });
        expect(String(body.message)).toContain('fail-closed');
      },
    );

    test(
      '[P1] webhook post-correlation rollout revalidation uses mapped tenant and org-unit context to enforce fail-closed cutover decisions @P1',
      async ({ request }) => {
        const f2Context = createStoryF2Context();
        const f2OperatorHeaders = createStoryF2Headers(f2Context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [f2Context.orgUnitId],
        });

        const outboundCallResponse = await apiRequest(request, {
          method: 'POST',
          path: `${f2Context.paths.threads}/${f2Context.threadIds.unclaimed}/call`,
          headers: f2OperatorHeaders,
          data: {
            orgUnitId: f2Context.orgUnitId,
            providerKey: f2Context.providers.enabledPrimary,
          },
        });

        expect(outboundCallResponse.status()).toBe(200);
        const outboundCallBody = await outboundCallResponse.json();
        const providerLegId = outboundCallBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const f1Context = createStoryF1Context();
        const strictWebhookHeaders = createStoryF1Headers(f1Context, {
          role: 'ORGUNIT_ADMIN',
          userId: f1Context.adminUserId,
          orgUnitMemberships: [f1Context.orgUnitId],
        });
        strictWebhookHeaders['x-test-connectshyft-provider-rollout-allowlist'] = JSON.stringify({
          telnyx: {
            tenantIds: [],
            orgUnitIds: [],
            tenantOrgUnitPairs: [`${f1Context.tenantId}::${f1Context.orgUnitId}`],
          },
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: f1Context.paths.inboundWebhook,
          headers: strictWebhookHeaders,
          data: {
            eventType: 'voice.connected',
            providerKey: f1Context.providers.enabledPrimary,
            providerLegId,
          },
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = (await webhookResponse.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_PROVIDER_DISABLED',
          refusalType: 'business',
          data: {
            providerResolution: {
              requestedProvider: f1Context.providers.enabledPrimary,
              resolvedProvider: null,
              deterministic: true,
              reason: 'provider-not-allowlisted',
            },
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              tenantId: f2Context.tenantId,
              orgUnitId: f2Context.orgUnitId,
              threadId: f2Context.threadIds.unclaimed,
              providerLegId,
            },
          },
        });
      },
    );

    test(
      '[P0] policy gate blocks direct Twilio SDK coupling in ConnectShyft source paths outside provider adapter contracts @P0',
      async () => {
        const ciPolicyContext = createCiPolicyContext();
        const result = runPolicyScriptInTempRepo(
          ciPolicyContext.policyScript,
          ciPolicyContext.policyFile,
          {
            branch: 'codex/story-0-9-routeshyft-ci-policy-gate-as-blocking-first-stage',
            event: 'local',
            commitSubject: '0-9: enforce provider abstraction cutover guard in f4',
            seedFiles: {
              'src/src/modules/connectshyft/twilio-direct-coupling.ts': [
                "import twilio from 'twilio';",
                '',
                "export const createLeakyClient = () => twilio('sid', 'token');",
                '',
              ].join('\n'),
            },
          },
        );

        const hasGuardFailure =
          /ConnectShyft provider abstraction guard failed: direct Twilio coupling detected/.test(result.output);
        const hasViolationPath =
          /src\/src\/modules\/connectshyft\/twilio-direct-coupling\.ts/.test(result.output);
        expect(result.status !== 0 && hasGuardFailure && hasViolationPath).toBe(true);
      },
    );
  },
);
