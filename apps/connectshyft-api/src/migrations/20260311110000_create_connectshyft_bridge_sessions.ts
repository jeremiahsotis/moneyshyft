import type { Knex } from 'knex'

const CONNECTSHYFT_SCHEMA = 'connectshyft'
const BRIDGE_SESSIONS_TABLE = 'cs_bridge_sessions'
const BRIDGE_LEGS_TABLE = 'cs_bridge_legs'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}`)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      operator_participant_id TEXT NOT NULL,
      neighbor_participant_id TEXT NOT NULL,
      operator_contact_point_id TEXT NOT NULL,
      neighbor_contact_point_id TEXT NOT NULL,
      selected_outbound_contact_point_id TEXT NULL,
      bridge_status TEXT NOT NULL,
      failure_code TEXT NULL,
      failure_message TEXT NULL,
      ended_by TEXT NULL,
      idempotency_key TEXT NULL,
      audit_correlation_id TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at_utc TIMESTAMPTZ NULL,
      CONSTRAINT cs_bridge_sessions_status_ck CHECK (
        bridge_status IN (
          'created',
          'operator_dialing',
          'operator_answered',
          'neighbor_dialing',
          'neighbor_answered',
          'bridged',
          'completed',
          'failed',
          'canceled',
          'expired'
        )
      )
    )
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${BRIDGE_LEGS_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      bridge_session_id TEXT NOT NULL REFERENCES ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}(id) ON DELETE CASCADE,
      leg_role TEXT NOT NULL,
      contact_point_id TEXT NOT NULL,
      provider_call_id TEXT NULL,
      leg_status TEXT NOT NULL,
      started_at_utc TIMESTAMPTZ NULL,
      answered_at_utc TIMESTAMPTZ NULL,
      ended_at_utc TIMESTAMPTZ NULL,
      failure_code TEXT NULL,
      failure_message TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_bridge_legs_role_ck CHECK (leg_role IN ('operator', 'neighbor')),
      CONSTRAINT cs_bridge_legs_status_ck CHECK (
        leg_status IN ('created', 'dialing', 'ringing', 'answered', 'failed', 'completed', 'canceled')
      ),
      CONSTRAINT cs_bridge_legs_session_role_uq UNIQUE (bridge_session_id, leg_role)
    )
  `)

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_bridge_sessions_scope_idx
    ON ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE} (tenant_id, org_unit_id, thread_id, created_at_utc DESC, id)
  `)

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_bridge_legs_session_idx
    ON ${CONNECTSHYFT_SCHEMA}.${BRIDGE_LEGS_TABLE} (bridge_session_id, leg_role, id)
  `)

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS connectshyft_cs_bridge_legs_provider_call_id_uq
    ON ${CONNECTSHYFT_SCHEMA}.${BRIDGE_LEGS_TABLE} (provider_call_id)
    WHERE provider_call_id IS NOT NULL
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(BRIDGE_LEGS_TABLE)
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(BRIDGE_SESSIONS_TABLE)
}
