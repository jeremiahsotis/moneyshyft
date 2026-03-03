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

const buildE3VoicemailPayload = ({
  context,
  neighborId,
  threadId,
  testInfo,
  label,
}: {
  context: ReturnType<typeof createStoryE3Context>;
  neighborId: string;
  threadId?: string;
  testInfo: Parameters<typeof deterministicToken>[0];
  label: string;
}) => {
  const providerEventId = deterministicProviderEventId(
    'provider-event-e3-atdd-e2e',
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
    eventType: 'voice.voicemail' as const,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    providerPayload: {
      to: context.numbers.mappedInbound,
      from: context.numbers.mappedOutbound,
      recording_url: `https://example.invalid/recordings/${providerEventId}.mp3`,
      voicemail_duration_seconds: 63,
    },
  };
};

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD E2E RED)',
  () => {
    test.skip(
      '[E3-ATDD-E2E-001][P0] end-to-end inbound voice webhook journey creates voicemail artifact on active thread timeline with deterministic context linkage @P0',
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

        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.3 inbound mapped voice number',
            isActive: true,
          },
        });
        expect([200, 201, 409]).toContain(mappingResponse.status());

        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threads,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailUnclaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-001',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-001',
          },
        });
        expect([200, 201]).toContain(ensureResponse.status());
        const ensureBody = await ensureResponse.json();
        const threadId = String(ensureBody?.data?.thread?.threadId || '');
        expect(threadId.length).toBeGreaterThan(0);

        const webhookPayload = buildE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-e2e-001',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-e2e-001'),
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
              deterministic: true,
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
              neighborId: context.neighborIds.voicemailUnclaimed,
            },
            timeline: {
              eventName: context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
            voicemailArtifact: {
              artifactId: expect.any(String),
              channel: 'voice',
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
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            thread: {
              threadId,
              timeline: expect.any(Array),
            },
          },
        });
      },
    );

    test.skip(
      '[E3-ATDD-E2E-002][P0] state-driven voice routing matrix honors no-thread intake fallback unclaimed voicemail-only and claimed orgUnit-configured behavior @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE3Context();
        const adminHeaders = createStoryE3Headers(context, {
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
            label: 'Story e.3 routing matrix number',
            isActive: true,
          },
        });

        const unclaimedEnsure = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threads,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailUnclaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-002-unclaimed',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-002-unclaimed',
          },
        });
        expect([200, 201]).toContain(unclaimedEnsure.status());
        const unclaimedThreadId = String((await unclaimedEnsure.json())?.data?.thread?.threadId || '');
        expect(unclaimedThreadId.length).toBeGreaterThan(0);

        const claimedEnsure = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threads,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailClaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-002-claimed',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-002-claimed',
          },
        });
        expect([200, 201]).toContain(claimedEnsure.status());
        const claimedThreadId = String((await claimedEnsure.json())?.data?.thread?.threadId || '');
        expect(claimedThreadId.length).toBeGreaterThan(0);

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${claimedThreadId}/claim`,
          headers: adminHeaders,
        });
        expect([200, 409]).toContain(claimResponse.status());

        const noThreadPayload = buildE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.noActiveThread,
          testInfo,
          label: 'e3-atdd-e2e-002-no-thread',
        });
        const unclaimedPayload = buildE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailUnclaimed,
          threadId: unclaimedThreadId,
          testInfo,
          label: 'e3-atdd-e2e-002-unclaimed',
        });
        const claimedPayload = buildE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailClaimed,
          threadId: claimedThreadId,
          testInfo,
          label: 'e3-atdd-e2e-002-claimed',
        });

        const [noThreadResponse, unclaimedResponse, claimedResponse] = await Promise.all([
          apiRequest(request, {
            method: 'POST',
            path: context.paths.inboundWebhook,
            headers: {
              ...adminHeaders,
              ...buildSignedWebhookHeaders(
                noThreadPayload,
                testInfo,
                'e3-atdd-e2e-002-no-thread',
              ),
            },
            data: noThreadPayload,
          }),
          apiRequest(request, {
            method: 'POST',
            path: context.paths.inboundWebhook,
            headers: {
              ...adminHeaders,
              ...buildSignedWebhookHeaders(
                unclaimedPayload,
                testInfo,
                'e3-atdd-e2e-002-unclaimed',
              ),
            },
            data: unclaimedPayload,
          }),
          apiRequest(request, {
            method: 'POST',
            path: context.paths.inboundWebhook,
            headers: {
              ...adminHeaders,
              ...buildSignedWebhookHeaders(
                claimedPayload,
                testInfo,
                'e3-atdd-e2e-002-claimed',
              ),
            },
            data: claimedPayload,
          }),
        ]);

        expect(noThreadResponse.status()).toBe(200);
        expect(unclaimedResponse.status()).toBe(200);
        expect(claimedResponse.status()).toBe(200);

        const noThreadBody = await noThreadResponse.json();
        const unclaimedBody = await unclaimedResponse.json();
        const claimedBody = await claimedResponse.json();

        expect(noThreadBody).toMatchObject({
          ok: true,
          data: {
            timeline: {
              eventName: context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });
        expect(unclaimedBody).toMatchObject({
          ok: true,
          data: {
            timeline: {
              eventName: context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
          },
        });
        expect(claimedBody).toMatchObject({
          ok: true,
          data: {
            threadState: 'CLAIMED',
            timeline: {
              eventName: context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'accepted',
            },
            routingPolicy: {
              claimedMode: 'orgunit_configured_mode',
            },
          },
        });
      },
    );

    test.skip(
      '[E3-ATDD-E2E-003][P1] voicemail artifact pipeline emits transcription enqueue metadata and preserves lifecycle reset guards @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE3Context();
        const adminHeaders = createStoryE3Headers(context, {
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
            label: 'Story e.3 transcription queue number',
            isActive: true,
          },
        });

        const ensureResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threads,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailUnclaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-003',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-003',
          },
        });
        expect([200, 201]).toContain(ensureResponse.status());
        const threadId = String((await ensureResponse.json())?.data?.thread?.threadId || '');
        expect(threadId.length).toBeGreaterThan(0);

        const webhookPayload = buildE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-e2e-003',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-e2e-003'),
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
            lifecycle: {
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
            transcription: {
              requestQueued: true,
              callbackCorrelation: {
                tenantId: context.tenantId,
                orgUnitId: context.orgUnitId,
                threadId,
                providerEventId: webhookPayload.providerEventId,
                providerLegId: webhookPayload.providerLegId,
                voicemailArtifactId: expect.any(String),
              },
            },
          },
        });
      },
    );
  },
);
