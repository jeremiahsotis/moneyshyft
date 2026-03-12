import { randomUUID } from 'node:crypto'
import type { Knex } from 'knex'
import db from '../../config/knex'
import {
  buildIdempotencyService,
  type IdempotencyFailureSnapshot,
  type IdempotencyOperationName,
  type IdempotencyRecord,
  type IdempotencyRepository,
} from '../../../../../domains/communication'

const CONNECTSHYFT_SCHEMA = 'connectshyft'
const IDEMPOTENCY_TABLE = 'cs_communication_idempotency_records'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ConnectShyftIdempotencyResponseSnapshot = {
  httpStatus: number
  body: unknown
}

type DbIdempotencyRow = {
  id: string
  tenant_id: string
  idempotency_key: string
  operation_name: string
  actor_id?: string | null
  actor_scope_key?: string | null
  request_fingerprint: string
  request_summary?: string | null
  resource_type?: string | null
  resource_id?: string | null
  status: string
  response_snapshot_json?: unknown
  failure_classification_json?: unknown
  failure_message?: string | null
  attempt_count?: unknown
  first_seen_at_utc: string | Date
  last_seen_at_utc: string | Date
  completed_at_utc?: string | Date | null
  retry_eligible_at_utc?: string | Date | null
  expires_at_utc: string | Date
}

const inMemoryIdempotencyRecords = new Map<string, IdempotencyRecord>()

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  const normalized = normalizeString(value)
  if (!normalized) {
    return null
  }
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

const parseJsonValue = <T>(value: unknown): T | null => {
  if (value == null) {
    return null
  }
  if (typeof value === 'object') {
    return value as T
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return null
}

const parseAttemptCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }
  const normalized = normalizeString(value)
  if (!normalized) {
    return 1
  }
  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1
}

const buildInMemoryKey = (tenantId: string, idempotencyKey: string, operationName: IdempotencyOperationName): string =>
  `${tenantId}|${operationName}|${idempotencyKey}`

const shouldUseDb = (tenantId: string, connection?: Knex): boolean =>
  Boolean(connection && UUID_PATTERN.test(normalizeString(tenantId)))

const mapRow = (row: DbIdempotencyRow | undefined | null): IdempotencyRecord | null => {
  if (!row) {
    return null
  }

  return {
    id: normalizeString(row.id),
    tenantId: normalizeString(row.tenant_id),
    idempotencyKey: normalizeString(row.idempotency_key),
    operationName: normalizeString(row.operation_name) as IdempotencyOperationName,
    actorId: normalizeString(row.actor_id) || null,
    actorScopeKey: normalizeString(row.actor_scope_key) || null,
    requestFingerprint: normalizeString(row.request_fingerprint),
    requestSummary: normalizeString(row.request_summary) || null,
    resourceType: normalizeString(row.resource_type) || null,
    resourceId: normalizeString(row.resource_id) || null,
    status: normalizeString(row.status) as IdempotencyRecord['status'],
    responseSnapshot: typeof row.response_snapshot_json === 'string'
      ? row.response_snapshot_json
      : row.response_snapshot_json == null
        ? null
        : JSON.stringify(row.response_snapshot_json),
    failureSnapshot: parseJsonValue<IdempotencyFailureSnapshot>(row.failure_classification_json),
    failureMessage: normalizeString(row.failure_message) || null,
    attemptCount: parseAttemptCount(row.attempt_count),
    firstSeenAt: toDate(row.first_seen_at_utc) || new Date(),
    lastSeenAt: toDate(row.last_seen_at_utc) || new Date(),
    completedAt: toDate(row.completed_at_utc),
    retryEligibleAt: toDate(row.retry_eligible_at_utc),
    expiresAt: toDate(row.expires_at_utc) || new Date(),
  }
}

const toRow = (record: IdempotencyRecord) => ({
  id: record.id,
  tenant_id: record.tenantId,
  idempotency_key: record.idempotencyKey,
  operation_name: record.operationName,
  actor_id: record.actorId ?? null,
  actor_scope_key: record.actorScopeKey ?? null,
  request_fingerprint: record.requestFingerprint,
  request_summary: record.requestSummary ?? null,
  resource_type: record.resourceType ?? null,
  resource_id: record.resourceId ?? null,
  status: record.status,
  response_snapshot_json: record.responseSnapshot ? JSON.parse(record.responseSnapshot) : null,
  failure_classification_json: record.failureSnapshot ?? null,
  failure_message: record.failureMessage ?? null,
  attempt_count: record.attemptCount,
  first_seen_at_utc: record.firstSeenAt.toISOString(),
  last_seen_at_utc: record.lastSeenAt.toISOString(),
  completed_at_utc: record.completedAt ? record.completedAt.toISOString() : null,
  retry_eligible_at_utc: record.retryEligibleAt ? record.retryEligibleAt.toISOString() : null,
  expires_at_utc: record.expiresAt.toISOString(),
})

const buildRepository = (tenantId: string, connection?: Knex): IdempotencyRepository => {
  if (!shouldUseDb(tenantId, connection)) {
    return {
      async findByScope(input) {
        return inMemoryIdempotencyRecords.get(
          buildInMemoryKey(input.tenantId, input.idempotencyKey, input.operationName),
        ) ?? null
      },
      async create(record) {
        inMemoryIdempotencyRecords.set(
          buildInMemoryKey(record.tenantId, record.idempotencyKey, record.operationName),
          record,
        )
      },
      async update(record) {
        inMemoryIdempotencyRecords.set(
          buildInMemoryKey(record.tenantId, record.idempotencyKey, record.operationName),
          record,
        )
      },
    }
  }

  const knex = connection as Knex
  return {
    async findByScope(input) {
      const row = await knex
        .withSchema(CONNECTSHYFT_SCHEMA)
        .table(IDEMPOTENCY_TABLE)
        .where({
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
          operation_name: input.operationName,
        })
        .first()

      return mapRow(row as DbIdempotencyRow | undefined)
    },
    async create(record) {
      await knex.withSchema(CONNECTSHYFT_SCHEMA).table(IDEMPOTENCY_TABLE).insert(toRow(record))
    },
    async update(record) {
      await knex
        .withSchema(CONNECTSHYFT_SCHEMA)
        .table(IDEMPOTENCY_TABLE)
        .where({ id: record.id })
        .update(toRow(record))
    },
  }
}

export const loadConnectShyftCommunicationDb = (): Knex => db

export const beginConnectShyftCommunicationIdempotency = async (input: {
  tenantId: string
  idempotencyKey: string
  operationName: IdempotencyOperationName
  actorId?: string | null
  actorScopeKey?: string | null
  requestFingerprint: string
  requestSummary?: string | null
  expiresAt: Date
  db?: Knex
}) => {
  const repository = buildRepository(input.tenantId, input.db)
  const service = buildIdempotencyService(repository)

  try {
    return await service.beginOperation(input)
  } catch (error) {
    if (
      shouldUseDb(input.tenantId, input.db)
      && error
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: string }).code === '23505'
    ) {
      return service.beginOperation(input)
    }
    throw error
  }
}

export const completeConnectShyftCommunicationIdempotency = async (input: {
  record: IdempotencyRecord
  status: 'succeeded' | 'failed'
  responseSnapshot?: ConnectShyftIdempotencyResponseSnapshot | null
  resourceType?: string | null
  resourceId?: string | null
  failureSnapshot?: IdempotencyFailureSnapshot | null
  failureMessage?: string | null
  retryEligibleAt?: Date | null
  db?: Knex
}) => {
  const repository = buildRepository(input.record.tenantId, input.db)
  const service = buildIdempotencyService(repository)

  return service.completeOperation({
    record: input.record,
    status: input.status,
    responseSnapshot: input.responseSnapshot ? JSON.stringify(input.responseSnapshot) : null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    failureSnapshot: input.failureSnapshot ?? null,
    failureMessage: input.failureMessage ?? null,
    retryEligibleAt: input.retryEligibleAt ?? null,
  })
}

export const parseConnectShyftIdempotencyResponseSnapshot = (
  snapshot: string | null | undefined,
): ConnectShyftIdempotencyResponseSnapshot | null => parseJsonValue<ConnectShyftIdempotencyResponseSnapshot>(snapshot)

export const resetConnectShyftCommunicationReliabilityStateForTests = (): void => {
  inMemoryIdempotencyRecords.clear()
}

export const buildConnectShyftCommunicationCorrelationId = (): string => randomUUID()
