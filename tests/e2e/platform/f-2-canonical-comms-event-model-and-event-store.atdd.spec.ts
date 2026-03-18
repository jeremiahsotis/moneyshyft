import { randomUUID } from 'node:crypto';
import { test, expect } from '../../support/fixtures/connectShyftStoryF2.fixture';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  type StoryF2Context,
} from '../../support/factories/connectShyftStoryF2Factory';

type CanonicalEventRecord = {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAtUtc: string;
};

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const assertProviderSpecificLeakageRemoved = (
  payload: Record<string, unknown>,
): void => {
  expect(payload).not.toHaveProperty('twilioCallSid');
  expect(payload).not.toHaveProperty('telnyxCallControlId');
  expect(payload).not.toHaveProperty('providerLegId');
  expect(payload).not.toHaveProperty('providerMessageId');
  expect(payload).not.toHaveProperty('providerPayload');
};

const sortCanonically = (
  events: CanonicalEventRecord[],
): CanonicalEventRecord[] => [...events].sort((left, right) => {
  const timeDelta =
    new Date(left.occurredAtUtc).getTime() - new Date(right.occurredAtUtc).getTime();
  return timeDelta !== 0 ? timeDelta : left.eventId.localeCompare(right.eventId);
});

const buildThreadUrl = (
  context: StoryF2Context,
  options: {
    threadId: string;
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    providerKey: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    providerKey: options.providerKey,
  });

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

test.describe(
  'Story f.2 Canonical Comms Event Model and Event Store (ATDD E2E Timeline)',
  () => {
    test(
      '[P0] thread detail timeline renders canonical event rows with provider-neutral labels and deterministic chronological ordering @P0',
      async ({ page, request, storyF2Context, storyF2OperatorHeaders, storyF2AdminHeaders }) => {
        const context = storyF2Context;
        const operatorHeaders = storyF2OperatorHeaders;
        const adminHeaders = storyF2AdminHeaders;
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.enabledPrimary,
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-detail')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
        await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
        await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();

        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/messages`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Story f.2 ATDD E2E canonical event ordering validation.',
          },
        });
        const webhookEventToken = randomUUID().slice(0, 8);
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: context.threadIds.unclaimed,
            orgUnitId: context.orgUnitId,
            tenantId: context.tenantId,
            providerKey: context.providers.enabledPrimary,
            providerEventId: `provider-event-f2-atdd-${webhookEventToken}`,
            providerPayload: {
              telnyxCallControlId: `telnyx-control-f2-atdd-${webhookEventToken}`,
              twilioCallSid: `twilio-callsid-f2-atdd-${webhookEventToken}`,
            },
          },
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);
        expect(webhookResponse.status()).toBe(200);

        const aggregateQuery = new URLSearchParams({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          aggregateId: context.threadIds.unclaimed,
          aggregateType: 'Thread',
          limit: '50',
        });
        const eventsResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.events}?${aggregateQuery.toString()}`,
          headers: operatorHeaders,
        });

        expect(eventsResponse.status()).toBe(200);
        const eventsBody = await eventsResponse.json();
        expect(hasRequiredEnvelopeKeys(eventsBody)).toBe(true);
        expect(eventsBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
          data: {
            deterministic: true,
            providerNeutral: true,
            events: expect.any(Array),
          },
        });

        const events = eventsBody.data.events as CanonicalEventRecord[];
        expect(events.length).toBeGreaterThanOrEqual(3);
        expect(events).toEqual(sortCanonically(events));
        expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining([
          context.canonicalEventTypes.callAttemptStarted,
          context.canonicalEventTypes.messageQueued,
          context.canonicalEventTypes.callConnected,
        ]));
        events.forEach((event) => {
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );
  },
);
