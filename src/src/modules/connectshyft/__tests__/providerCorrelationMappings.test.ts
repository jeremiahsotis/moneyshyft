import {
  recordConnectShyftWebhookReceipt,
  recordConnectShyftProviderIdentifierMapping,
  resetConnectShyftProviderCorrelationStateForTests,
  resolveConnectShyftProviderCorrelationByIdentifiers,
} from '../providerCorrelationMappings';

describe('connectshyft provider correlation mappings', () => {
  beforeEach(() => {
    resetConnectShyftProviderCorrelationStateForTests();
  });

  it('records provider call/message mappings with provider-scoped uniqueness', async () => {
    const callRecord = await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-1001',
      internalReferenceId: 'canonical-call-f3-1001',
    });

    expect(callRecord.status).toBe('created');
    expect(callRecord.mapping).toMatchObject({
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-1001',
      threadId: 'thread-f3-unclaimed-1001',
      internalReferenceId: 'canonical-call-f3-1001',
    });

    const duplicateCallRecord = await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-1001',
      internalReferenceId: 'canonical-call-f3-duplicate',
    });

    expect(duplicateCallRecord.status).toBe('duplicate');
    expect(duplicateCallRecord.mapping?.internalReferenceId).toBe('canonical-call-f3-1001');

    const messageRecord = await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'message',
      providerIdentifier: 'telnyx-msg-f3-1001',
      internalReferenceId: 'canonical-message-f3-1001',
    });

    expect(messageRecord.status).toBe('created');
    expect(messageRecord.mapping).toMatchObject({
      providerName: 'telnyx',
      identifierKind: 'message',
      providerIdentifier: 'telnyx-msg-f3-1001',
      threadId: 'thread-f3-unclaimed-1001',
      internalReferenceId: 'canonical-message-f3-1001',
    });
  });

  it('resolves metadata fallback via provider leg/message identifiers', async () => {
    await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-1001',
      internalReferenceId: 'canonical-call-f3-1001',
    });

    const resolvedByCallLeg = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerLegId: 'telnyx-leg-f3-1001',
    });

    expect(resolvedByCallLeg).toMatchObject({
      ok: true,
      source: 'provider_leg_id',
      correlation: {
        tenantId: 'tenant-connectshyft-f3',
        orgUnitId: 'org-connectshyft-f3-east',
        threadId: 'thread-f3-unclaimed-1001',
      },
    });

    await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'message',
      providerIdentifier: 'telnyx-msg-f3-1001',
      internalReferenceId: 'canonical-message-f3-1001',
    });

    const resolvedByMessage = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerMessageId: 'telnyx-msg-f3-1001',
    });

    expect(resolvedByMessage).toMatchObject({
      ok: true,
      source: 'provider_message_id',
      correlation: {
        tenantId: 'tenant-connectshyft-f3',
        orgUnitId: 'org-connectshyft-f3-east',
        threadId: 'thread-f3-unclaimed-1001',
      },
    });
  });

  it('returns deterministic ambiguous result when both identifiers map to different internal records', async () => {
    await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-1001',
      internalReferenceId: 'canonical-call-f3-1001',
    });

    await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-claimed-1002',
      providerName: 'telnyx',
      identifierKind: 'message',
      providerIdentifier: 'telnyx-msg-f3-1002',
      internalReferenceId: 'canonical-message-f3-1002',
    });

    const resolution = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerLegId: 'telnyx-leg-f3-1001',
      providerMessageId: 'telnyx-msg-f3-1002',
    });

    expect(resolution).toEqual({
      ok: false,
      reason: 'ambiguous',
    });
  });

  it('returns deterministic refusal reasons when fallback cannot resolve', async () => {
    const missingIdentifiers = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
    });
    expect(missingIdentifiers).toEqual({
      ok: false,
      reason: 'missing-identifiers',
    });

    const notFound = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerLegId: 'telnyx-leg-f3-unknown',
    });
    expect(notFound).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('suppresses duplicate webhook receipts using provider-scoped deterministic dedupe keys', async () => {
    const first = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'CallConnected',
      providerEventId: 'provider-event-f3-1001',
      providerLegId: 'telnyx-leg-f3-1001',
    });

    expect(first).toEqual({
      deterministic: true,
      duplicate: false,
      dedupeKey: 'provider-event:provider-event-f3-1001',
    });

    const duplicate = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'CallConnected',
      providerEventId: 'provider-event-f3-1001',
      providerLegId: 'telnyx-leg-f3-1001',
    });

    expect(duplicate).toEqual({
      deterministic: true,
      duplicate: true,
      dedupeKey: 'provider-event:provider-event-f3-1001',
    });
  });
});
