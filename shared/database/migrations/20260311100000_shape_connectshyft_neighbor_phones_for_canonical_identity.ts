import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBOR_PHONES_TABLE = 'cs_neighbor_phones';
const VALIDATION_STATUS_CHECK = 'cs_neighbor_phones_validation_status_ck';
const USAGE_TYPE_CHECK = 'cs_neighbor_phones_usage_type_ck';
const SOURCE_CHECK = 'cs_neighbor_phones_source_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS raw_input TEXT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS normalized_e164 TEXT
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS display_national TEXT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS country_code TEXT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS national_number TEXT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS extension TEXT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'valid'
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'unknown'
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user_entered'
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
    SET
      raw_input = COALESCE(raw_input, value_e164),
      normalized_e164 = value_e164,
      country_code = COALESCE(country_code, CASE
        WHEN value_e164 ~ '^\\+1\\d{10}$' THEN '1'
        ELSE country_code
      END),
      national_number = COALESCE(national_number, CASE
        WHEN value_e164 ~ '^\\+1\\d{10}$' THEN SUBSTRING(value_e164 FROM 3)
        ELSE national_number
      END),
      display_national = COALESCE(display_national, CASE
        WHEN value_e164 ~ '^\\+1\\d{10}$' THEN
          '(' || SUBSTRING(value_e164 FROM 3 FOR 3) || ') '
          || SUBSTRING(value_e164 FROM 6 FOR 3) || '-'
          || SUBSTRING(value_e164 FROM 9 FOR 4)
        ELSE display_national
      END)
    WHERE normalized_e164 IS NULL
       OR raw_input IS NULL
       OR country_code IS NULL
       OR national_number IS NULL
       OR display_national IS NULL
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      ALTER COLUMN normalized_e164 SET NOT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${VALIDATION_STATUS_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
          ADD CONSTRAINT ${VALIDATION_STATUS_CHECK}
          CHECK (validation_status IN ('valid', 'invalid', 'needs_review'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${USAGE_TYPE_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
          ADD CONSTRAINT ${USAGE_TYPE_CHECK}
          CHECK (usage_type IN ('mobile', 'landline', 'unknown'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${SOURCE_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
          ADD CONSTRAINT ${SOURCE_CHECK}
          CHECK (source IN ('user_entered', 'imported', 'system_generated'));
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP CONSTRAINT IF EXISTS ${VALIDATION_STATUS_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP CONSTRAINT IF EXISTS ${USAGE_TYPE_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP CONSTRAINT IF EXISTS ${SOURCE_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS raw_input
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS normalized_e164
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS display_national
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS country_code
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS national_number
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS extension
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS validation_status
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS usage_type
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS source
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE}
      DROP COLUMN IF EXISTS is_active
  `);
}
