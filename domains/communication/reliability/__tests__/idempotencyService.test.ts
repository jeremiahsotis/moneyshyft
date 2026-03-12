import { buildIdempotencyService } from '../idempotencyService'
import type { IdempotencyRecord } from '../idempotencyTypes'

describe('communication idempotency service', () => {
  const records = new Map<string, IdempotencyRecord>()

  const repository = {
    async findByScope(input: {
      tenantId: string
      idempotencyKey: string
      operationName: string
    }) {
      return records.get(`${input.tenantId}|${input.operationName}|${input.idempotencyKey}`) ?? null
    },
    async create(record: IdempotencyRecord) {
      records.set(`${record.tenantId}|${record.operationName}|${record.idempotencyKey}`, record)
    },
    async update(record: IdempotencyRecord) {
      records.set(`${record.tenantId}|${record.operationName}|${record.idempotencyKey}`, record)
    },
  }

  beforeEach(() => {
    records.clear()
  })

  it('proceeds once and replays the completed record for an identical fingerprint', async () => {
    const service = buildIdempotencyService(repository)
    const begun = await service.beginOperation({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-1',
      operationName: 'send_sms',
      actorId: 'user-1',
      actorScopeKey: '{"actorUserId":"user-1"}',
      requestFingerprint: 'fingerprint-1',
      expiresAt: new Date('2026-03-13T00:00:00.000Z'),
    })

    expect(begun.decision).toBe('proceed')

    const completed = await service.completeOperation({
      record: begun.record,
      status: 'succeeded',
      responseSnapshot: '{"httpStatus":200,"body":{"ok":true}}',
      resourceType: 'message_dispatch',
      resourceId: 'message-1',
    })

    const replay = await service.beginOperation({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-1',
      operationName: 'send_sms',
      actorId: 'user-1',
      actorScopeKey: '{"actorUserId":"user-1"}',
      requestFingerprint: 'fingerprint-1',
      expiresAt: new Date('2026-03-13T00:00:00.000Z'),
    })

    expect(completed.status).toBe('succeeded')
    expect(replay.decision).toBe('return_existing')
    expect(replay.record.responseSnapshot).toBe('{"httpStatus":200,"body":{"ok":true}}')
  })

  it('rejects conflicting reuse and reports in-progress duplicates before completion', async () => {
    const service = buildIdempotencyService(repository)
    const begun = await service.beginOperation({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-2',
      operationName: 'start_bridge_session',
      requestFingerprint: 'fingerprint-a',
      expiresAt: new Date('2026-03-13T00:00:00.000Z'),
    })

    const inProgress = await service.beginOperation({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-2',
      operationName: 'start_bridge_session',
      requestFingerprint: 'fingerprint-a',
      expiresAt: new Date('2026-03-13T00:00:00.000Z'),
    })

    const conflict = await service.beginOperation({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-2',
      operationName: 'start_bridge_session',
      requestFingerprint: 'fingerprint-b',
      expiresAt: new Date('2026-03-13T00:00:00.000Z'),
    })

    expect(begun.decision).toBe('proceed')
    expect(inProgress.decision).toBe('in_progress')
    expect(conflict.decision).toBe('conflict')
  })
})
