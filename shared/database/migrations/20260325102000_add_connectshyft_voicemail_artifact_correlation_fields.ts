import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const VOICEMAILS_TABLE = 'cs_voicemails';
const VOICEMAIL_DIRECTION_CHECK = 'cs_voicemails_direction_ck';
const VOICEMAIL_TRANSCRIPTION_STATUS_CHECK = 'cs_voicemails_transcription_status_ck';
const VOICEMAIL_PROVIDER_RECORDING_INDEX = 'connectshyft_cs_voicemails_provider_recording_uq';
const VOICEMAIL_PROVIDER_EVENT_INDEX = 'connectshyft_cs_voicemails_provider_event_uq';
const VOICEMAIL_BRIDGE_LEG_DIRECTION_INDEX = 'connectshyft_cs_voicemails_bridge_leg_direction_uq';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(VOICEMAILS_TABLE, (table) => {
    table.text('bridge_session_id').nullable();
    table.text('contact_point_id').nullable();
    table.text('direction').nullable();
    table.text('provider_event_id').nullable();
    table.text('provider_leg_id').nullable();
    table.text('provider_recording_id').nullable();
    table.text('transcription_status').nullable();
    table.text('transcription_text').nullable();
    table.text('transcription_provider').nullable();
    table.timestamp('transcription_requested_at_utc', { useTz: true }).nullable();
    table.timestamp('transcription_completed_at_utc', { useTz: true }).nullable();
    table.timestamp('transcription_failed_at_utc', { useTz: true }).nullable();
  });

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      ALTER COLUMN call_id DROP NOT NULL
  `);
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      ALTER COLUMN person_id DROP NOT NULL
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE} AS voicemails
    SET bridge_session_id = calls.bridge_session_id
    FROM ${CONNECTSHYFT_SCHEMA}.cs_calls AS calls
    WHERE voicemails.call_id = calls.id
      AND voicemails.bridge_session_id IS NULL
      AND calls.bridge_session_id IS NOT NULL
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
    SET
      direction = COALESCE(direction, 'outbound'),
      transcription_text = COALESCE(
        transcription_text,
        NULLIF(transcription_json ->> 'text', ''),
        NULLIF(transcription_json ->> 'transcriptText', ''),
        NULLIF(transcription_json ->> 'transcriptionText', ''),
        NULLIF(transcription_json ->> 'transcript_text', ''),
        NULLIF(transcription_json ->> 'transcription_text', '')
      ),
      transcription_provider = COALESCE(
        transcription_provider,
        NULLIF(transcription_json ->> 'provider', ''),
        NULLIF(transcription_json ->> 'transcriptionProvider', ''),
        NULLIF(transcription_json ->> 'transcription_provider', '')
      ),
      transcription_requested_at_utc = COALESCE(
        transcription_requested_at_utc,
        NULLIF(transcription_json ->> 'requestedAtUtc', '')::timestamptz,
        NULLIF(transcription_json ->> 'transcriptionRequestedAtUtc', '')::timestamptz,
        NULLIF(transcription_json ->> 'transcription_requested_at_utc', '')::timestamptz
      ),
      transcription_completed_at_utc = COALESCE(
        transcription_completed_at_utc,
        NULLIF(transcription_json ->> 'completedAtUtc', '')::timestamptz,
        NULLIF(transcription_json ->> 'transcriptionCompletedAtUtc', '')::timestamptz,
        NULLIF(transcription_json ->> 'transcription_completed_at_utc', '')::timestamptz
      ),
      transcription_failed_at_utc = COALESCE(
        transcription_failed_at_utc,
        NULLIF(transcription_json ->> 'failedAtUtc', '')::timestamptz,
        NULLIF(transcription_json ->> 'transcriptionFailedAtUtc', '')::timestamptz,
        NULLIF(transcription_json ->> 'transcription_failed_at_utc', '')::timestamptz
      ),
      transcription_status = CASE
        WHEN recording_status = 'failed' THEN NULL
        WHEN transcription_status IN ('pending', 'completed', 'failed') THEN transcription_status
        WHEN COALESCE(
          NULLIF(transcription_text, ''),
          NULLIF(transcription_json ->> 'text', ''),
          NULLIF(transcription_json ->> 'transcriptText', ''),
          NULLIF(transcription_json ->> 'transcriptionText', ''),
          NULLIF(transcription_json ->> 'transcript_text', ''),
          NULLIF(transcription_json ->> 'transcription_text', '')
        ) IS NOT NULL THEN 'completed'
        ELSE 'pending'
      END
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      ALTER COLUMN direction SET NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      DROP CONSTRAINT IF EXISTS ${VOICEMAIL_DIRECTION_CHECK}
  `);
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      ADD CONSTRAINT ${VOICEMAIL_DIRECTION_CHECK}
      CHECK (direction IN ('inbound', 'outbound'))
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      DROP CONSTRAINT IF EXISTS ${VOICEMAIL_TRANSCRIPTION_STATUS_CHECK}
  `);
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      ADD CONSTRAINT ${VOICEMAIL_TRANSCRIPTION_STATUS_CHECK}
      CHECK (
        transcription_status IS NULL
        OR transcription_status IN ('pending', 'completed', 'failed')
      )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${VOICEMAIL_PROVIDER_RECORDING_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE} (tenant_id, provider_recording_id)
    WHERE provider_recording_id IS NOT NULL
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${VOICEMAIL_PROVIDER_EVENT_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE} (tenant_id, provider_event_id)
    WHERE provider_event_id IS NOT NULL
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${VOICEMAIL_BRIDGE_LEG_DIRECTION_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE} (tenant_id, bridge_session_id, provider_leg_id, direction)
    WHERE bridge_session_id IS NOT NULL
      AND provider_leg_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${VOICEMAIL_BRIDGE_LEG_DIRECTION_INDEX}
  `);
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${VOICEMAIL_PROVIDER_EVENT_INDEX}
  `);
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${VOICEMAIL_PROVIDER_RECORDING_INDEX}
  `);
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      DROP CONSTRAINT IF EXISTS ${VOICEMAIL_TRANSCRIPTION_STATUS_CHECK}
  `);
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
      DROP CONSTRAINT IF EXISTS ${VOICEMAIL_DIRECTION_CHECK}
  `);
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
        WHERE call_id IS NULL
           OR person_id IS NULL
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
          ALTER COLUMN call_id SET NOT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
          ALTER COLUMN person_id SET NOT NULL;
      END IF;
    END $$;
  `);

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(VOICEMAILS_TABLE, (table) => {
    table.dropColumn('bridge_session_id');
    table.dropColumn('contact_point_id');
    table.dropColumn('direction');
    table.dropColumn('provider_event_id');
    table.dropColumn('provider_leg_id');
    table.dropColumn('provider_recording_id');
    table.dropColumn('transcription_status');
    table.dropColumn('transcription_text');
    table.dropColumn('transcription_provider');
    table.dropColumn('transcription_requested_at_utc');
    table.dropColumn('transcription_completed_at_utc');
    table.dropColumn('transcription_failed_at_utc');
  });
}
