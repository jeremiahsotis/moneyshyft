import {
  beginConnectShyftWebhookReceiptProcessing,
  cleanupConnectShyftWebhookReceipts,
  loadConnectShyftWebhookReceiptMetrics,
  markConnectShyftWebhookReceiptProcessingResult,
  recordConnectShyftBridgeLegProviderIdentifierMapping,
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

  it('records provider call-leg mappings against persisted bridge-leg ids', async () => {
    const mapping = await recordConnectShyftBridgeLegProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      providerIdentifier: 'telnyx-leg-bridge-f3-1001',
      bridgeLegId: 'bridge-leg-neighbor-f3-1001',
    });

    expect(mapping).toMatchObject({
      status: 'created',
      mapping: {
        providerName: 'telnyx',
        identifierKind: 'call_leg',
        providerIdentifier: 'telnyx-leg-bridge-f3-1001',
        internalReferenceId: 'bridge-leg-neighbor-f3-1001',
      },
    });

    const resolved = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerLegId: 'telnyx-leg-bridge-f3-1001',
    });

    expect(resolved).toMatchObject({
      ok: true,
      source: 'provider_leg_id',
      correlation: {
        internalCallReferenceId: 'bridge-leg-neighbor-f3-1001',
      },
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

  it('scopes webhook replay identity by canonical event type for the same provider sid', async () => {
    const firstMessage = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-shared-by-type',
      providerMessageId: 'telnyx-msg-f3-shared-by-type',
    });

    const firstVoice = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'CallConnected',
      providerEventId: 'provider-event-f3-shared-by-type',
      providerLegId: 'telnyx-leg-f3-shared-by-type',
    });

    const duplicateMessage = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-shared-by-type',
      providerMessageId: 'telnyx-msg-f3-shared-by-type',
    });

    expect(firstMessage.duplicate).toBe(false);
    expect(firstVoice.duplicate).toBe(false);
    expect(duplicateMessage.duplicate).toBe(true);
  });

  it('keeps duplicate suppression deterministic under concurrent duplicate bursts', async () => {
    const start = Date.now();
    const burst = await Promise.all(
      Array.from({ length: 32 }).map(() =>
        recordConnectShyftWebhookReceipt({
          tenantId: 'tenant-connectshyft-f3',
          orgUnitId: 'org-connectshyft-f3-east',
          threadId: 'thread-f3-unclaimed-1001',
          providerName: 'telnyx',
          canonicalEventType: 'MessageDelivered',
          providerEventId: 'provider-event-f3-concurrent-burst',
          providerMessageId: 'telnyx-msg-f3-concurrent-burst',
        }),
      ),
    );
    const elapsedMs = Date.now() - start;

    const firstSeenCount = burst.filter((result) => result.duplicate === false).length;
    const duplicateCount = burst.filter((result) => result.duplicate === true).length;
    expect(firstSeenCount).toBe(1);
    expect(duplicateCount).toBe(31);
    expect(elapsedMs).toBeLessThan(1000);
  });

  it('allows retry attempts for non-applied webhook receipts and only suppresses after applied', async () => {
    const first = await beginConnectShyftWebhookReceiptProcessing({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'VoiceTranscriptionCompleted',
      providerEventId: 'provider-event-f3-transcription-1001',
      providerLegId: 'telnyx-leg-f3-1001',
    });

    expect(first).toMatchObject({
      deterministic: true,
      alreadyApplied: false,
      dedupeKey: 'provider-event:provider-event-f3-transcription-1001',
      status: 'RECEIVED',
      attemptCount: 1,
    });

    const markedRetryableFailure = await markConnectShyftWebhookReceiptProcessingResult({
      tenantId: 'tenant-connectshyft-f3',
      providerName: 'telnyx',
      dedupeKey: first.dedupeKey,
      status: 'FAILED_RETRYABLE',
      failureReason: 'canonical_event_persistence_error',
    });
    expect(markedRetryableFailure.updated).toBe(true);

    const second = await beginConnectShyftWebhookReceiptProcessing({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'VoiceTranscriptionCompleted',
      providerEventId: 'provider-event-f3-transcription-1001',
      providerLegId: 'telnyx-leg-f3-1001',
    });

    expect(second).toMatchObject({
      deterministic: true,
      alreadyApplied: false,
      dedupeKey: 'provider-event:provider-event-f3-transcription-1001',
      status: 'RECEIVED',
      attemptCount: 2,
    });

    const markedApplied = await markConnectShyftWebhookReceiptProcessingResult({
      tenantId: 'tenant-connectshyft-f3',
      providerName: 'telnyx',
      dedupeKey: first.dedupeKey,
      status: 'APPLIED',
    });
    expect(markedApplied.updated).toBe(true);

    const duplicateAfterApplied = await beginConnectShyftWebhookReceiptProcessing({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'VoiceTranscriptionCompleted',
      providerEventId: 'provider-event-f3-transcription-1001',
      providerLegId: 'telnyx-leg-f3-1001',
    });

    expect(duplicateAfterApplied).toMatchObject({
      deterministic: true,
      alreadyApplied: true,
      dedupeKey: 'provider-event:provider-event-f3-transcription-1001',
      status: 'APPLIED',
      attemptCount: 3,
    });
  });

  it('allows duplicate provider identifiers across tenants and marks tenant-unspecified lookup as ambiguous', async () => {
    await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3-a',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-shared',
      internalReferenceId: 'canonical-call-f3-tenant-a',
    });

    const otherTenantRecord = await recordConnectShyftProviderIdentifierMapping({
      tenantId: 'tenant-connectshyft-f3-b',
      orgUnitId: 'org-connectshyft-f3-west',
      threadId: 'thread-f3-claimed-1002',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-shared',
      internalReferenceId: 'canonical-call-f3-tenant-b',
    });

    expect(otherTenantRecord.status).toBe('created');

    const ambiguousLookup = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerLegId: 'telnyx-leg-f3-shared',
    });

    expect(ambiguousLookup).toEqual({
      ok: false,
      reason: 'ambiguous',
    });

    const tenantScopedLookup = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: 'telnyx',
      providerLegId: 'telnyx-leg-f3-shared',
      tenantId: 'tenant-connectshyft-f3-a',
    });

    expect(tenantScopedLookup).toMatchObject({
      ok: true,
      source: 'provider_leg_id',
      correlation: {
        tenantId: 'tenant-connectshyft-f3-a',
        threadId: 'thread-f3-unclaimed-1001',
      },
    });
  });

  it('does not suppress duplicate receipts across tenants for the same provider event key', async () => {
    const tenantAFirst = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3-a',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-shared-2001',
      providerMessageId: 'telnyx-msg-f3-shared-2001',
    });
    expect(tenantAFirst.duplicate).toBe(false);

    const tenantBFirst = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3-b',
      orgUnitId: 'org-connectshyft-f3-west',
      threadId: 'thread-f3-unclaimed-9001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-shared-2001',
      providerMessageId: 'telnyx-msg-f3-shared-2001',
    });
    expect(tenantBFirst.duplicate).toBe(false);

    const tenantASecond = await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3-a',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-shared-2001',
      providerMessageId: 'telnyx-msg-f3-shared-2001',
    });
    expect(tenantASecond.duplicate).toBe(true);
  });

  it('returns explicit persistence errors on db-backed mapping or receipt writes instead of silent in-memory fallback', async () => {
    const failingDbChain: any = {
      insert: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      ignore: jest.fn().mockReturnThis(),
      returning: jest.fn(async () => {
        throw new Error('db-unavailable');
      }),
    };

    const failingDb: any = {
      withSchema: jest.fn(() => ({
        table: jest.fn(() => failingDbChain),
      })),
    };

    const mappingResult = await recordConnectShyftProviderIdentifierMapping({
      tenantId: '11111111-1111-4111-8111-111111111111',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: '22222222-2222-4222-8222-222222222222',
      providerName: 'telnyx',
      identifierKind: 'call_leg',
      providerIdentifier: 'telnyx-leg-f3-db-failure',
      internalReferenceId: 'canonical-call-f3-db-failure',
      db: failingDb,
    });

    expect(mappingResult.status).toBe('error');
    expect(mappingResult.errorCode).toBe('CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE');

    const receiptResult = await recordConnectShyftWebhookReceipt({
      tenantId: '11111111-1111-4111-8111-111111111111',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: '22222222-2222-4222-8222-222222222222',
      providerName: 'telnyx',
      canonicalEventType: 'CallConnected',
      providerEventId: 'provider-event-f3-db-failure',
      providerLegId: 'telnyx-leg-f3-db-failure',
      db: failingDb,
    });

    expect(receiptResult).toMatchObject({
      deterministic: true,
      duplicate: false,
      dedupeKey: 'provider-event:provider-event-f3-db-failure',
      error: {
        code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
      },
    });
  });

  it('applies retention cleanup and reports receipt metrics for bounded replay windows', async () => {
    await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-retention-1',
      providerMessageId: 'telnyx-msg-f3-retention-1',
    });
    await recordConnectShyftWebhookReceipt({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      threadId: 'thread-f3-unclaimed-1001',
      providerName: 'telnyx',
      canonicalEventType: 'MessageDelivered',
      providerEventId: 'provider-event-f3-retention-2',
      providerMessageId: 'telnyx-msg-f3-retention-2',
    });

    const asOfUtc = '2100-01-10T00:00:00.000Z';
    const before = await loadConnectShyftWebhookReceiptMetrics({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      retentionWindowDays: 1,
      asOfUtc,
    });
    expect(before.totalRows).toBe(2);
    expect(before.expiredRowsCandidate).toBe(2);

    const dryRun = await cleanupConnectShyftWebhookReceipts({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      policyWindowDays: 1,
      dryRun: true,
      asOfUtc,
    });
    expect(dryRun.expiredRowsRemoved).toBe(2);
    expect(dryRun.totalRowsBefore).toBe(2);
    expect(dryRun.totalRowsAfter).toBe(2);

    const applied = await cleanupConnectShyftWebhookReceipts({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      policyWindowDays: 1,
      dryRun: false,
      asOfUtc,
    });
    expect(applied.expiredRowsRemoved).toBe(2);
    expect(applied.totalRowsBefore).toBe(2);
    expect(applied.totalRowsAfter).toBe(0);

    const after = await loadConnectShyftWebhookReceiptMetrics({
      tenantId: 'tenant-connectshyft-f3',
      orgUnitId: 'org-connectshyft-f3-east',
      retentionWindowDays: 1,
      asOfUtc,
    });
    expect(after.totalRows).toBe(0);
    expect(after.oldestRetainedAt).toBe(asOfUtc);
  });
});
