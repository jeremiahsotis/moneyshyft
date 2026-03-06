import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryF2Context,
  createStoryF2Headers,
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

test.describe(
  'Story f.2 Canonical Comms Event Model and Event Store (Automate E2E Read Models)',
  () => {
    test(
      '[P1] repeated canonical event filter reads remain deterministic and preserve provider-specific data stripping @P1',
      async ({ request }) => {
        const context = createStoryF2Context();
        const operatorHeaders = createStoryF2Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF2Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: context.threadIds.unclaimed,
            orgUnitId: context.orgUnitId,
            tenantId: context.tenantId,
            providerKey: context.providers.enabledPrimary,
            providerPayload: {
              telnyxCallControlId: 'telnyx-hidden-f2-filter',
              twilioCallSid: 'twilio-hidden-f2-filter',
            },
          },
        });

        const query = new URLSearchParams({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          aggregateId: context.threadIds.unclaimed,
          aggregateType: 'Thread',
          eventType: context.canonicalEventTypes.callConnected,
          limit: '50',
        });

        const firstResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.events}?${query.toString()}`,
          headers: operatorHeaders,
        });
        const secondResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.events}?${query.toString()}`,
          headers: operatorHeaders,
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
        expect(firstEvents).toEqual(secondEvents);
        firstEvents.forEach((event) => {
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );

    test(
      '[P1] thread detail response remains provider-neutral and status-derived from canonical timeline events in deterministic order @P1',
      async ({ request }) => {
        const context = createStoryF2Context();
        const operatorHeaders = createStoryF2Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryF2Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });
        await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: adminHeaders,
          data: {
            eventType: 'voice.fallback',
            threadId: context.threadIds.unclaimed,
            orgUnitId: context.orgUnitId,
            tenantId: context.tenantId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}`,
          headers: operatorHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            thread: {
              threadId: context.threadIds.unclaimed,
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
          assertProviderSpecificLeakageRemoved(event.payload);
        });
      },
    );
  },
);
