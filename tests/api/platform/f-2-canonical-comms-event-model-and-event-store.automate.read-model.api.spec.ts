import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryF2.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';

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
  'Story f.2 Canonical Comms Event Model and Event Store (Automate API Read Models)',
  () => {
    test(
      '[P1] canonical event filters stay deterministic across repeated aggregate and event-type reads with stable ordering @P1',
      async ({
        request,
        storyF2Context,
        storyF2AdminHeaders,
        storyF2OperatorHeaders,
      }, testInfo) => {
        const eventToken = deterministicToken(testInfo, 'f2-claimed-event', 6);
        await apiRequest(request, {
          method: 'POST',
          path: storyF2Context.paths.inboundWebhook,
          headers: storyF2AdminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: storyF2Context.threadIds.claimed,
            orgUnitId: storyF2Context.orgUnitId,
            tenantId: storyF2Context.tenantId,
            providerKey: storyF2Context.providers.enabledPrimary,
            providerEventId: deterministicProviderEventId(
              'provider-event-f2-claimed',
              testInfo,
              'call-connected',
            ),
            callStatus: 'CONNECTED',
            providerPayload: {
              telnyxCallControlId: `telnyx-control-f2-claimed-${eventToken}`,
              twilioCallSid: `twilio-callsid-f2-claimed-${eventToken}`,
              rawProviderStatus: 'answered',
            },
          },
        });

        const query = new URLSearchParams({
          tenantId: storyF2Context.tenantId,
          orgUnitId: storyF2Context.orgUnitId,
          aggregateId: storyF2Context.threadIds.claimed,
          aggregateType: 'Thread',
          eventType: storyF2Context.canonicalEventTypes.callConnected,
          limit: '50',
        });

        const firstResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}?${query.toString()}`,
          headers: storyF2OperatorHeaders,
        });
        const secondResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}?${query.toString()}`,
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

        const firstEvents = firstBody.data.events as CanonicalEventRecord[];
        const secondEvents = secondBody.data.events as CanonicalEventRecord[];
        expect(firstEvents.length).toBeGreaterThan(0);
        expect(firstEvents).toEqual(sortCanonically(firstEvents));
        expect(secondEvents).toEqual(sortCanonically(secondEvents));
        expectMonotonicCanonicalRead(firstEvents, secondEvents);
      },
    );

    test(
      '[P1] thread detail contract derives provider-neutral timeline/status from canonical events in deterministic order @P1',
      async ({
        request,
        storyF2Context,
        storyF2OperatorHeaders,
        storyF2AdminHeaders,
        storyF2InboundWebhookPayload,
      }) => {
        await apiRequest(request, {
          method: 'POST',
          path: `${storyF2Context.paths.threads}/${storyF2Context.threadIds.unclaimed}/call`,
          headers: storyF2OperatorHeaders,
          data: {
            orgUnitId: storyF2Context.orgUnitId,
            providerKey: storyF2Context.providers.enabledPrimary,
          },
        });
        await apiRequest(request, {
          method: 'POST',
          path: storyF2Context.paths.inboundWebhook,
          headers: storyF2AdminHeaders,
          data: storyF2InboundWebhookPayload,
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.threads}/${storyF2Context.threadIds.unclaimed}`,
          headers: storyF2OperatorHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
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

        const timeline = detailBody.data.thread.timeline as CanonicalEventRecord[];
        expect(timeline.length).toBeGreaterThan(0);
        expect(timeline).toEqual(sortCanonically(timeline));
        timeline.forEach((event) => {
          expect(hasRequiredCanonicalEventKeys(event as unknown as Record<string, unknown>)).toBe(true);
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );

    test(
      '[P1] voice family webhook events persist canonical VoiceFallback records with inbound voice channel payload metadata @P1',
      async ({ request, storyF2Context, storyF2AdminHeaders, storyF2OperatorHeaders }, testInfo) => {
        const eventToken = deterministicToken(testInfo, 'f2-fallback-event', 6);
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyF2Context.paths.inboundWebhook,
          headers: storyF2AdminHeaders,
          data: {
            eventType: 'voice.fallback',
            threadId: storyF2Context.threadIds.unclaimed,
            orgUnitId: storyF2Context.orgUnitId,
            tenantId: storyF2Context.tenantId,
            providerKey: storyF2Context.providers.enabledPrimary,
            providerEventId: deterministicProviderEventId(
              'provider-event-f2-fallback',
              testInfo,
              'voice-fallback',
            ),
            providerPayload: {
              telnyxCallControlId: `telnyx-f2-fallback-${eventToken}`,
              twilioCallSid: `twilio-f2-fallback-${eventToken}`,
            },
          },
        });

        expect(webhookResponse.status()).toBe(200);

        const query = new URLSearchParams({
          tenantId: storyF2Context.tenantId,
          orgUnitId: storyF2Context.orgUnitId,
          aggregateId: storyF2Context.threadIds.unclaimed,
          aggregateType: 'Thread',
          eventType: 'VoiceFallback',
          limit: '25',
        });
        const eventsResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyF2Context.paths.events}?${query.toString()}`,
          headers: storyF2OperatorHeaders,
        });

        expect(eventsResponse.status()).toBe(200);
        const eventsBody = await eventsResponse.json();
        const events = eventsBody.data.events as CanonicalEventRecord[];
        expect(events.length).toBeGreaterThan(0);
        events.forEach((event) => {
          expect(event.eventType).toBe('VoiceFallback');
          expect(event.payload).toMatchObject({
            direction: 'inbound',
            channel: 'voice',
          });
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );
  },
);
