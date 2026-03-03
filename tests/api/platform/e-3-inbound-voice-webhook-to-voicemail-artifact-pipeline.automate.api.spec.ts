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
  eventType = 'voice.voicemail',
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
  eventType?: 'voice.voicemail' | 'voice.fallback';
}) => {
  const providerEventId = deterministicProviderEventId(
    'provider-event-e3-automate-api',
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
      voicemail_duration_seconds: 52,
    },
  };
};

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (Automate API Expansion)',
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
      '[E3-AUTOMATE-API-101][P0] duplicate inbound voice webhook is replay-safe and suppresses duplicate domain writes after the first accepted voicemail event @P0',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const neighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(testInfo, 'e3-automate-api-101-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId,
          },
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-api-101',
        });

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-101-first'),
          },
          data: webhookPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-101-duplicate'),
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
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.any(String),
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
            voicemailArtifact: {
              artifactId: expect.any(String),
            },
            transcription: {
              requestQueued: true,
            },
          },
        });

        const firstDedupeKey = String(firstBody?.data?.replaySafe?.dedupeKey || '');
        expect(firstDedupeKey.length).toBeGreaterThan(0);

        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: firstDedupeKey,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });

        expect(duplicateBody.data).not.toHaveProperty('timeline');
        expect(duplicateBody.data).not.toHaveProperty('canonicalEvent');
        expect(duplicateBody.data).not.toHaveProperty('audit');
        expect(duplicateBody.data).not.toHaveProperty('outbox');
        expect(duplicateBody.data).not.toHaveProperty('voicemailArtifact');
        expect(duplicateBody.data).not.toHaveProperty('transcription');

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const timeline = Array.isArray(detailBody?.data?.thread?.timeline)
          ? detailBody.data.thread.timeline as Array<{ eventName: string }>
          : [];
        const voicemailEvents = timeline.filter(
          (entry) => entry.eventName === storyE3Context.eventNames.inboundVoiceVoicemail,
        );
        expect(voicemailEvents.length).toBe(1);
      },
    );

    test(
      '[E3-AUTOMATE-API-102][P1] explicit voice fallback event on an active thread never creates voicemail artifacts or transcription side effects @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const neighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(testInfo, 'e3-automate-api-102-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId,
          },
        });

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-api-102',
          eventType: 'voice.fallback',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-102'),
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
            threadState: 'UNCLAIMED',
            lifecycle: {
              ensuredActiveThread: true,
              reusedThreadId: threadId,
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });

        expect(webhookBody.data).not.toHaveProperty('voicemailArtifact');
        expect(webhookBody.data).not.toHaveProperty('transcription');
        expect(webhookBody.data).not.toHaveProperty('transcriptionOutbox');
      },
    );

    test(
      '[E3-AUTOMATE-API-103][P1] closed thread voicemail ingress remains closed and routes to intake fallback without lifecycle resets or voicemail artifact writes @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3OperatorHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const neighborId = `${storyE3Context.neighborIds.voicemailClaimed}-${deterministicToken(testInfo, 'e3-automate-api-103-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId,
          },
        });

        const persistedActorUserId = await resolvePersistedActorUserId(request);
        const actorHeaders = {
          ...storyE3OperatorHeaders,
          'x-test-connectshyft-user-id': persistedActorUserId,
        };

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE3Context.paths.threads}/${threadId}/claim`,
          headers: actorHeaders,
        });
        expect([200, 409]).toContain(claimResponse.status());

        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE3Context.paths.threads}/${threadId}/close`,
          headers: actorHeaders,
        });
        expect([200, 409]).toContain(closeResponse.status());

        const detailBeforeResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailBeforeResponse.status()).toBe(200);
        const detailBeforeBody = await detailBeforeResponse.json();
        expect(String(detailBeforeBody?.data?.thread?.state || '')).toBe('CLOSED');
        const beforeStage = Number(detailBeforeBody?.data?.thread?.escalation?.stage ?? 0);
        const beforeInactivity = String(detailBeforeBody?.data?.thread?.nextEvaluationAtUtc ?? '');

        const webhookPayload = buildVoicemailWebhookPayload({
          context: storyE3Context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-api-103',
          eventType: 'voice.voicemail',
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-103'),
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
              eventName: storyE3Context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });
        expect(webhookBody.data).not.toHaveProperty('voicemailArtifact');
        expect(webhookBody.data).not.toHaveProperty('transcription');

        const detailAfterResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailAfterResponse.status()).toBe(200);
        const detailAfterBody = await detailAfterResponse.json();
        expect(String(detailAfterBody?.data?.thread?.state || '')).toBe('CLOSED');
        expect(Number(detailAfterBody?.data?.thread?.escalation?.stage ?? 0)).toBe(beforeStage);
        expect(String(detailAfterBody?.data?.thread?.nextEvaluationAtUtc ?? '')).toBe(beforeInactivity);
      },
    );
  },
);
