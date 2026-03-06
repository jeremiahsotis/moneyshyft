import { Knex } from 'knex';

const ROUTE_SCHEMA = 'route';
const OUTCOMES_TABLE = 'refusal_outcomes';
const EVENTS_TABLE = 'refusal_lifecycle_events';
const OUTBOX_TABLE = 'refusal_outbox_events';
const IDEMPOTENCY_TABLE = 'refusal_idempotency_keys';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${ROUTE_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${OUTCOMES_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      reason_code TEXT NOT NULL,
      reason_message TEXT NOT NULL,
      alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
      request_id TEXT NULL,
      commitment_id TEXT NULL,
      actor_user_id TEXT NULL,
      fingerprint TEXT NOT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT route_refusal_outcomes_scope_chk CHECK (scope IN ('request', 'commitment')),
      CONSTRAINT route_refusal_outcomes_stage_chk CHECK (stage IN ('intake', 'execution'))
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS route_refusal_outcomes_scope_fingerprint_uq
    ON ${ROUTE_SCHEMA}.${OUTCOMES_TABLE} (tenant_id, scope, scope_id, fingerprint)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_refusal_outcomes_scope_created_idx
    ON ${ROUTE_SCHEMA}.${OUTCOMES_TABLE} (tenant_id, scope, scope_id, created_at_utc)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${EVENTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      refusal_outcome_id UUID NOT NULL REFERENCES ${ROUTE_SCHEMA}.${OUTCOMES_TABLE}(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      reason_code TEXT NOT NULL,
      reason_message TEXT NOT NULL,
      alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
      request_id TEXT NULL,
      commitment_id TEXT NULL,
      actor_user_id TEXT NULL,
      occurred_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT route_refusal_lifecycle_events_scope_chk CHECK (scope IN ('request', 'commitment')),
      CONSTRAINT route_refusal_lifecycle_events_stage_chk CHECK (stage IN ('intake', 'execution')),
      CONSTRAINT route_refusal_lifecycle_events_type_chk CHECK (event_type IN ('ROUTE_REFUSAL_RECORDED', 'ROUTE_COMMITMENT_REFUSAL_LINKED'))
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_refusal_lifecycle_events_scope_idx
    ON ${ROUTE_SCHEMA}.${EVENTS_TABLE} (tenant_id, scope, scope_id, occurred_at_utc, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${OUTBOX_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID NOT NULL UNIQUE REFERENCES ${ROUTE_SCHEMA}.${EVENTS_TABLE}(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      occurred_at_utc TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      delivery_status TEXT NOT NULL DEFAULT 'pending',
      delivery_attempts INTEGER NOT NULL DEFAULT 0,
      available_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      leased_until_utc TIMESTAMPTZ NULL,
      delivered_at_utc TIMESTAMPTZ NULL,
      last_delivery_error TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT route_refusal_outbox_status_chk CHECK (delivery_status IN ('pending', 'leased', 'delivered', 'failed')),
      CONSTRAINT route_refusal_outbox_attempts_non_negative_chk CHECK (delivery_attempts >= 0)
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_refusal_outbox_ready_idx
    ON ${ROUTE_SCHEMA}.${OUTBOX_TABLE} (delivery_status, available_at_utc, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${IDEMPOTENCY_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL,
      refusal_outcome_id UUID NOT NULL REFERENCES ${ROUTE_SCHEMA}.${OUTCOMES_TABLE}(id) ON DELETE CASCADE,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT route_refusal_idempotency_scope_chk CHECK (scope IN ('request', 'commitment'))
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS route_refusal_idempotency_scope_uq
    ON ${ROUTE_SCHEMA}.${IDEMPOTENCY_TABLE} (tenant_id, scope, scope_id, idempotency_key)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(IDEMPOTENCY_TABLE);
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(OUTBOX_TABLE);
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(EVENTS_TABLE);
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(OUTCOMES_TABLE);
}
