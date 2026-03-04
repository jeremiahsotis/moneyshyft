import { expect, type TestInfo } from '@playwright/test';
import type { StoryE5Context } from '../factories/connectShyftStoryE5Factory';
import { apiRequest } from './apiClient';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from './connectShyftWebhookTestHelpers';

type RequestContext = Parameters<typeof apiRequest>[0];

type StoryE5EnvelopeBody = Record<string, any>;

type StoryE5NumberMappingPayload = {
  orgUnitId: string;
  providerNumberE164: string;
  label: string;
  isActive: true;
};

type StoryE5CleanupPayload = {
  policyWindowDays: number;
  dryRun: boolean;
};

const buildStoryE5RunScopeToken = (context: StoryE5Context): string =>
  String(context.correlationId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-10);

export const withStoryE5RunScope = (
  context: StoryE5Context,
  value: string,
): string => {
  const scopeToken = buildStoryE5RunScopeToken(context);
  return scopeToken ? `${value}-${scopeToken}` : value;
};

export const ensureStoryE5NumberMapping = async ({
  request,
  context,
  adminHeaders,
  numberMappingPayload,
}: {
  request: RequestContext;
  context: StoryE5Context;
  adminHeaders: Record<string, string>;
  numberMappingPayload: StoryE5NumberMappingPayload;
}): Promise<void> => {
  const mappingResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.numbersCollection,
    headers: adminHeaders,
    data: numberMappingPayload,
  });

  expect([200, 201]).toContain(mappingResponse.status());
};

export const postStoryE5InboundWebhook = async ({
  request,
  context,
  adminHeaders,
  payload,
  testInfo,
  signatureLabel,
  expectedStatus = 200,
}: {
  request: RequestContext;
  context: StoryE5Context;
  adminHeaders: Record<string, string>;
  payload: Record<string, unknown>;
  testInfo: TestInfo;
  signatureLabel: string;
  expectedStatus?: number;
}): Promise<{
  response: Awaited<ReturnType<typeof apiRequest>>;
  body: StoryE5EnvelopeBody;
}> => {
  const response = await apiRequest(request, {
    method: 'POST',
    path: context.paths.inboundWebhook,
    headers: {
      ...adminHeaders,
      ...buildSignedWebhookHeaders(payload, testInfo, signatureLabel),
    },
    data: payload,
  });

  expect(response.status()).toBe(expectedStatus);

  const body = (await response.json()) as StoryE5EnvelopeBody;
  expect(hasRequiredEnvelopeKeys(body)).toBe(true);

  return {
    response,
    body,
  };
};

export const fetchStoryE5ThreadDetail = async ({
  request,
  context,
  headers,
  threadId,
}: {
  request: RequestContext;
  context: StoryE5Context;
  headers: Record<string, string>;
  threadId: string;
}): Promise<{
  response: Awaited<ReturnType<typeof apiRequest>>;
  body: StoryE5EnvelopeBody;
}> => {
  const response = await apiRequest(request, {
    method: 'GET',
    path: `${context.paths.threads}/${threadId}`,
    headers,
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as StoryE5EnvelopeBody;
  expect(hasRequiredEnvelopeKeys(body)).toBe(true);

  return {
    response,
    body,
  };
};

export const loadStoryE5ReceiptMetrics = async ({
  request,
  context,
  adminHeaders,
}: {
  request: RequestContext;
  context: StoryE5Context;
  adminHeaders: Record<string, string>;
}): Promise<{
  response: Awaited<ReturnType<typeof apiRequest>>;
  body: StoryE5EnvelopeBody;
}> => {
  const response = await apiRequest(request, {
    method: 'GET',
    path: context.paths.receiptMetrics,
    headers: adminHeaders,
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as StoryE5EnvelopeBody;
  expect(hasRequiredEnvelopeKeys(body)).toBe(true);

  return {
    response,
    body,
  };
};

export const runStoryE5ReceiptCleanup = async ({
  request,
  context,
  adminHeaders,
  cleanupPayload,
}: {
  request: RequestContext;
  context: StoryE5Context;
  adminHeaders: Record<string, string>;
  cleanupPayload: StoryE5CleanupPayload;
}): Promise<{
  response: Awaited<ReturnType<typeof apiRequest>>;
  body: StoryE5EnvelopeBody;
}> => {
  const response = await apiRequest(request, {
    method: 'POST',
    path: context.paths.receiptCleanup,
    headers: adminHeaders,
    data: cleanupPayload,
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as StoryE5EnvelopeBody;
  expect(hasRequiredEnvelopeKeys(body)).toBe(true);

  return {
    response,
    body,
  };
};

export const extractStoryE5ThreadId = (body: StoryE5EnvelopeBody): string => {
  const threadId = String(
    body?.data?.thread?.threadId
      || body?.data?.threadId
      || body?.data?.correlation?.threadId
      || '',
  );

  expect(threadId.length).toBeGreaterThan(0);
  return threadId;
};

export const countStoryE5TimelineEvents = (
  detailBody: StoryE5EnvelopeBody,
  eventName: string,
): number => {
  const timeline = Array.isArray(detailBody?.data?.thread?.timeline)
    ? (detailBody.data.thread.timeline as Array<{ eventName?: string }>)
    : [];

  return timeline.filter((entry) => entry.eventName === eventName).length;
};

export const buildStoryE5ThreadDetailUrl = ({
  context,
  threadId,
  actorUserId,
  tenantRole = 'ORGUNIT_MEMBER',
}: {
  context: StoryE5Context;
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

  return `${context.paths.threadDetailUi}/${encodeURIComponent(threadId)}?${params.toString()}`;
};
