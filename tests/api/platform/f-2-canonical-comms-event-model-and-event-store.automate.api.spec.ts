import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryF2.fixture';

type CanonicalEventRecord = {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAtUtc: string;
};

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];
const REQUIRED_CANONICAL_EVENT_KEYS = [
  'eventId',
  'aggregateId',
  'aggregateType',
  'eventType',
  'payload',
  'occurredAtUtc',
] as const;
const UTC_ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const hasRequiredCanonicalEventKeys = (
  record: Record<string, unknown>,
): boolean => REQUIRED_CANONICAL_EVENT_KEYS.every((key) =>
  Object.prototype.hasOwnProperty.call(record, key),
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

test.describe(
  'Story f.2 Canonical Comms Event Model and Event Store (Automate API Dispatch)',
  () => {
    test(
      '[P0] outbound call and message dispatches persist canonical provider-neutral events with stable schema and UTC timestamps @P0',
      async ({
        request,
        storyF2Context,
        storyF2OperatorHeaders,
        storyF2OutboundCallPayload,
        storyF2OutboundMessagePayload,
        storyF2EventsByAggregateQuery,
      }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF2Context.paths.threads}/${storyF2Context.threadIds.unclaimed}/call`,
          headers: storyF2OperatorHeaders,
          data: storyF2OutboundCallPayload,
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF2Context.paths.threads}/${storyF2Context.threadIds.unclaimed}/messages`,
          headers: storyF2OperatorHeaders,
          data: storyF2OutboundMessagePayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();

        expect(hasRequiredEnvelopeKeys(callBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(messageBody)).toBe(true);
        expect(callBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            canonicalEvent: {
              aggregateId: storyF2Context.threadIds.unclaimed,
              aggregateType: 'Thread',
              eventType: storyF2Context.canonicalEventTypes.callAttemptStarted,
            },
          },
        });
        expect(messageBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            canonicalEvent: {
              aggregateId: storyF2Context.threadIds.unclaimed,
              aggregateType: 'Thread',
              eventType: storyF2Context.canonicalEventTypes.messageQueued,
            },
          },
        });

        const eventsResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}${storyF2EventsByAggregateQuery}`,
          headers: storyF2OperatorHeaders,
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
            filters: {
              aggregateId: storyF2Context.threadIds.unclaimed,
              aggregateType: 'Thread',
            },
            events: expect.any(Array),
          },
        });

        const events = eventsBody.data.events as CanonicalEventRecord[];
        expect(events.length).toBeGreaterThanOrEqual(2);
        expect(events).toEqual(sortCanonically(events));
        expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining([
          storyF2Context.canonicalEventTypes.callAttemptStarted,
          storyF2Context.canonicalEventTypes.messageQueued,
        ]));

        events.forEach((event) => {
          expect(hasRequiredCanonicalEventKeys(event as unknown as Record<string, unknown>)).toBe(true);
          expect(UTC_ISO_TIMESTAMP_PATTERN.test(event.occurredAtUtc)).toBe(true);
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );

    test(
      '[P0] inbound webhook translation emits canonical provider-neutral events and strips provider-specific fields from persisted payloads @P0',
      async ({
        request,
        storyF2Context,
        storyF2AdminHeaders,
        storyF2OperatorHeaders,
        storyF2InboundWebhookPayload,
        storyF2EventsByEventTypeQuery,
      }) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF2Context.paths.inboundWebhook,
          headers: storyF2AdminHeaders,
          data: storyF2InboundWebhookPayload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            canonicalTranslation: {
              eventType: storyF2Context.canonicalEventTypes.callConnected,
              providerNeutral: true,
              providerSpecificFieldsStripped: true,
            },
            domainHandlers: {
              providerBranchingInDomain: false,
            },
            canonicalEvent: {
              aggregateId: storyF2Context.threadIds.unclaimed,
              aggregateType: 'Thread',
              eventType: storyF2Context.canonicalEventTypes.callConnected,
            },
          },
        });

        assertProviderSpecificLeakageRemoved(webhookBody.data.canonicalEvent.payload);

        const eventsResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}${storyF2EventsByEventTypeQuery}`,
          headers: storyF2OperatorHeaders,
        });

        expect(eventsResponse.status()).toBe(200);
        const eventsBody = await eventsResponse.json();
        const events = eventsBody.data.events as CanonicalEventRecord[];
        expect(events.length).toBeGreaterThan(0);
        events.forEach((event) => {
          expect(event.eventType).toBe(storyF2Context.canonicalEventTypes.callConnected);
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );
  },
);
