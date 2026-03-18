import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBORS_TABLE = 'cs_neighbors';
const ACTIVE_SCOPE_INDEX = 'connectshyft_cs_neighbors_active_scope_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE}
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE}
    ADD COLUMN IF NOT EXISTS deleted_at_utc TIMESTAMPTZ NULL
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE}
    ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${ACTIVE_SCOPE_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE} (tenant_id, org_unit_id, is_deleted, id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${ACTIVE_SCOPE_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE}
    DROP COLUMN IF EXISTS deleted_by_user_id
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE}
    DROP COLUMN IF EXISTS deleted_at_utc
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE}
    DROP COLUMN IF EXISTS is_deleted
  `);
}
