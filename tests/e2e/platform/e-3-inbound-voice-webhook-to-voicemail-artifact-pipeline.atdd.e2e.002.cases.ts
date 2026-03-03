import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  createStoryE3Context,
  createStoryE3Headers,
} from '../../support/factories/connectShyftStoryE3Factory';
import {
  buildSignedWebhookHeaders,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE3VoicemailPayload,
  ensureThread,
  mapInboundVoiceNumber,
  resolvePersistedActorUserId,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD E2E) - Case 002',
  () => {
    test(
      '[E3-ATDD-E2E-002][P0] state-driven voice routing matrix honors no-thread intake fallback unclaimed voicemail-only and claimed orgUnit-configured behavior @P0',
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
            label: 'Story e.3 routing matrix number',
            isActive: true,
          },
        });

        const unclaimedThreadId = await ensureThread({
          request,
          path: context.paths.threads,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailUnclaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-002-unclaimed',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-002-unclaimed',
          },
        });

        const claimedThreadId = await ensureThread({
          request,
          path: context.paths.threads,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailClaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-002-claimed',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-002-claimed',
          },
        });

        const persistedActorUserId = await resolvePersistedActorUserId(request);
        const claimHeaders = {
          ...operatorHeaders,
          'x-test-connectshyft-user-id': persistedActorUserId,
        };

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${claimedThreadId}/claim`,
          headers: claimHeaders,
        });
        expect(claimResponse.status()).toBe(200);

        const detailAfterClaimResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${claimedThreadId}`,
          headers: adminHeaders,
        });
        expect(detailAfterClaimResponse.status()).toBe(200);
        const detailAfterClaimBody = await detailAfterClaimResponse.json();
        expect(String(detailAfterClaimBody?.data?.thread?.state || '')).toBe('CLAIMED');

        const noThreadPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.noActiveThread,
          testInfo,
          label: 'e3-atdd-e2e-002-no-thread',
          providerEventNamespace: 'provider-event-e3-atdd-e2e',
          voicemailDurationSeconds: 63,
        });
        const unclaimedPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailUnclaimed,
          threadId: unclaimedThreadId,
          testInfo,
          label: 'e3-atdd-e2e-002-unclaimed',
          providerEventNamespace: 'provider-event-e3-atdd-e2e',
          voicemailDurationSeconds: 63,
        });
        const claimedPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailClaimed,
          threadId: claimedThreadId,
          testInfo,
          label: 'e3-atdd-e2e-002-claimed',
          providerEventNamespace: 'provider-event-e3-atdd-e2e',
          voicemailDurationSeconds: 63,
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
  },
);
