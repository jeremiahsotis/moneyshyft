import { expect, type APIRequestContext, type TestInfo } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import type { StoryE2Context } from '../../support/factories/connectShyftStoryE2Factory';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import { buildSignedWebhookHeaders } from '../../support/helpers/connectShyftWebhookTestHelpers';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export type CanonicalTimelineEvent = {
  eventId: string;
  eventName: string;
  occurredAtUtc: string;
  payload?: Record<string, unknown> | null;
};

export const expectsDurableSideEffects = (
  tenantId: string,
  threadId: string,
): boolean => UUID_PATTERN.test(tenantId) && UUID_PATTERN.test(threadId);

export const buildStoryE2NeighborId = (
  baseNeighborId: string,
  testInfo: TestInfo,
  label: string,
  suffix: string,
): string => `${baseNeighborId}-${suffix}-${deterministicToken(testInfo, label)}`;

export const mapStoryE2InboundNumber = async (input: {
  request: APIRequestContext;
  context: StoryE2Context;
  adminHeaders: Record<string, string>;
  numberMappingPayload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
}): Promise<void> => {
  const mappingResponse = await apiRequest(input.request, {
    method: 'POST',
    path: input.context.paths.numbersCollection,
    headers: input.adminHeaders,
    data: input.numberMappingPayload,
  });

  expect([200, 201]).toContain(mappingResponse.status());
};

export const postSignedInboundWebhook = async (input: {
  request: APIRequestContext;
  path: string;
  adminHeaders: Record<string, string>;
  webhookPayload: Record<string, unknown>;
  testInfo: TestInfo;
  signatureLabel: string;
}) => {
  return apiRequest(input.request, {
    method: 'POST',
    path: input.path,
    headers: {
      ...input.adminHeaders,
      ...buildSignedWebhookHeaders(input.webhookPayload, input.testInfo, input.signatureLabel),
    },
    data: input.webhookPayload,
  });
};

export const resolveThreadIdFromEnvelope = (body: Record<string, unknown>): string => {
  const data = asRecord(body.data);
  const thread = asRecord(data?.thread);
  const threadIdFromThread = typeof thread?.threadId === 'string' ? thread.threadId : '';
  const threadIdFromData = typeof data?.threadId === 'string' ? data.threadId : '';

  return threadIdFromThread || threadIdFromData;
};

export const assertDurabilityEnvelope = (input: {
  body: Record<string, unknown>;
  tenantId: string;
  threadId: string;
  expectedEventName: string;
}): void => {
  const durableSideEffects = expectsDurableSideEffects(input.tenantId, input.threadId);

  expect(input.body?.data).toMatchObject({
    sideEffects: {
      canonicalEventPersisted: true,
      auditPersisted: durableSideEffects,
      outboxPersisted: durableSideEffects,
    },
    transaction: {
      atomic: durableSideEffects,
      auditPersisted: durableSideEffects,
      outboxPersisted: durableSideEffects,
    },
  });

  if (durableSideEffects) {
    expect(input.body?.data).toMatchObject({
      audit: {
        eventName: input.expectedEventName,
      },
      outbox: {
        eventName: input.expectedEventName,
      },
    });
    return;
  }

  expect(input.body.data).not.toHaveProperty('audit');
  expect(input.body.data).not.toHaveProperty('outbox');
};

export const fetchThreadTimeline = async (input: {
  request: APIRequestContext;
  context: StoryE2Context;
  operatorHeaders: Record<string, string>;
  threadId: string;
}): Promise<CanonicalTimelineEvent[]> => {
  const detailResponse = await apiRequest(input.request, {
    method: 'GET',
    path: `${input.context.paths.threads}/${input.threadId}`,
    headers: input.operatorHeaders,
  });

  expect(detailResponse.status()).toBe(200);

  const detailBody = await detailResponse.json();
  const timeline = asRecord(detailBody?.data?.thread)?.timeline;
  return Array.isArray(timeline) ? (timeline as CanonicalTimelineEvent[]) : [];
};
