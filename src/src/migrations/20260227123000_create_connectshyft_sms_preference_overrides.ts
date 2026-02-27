import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBORS_TABLE = 'cs_neighbors';
const SMS_OVERRIDE_TABLE = 'cs_sms_preference_overrides';

const NEIGHBORS_PREFERS_TEXTING_CHECK = 'cs_neighbors_prefers_texting_canonical_ck';
const SMS_OVERRIDE_PREFERENCE_CHECK = 'cs_sms_pref_override_pref_value_ck';
const SMS_OVERRIDE_SCOPE_INDEX = 'cs_sms_pref_override_scope_idx';
const SMS_OVERRIDE_REASON_INDEX = 'cs_sms_pref_override_reason_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${NEIGHBORS_TABLE}
      ADD COLUMN IF NOT EXISTS prefers_texting TEXT NOT NULL DEFAULT 'UNKNOWN'
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${NEIGHBORS_PREFERS_TEXTING_CHECK}'
          AND conrelid = 'connectshyft.${NEIGHBORS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${NEIGHBORS_TABLE}
          ADD CONSTRAINT ${NEIGHBORS_PREFERS_TEXTING_CHECK}
          CHECK (prefers_texting IN ('UNKNOWN', 'YES', 'NO'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS connectshyft.${SMS_OVERRIDE_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      neighbor_id TEXT NULL,
      actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      preference_value TEXT NOT NULL DEFAULT 'NO',
      override_reason TEXT NOT NULL,
      override_note TEXT NULL,
      message_body TEXT NOT NULL DEFAULT '',
      message_event_name TEXT NOT NULL DEFAULT 'connectshyft.thread.outbound_message_dispatched',
      audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${SMS_OVERRIDE_PREFERENCE_CHECK}'
          AND conrelid = 'connectshyft.${SMS_OVERRIDE_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${SMS_OVERRIDE_TABLE}
          ADD CONSTRAINT ${SMS_OVERRIDE_PREFERENCE_CHECK}
          CHECK (preference_value = 'NO');
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${SMS_OVERRIDE_SCOPE_INDEX}
      ON connectshyft.${SMS_OVERRIDE_TABLE} (tenant_id, org_unit_id, thread_id, created_at_utc)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${SMS_OVERRIDE_REASON_INDEX}
      ON connectshyft.${SMS_OVERRIDE_TABLE} (tenant_id, override_reason, created_at_utc)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(SMS_OVERRIDE_TABLE);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${NEIGHBORS_TABLE}
      DROP COLUMN IF EXISTS prefers_texting
  `);
}
