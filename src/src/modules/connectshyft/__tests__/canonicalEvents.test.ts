import {
  listConnectShyftCanonicalEvents,
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
  sanitizeConnectShyftCanonicalPayload,
} from '../canonicalEvents';

describe('connectshyft canonical event store', () => {
  beforeEach(() => {
    resetConnectShyftCanonicalEventsForTests();
  });

  it('sanitizes provider-specific payload fields recursively', () => {
    const payload = sanitizeConnectShyftCanonicalPayload({
      threadState: 'UNCLAIMED',
      providerPayload: {
        telnyxCallControlId: 'telnyx-123',
      },
      nested: {
        twilioCallSid: 'twilio-123',
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
        telnyxCallControlId: 'telnyx-hidden',
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
});
