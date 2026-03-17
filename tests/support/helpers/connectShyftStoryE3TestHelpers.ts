import { expect, type TestInfo } from '@playwright/test';
import {
  createStoryE3Context,
  createStoryE3Headers,
  type StoryE3Context,
} from '../factories/connectShyftStoryE3Factory';
import { apiRequest } from './apiClient';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../utils/deterministicTestIds';
import { buildVoiceWebhookPayload } from './connectShyftWebhookTestHelpers';

type RequestContext = Parameters<typeof apiRequest>[0];

type NumberMappingPayload = {
  orgUnitId: string;
  providerNumberE164: string;
  label: string;
  isActive: true;
};

type EnsureThreadPayload = {
  orgUnitId: string;
  neighborId: string;
  source: 'VOICE';
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

type VoiceWebhookEventType = 'voice.voicemail' | 'voice.fallback';

type StoryE3E2EBootstrap = {
  context: StoryE3Context;
  operatorHeaders: Record<string, string>;
  adminHeaders: Record<string, string>;
};

type StoryE3VoicemailPayloadInput = {
  context: StoryE3Context;
  neighborId: string;
  threadId?: string;
  testInfo: TestInfo;
  label: string;
  providerEventNamespace: string;
  eventType?: VoiceWebhookEventType;
  voicemailDurationSeconds?: number;
};

const persistedActorUserIdCache = new Map<string, Promise<string>>();

export const mapInboundVoiceNumber = async ({
  request,
  path,
  headers,
  payload,
}: {
  request: RequestContext;
  path: string;
  headers: Record<string, string>;
  payload: NumberMappingPayload;
}): Promise<void> => {
  const response = await apiRequest(request, {
    method: 'POST',
    path,
    headers,
    data: payload,
  });

  expect([200, 201]).toContain(response.status());
  const body = await response.json();
  expect(String(body?.code || '')).toBe('CONNECTSHYFT_NUMBER_MAPPING_SAVED');
};

export const bootstrapStoryE3E2E = async ({
  request,
  numberMappingLabel,
}: {
  request: RequestContext;
  numberMappingLabel: string;
}): Promise<StoryE3E2EBootstrap> => {
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

export const ensureThread = async ({
  request,
  path,
  headers,
  payload,
}: {
  request: RequestContext;
  path: string;
  headers: Record<string, string>;
  payload: EnsureThreadPayload;
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

export const resolvePersistedActorUserId = async (
  request: RequestContext,
): Promise<string> => {
  const email = process.env.TEST_EMAIL || 'operator@example.com';
  const password = process.env.TEST_PASSWORD || 'SecurePass123!';
  const cacheKey = `${email}::${password}`;
  const cachedResolution = persistedActorUserIdCache.get(cacheKey);

  if (cachedResolution) {
    return cachedResolution;
  }

  const resolution = (async () => {
    const loginResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {
        cookie: '',
      },
      data: {
        email,
        password,
        rememberMe: false,
      },
    });

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const user = loginBody?.user ?? loginBody?.data?.user ?? {};
    const userId =
      typeof user?.userId === 'string'
        ? user.userId
        : typeof user?.id === 'string'
          ? user.id
          : '';

    expect(userId.length).toBeGreaterThan(0);
    return userId;
  })();

  persistedActorUserIdCache.set(cacheKey, resolution);
  try {
    return await resolution;
  } catch (error) {
    persistedActorUserIdCache.delete(cacheKey);
    throw error;
  }
};

export const buildStoryE3ThreadDetailUrl = ({
  context,
  threadId,
  actorUserId,
  tenantRole = 'ORGUNIT_MEMBER',
}: {
  context: StoryE3Context;
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

export const buildStoryE3VoicemailPayload = ({
  context,
  neighborId,
  threadId,
  testInfo,
  label,
  providerEventNamespace,
  eventType = 'voice.voicemail',
  voicemailDurationSeconds = 52,
}: StoryE3VoicemailPayloadInput) => {
  const providerEventId = deterministicProviderEventId(
    providerEventNamespace,
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
      voicemail_duration_seconds: voicemailDurationSeconds,
    },
  };
};
