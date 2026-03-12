import {
  IdempotencyFailureSnapshot,
  IdempotencyOperationName,
  IdempotencyRecord,
  IdempotencyRecordStatus,
} from './idempotencyTypes'

export type IdempotencyRepository = {
  findByScope(input: {
    tenantId: string
    idempotencyKey: string
    operationName: IdempotencyOperationName
  }): Promise<IdempotencyRecord | null>
  create(record: IdempotencyRecord): Promise<void>
  update(record: IdempotencyRecord): Promise<void>
}

export type BeginIdempotencyOperationInput = {
  tenantId: string
  idempotencyKey: string
  operationName: IdempotencyOperationName
  actorId?: string | null
  actorScopeKey?: string | null
  requestFingerprint: string
  requestSummary?: string | null
  expiresAt: Date
}

export type CompleteIdempotencyOperationInput = {
  record: IdempotencyRecord
  status: Extract<IdempotencyRecordStatus, 'succeeded' | 'failed'>
  responseSnapshot?: string | null
  resourceType?: string | null
  resourceId?: string | null
  failureSnapshot?: IdempotencyFailureSnapshot | null
  failureMessage?: string | null
  retryEligibleAt?: Date | null
}

export function buildIdempotencyService(repository: IdempotencyRepository) {
  return {
    async beginOperation(input: BeginIdempotencyOperationInput) {
      const existing = await repository.findByScope(input)
      if (!existing) {
        const now = new Date()
        const record: IdempotencyRecord = {
          id: crypto.randomUUID(),
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
          operationName: input.operationName,
          actorId: input.actorId ?? null,
          actorScopeKey: input.actorScopeKey ?? null,
          requestFingerprint: input.requestFingerprint,
          requestSummary: input.requestSummary ?? null,
          status: 'in_progress',
          attemptCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          expiresAt: input.expiresAt,
        }
        await repository.create(record)
        return { decision: 'proceed', record }
      }
      if (existing.requestFingerprint !== input.requestFingerprint) {
        return { decision: 'conflict', record: existing }
      }
      if (existing.status === 'in_progress') {
        return { decision: 'in_progress', record: existing }
      }
      return { decision: 'return_existing', record: existing }
    },
    async completeOperation(input: CompleteIdempotencyOperationInput) {
      const now = new Date()
      const updated: IdempotencyRecord = {
        ...input.record,
        status: input.status,
        responseSnapshot: input.responseSnapshot ?? input.record.responseSnapshot ?? null,
        resourceType: input.resourceType ?? input.record.resourceType ?? null,
        resourceId: input.resourceId ?? input.record.resourceId ?? null,
        failureSnapshot: input.failureSnapshot ?? null,
        failureMessage: input.failureMessage ?? null,
        completedAt: now,
        retryEligibleAt: input.retryEligibleAt ?? null,
        lastSeenAt: now,
      }
      await repository.update(updated)
      return updated
    },
  }
}
