import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const OPERATOR_CALLBACK_NUMBERS_TABLE = 'cs_operator_callback_numbers';
const CALLBACK_NUMBER_E164_CHECK = 'cs_operator_callback_numbers_e164_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS connectshyft.${OPERATOR_CALLBACK_NUMBERS_TABLE} (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      callback_number_e164 TEXT NOT NULL,
      callback_number_raw_input TEXT NOT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_operator_callback_numbers_pk PRIMARY KEY (tenant_id, user_id)
    )
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${CALLBACK_NUMBER_E164_CHECK}'
          AND conrelid = 'connectshyft.${OPERATOR_CALLBACK_NUMBERS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${OPERATOR_CALLBACK_NUMBERS_TABLE}
          ADD CONSTRAINT ${CALLBACK_NUMBER_E164_CHECK}
          CHECK (callback_number_e164 ~ '^\\+[1-9][0-9]{1,14}$');
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .withSchema(CONNECTSHYFT_SCHEMA)
    .dropTableIfExists(OPERATOR_CALLBACK_NUMBERS_TABLE);
}
