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

const EMPTY_CALLBACK_CORRELATION = {
  voicemailArtifactId: '',
  providerEventId: null as string | null,
  providerLegId: null as string | null,
};

type StoryE4ApiSuite = 'atdd-api' | 'automate-api';

type StoryE4ScenarioSeedInput = {
  request: RequestContext;
  testInfo: TestInfo;
  suite: StoryE4ApiSuite;
  scenarioId: string;
  numberMappingLabel?: string;
  neighborId?: string;
  inboundNumberId?: string;
  outboundNumberId?: string;
  seedLabel?: string;
  providerEventNamespace?: string;
  webhookHeaderLabel?: string;
};

type StoryE4PostTranscriptionCallbackInput = {
  request: RequestContext;
  seeded: StoryE4SeededVoicemailContext;
  testInfo: TestInfo;
  transcriptText: string;
  label: string;
  callbackEventNamespace: string;
  neighborId?: string;
  threadId?: string;
  callbackCorrelation?: StoryE4SeededVoicemailContext['callbackCorrelation'];
  signatureLabel?: string;
  mutatePayload?: (
    payload: ReturnType<typeof buildStoryE4TranscriptionCallbackPayload>,
  ) => Record<string, unknown>;
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
  const resolvedCallbackCorrelation = callbackCorrelation ?? EMPTY_CALLBACK_CORRELATION;
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
      resolvedCallbackCorrelation.providerLegId
      || `leg-e4-callback-${deterministicToken(testInfo, `${label}-provider-leg`)}`,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    threadId,
    callbackCorrelation: {
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      providerEventId: resolvedCallbackCorrelation.providerEventId,
      providerLegId: resolvedCallbackCorrelation.providerLegId,
      voicemailArtifactId: resolvedCallbackCorrelation.voicemailArtifactId,
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

const buildStoryE4ScenarioToken = (
  suite: StoryE4ApiSuite,
  scenarioId: string,
): string => `${suite}-${scenarioId}`;

export const seedStoryE4VoicemailScenario = async ({
  request,
  testInfo,
  suite,
  scenarioId,
  numberMappingLabel,
  neighborId,
  inboundNumberId,
  outboundNumberId,
  seedLabel,
  providerEventNamespace,
  webhookHeaderLabel,
}: StoryE4ScenarioSeedInput): Promise<StoryE4SeededVoicemailContext> => {
  const scenarioToken = buildStoryE4ScenarioToken(suite, scenarioId);
  return seedStoryE4VoicemailWithCallbackCorrelation({
    request,
    testInfo,
    numberMappingLabel:
      numberMappingLabel ?? `Story e.4 mapped number (${scenarioToken})`,
    neighborId: neighborId ?? `neighbor-connectshyft-e4-${scenarioToken}`,
    inboundNumberId: inboundNumberId ?? `cs-inbound-e4-seed-${scenarioToken}`,
    outboundNumberId: outboundNumberId ?? `cs-outbound-e4-seed-${scenarioToken}`,
    seedLabel: seedLabel ?? `e4-seed-${scenarioToken}`,
    providerEventNamespace:
      providerEventNamespace ?? `provider-event-e4-${suite}-seed`,
    webhookHeaderLabel: webhookHeaderLabel ?? `e4-seed-${scenarioToken}`,
  });
};

export const postStoryE4TranscriptionCallback = async ({
  request,
  seeded,
  testInfo,
  transcriptText,
  label,
  callbackEventNamespace,
  neighborId,
  threadId,
  callbackCorrelation,
  signatureLabel,
  mutatePayload,
}: StoryE4PostTranscriptionCallbackInput): Promise<{
  payload: Record<string, unknown>;
  response: Awaited<ReturnType<typeof apiRequest>>;
  body: Record<string, unknown>;
}> => {
  const basePayload = buildStoryE4TranscriptionCallbackPayload({
    context: seeded.context,
    neighborId: neighborId ?? seeded.context.neighborIds.transcriptionTarget,
    threadId: threadId ?? seeded.threadId,
    callbackCorrelation: callbackCorrelation ?? seeded.callbackCorrelation,
    transcriptText,
    testInfo,
    label,
    callbackEventNamespace,
  });
  const payload = mutatePayload
    ? mutatePayload(basePayload)
    : (basePayload as Record<string, unknown>);

  const response = await apiRequest(request, {
    method: 'POST',
    path: seeded.context.paths.inboundWebhook,
    headers: {
      ...seeded.adminHeaders,
      ...buildSignedWebhookHeaders(payload, testInfo, signatureLabel ?? label),
    },
    data: payload,
  });
  const body = (await response.json()) as Record<string, unknown>;
  return {
    payload,
    response,
    body,
  };
};

export const fetchStoryE4ThreadDetail = async ({
  request,
  seeded,
  threadId,
}: {
  request: RequestContext;
  seeded: StoryE4SeededVoicemailContext;
  threadId?: string;
}): Promise<{
  response: Awaited<ReturnType<typeof apiRequest>>;
  body: Record<string, unknown>;
}> => {
  const resolvedThreadId = threadId ?? seeded.threadId;
  const response = await apiRequest(request, {
    method: 'GET',
    path: `${seeded.context.paths.threads}/${resolvedThreadId}`,
    headers: seeded.operatorHeaders,
  });
  const body = (await response.json()) as Record<string, unknown>;
  return {
    response,
    body,
  };
};

export const countStoryE4TimelineEvents = (
  detailBody: Record<string, unknown>,
  eventName: string,
): number => {
  const timeline = Array.isArray((detailBody.data as { thread?: { timeline?: unknown[] } } | undefined)?.thread?.timeline)
    ? ((detailBody.data as { thread?: { timeline?: Array<{ eventName?: string }> } }).thread?.timeline ?? [])
    : [];
  return timeline.filter((entry) => entry.eventName === eventName).length;
};
