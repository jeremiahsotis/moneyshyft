import type { Knex } from 'knex'
import db from '../../config/knex'
import {
  buildRecordCommunicationAudit,
  type CommunicationAuditEntry,
  type CommunicationAuditRepository,
} from '../../../../../domains/communication'

const CONNECTSHYFT_SCHEMA = 'connectshyft'
const AUDIT_TABLE = 'cs_communication_audit_log'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const inMemoryAuditEntries: CommunicationAuditEntry[] = []

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const shouldUseDb = (tenantId: string, connection?: Knex): boolean =>
  Boolean(connection && UUID_PATTERN.test(normalizeString(tenantId)))

const buildRepository = (tenantId: string, connection?: Knex): CommunicationAuditRepository => {
  if (!shouldUseDb(tenantId, connection)) {
    return {
      async append(entry) {
        inMemoryAuditEntries.push(entry)
      },
    }
  }

  const knex = connection as Knex
  return {
    async append(entry) {
      await knex
        .withSchema(CONNECTSHYFT_SCHEMA)
        .table(AUDIT_TABLE)
        .insert({
          id: entry.id,
          tenant_id: entry.tenantId,
          correlation_id: entry.correlationId,
          actor_type: entry.actorType,
          actor_id: entry.actorId ?? null,
          operation_name: entry.operationName,
          target_entity_type: entry.targetEntityType,
          target_entity_id: entry.targetEntityId ?? null,
          channel: entry.channel,
          result_state: entry.resultState,
          result_code: entry.resultCode ?? null,
          result_message: entry.resultMessage ?? null,
          idempotency_key: entry.idempotencyKey ?? null,
          request_fingerprint: entry.requestFingerprint ?? null,
          provider_name: entry.providerName ?? null,
          provider_reference_id: entry.providerReferenceId ?? null,
          metadata_json: entry.metadataJson ? JSON.parse(entry.metadataJson) : null,
          created_at_utc: entry.createdAt.toISOString(),
        })
    },
  }
}

export const appendConnectShyftCommunicationAuditEntry = async (
  input: Omit<CommunicationAuditEntry, 'id' | 'createdAt'> & { db?: Knex },
) => {
  const repository = buildRepository(input.tenantId, input.db)
  const recordAudit = buildRecordCommunicationAudit(repository)
  return recordAudit(input)
}

export const listConnectShyftCommunicationAuditEntriesForTests = (): CommunicationAuditEntry[] => [
  ...inMemoryAuditEntries,
]

export const resetConnectShyftCommunicationAuditLogForTests = (): void => {
  inMemoryAuditEntries.splice(0, inMemoryAuditEntries.length)
}

export const loadConnectShyftCommunicationAuditDb = (): Knex => db
