import type { TestInfo } from '@playwright/test';
import {
  createStoryE4Context,
  createStoryE4Headers,
  type StoryE4Context,
} from '../factories/connectShyftStoryE4Factory';
import { apiRequest } from './apiClient';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildVoiceWebhookPayload,
} from './connectShyftWebhookTestHelpers';
import {
  ensureThread,
  mapInboundVoiceNumber,
} from './connectShyftStoryE3TestHelpers';

type RequestContext = Parameters<typeof apiRequest>[0];

type StoryE4Bootstrap = {
  context: StoryE4Context;
  operatorHeaders: Record<string, string>;
  adminHeaders: Record<string, string>;
};

export type StoryE4SeededVoicemailContext = {
  context: StoryE4Context;
  operatorHeaders: Record<string, string>;
  adminHeaders: Record<string, string>;
  threadId: string;
  seedPayload: ReturnType<typeof buildStoryE4VoicemailSeedPayload>;
  seedResponseBody: Record<string, unknown>;
  callbackCorrelation: {
    voicemailArtifactId: string;
    providerEventId: string | null;
    providerLegId: string | null;
  };
};

type StoryE4VoicemailSeedPayloadInput = {
  context: StoryE4Context;
  neighborId: string;
  threadId: string;
  testInfo: TestInfo;
  label: string;
  providerEventNamespace: string;
  voicemailDurationSeconds?: number;
};

type StoryE4TranscriptionCallbackInput = {
  context: StoryE4Context;
  neighborId: string;
  threadId: string;
  callbackCorrelation: {
    voicemailArtifactId: string;
    providerEventId: string | null;
    providerLegId: string | null;
  };
  transcriptText: string;
  testInfo: TestInfo;
  label: string;
  callbackEventNamespace: string;
};

export const bootstrapStoryE4 = async ({
  request,
  numberMappingLabel,
}: {
  request: RequestContext;
  numberMappingLabel: string;
}): Promise<StoryE4Bootstrap> => {
  const context = createStoryE4Context();
  const operatorHeaders = createStoryE4Headers(context, {
    role: 'ORGUNIT_MEMBER',
    orgUnitMemberships: [context.orgUnitId],
  });
  const adminHeaders = createStoryE4Headers(context, {
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
      label: numberMappingLabel,
      isActive: true,
    },
  });

  return {
    context,
    operatorHeaders,
    adminHeaders,
  };
};

export const ensureStoryE4Thread = async ({
  request,
  context,
  adminHeaders,
  neighborId,
  inboundNumberId,
  outboundNumberId,
}: {
  request: RequestContext;
  context: StoryE4Context;
  adminHeaders: Record<string, string>;
  neighborId: string;
  inboundNumberId: string;
  outboundNumberId: string;
}): Promise<string> =>
  ensureThread({
    request,
    path: context.paths.threads,
    headers: adminHeaders,
    payload: {
      orgUnitId: context.orgUnitId,
      neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: inboundNumberId,
      preferredOutboundCsNumberId: outboundNumberId,
    },
  });

export const buildStoryE4VoicemailSeedPayload = ({
  context,
  neighborId,
  threadId,
  testInfo,
  label,
  providerEventNamespace,
  voicemailDurationSeconds = 58,
}: StoryE4VoicemailSeedPayloadInput) => {
  const providerEventId = deterministicProviderEventId(
    providerEventNamespace,
    testInfo,
    `${label}-provider-event`,
  );
  const providerLegId = `leg-e4-${deterministicToken(testInfo, `${label}-provider-leg`)}`;

  return {
    ...buildVoiceWebhookPayload({
      providerKey: context.providers.enabledPrimary,
      providerLegId,
      providerEventId,
      threadId,
    }),
    eventType: 'voice.voicemail' as const,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    providerPayload: {
      to: context.numbers.mappedInbound,
      from: context.numbers.mappedOutbound,
      recording_url: `https://example.invalid/recordings/${providerEventId}.mp3`,
      voicemail_duration_seconds: voicemailDurationSeconds,
    },
  };
};

export const buildStoryE4TranscriptionCallbackPayload = ({
  context,
  neighborId,
  threadId,
  callbackCorrelation,
  transcriptText,
  testInfo,
  label,
  callbackEventNamespace,
}: StoryE4TranscriptionCallbackInput) => {
  const callbackEventId = deterministicProviderEventId(
    callbackEventNamespace,
    testInfo,
    `${label}-callback-event`,
  );

  return {
    eventType: 'voice.transcription.completed' as const,
    providerKey: context.providers.enabledPrimary,
    providerEventId: callbackEventId,
    providerLegId:
      callbackCorrelation.providerLegId
      || `leg-e4-callback-${deterministicToken(testInfo, `${label}-provider-leg`)}`,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    threadId,
    callbackCorrelation: {
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      providerEventId: callbackCorrelation.providerEventId,
      providerLegId: callbackCorrelation.providerLegId,
      voicemailArtifactId: callbackCorrelation.voicemailArtifactId,
    },
    transcript: {
      text: transcriptText,
      language: 'en',
      confidence: 0.97,
    },
    providerPayload: {
      callback_event_id: callbackEventId,
      transcription_text: transcriptText,
      language: 'en',
      confidence: 0.97,
    },
  };
};

export const buildStoryE4ThreadDetailUrl = ({
  context,
  threadId,
  actorUserId,
  tenantRole = 'ORGUNIT_MEMBER',
}: {
  context: StoryE4Context;
  threadId: string;
  actorUserId: string;
  tenantRole?: string;
}): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId,
    tenantRole,
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.threadDetailUi}/${threadId}?${params.toString()}`;
};

export const seedStoryE4VoicemailWithCallbackCorrelation = async ({
  request,
  testInfo,
  numberMappingLabel,
  neighborId,
  inboundNumberId,
  outboundNumberId,
  seedLabel,
  providerEventNamespace,
  webhookHeaderLabel,
}: {
  request: RequestContext;
  testInfo: TestInfo;
  numberMappingLabel: string;
  neighborId: string;
  inboundNumberId: string;
  outboundNumberId: string;
  seedLabel: string;
  providerEventNamespace: string;
  webhookHeaderLabel: string;
}): Promise<StoryE4SeededVoicemailContext> => {
  const { context, operatorHeaders, adminHeaders } = await bootstrapStoryE4({
    request,
    numberMappingLabel,
  });

  const threadId = await ensureStoryE4Thread({
    request,
    context,
    adminHeaders,
    neighborId,
    inboundNumberId,
    outboundNumberId,
  });

  const seedPayload = buildStoryE4VoicemailSeedPayload({
    context,
    neighborId,
    threadId,
    testInfo,
    label: seedLabel,
    providerEventNamespace,
  });

  const seedResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.inboundWebhook,
    headers: {
      ...adminHeaders,
      ...buildSignedWebhookHeaders(seedPayload, testInfo, webhookHeaderLabel),
    },
    data: seedPayload,
  });

  const seedResponseBody = (await seedResponse.json()) as Record<string, unknown>;
  const callbackCorrelation = ((seedResponseBody as { data?: Record<string, unknown> }).data
    ?.transcription as { callbackCorrelation?: unknown } | undefined)?.callbackCorrelation as {
      voicemailArtifactId: string;
      providerEventId: string | null;
      providerLegId: string | null;
    };

  return {
    context,
    operatorHeaders,
    adminHeaders,
    threadId,
    seedPayload,
    seedResponseBody,
    callbackCorrelation,
  };
};
