import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBOR_PHONES_TABLE = 'cs_neighbor_phones';
const NEIGHBORS_TABLE = 'cs_neighbors';
const UNIQUENESS_STATE_COLUMN = 'uniqueness_enforcement_state';
const UNIQUENESS_STATE_CHECK = 'cs_neighbor_phones_uniqueness_enforcement_state_ck';
const CURRENT_UNIQUE_E164_INDEX = 'connectshyft_cs_neighbor_phones_current_unique_e164_uq';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS ${UNIQUENESS_STATE_COLUMN} TEXT NOT NULL DEFAULT 'ENFORCED'
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${UNIQUENESS_STATE_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
          ADD CONSTRAINT ${UNIQUENESS_STATE_CHECK}
          CHECK (${UNIQUENESS_STATE_COLUMN} IN ('ENFORCED', 'LEGACY_EXEMPT'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE} AS phones
    SET ${UNIQUENESS_STATE_COLUMN} = 'LEGACY_EXEMPT'
    WHERE phones.is_active = FALSE
       OR EXISTS (
         SELECT 1
         FROM ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE} AS neighbors
         WHERE neighbors.tenant_id = phones.tenant_id
           AND neighbors.id = phones.neighbor_id
           AND neighbors.is_deleted = TRUE
       )
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE} AS phones
    SET ${UNIQUENESS_STATE_COLUMN} = 'LEGACY_EXEMPT'
    FROM (
      SELECT
        phones.tenant_id,
        phones.normalized_e164
      FROM ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE} AS phones
      JOIN ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE} AS neighbors
        ON neighbors.tenant_id = phones.tenant_id
       AND neighbors.id = phones.neighbor_id
      WHERE phones.is_active = TRUE
        AND neighbors.is_deleted = FALSE
        AND phones.normalized_e164 IS NOT NULL
      GROUP BY phones.tenant_id, phones.normalized_e164
      HAVING COUNT(DISTINCT phones.neighbor_id) > 1
    ) AS duplicate_current_claims
    , ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE} AS neighbors
    WHERE phones.tenant_id = duplicate_current_claims.tenant_id
      AND phones.normalized_e164 = duplicate_current_claims.normalized_e164
      AND neighbors.tenant_id = phones.tenant_id
      AND neighbors.id = phones.neighbor_id
      AND phones.is_active = TRUE
      AND neighbors.is_deleted = FALSE
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE} AS phones
    SET ${UNIQUENESS_STATE_COLUMN} = 'ENFORCED'
    FROM ${CONNECTSHYFT_SCHEMA}.${NEIGHBORS_TABLE} AS neighbors
    WHERE neighbors.tenant_id = phones.tenant_id
      AND neighbors.id = phones.neighbor_id
      AND phones.is_active = TRUE
      AND neighbors.is_deleted = FALSE
      AND phones.normalized_e164 IS NOT NULL
      AND phones.${UNIQUENESS_STATE_COLUMN} <> 'LEGACY_EXEMPT'
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${CURRENT_UNIQUE_E164_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE} (tenant_id, normalized_e164)
    WHERE is_active = TRUE AND ${UNIQUENESS_STATE_COLUMN} = 'ENFORCED' AND normalized_e164 IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${CURRENT_UNIQUE_E164_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP CONSTRAINT IF EXISTS ${UNIQUENESS_STATE_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS ${UNIQUENESS_STATE_COLUMN}
  `);
}
