import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const BRIDGE_SESSIONS_TABLE = 'cs_bridge_sessions';
const THREADS_TABLE = 'cs_threads';
const BRIDGE_SESSION_PERSON_INDEX = 'connectshyft_cs_bridge_sessions_scope_person_idx';
const PERSON_REQUIRED_MESSAGE =
  'connectshyft.cs_bridge_sessions has NULL person_id rows; backfill person_id before enabling NOT NULL enforcement';

export async function up(knex: Knex): Promise<void> {
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
}
