import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBORS_TABLE = 'cs_neighbors';
const NEIGHBOR_PHONES_TABLE = 'cs_neighbor_phones';

const NEIGHBORS_TENANT_ID_UNIQUE = 'cs_neighbors_tenant_neighbor_uq';
const NEIGHBOR_PHONES_SORT_ORDER_CHECK = 'cs_neighbor_phones_sort_order_non_negative_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS connectshyft.${NEIGHBORS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_neighbors_scope_idx
    ON connectshyft.${NEIGHBORS_TABLE} (tenant_id, org_unit_id, id)
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${NEIGHBORS_TENANT_ID_UNIQUE}'
          AND conrelid = 'connectshyft.${NEIGHBORS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${NEIGHBORS_TABLE}
          ADD CONSTRAINT ${NEIGHBORS_TENANT_ID_UNIQUE}
          UNIQUE (tenant_id, id);
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS connectshyft.${NEIGHBOR_PHONES_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      neighbor_id UUID NOT NULL REFERENCES connectshyft.${NEIGHBORS_TABLE}(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      value_e164 TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_neighbor_phones_scope_idx
    ON connectshyft.${NEIGHBOR_PHONES_TABLE} (tenant_id, neighbor_id, sort_order, id)
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${NEIGHBOR_PHONES_SORT_ORDER_CHECK}'
          AND conrelid = 'connectshyft.${NEIGHBOR_PHONES_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${NEIGHBOR_PHONES_TABLE}
          ADD CONSTRAINT ${NEIGHBOR_PHONES_SORT_ORDER_CHECK}
          CHECK (sort_order >= 0);
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(NEIGHBOR_PHONES_TABLE);
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(NEIGHBORS_TABLE);
}
