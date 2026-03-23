import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const THREADS_TABLE = 'cs_threads';
const THREAD_PERSON_INDEX = 'connectshyft_cs_threads_scope_person_idx';
const THREAD_PERSON_COLUMN = 'person_id';
const PERSON_REQUIRED_MESSAGE =
  'connectshyft.cs_threads has NULL person_id rows; backfill person_id before enabling NOT NULL enforcement';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS ${THREAD_PERSON_COLUMN} UUID NULL
      REFERENCES people.persons(id) ON DELETE RESTRICT
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${THREAD_PERSON_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE} (tenant_id, org_unit_id, ${THREAD_PERSON_COLUMN}, id)
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE}
        WHERE ${THREAD_PERSON_COLUMN} IS NULL
      ) THEN
        RAISE EXCEPTION '${PERSON_REQUIRED_MESSAGE}';
      END IF;

      ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE}
        ALTER COLUMN ${THREAD_PERSON_COLUMN} SET NOT NULL;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${THREAD_PERSON_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE}
      DROP COLUMN IF EXISTS ${THREAD_PERSON_COLUMN}
  `);
}
