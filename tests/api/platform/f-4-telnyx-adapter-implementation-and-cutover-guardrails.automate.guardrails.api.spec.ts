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
  'Story f.4 Telnyx Adapter Implementation and Cutover Guardrails (Automate API Guardrails)',
  () => {
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
              'apps/routeshyft-api/src/modules/connectshyft/twilio-direct-coupling.ts': [
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
