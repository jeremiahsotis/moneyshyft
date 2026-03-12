import { dedupeWebhookEvent } from '../eventDeduper'

describe('communication webhook event deduper', () => {
  it('reprocesses retryable failures but suppresses processed and terminal duplicates', async () => {
    const findDuplicate = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'receipt-1',
        tenantId: 'tenant-1',
        providerName: 'telnyx',
        eventType: 'CallConnected',
        providerEventId: 'event-1',
        payloadHash: 'hash-1',
        processingStatus: 'failed_retryable',
        attemptCount: 2,
      })
      .mockResolvedValueOnce({
        id: 'receipt-2',
        tenantId: 'tenant-1',
        providerName: 'telnyx',
        eventType: 'CallConnected',
        providerEventId: 'event-1',
        payloadHash: 'hash-1',
        processingStatus: 'processed',
        attemptCount: 1,
      })

    const retryable = await dedupeWebhookEvent(
      { findDuplicate },
      {
        tenantId: 'tenant-1',
        providerName: 'telnyx',
        providerEventId: 'event-1',
        payloadHash: 'hash-1',
      },
    )

    const processed = await dedupeWebhookEvent(
      { findDuplicate },
      {
        tenantId: 'tenant-1',
        providerName: 'telnyx',
        providerEventId: 'event-1',
        payloadHash: 'hash-1',
      },
    )

    expect(retryable.decision).toBe('reprocess')
    expect(processed.decision).toBe('ignore_duplicate')
  })
})
