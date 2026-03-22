import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const ESCALATION_CONFIG_TABLE = 'cs_org_unit_escalation_config';
const USERS_PHONE_E164_CHECK = 'users_phone_e164_ck';
const DEFAULT_OPERATOR_PHONE_E164_CHECK =
  'cs_org_unit_escalation_config_default_operator_phone_e164_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.raw(`
    ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS phone_e164 TEXT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('users') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${USERS_PHONE_E164_CHECK}'
            AND conrelid = 'users'::regclass
        )
      THEN
        ALTER TABLE users
          ADD CONSTRAINT ${USERS_PHONE_E164_CHECK}
          CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\\+[1-9][0-9]{1,14}$');
      END IF;
    END $$;
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
      ADD COLUMN IF NOT EXISTS default_operator_phone_e164 TEXT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${DEFAULT_OPERATOR_PHONE_E164_CHECK}'
            AND conrelid = '${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}'::regclass
        )
      THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
          ADD CONSTRAINT ${DEFAULT_OPERATOR_PHONE_E164_CHECK}
          CHECK (
            default_operator_phone_e164 IS NULL
            OR default_operator_phone_e164 ~ '^\\+[1-9][0-9]{1,14}$'
          );
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
      DROP CONSTRAINT IF EXISTS ${DEFAULT_OPERATOR_PHONE_E164_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
      DROP COLUMN IF EXISTS default_operator_phone_e164
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS users
      DROP CONSTRAINT IF EXISTS ${USERS_PHONE_E164_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS users
      DROP COLUMN IF EXISTS phone_e164
  `);
}
