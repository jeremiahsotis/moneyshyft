import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const CALLS_TABLE = 'cs_calls';
const VOICEMAILS_TABLE = 'cs_voicemails';
const DELIVERY_ATTEMPTS_TABLE = 'cs_delivery_attempts';
const PROVIDER_EVENTS_TABLE = 'cs_provider_events';
const BRIDGE_SESSIONS_TABLE = 'cs_bridge_sessions';
const THREADS_TABLE = 'cs_threads';
const BRIDGE_SESSION_PERSON_INDEX = 'connectshyft_cs_bridge_sessions_scope_person_idx';
const PERSON_REQUIRED_MESSAGE =
  'connectshyft.cs_bridge_sessions has NULL person_id rows; backfill person_id before enabling NOT NULL enforcement';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${CALLS_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      bridge_session_id TEXT NULL REFERENCES ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK (status IN (
        'operator_dialing',
        'operator_answered',
        'neighbor_dialing',
        'neighbor_answered',
        'bridged',
        'voicemail',
        'completed',
        'failed',
        'canceled',
        'expired'
      )),
      failure_code TEXT NULL,
      failure_message TEXT NULL,
      started_at_utc TIMESTAMPTZ NOT NULL,
      operator_answered_at_utc TIMESTAMPTZ NULL,
      neighbor_answered_at_utc TIMESTAMPTZ NULL,
      bridged_at_utc TIMESTAMPTZ NULL,
      ended_at_utc TIMESTAMPTZ NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_calls_scope_idx
    ON ${CONNECTSHYFT_SCHEMA}.${CALLS_TABLE} (tenant_id, org_unit_id, person_id, created_at_utc DESC, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_calls_thread_idx
    ON ${CONNECTSHYFT_SCHEMA}.${CALLS_TABLE} (tenant_id, org_unit_id, thread_id, created_at_utc DESC, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      call_id TEXT NOT NULL REFERENCES ${CONNECTSHYFT_SCHEMA}.${CALLS_TABLE}(id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      recording_url TEXT NULL,
      transcription_json JSONB NULL,
      recording_status TEXT NOT NULL CHECK (recording_status IN ('pending', 'completed', 'failed')),
      occurred_at_utc TIMESTAMPTZ NOT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_voicemails_artifact_uq UNIQUE (tenant_id, artifact_id)
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_voicemails_scope_idx
    ON ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE} (tenant_id, org_unit_id, person_id, occurred_at_utc DESC, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${DELIVERY_ATTEMPTS_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      call_id TEXT NULL REFERENCES ${CONNECTSHYFT_SCHEMA}.${CALLS_TABLE}(id) ON DELETE SET NULL,
      channel TEXT NOT NULL CHECK (channel IN ('sms', 'voice')),
      provider_event_id TEXT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
      failure_code TEXT NULL,
      failure_message TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${PROVIDER_EVENTS_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_json JSONB NOT NULL,
      call_id TEXT NULL,
      bridge_session_id TEXT NULL,
      provider_call_id TEXT NULL,
      occurred_at_utc TIMESTAMPTZ NOT NULL,
      received_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_provider_events_dedup_uq
        UNIQUE (tenant_id, provider, provider_call_id, event_type, occurred_at_utc)
    )
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}
      ADD COLUMN IF NOT EXISTS person_id TEXT NULL
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE} AS sessions
    SET person_id = threads.person_id::text
    FROM ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE} AS threads
    WHERE sessions.thread_id = threads.id::text
      AND sessions.person_id IS NULL
      AND threads.person_id IS NOT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}
        WHERE person_id IS NULL
      ) THEN
        RAISE EXCEPTION '${PERSON_REQUIRED_MESSAGE}';
      END IF;

      ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}
        ALTER COLUMN person_id SET NOT NULL;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${BRIDGE_SESSION_PERSON_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE} (tenant_id, org_unit_id, person_id, created_at_utc DESC, id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSION_PERSON_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}
      DROP COLUMN IF EXISTS person_id
  `);

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(PROVIDER_EVENTS_TABLE);
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(DELIVERY_ATTEMPTS_TABLE);
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(VOICEMAILS_TABLE);
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(CALLS_TABLE);
}
