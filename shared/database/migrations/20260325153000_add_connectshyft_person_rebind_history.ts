import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const THREADS_TABLE = 'cs_threads';
const DELIVERY_ATTEMPTS_TABLE = 'cs_delivery_attempts';
const PERSON_REBIND_HISTORY_TABLE = 'person_rebind_history';
const THREAD_ORIGIN_PERSON_COLUMN = 'origin_person_id';
const THREAD_ORIGIN_PERSON_INDEX = 'connectshyft_cs_threads_scope_origin_person_idx';
const DELIVERY_ATTEMPTS_PERSON_INDEX = 'connectshyft_cs_delivery_attempts_scope_person_idx';
const PERSON_REBIND_HISTORY_PAIR_UNIQUE_INDEX = 'connectshyft_person_rebind_history_scope_pair_uq';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS ${THREAD_ORIGIN_PERSON_COLUMN} UUID NULL
      REFERENCES people.persons(id) ON DELETE RESTRICT
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${THREAD_ORIGIN_PERSON_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE} (tenant_id, org_unit_id, ${THREAD_ORIGIN_PERSON_COLUMN}, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${DELIVERY_ATTEMPTS_PERSON_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${DELIVERY_ATTEMPTS_TABLE} (tenant_id, org_unit_id, person_id, created_at_utc DESC, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${PERSON_REBIND_HISTORY_TABLE} (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      provisional_person_id TEXT NOT NULL,
      canonical_person_id TEXT NOT NULL,
      rebind_class TEXT NOT NULL CHECK (rebind_class IN ('auto', 'review')),
      performed_by_user_id TEXT NOT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT NULL
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${PERSON_REBIND_HISTORY_PAIR_UNIQUE_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${PERSON_REBIND_HISTORY_TABLE} (
      tenant_id,
      org_unit_id,
      provisional_person_id,
      canonical_person_id,
      rebind_class
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${PERSON_REBIND_HISTORY_PAIR_UNIQUE_INDEX}
  `);

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(PERSON_REBIND_HISTORY_TABLE);

  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${DELIVERY_ATTEMPTS_PERSON_INDEX}
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${THREAD_ORIGIN_PERSON_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${THREADS_TABLE}
      DROP COLUMN IF EXISTS ${THREAD_ORIGIN_PERSON_COLUMN}
  `);
}
