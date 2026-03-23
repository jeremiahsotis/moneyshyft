import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const BRIDGE_SESSIONS_TABLE = 'cs_bridge_sessions';
const BRIDGE_LEGS_TABLE = 'cs_bridge_legs';
const VOICEMAIL_RECORDING_STATUS_CHECK = 'cs_bridge_sessions_voicemail_recording_status_ck';
const BRIDGE_LEG_PROVIDER_CALL_CONTROL_INDEX =
  'connectshyft_cs_bridge_legs_provider_call_control_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(BRIDGE_SESSIONS_TABLE, (table) => {
    table.timestamp('neighbor_ring_started_at_utc', { useTz: true }).nullable();
    table.timestamp('neighbor_timeout_at_utc', { useTz: true }).nullable();
    table.timestamp('voicemail_fallback_started_at_utc', { useTz: true }).nullable();
    table.text('voicemail_artifact_id').nullable();
    table.text('voicemail_recording_url').nullable();
    table.text('voicemail_recording_status').nullable();
    table.text('voicemail_provider_event_id').nullable();
    table.text('voicemail_provider_leg_id').nullable();
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${VOICEMAIL_RECORDING_STATUS_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}
          ADD CONSTRAINT ${VOICEMAIL_RECORDING_STATUS_CHECK}
          CHECK (voicemail_recording_status IN ('pending', 'completed', 'failed'));
      END IF;
    END $$;
  `);

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(BRIDGE_LEGS_TABLE, (table) => {
    table.text('provider_call_control_id').nullable();
  });

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${BRIDGE_LEG_PROVIDER_CALL_CONTROL_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${BRIDGE_LEGS_TABLE} (bridge_session_id, provider_call_control_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${BRIDGE_LEG_PROVIDER_CALL_CONTROL_INDEX}`,
  );

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${BRIDGE_SESSIONS_TABLE}
    DROP CONSTRAINT IF EXISTS ${VOICEMAIL_RECORDING_STATUS_CHECK}
  `);

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(BRIDGE_LEGS_TABLE, (table) => {
    table.dropColumn('provider_call_control_id');
  });

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(BRIDGE_SESSIONS_TABLE, (table) => {
    table.dropColumn('neighbor_ring_started_at_utc');
    table.dropColumn('neighbor_timeout_at_utc');
    table.dropColumn('voicemail_fallback_started_at_utc');
    table.dropColumn('voicemail_artifact_id');
    table.dropColumn('voicemail_recording_url');
    table.dropColumn('voicemail_recording_status');
    table.dropColumn('voicemail_provider_event_id');
    table.dropColumn('voicemail_provider_leg_id');
  });
}
