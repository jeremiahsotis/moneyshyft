import {
  CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
  buildConnectShyftInboundSmsCanonicalPayload,
  extractConnectShyftInboundSmsNeighborId,
  mapConnectShyftInboundSmsWebhookToDomainEvent,
} from '../inboundSms';

describe('connectshyft inbound sms domain mapping', () => {
  it('maps provider payload fields into a canonical inbound sms domain event', () => {
    const event = mapConnectShyftInboundSmsWebhookToDomainEvent({
      webhookBody: {
        providerPayload: {
          from: '+12605550162',
          to: '+12605550161',
          text: 'Need help with delivery window',
        },
      },
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-001',
      providerMessageId: 'provider-message-001',
      providerLegId: null,
    });

    expect(event).toMatchObject({
      eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      routingDecision: 'accepted',
      deterministicOrdering: true,
      canonicalEventType: 'MessageDelivered',
      inboundMessageArtifact: {
        channel: 'sms',
        direction: 'inbound',
        providerEventId: 'provider-event-001',
        providerMessageId: 'provider-message-001',
        providerLegId: null,
        body: 'Need help with delivery window',
        from: '+12605550162',
        to: '+12605550161',
      },
    });
  });

  it('resolves neighbor id from webhook envelope aliases', () => {
    expect(extractConnectShyftInboundSmsNeighborId({
      neighborId: 'neighbor-connectshyft-e2-inbound-1002',
    })).toBe('neighbor-connectshyft-e2-inbound-1002');

    expect(extractConnectShyftInboundSmsNeighborId({
      providerPayload: {
        neighbor_id: 'neighbor-connectshyft-e2-duplicate-1003',
      },
    })).toBe('neighbor-connectshyft-e2-duplicate-1003');
  });

  it('builds canonical payload with explicit sms append event naming for deterministic timeline reads', () => {
    const domainEvent = mapConnectShyftInboundSmsWebhookToDomainEvent({
      webhookBody: {
        data: {
          payload: {
            message: 'status update',
            sender: '+13175550100',
            recipient: '+13175550101',
          },
        },
      },
      canonicalEventType: '',
      providerEventId: 'provider-event-002',
      providerMessageId: null,
      providerLegId: 'provider-leg-002',
    });

    const payload = buildConnectShyftInboundSmsCanonicalPayload({
      domainEvent,
      threadState: 'UNCLAIMED',
    });

    expect(payload).toMatchObject({
      direction: 'inbound',
      channel: 'sms',
      eventType: 'MessageDelivered',
      eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      routingDecision: 'accepted',
      deterministicOrdering: true,
      threadState: 'UNCLAIMED',
      autoClaimApplied: false,
      inboundMessageArtifact: {
        body: 'status update',
        from: '+13175550100',
        to: '+13175550101',
      },
    });
  });
});
