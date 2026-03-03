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

const buildInvalidSignedWebhookHeaders = (
  payload: Record<string, unknown>,
): Record<string, string> => {
  const timestamp = String(Math.trunc(Date.now() / 1000));
  const tamperedPayload = {
    ...payload,
    eventType: `${String(payload.eventType || 'event')}.tampered`,
  };
  const signature = signPayload(
    null,
    Buffer.from(`${timestamp}|${JSON.stringify(tamperedPayload)}`),
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
}) => ({
  eventType: 'sms.delivered' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerPayload: {
    to: input.to,
    from: input.from,
    message_uuid: input.providerMessageId,
  },
});

const buildVoiceWebhookPayload = (input: {
  providerKey: string;
  providerLegId: string;
  providerEventId: string;
  threadId?: string;
}) => ({
  eventType: 'voice.connected' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerLegId: input.providerLegId,
  ...(input.threadId ? { threadId: input.threadId } : {}),
});

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate API Expansion)',
  () => {
    test(
      '[P0] invalid webhook signatures are refused fail-closed with explicit verification metadata and zero domain writes @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const payload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: context.numbers.mappedInbound,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-invalid-${deterministicToken(testInfo, 'invalid-signature-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'invalid-signature-event',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildInvalidSignedWebhookHeaders(payload),
          },
          data: payload,
        });

        expect(response.status()).toBe(401);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: context.refusalCodes.signatureInvalid,
          refusalType: 'client',
          data: {
            providerResolution: {
              requestedProvider: context.providers.enabledPrimary,
              resolvedProvider: context.providers.enabledPrimary,
              deterministic: true,
              adapterInvoked: true,
            },
            signatureValidation: {
              deterministic: true,
              verified: false,
              provider: context.providers.enabledPrimary,
            },
            operatorFeedbackMeta: {
              actionable: true,
              hiddenTransition: false,
              messageKey: 'connectshyft.webhook.signature.invalid',
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
      '[P0] provider-identifier fallback resolves deterministic context when metadata is absent and accepts signed connected-call webhooks @P0',
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

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerLegId = outboundBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const payload = buildVoiceWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          providerLegId,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'provider-fallback',
          ),
        });

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
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              source: 'provider_fallback',
              deterministic: true,
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
              threadId: context.threadIds.unclaimed,
              providerLegId,
            },
            canonicalTranslation: {
              eventType: context.canonicalEventTypes.callConnected,
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
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
      '[P0] public ingress resolves deterministic tenant and orgUnit via globally unique active number mapping when identifiers are unavailable @P0',
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
            ...buildSignedWebhookHeaders(payload),
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
      '[P0] public ingress refuses deterministically when number mapping fallback is ambiguous across tenants @P0',
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
            ...buildSignedWebhookHeaders(payload),
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

    test(
      '[P1] partial metadata mismatches against provider fallback identifiers are refused with deterministic conflict metadata @P1',
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

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerLegId = outboundBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const payload = buildVoiceWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          providerLegId,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'partial-metadata-conflict',
          ),
          threadId: context.threadIds.closed,
        });

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
          code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT',
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
  },
);
