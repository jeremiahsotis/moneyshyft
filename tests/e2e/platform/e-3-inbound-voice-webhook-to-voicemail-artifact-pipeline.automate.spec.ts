import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  createStoryE3Context,
  createStoryE3Headers,
} from '../../support/factories/connectShyftStoryE3Factory';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import {
  buildStoryE3VoicemailPayload,
  ensureThread,
  mapInboundVoiceNumber,
  resolvePersistedActorUserId,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

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
            lastInboundCsNumberId: context.numbers.mappedInbound,
            preferredOutboundCsNumberId: context.numbers.mappedInbound,
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-e2e-201',
          providerEventNamespace: 'provider-event-e3-automate-e2e',
          voicemailDurationSeconds: 38,
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
          ? (detailBody.data.thread.timeline as Array<{ eventName: string }>)
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
            lastInboundCsNumberId: context.numbers.mappedInbound,
            preferredOutboundCsNumberId: context.numbers.mappedInbound,
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
        expect(claimResponse.status()).toBe(200);

        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${threadId}/close`,
          headers: actorHeaders,
        });
        expect(closeResponse.status()).toBe(200);

        const webhookPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-e2e-202',
          providerEventNamespace: 'provider-event-e3-automate-e2e',
          eventType: 'voice.voicemail',
          voicemailDurationSeconds: 38,
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
