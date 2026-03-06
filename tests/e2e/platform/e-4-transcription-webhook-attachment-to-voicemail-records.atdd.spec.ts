import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  bootstrapStoryE4,
  buildStoryE4ThreadDetailUrl,
  buildStoryE4TranscriptionCallbackPayload,
  buildStoryE4VoicemailSeedPayload,
  ensureStoryE4Thread,
} from '../../support/helpers/connectShyftStoryE4TestHelpers';

test.describe(
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (ATDD E2E RED)',
  () => {
    test.skip(
      '[E4-ATDD-E2E-001][P0] operator thread detail renders transcript text on the correlated voicemail artifact after successful callback processing @P0',
      async ({ request, page }, testInfo) => {
        const { context, operatorHeaders, adminHeaders } = await bootstrapStoryE4({
          request,
          numberMappingLabel: 'Story e.4 e2e transcript attach number',
        });
        const threadId = await ensureStoryE4Thread({
          request,
          context,
          adminHeaders,
          neighborId: context.neighborIds.transcriptionTarget,
          inboundNumberId: 'cs-inbound-e4-e2e-001',
          outboundNumberId: 'cs-outbound-e4-e2e-001',
        });
        const seedPayload = buildStoryE4VoicemailSeedPayload({
          context,
          neighborId: context.neighborIds.transcriptionTarget,
          threadId,
          testInfo,
          label: 'e4-atdd-e2e-001-seed',
          providerEventNamespace: 'provider-event-e4-atdd-e2e',
          voicemailDurationSeconds: 67,
        });

        const seedResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(seedPayload, testInfo, 'e4-atdd-e2e-001-seed'),
          },
          data: seedPayload,
        });
        expect(seedResponse.status()).toBe(200);
        const seedBody = await seedResponse.json();
        const callbackCorrelation = seedBody?.data?.transcription?.callbackCorrelation as {
          voicemailArtifactId: string;
          providerEventId: string | null;
          providerLegId: string | null;
        };
        const transcriptText =
          'Neighbor confirmed callback request and shared updated availability.';
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context,
          neighborId: context.neighborIds.transcriptionTarget,
          threadId,
          callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-atdd-e2e-001-callback',
          callbackEventNamespace: 'provider-event-e4-atdd-e2e',
        });

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(
              callbackPayload,
              testInfo,
              'e4-atdd-e2e-001-callback',
            ),
          },
          data: callbackPayload,
        });
        expect(callbackResponse.status()).toBe(200);
        const callbackBody = await callbackResponse.json();
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
        });

        await login(page);
        const detailRequest = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${threadId}`)
            && response.request().method() === 'GET',
        );
        await page.goto(
          buildStoryE4ThreadDetailUrl({
            context,
            threadId,
            actorUserId: context.userId,
          }),
        );
        await detailRequest;
        await expect(page.getByTestId('connectshyft-thread-detail')).toBeVisible();
        await expect(page.getByTestId('connectshyft-voicemail-indicator')).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-thread-event-transcription-attached'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-voicemail-artifact-transcript'),
        ).toContainText(transcriptText);

        const detailApiResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${threadId}`,
          headers: operatorHeaders,
        });
        expect(detailApiResponse.status()).toBe(200);
        const detailApiBody = await detailApiResponse.json();
        expect(hasRequiredEnvelopeKeys(detailApiBody)).toBe(true);
        expect(detailApiBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            voicemailArtifacts: expect.arrayContaining([
              expect.objectContaining({
                artifactId: callbackCorrelation.voicemailArtifactId,
                transcription: expect.objectContaining({
                  available: true,
                  text: transcriptText,
                }),
              }),
            ]),
          },
        });
      },
    );

    test.skip(
      '[E4-ATDD-E2E-002][P1] duplicate transcription callback deliveries do not create duplicate transcript timeline rows in operator thread views @P1',
      async ({ request, page }, testInfo) => {
        const { context, adminHeaders } = await bootstrapStoryE4({
          request,
          numberMappingLabel: 'Story e.4 e2e duplicate replay number',
        });
        const threadId = await ensureStoryE4Thread({
          request,
          context,
          adminHeaders,
          neighborId: context.neighborIds.duplicateReplayProbe,
          inboundNumberId: 'cs-inbound-e4-e2e-002',
          outboundNumberId: 'cs-outbound-e4-e2e-002',
        });
        const seedPayload = buildStoryE4VoicemailSeedPayload({
          context,
          neighborId: context.neighborIds.duplicateReplayProbe,
          threadId,
          testInfo,
          label: 'e4-atdd-e2e-002-seed',
          providerEventNamespace: 'provider-event-e4-atdd-e2e',
          voicemailDurationSeconds: 64,
        });

        const seedResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(seedPayload, testInfo, 'e4-atdd-e2e-002-seed'),
          },
          data: seedPayload,
        });
        expect(seedResponse.status()).toBe(200);
        const seedBody = await seedResponse.json();
        const callbackCorrelation = seedBody?.data?.transcription?.callbackCorrelation as {
          voicemailArtifactId: string;
          providerEventId: string | null;
          providerLegId: string | null;
        };
        const transcriptText = 'Replay-safe transcript for duplicate callback suppression.';
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context,
          neighborId: context.neighborIds.duplicateReplayProbe,
          threadId,
          callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-atdd-e2e-002-callback',
          callbackEventNamespace: 'provider-event-e4-atdd-e2e',
        });

        const firstCallbackResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(
              callbackPayload,
              testInfo,
              'e4-atdd-e2e-002-callback-first',
            ),
          },
          data: callbackPayload,
        });
        const duplicateCallbackResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(
              callbackPayload,
              testInfo,
              'e4-atdd-e2e-002-callback-duplicate',
            ),
          },
          data: callbackPayload,
        });
        expect(firstCallbackResponse.status()).toBe(200);
        expect(duplicateCallbackResponse.status()).toBe(200);
        const duplicateCallbackBody = await duplicateCallbackResponse.json();
        expect(hasRequiredEnvelopeKeys(duplicateCallbackBody)).toBe(true);
        expect(duplicateCallbackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_DUPLICATE_SUPPRESSED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
            },
          },
        });

        await login(page);
        const detailRequest = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${threadId}`)
            && response.request().method() === 'GET',
        );
        await page.goto(
          buildStoryE4ThreadDetailUrl({
            context,
            threadId,
            actorUserId: context.userId,
          }),
        );
        await detailRequest;

        await expect(
          page.getByTestId('connectshyft-thread-event-transcription-attached'),
        ).toHaveCount(1);
        await expect(
          page.getByTestId('connectshyft-voicemail-artifact-transcript'),
        ).toContainText(transcriptText);
      },
    );
  },
);
