import { expect, type TestInfo } from '@playwright/test';
import type { StoryE3Context } from '../factories/connectShyftStoryE3Factory';
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

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(String(body?.code || '')).toBe('CONNECTSHYFT_NUMBER_MAPPING_SAVED');
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
  const userId =
    typeof user?.userId === 'string'
      ? user.userId
      : typeof user?.id === 'string'
        ? user.id
        : '';

  expect(userId.length).toBeGreaterThan(0);
  return userId;
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
