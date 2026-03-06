import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBOR_PHONES_TABLE = 'cs_neighbor_phones';
const VERIFICATION_STATUS_CHECK = 'cs_neighbor_phones_verification_status_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = '${CONNECTSHYFT_SCHEMA}'
          AND table_name = '${NEIGHBOR_PHONES_TABLE}'
          AND column_name = 'verification_status'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${VERIFICATION_STATUS_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
          ADD CONSTRAINT ${VERIFICATION_STATUS_CHECK}
          CHECK (verification_status IN ('verified', 'unverified'));
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP CONSTRAINT IF EXISTS ${VERIFICATION_STATUS_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS verification_status
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS is_shared
  `);
}
