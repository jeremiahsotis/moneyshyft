import type { Knex } from 'knex'

const CONNECTSHYFT_SCHEMA = 'connectshyft'
const IDEMPOTENCY_TABLE = 'cs_communication_idempotency_records'
const AUDIT_TABLE = 'cs_communication_audit_log'
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}`)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${IDEMPOTENCY_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      operation_name TEXT NOT NULL,
      actor_id TEXT NULL,
      actor_scope_key TEXT NULL,
      request_fingerprint TEXT NOT NULL,
      request_summary TEXT NULL,
      resource_type TEXT NULL,
      resource_id TEXT NULL,
      status TEXT NOT NULL,
      response_snapshot_json JSONB NULL,
      failure_classification_json JSONB NULL,
      failure_message TEXT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 1,
      first_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at_utc TIMESTAMPTZ NULL,
      retry_eligible_at_utc TIMESTAMPTZ NULL,
      expires_at_utc TIMESTAMPTZ NOT NULL,
      CONSTRAINT cs_communication_idempotency_status_ck CHECK (
        status IN ('in_progress', 'succeeded', 'failed')
      ),
      CONSTRAINT cs_communication_idempotency_scope_uq UNIQUE (
        tenant_id,
        idempotency_key,
        operation_name
      )
    )
  `)

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_communication_idempotency_scope_idx
    ON ${CONNECTSHYFT_SCHEMA}.${IDEMPOTENCY_TABLE} (
      tenant_id,
      operation_name,
      idempotency_key,
      last_seen_at_utc DESC,
      id
    )
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${AUDIT_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT NULL,
      operation_name TEXT NOT NULL,
      target_entity_type TEXT NOT NULL,
      target_entity_id TEXT NULL,
      channel TEXT NOT NULL,
      result_state TEXT NOT NULL,
      result_code TEXT NULL,
      result_message TEXT NULL,
      idempotency_key TEXT NULL,
      request_fingerprint TEXT NULL,
      provider_name TEXT NULL,
      provider_reference_id TEXT NULL,
      metadata_json JSONB NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_communication_audit_actor_type_ck CHECK (
        actor_type IN ('user', 'system', 'provider')
      ),
      CONSTRAINT cs_communication_audit_channel_ck CHECK (
        channel IN ('sms', 'voice', 'bridge', 'webhook')
      ),
      CONSTRAINT cs_communication_audit_result_state_ck CHECK (
        result_state IN ('succeeded', 'failed', 'ignored_duplicate', 'retrying', 'exhausted')
      )
    )
  `)

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_communication_audit_scope_idx
    ON ${CONNECTSHYFT_SCHEMA}.${AUDIT_TABLE} (
      tenant_id,
      correlation_id,
      created_at_utc DESC,
      id
    )
  `)

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
    ADD COLUMN IF NOT EXISTS next_retry_at_utc TIMESTAMPTZ NULL
  `)

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
    ADD COLUMN IF NOT EXISTS last_failure_classification JSONB NULL
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
    DROP COLUMN IF EXISTS last_failure_classification
  `)

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
    DROP COLUMN IF EXISTS next_retry_at_utc
  `)

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(AUDIT_TABLE)
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(IDEMPOTENCY_TABLE)
}
