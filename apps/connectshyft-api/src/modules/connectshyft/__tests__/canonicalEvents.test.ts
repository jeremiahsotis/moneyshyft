import {
  listConnectShyftCanonicalEvents,
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
  sanitizeConnectShyftCanonicalPayload,
} from '../canonicalEvents';
import * as platformMutations from '../../../platform/mutations/executePlatformMutation';

describe('connectshyft canonical event store', () => {
  let executePlatformMutationSpy: jest.SpyInstance;

  beforeEach(() => {
    resetConnectShyftCanonicalEventsForTests();
    executePlatformMutationSpy = jest.spyOn(platformMutations, 'executePlatformMutation');
  });

  afterEach(() => {
    executePlatformMutationSpy.mockRestore();
  });

  it('sanitizes provider-specific payload fields recursively', () => {
    const payload = sanitizeConnectShyftCanonicalPayload({
      threadState: 'UNCLAIMED',
      providerPayload: {
        providerLegId: 'provider-leg-hidden',
      },
      nested: {
        providerMessageId: 'provider-message-hidden',
        keep: true,
      },
      providerLegId: 'provider-leg-1001',
      providerMessageId: 'provider-message-1002',
    });

    expect(payload).toEqual({
      threadState: 'UNCLAIMED',
      nested: {
        keep: true,
      },
    });
  });

  it('records and lists canonical events with deterministic ordering and filtering', async () => {
    await recordConnectShyftCanonicalEvent({
      tenantId: 'tenant-connectshyft-f2',
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: 'thread-f2-unclaimed-1001',
      aggregateType: 'Thread',
      eventType: 'MessageQueued',
      payload: { direction: 'outbound', channel: 'sms' },
      occurredAtUtc: '2026-02-28T09:00:01.000Z',
    });
    await recordConnectShyftCanonicalEvent({
      tenantId: 'tenant-connectshyft-f2',
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: 'thread-f2-unclaimed-1001',
      aggregateType: 'Thread',
      eventType: 'CallConnected',
      payload: {
        direction: 'inbound',
        channel: 'voice',
        providerLegId: 'provider-leg-hidden',
      },
      occurredAtUtc: '2026-02-28T09:00:02.000Z',
    });

    const listed = await listConnectShyftCanonicalEvents({
      tenantId: 'tenant-connectshyft-f2',
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: 'thread-f2-unclaimed-1001',
      aggregateType: 'Thread',
      limit: 10,
    });

    expect(listed).toHaveLength(2);
    expect(listed[0].eventType).toBe('MessageQueued');
    expect(listed[1].eventType).toBe('CallConnected');
    expect(listed[1].payload).toEqual({
      direction: 'inbound',
      channel: 'voice',
    });

    const filtered = await listConnectShyftCanonicalEvents({
      tenantId: 'tenant-connectshyft-f2',
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: 'thread-f2-unclaimed-1001',
      aggregateType: 'Thread',
      eventType: 'CallConnected',
      limit: 10,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].eventType).toBe('CallConnected');
  });

  it('does not swallow canonical DB persistence failures', async () => {
    executePlatformMutationSpy.mockRejectedValueOnce(new Error('platform-events-write-failed'));

    await expect(recordConnectShyftCanonicalEvent({
      tenantId: '00000000-0000-4000-8000-000000000101',
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: '00000000-0000-4000-8000-000000000201',
      aggregateType: 'Thread',
      eventType: 'MessageQueued',
      payload: { direction: 'outbound', channel: 'sms' },
      db: {} as any,
    })).rejects.toThrow('platform-events-write-failed');

    const fallbackListed = await listConnectShyftCanonicalEvents({
      tenantId: '00000000-0000-4000-8000-000000000101',
      limit: 10,
    });
    expect(fallbackListed).toEqual([]);
  });

  it('caps in-memory fallback records to avoid unbounded growth', async () => {
    const baseUtcMs = Date.parse('2026-02-28T09:00:00.000Z');
    for (let index = 0; index <= 1000; index += 1) {
      await recordConnectShyftCanonicalEvent({
        tenantId: 'tenant-connectshyft-f2',
        orgUnitId: 'org-connectshyft-f2-east',
        aggregateId: 'thread-f2-unclaimed-1001',
        aggregateType: 'Thread',
        eventType: 'MessageQueued',
        payload: { sequence: index },
        occurredAtUtc: new Date(baseUtcMs + (index * 1000)).toISOString(),
      });
    }

    const earliestRetained = await listConnectShyftCanonicalEvents({
      tenantId: 'tenant-connectshyft-f2',
      aggregateId: 'thread-f2-unclaimed-1001',
      eventType: 'MessageQueued',
      limit: 1,
    });

    expect(earliestRetained).toHaveLength(1);
    expect(earliestRetained[0].payload).toMatchObject({
      sequence: 1,
    });
  });
});
