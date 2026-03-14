import { buildRecordCommunicationAudit } from '../recordCommunicationAudit'

describe('communication audit recorder', () => {
  it('appends immutable audit entries with generated ids and timestamps', async () => {
    const appended: Array<Record<string, unknown>> = []
    const recordAudit = buildRecordCommunicationAudit({
      async append(entry) {
        appended.push(entry)
      },
    })

    const entry = await recordAudit({
      tenantId: 'tenant-1',
      correlationId: 'corr-1',
      actorType: 'system',
      operationName: 'send_sms',
      targetEntityType: 'message_dispatch',
      targetEntityId: 'message-1',
      channel: 'sms',
      resultState: 'succeeded',
      resultCode: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      requestFingerprint: 'fingerprint-1',
      metadataJson: '{"ok":true}',
    })

    expect(entry.id).toBeTruthy()
    expect(entry.createdAt).toBeInstanceOf(Date)
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      tenantId: 'tenant-1',
      correlationId: 'corr-1',
      resultState: 'succeeded',
      requestFingerprint: 'fingerprint-1',
    })
  })
})
