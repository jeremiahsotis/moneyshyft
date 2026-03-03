import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE3.fixture';
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
}: {
  context: {
    tenantId: string;
    orgUnitId: string;
    providers: { enabledPrimary: string };
    numbers: { mappedInbound: string; mappedOutbound: string };
  };
  neighborId: string;
  threadId?: string;
  testInfo: Parameters<typeof deterministicToken>[0];
  label: string;
}) => {
  const providerEventId = deterministicProviderEventId(
    'provider-event-e3-atdd-api',
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
      voicemail_duration_seconds: 47,
    },
  };
};

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD API)',
  () => {
    test.beforeEach(async ({
      request,
      storyE3Context,
      storyE3AdminHeaders,
      storyE3NumberMappingPayload,
    }) => {
      await mapInboundVoiceNumber({
        request,
        path: storyE3Context.paths.numbersCollection,
        headers: storyE3AdminHeaders,
        payload: storyE3NumberMappingPayload,
      });
    });

    test(
      '[E3-ATDD-API-001][P0] valid inbound voice webhook creates voicemail artifact linked to resolved active thread context @P0',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: storyE3EnsurePayloadUnclaimed,
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-api-001',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-001'),
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
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
            },
            thread: {
              threadId,
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              ensuredActiveThread: true,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
            voicemailArtifact: {
              artifactId: expect.any(String),
              channel: 'voice',
              direction: 'inbound',
              providerLegId: expect.any(String),
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-002][P0] no-active-thread voice inbound routes to intake fallback and does not pretend voicemail-only routing @P0',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
      }, testInfo) => {
        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.noActiveThread,
          testInfo,
          label: 'e3-atdd-api-002',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-002'),
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
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: storyE3Context.neighborIds.noActiveThread,
            },
            lifecycle: {
              ensuredActiveThread: false,
              reopenedByInbound: false,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-003][P1] claimed-thread inbound voice follows orgUnit-configured mode rather than forced voicemail-only defaults @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3OperatorHeaders,
        storyE3EnsurePayloadClaimed,
      }, testInfo) => {
        const claimedNeighborId = `${storyE3Context.neighborIds.voicemailClaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-003-neighbor',
        )}`;
        const claimedThreadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadClaimed,
            neighborId: claimedNeighborId,
          },
        });
        const persistedActorUserId = await resolvePersistedActorUserId(request);
        const claimHeaders = {
          ...storyE3OperatorHeaders,
          'x-test-connectshyft-user-id': persistedActorUserId,
        };

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE3Context.paths.threads}/${claimedThreadId}/claim`,
          headers: claimHeaders,
        });
        expect([200, 409]).toContain(claimResponse.status());

        const detailAfterClaimResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${claimedThreadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailAfterClaimResponse.status()).toBe(200);
        const detailAfterClaimBody = await detailAfterClaimResponse.json();
        expect(String(detailAfterClaimBody?.data?.thread?.state || '')).toBe('CLAIMED');

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: claimedNeighborId,
          threadId: claimedThreadId,
          testInfo,
          label: 'e3-atdd-api-003',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-003'),
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
            threadState: 'CLAIMED',
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'accepted',
            },
            routingPolicy: {
              claimedMode: 'orgunit_configured_mode',
            },
            lifecycle: {
              reopenedByInbound: false,
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-004][P1] successful voicemail artifact creation enqueues transcription with durable callback correlation metadata @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: storyE3EnsurePayloadUnclaimed,
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-api-004',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-004'),
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
            voicemailArtifact: {
              artifactId: expect.any(String),
            },
            transcription: {
              requestQueued: true,
              queueName: 'connectshyft.voicemail.transcription',
              callbackCorrelation: {
                tenantId: storyE3Context.tenantId,
                orgUnitId: storyE3Context.orgUnitId,
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

    test(
      '[E3-ATDD-API-005][P1] voicemail-only inbound processing keeps escalation and inactivity windows unchanged unless locked lifecycle rules require a change @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: storyE3EnsurePayloadUnclaimed,
        });

        const detailBeforeResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailBeforeResponse.status()).toBe(200);
        const detailBeforeBody = await detailBeforeResponse.json();
        const beforeStage = Number(
          detailBeforeBody?.data?.thread?.escalation?.stage ?? 0,
        );
        const beforeInactivity = String(
          detailBeforeBody?.data?.thread?.nextEvaluationAtUtc ?? '',
        );

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-api-005',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-005'),
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
          },
        });

        const detailAfterResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailAfterResponse.status()).toBe(200);
        const detailAfterBody = await detailAfterResponse.json();
        expect(Number(detailAfterBody?.data?.thread?.escalation?.stage ?? 0)).toBe(
          beforeStage,
        );
        expect(String(detailAfterBody?.data?.thread?.nextEvaluationAtUtc ?? '')).toBe(
          beforeInactivity,
        );
      },
    );

    test(
      '[E3-ATDD-API-006][P1] number-mapping correlation reroutes voicemail inbound to existing active thread for the resolved neighbor context @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const rerouteNeighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-006-neighbor',
        )}`;
        const existingThreadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId: rerouteNeighborId,
          },
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: rerouteNeighborId,
          testInfo,
          label: 'e3-atdd-api-006',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-006'),
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
              source: 'number_mapping',
              threadId: existingThreadId,
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: rerouteNeighborId,
            },
            threadId: existingThreadId,
            thread: {
              threadId: existingThreadId,
              state: 'UNCLAIMED',
              neighborId: rerouteNeighborId,
            },
            lifecycle: {
              ensuredActiveThread: true,
              reusedThreadId: existingThreadId,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-007][P1] metadata-correlated thread context wins over conflicting payload neighbor id to prevent thread-neighbor desynchronization @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const canonicalNeighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-007-neighbor-canonical',
        )}`;
        const conflictingNeighborId = `${storyE3Context.neighborIds.voicemailClaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-007-neighbor-conflict',
        )}`;
        expect(conflictingNeighborId).not.toBe(canonicalNeighborId);

        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId: canonicalNeighborId,
          },
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId: conflictingNeighborId,
          threadId,
          testInfo,
          label: 'e3-atdd-api-007',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-007'),
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
              source: 'metadata',
              threadId,
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: canonicalNeighborId,
            },
            threadId,
            thread: {
              threadId,
              neighborId: canonicalNeighborId,
            },
          },
        });
      },
    );
  },
);
