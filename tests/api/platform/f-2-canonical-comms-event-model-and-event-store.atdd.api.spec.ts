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

const hasRequiredCanonicalEventKeys = (
  record: Record<string, unknown>,
): boolean => REQUIRED_CANONICAL_EVENT_KEYS.every((key) =>
  Object.prototype.hasOwnProperty.call(record, key),
);

const assertProviderSpecificLeakageIsPrevented = (
  payload: Record<string, unknown>,
): void => {
  expect(payload).not.toHaveProperty('twilioCallSid');
  expect(payload).not.toHaveProperty('telnyxCallControlId');
  expect(payload).not.toHaveProperty('providerLegId');
  expect(payload).not.toHaveProperty('providerMessageId');
};

const sortCanonically = (
  events: CanonicalEventRecord[],
): CanonicalEventRecord[] => [...events].sort((a, b) => {
  const occurredAtDelta =
    new Date(a.occurredAtUtc).getTime() - new Date(b.occurredAtUtc).getTime();
  return occurredAtDelta !== 0
    ? occurredAtDelta
    : a.eventId.localeCompare(b.eventId);
});

const expectMonotonicCanonicalRead = (
  earlier: CanonicalEventRecord[],
  later: CanonicalEventRecord[],
): void => {
  expect(later.length).toBeGreaterThanOrEqual(earlier.length);
  earlier.forEach((event, index) => {
    expect(later[index]).toEqual(event);
  });
};

test.describe(
  'Story f.2 Canonical Comms Event Model and Event Store (ATDD API RED)',
  () => {
    test(
      '[P0] outbound call and sms plus inbound webhook flows persist canonical events with aggregate id/type payload and UTC timestamp schema @P0',
      async ({
        request,
        storyF2Context,
        storyF2OperatorHeaders,
        storyF2AdminHeaders,
        storyF2OutboundCallPayload,
        storyF2OutboundMessagePayload,
        storyF2InboundWebhookPayload,
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
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF2Context.paths.inboundWebhook,
          headers: storyF2AdminHeaders,
          data: storyF2InboundWebhookPayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);
        expect(webhookResponse.status()).toBe(200);

        const eventsResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}${storyF2EventsByAggregateQuery}`,
          headers: storyF2OperatorHeaders,
        });

        expect(eventsResponse.status()).toBe(200);
        const eventsBody = await eventsResponse.json();
        expect(eventsBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
          data: {
            filters: {
              aggregateId: storyF2Context.threadIds.unclaimed,
              aggregateType: 'Thread',
            },
            events: expect.any(Array),
          },
        });

        const events: CanonicalEventRecord[] = eventsBody.data.events;
        expect(events.length).toBeGreaterThanOrEqual(3);

        for (const event of events) {
          expect(hasRequiredCanonicalEventKeys(event as unknown as Record<string, unknown>)).toBe(
            true,
          );
          expect(event.aggregateId).toBe(storyF2Context.threadIds.unclaimed);
          expect(event.aggregateType).toBe('Thread');
          expect(UTC_ISO_TIMESTAMP_PATTERN.test(event.occurredAtUtc)).toBe(true);
          assertProviderSpecificLeakageIsPrevented(event.payload);
        }
      },
    );

    test(
      '[P0] canonical translation shields downstream handlers from provider-specific payload keys while preserving provider-neutral event meaning @P0',
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
          },
        });

        const eventsResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}${storyF2EventsByEventTypeQuery}`,
          headers: storyF2OperatorHeaders,
        });

        expect(eventsResponse.status()).toBe(200);
        const eventsBody = await eventsResponse.json();
        const events: CanonicalEventRecord[] = eventsBody.data.events;

        expect(events.length).toBeGreaterThan(0);
        for (const event of events) {
          expect(event.eventType).toBe(storyF2Context.canonicalEventTypes.callConnected);
          assertProviderSpecificLeakageIsPrevented(event.payload);
        }
      },
    );

    test(
      '[P1] events endpoint filtering by aggregate id and event type is deterministic and orders by occurred_at_utc with event_id tie-breaks @P1',
      async ({
        request,
        storyF2Context,
        storyF2OperatorHeaders,
        storyF2AdminHeaders,
        storyF2InboundWebhookPayload,
        storyF2EventsByAggregateAndTypeQuery,
      }) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF2Context.paths.inboundWebhook,
          headers: storyF2AdminHeaders,
          data: storyF2InboundWebhookPayload,
        });

        expect(webhookResponse.status()).toBe(200);

        const firstResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}${storyF2EventsByAggregateAndTypeQuery}`,
          headers: storyF2OperatorHeaders,
        });
        const secondResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}${storyF2EventsByAggregateAndTypeQuery}`,
          headers: storyF2OperatorHeaders,
        });

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
          data: {
            deterministic: true,
            providerNeutral: true,
          },
        });
        expect(secondBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
          data: {
            deterministic: true,
            providerNeutral: true,
          },
        });

        const firstEvents: CanonicalEventRecord[] = firstBody.data.events;
        const secondEvents: CanonicalEventRecord[] = secondBody.data.events;

        expect(firstEvents.length).toBeGreaterThan(0);
        expect(firstEvents).toEqual(sortCanonically(firstEvents));
        expect(secondEvents).toEqual(sortCanonically(secondEvents));
        expectMonotonicCanonicalRead(firstEvents, secondEvents);
      },
    );

    test(
      '[P1] thread detail and status contracts derive provider-neutral timeline state from canonical events with stable deterministic ordering @P1',
      async ({ request, storyF2Context, storyF2OperatorHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.threads}/${storyF2Context.threadIds.unclaimed}`,
          headers: storyF2OperatorHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            thread: {
              threadId: storyF2Context.threadIds.unclaimed,
              providerNeutral: true,
              statusDerivedFromCanonicalEvents: true,
              timeline: expect.any(Array),
            },
          },
        });

        const timeline: CanonicalEventRecord[] = body.data.thread.timeline;
        expect(timeline).toEqual(sortCanonically(timeline));

        for (const entry of timeline) {
          expect(UTC_ISO_TIMESTAMP_PATTERN.test(entry.occurredAtUtc)).toBe(true);
          assertProviderSpecificLeakageIsPrevented(entry.payload);
        }
      },
    );
  },
);
