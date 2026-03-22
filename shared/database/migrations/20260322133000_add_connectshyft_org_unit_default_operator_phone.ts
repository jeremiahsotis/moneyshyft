import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const ESCALATION_CONFIG_TABLE = 'cs_org_unit_escalation_config';
const DEFAULT_OPERATOR_PHONE_COLUMN = 'default_operator_phone_e164';
const DEFAULT_OPERATOR_PHONE_CHECK =
  'cs_org_unit_escalation_config_default_operator_phone_e164_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}`);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
      ADD COLUMN IF NOT EXISTS ${DEFAULT_OPERATOR_PHONE_COLUMN} TEXT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${DEFAULT_OPERATOR_PHONE_CHECK}'
            AND conrelid = '${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}'::regclass
        )
      THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
          ADD CONSTRAINT ${DEFAULT_OPERATOR_PHONE_CHECK}
          CHECK (
            ${DEFAULT_OPERATOR_PHONE_COLUMN} IS NULL
            OR ${DEFAULT_OPERATOR_PHONE_COLUMN} ~ '^\\+[1-9][0-9]{1,14}$'
          );
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
      DROP CONSTRAINT IF EXISTS ${DEFAULT_OPERATOR_PHONE_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${ESCALATION_CONFIG_TABLE}
      DROP COLUMN IF EXISTS ${DEFAULT_OPERATOR_PHONE_COLUMN}
  `);
}
