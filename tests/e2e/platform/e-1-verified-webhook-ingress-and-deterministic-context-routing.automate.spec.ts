import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
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

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const { publicKey: storyE1WebhookPublicKey, privateKey: storyE1WebhookPrivateKey } =
  generateKeyPairSync('ed25519');
const storyE1WebhookPublicKeyPem = storyE1WebhookPublicKey.export({
  type: 'spki',
  format: 'pem',
}).toString();
const storyE1WebhookPublicKeyHeader = Buffer.from(
  storyE1WebhookPublicKeyPem,
  'utf8',
).toString('base64');

const buildSignatureEnforcementHeaders = (): Record<string, string> => ({
  'x-test-connectshyft-enforce-webhook-signature': 'true',
  'x-test-connectshyft-telnyx-public-key': storyE1WebhookPublicKeyHeader,
});

const buildSignedWebhookHeaders = (payload: Record<string, unknown>): Record<string, string> => {
  const timestamp = String(Math.trunc(Date.now() / 1000));
  const signature = signPayload(
    null,
    Buffer.from(`${timestamp}|${JSON.stringify(payload)}`),
    storyE1WebhookPrivateKey,
  ).toString('base64');

  return {
    ...buildSignatureEnforcementHeaders(),
    'telnyx-timestamp': timestamp,
    'telnyx-signature-ed25519': signature,
  };
};

const buildSmsWebhookPayload = (input: {
  providerKey: string;
  to: string;
  from: string;
  providerMessageId: string;
  providerEventId: string;
  providerLegId?: string;
}) => ({
  eventType: 'sms.delivered' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerPayload: {
    to: input.to,
    from: input.from,
    message_uuid: input.providerMessageId,
    call_control_id: input.providerLegId ?? null,
  },
});

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate E2E Expansion)',
  () => {
    test(
      '[P0] signed mapped ingress journey resolves deterministic tenant and orgUnit routing and preserves thread detail contracts @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
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
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate-e2e',
            testInfo,
            'mapped-journey',
          ),
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...systemAdminHeaders,
            ...buildSignedWebhookHeaders(payload),
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
      '[P0] replay-safe ingress journey normalizes provider event identity for duplicate suppression across case variants @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const systemAdminHeaders = createStoryE1Headers(context, {
          role: 'SYSTEM_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const mappedInboundNumber = deterministicE164(testInfo, 'e1-automate-e2e-replay-mapped-number');
        await apiRequest(request, {
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
            ...buildSignedWebhookHeaders(firstPayload),
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
            ...buildSignedWebhookHeaders(duplicatePayload),
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

    test(
      '[P1] spoofed ingress without signature is refused fail-closed and leaves existing thread lifecycle state unchanged @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const operatorHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const beforeDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}`,
          headers: operatorHeaders,
        });

        expect(beforeDetailResponse.status()).toBe(200);
        const beforeDetailBody = await beforeDetailResponse.json();
        const beforeState = beforeDetailBody?.data?.thread?.state;

        const payload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: context.numbers.mappedInbound,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-unsigned-${deterministicToken(testInfo, 'unsigned-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate-e2e',
            testInfo,
            'unsigned-ingress',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignatureEnforcementHeaders(),
          },
          data: payload,
        });

        expect(response.status()).toBe(401);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: context.refusalCodes.signatureMissing,
          refusalType: 'client',
          data: {
            signatureValidation: {
              deterministic: true,
              verified: false,
              provider: context.providers.enabledPrimary,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });

        const afterDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}`,
          headers: operatorHeaders,
        });

        expect(afterDetailResponse.status()).toBe(200);
        const afterDetailBody = await afterDetailResponse.json();
        expect(afterDetailBody?.data?.thread?.state).toBe(beforeState);
      },
    );

    test(
      '[P1] signed ingress without metadata and provider identifiers is refused deterministically with missing-identifiers diagnostics @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const payload = {
          eventType: 'voice.connected',
          providerKey: context.providers.enabledPrimary,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate-e2e',
            testInfo,
            'missing-identifiers',
          ),
        };

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(payload),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED',
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
  },
);
