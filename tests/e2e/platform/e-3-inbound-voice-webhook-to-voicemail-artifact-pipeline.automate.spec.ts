import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  createStoryE3Context,
  createStoryE3Headers,
} from '../../support/factories/connectShyftStoryE3Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildVoiceWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

const mapInboundVoiceNumber = async ({
  request,
  path,
  headers,
  payload,
}: {
  request: Parameters<typeof apiRequest>[0];
  path: string;
  headers: Record<string, string>;
  payload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
}): Promise<void> => {
  const response = await apiRequest(request, {
    method: 'POST',
    path,
    headers,
    data: payload,
  });
  expect([200, 201, 409]).toContain(response.status());
};

const ensureThread = async ({
  request,
  path,
  headers,
  payload,
}: {
  request: Parameters<typeof apiRequest>[0];
  path: string;
  headers: Record<string, string>;
  payload: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
}): Promise<string> => {
  const ensureResponse = await apiRequest(request, {
    method: 'POST',
    path,
    headers,
    data: payload,
  });
  expect([200, 201]).toContain(ensureResponse.status());
  const ensureBody = await ensureResponse.json();
  const threadId = String(ensureBody?.data?.thread?.threadId || '');
  expect(threadId.length).toBeGreaterThan(0);
  return threadId;
};

const resolvePersistedActorUserId = async (
  request: Parameters<typeof apiRequest>[0],
): Promise<string> => {
  const loginResponse = await apiRequest(request, {
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {
      cookie: '',
    },
    data: {
      email: process.env.TEST_EMAIL || 'operator@example.com',
      password: process.env.TEST_PASSWORD || 'SecurePass123!',
      rememberMe: false,
    },
  });
  expect(loginResponse.status()).toBe(200);

  const loginBody = await loginResponse.json();
  const user = loginBody?.user ?? loginBody?.data?.user ?? {};
  const userId = typeof user?.userId === 'string'
    ? user.userId
    : (typeof user?.id === 'string' ? user.id : '');
  expect(userId.length).toBeGreaterThan(0);
  return userId;
};

const buildVoicemailWebhookPayload = ({
  context,
  neighborId,
  threadId,
  testInfo,
  label,
  eventType = 'voice.voicemail',
}: {
  context: ReturnType<typeof createStoryE3Context>;
  neighborId: string;
  threadId?: string;
  testInfo: Parameters<typeof deterministicToken>[0];
  label: string;
  eventType?: 'voice.voicemail' | 'voice.fallback';
}) => {
  const providerEventId = deterministicProviderEventId(
    'provider-event-e3-automate-e2e',
    testInfo,
    `${label}-provider-event`,
  );
  const providerLegId = `leg-e3-${deterministicToken(testInfo, `${label}-provider-leg`)}`;
  return {
    ...buildVoiceWebhookPayload({
      providerKey: context.providers.enabledPrimary,
      providerLegId,
      providerEventId,
      ...(threadId ? { threadId } : {}),
    }),
    eventType,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    providerPayload: {
      to: context.numbers.mappedInbound,
      from: context.numbers.mappedOutbound,
      recording_url: `https://example.invalid/recordings/${providerEventId}.mp3`,
      voicemail_duration_seconds: 38,
    },
  };
};

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (Automate E2E Expansion)',
  () => {
    test(
      '[E3-AUTOMATE-E2E-201][P0] replay-safe duplicate suppression keeps timeline idempotent for repeated inbound voicemail payloads @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE3Context();
        const operatorHeaders = createStoryE3Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE3Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await mapInboundVoiceNumber({
          request,
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.3 automate e2e duplicate mapping',
            isActive: true,
          },
        });

        const neighborId = `${context.neighborIds.voicemailUnclaimed}-automate-e2e-201-${deterministicToken(testInfo, 'e3-automate-e2e-201-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: context.paths.threads,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-automate-e2e-201',
            preferredOutboundCsNumberId: 'cs-outbound-e3-automate-e2e-201',
          },
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-e2e-201',
        });

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-e2e-201-first'),
          },
          data: webhookPayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-e2e-201-duplicate'),
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
          data: {
            correlation: {
              threadId,
              neighborId,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
            timeline: {
              eventName: context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
          },
        });

        expect(duplicateBody).toMatchObject({
          ok: true,
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: firstBody?.data?.replaySafe?.dedupeKey,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${threadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const timeline = Array.isArray(detailBody?.data?.thread?.timeline)
          ? detailBody.data.thread.timeline as Array<{ eventName: string }>
          : [];
        const voicemailEvents = timeline.filter(
          (entry) => entry.eventName === context.eventNames.inboundVoiceVoicemail,
        );
        expect(voicemailEvents.length).toBe(1);
      },
    );

    test(
      '[E3-AUTOMATE-E2E-202][P1] closed-thread voicemail ingress remains fail-closed and does not emit voicemail artifact/transcription payloads @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE3Context();
        const operatorHeaders = createStoryE3Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE3Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await mapInboundVoiceNumber({
          request,
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.3 automate e2e closed-thread mapping',
            isActive: true,
          },
        });

        const neighborId = `${context.neighborIds.voicemailClaimed}-automate-e2e-202-${deterministicToken(testInfo, 'e3-automate-e2e-202-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: context.paths.threads,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            neighborId,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-automate-e2e-202',
            preferredOutboundCsNumberId: 'cs-outbound-e3-automate-e2e-202',
          },
        });

        const persistedActorUserId = await resolvePersistedActorUserId(request);
        const actorHeaders = {
          ...operatorHeaders,
          'x-test-connectshyft-user-id': persistedActorUserId,
        };

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${threadId}/claim`,
          headers: actorHeaders,
        });
        expect([200, 409]).toContain(claimResponse.status());

        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${threadId}/close`,
          headers: actorHeaders,
        });
        expect([200, 409]).toContain(closeResponse.status());

        const webhookPayload = buildVoicemailWebhookPayload({
          context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-e2e-202',
          eventType: 'voice.voicemail',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-e2e-202'),
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
              threadId,
              neighborId,
            },
            threadState: 'CLOSED',
            lifecycle: {
              ensuredActiveThread: false,
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
            timeline: {
              eventName: context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });
        expect(webhookBody.data).not.toHaveProperty('voicemailArtifact');
        expect(webhookBody.data).not.toHaveProperty('transcription');

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${threadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(String(detailBody?.data?.thread?.state || '')).toBe('CLOSED');
      },
    );
  },
);
