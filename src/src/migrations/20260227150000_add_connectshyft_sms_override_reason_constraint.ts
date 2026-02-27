import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const SMS_OVERRIDE_TABLE = 'cs_sms_preference_overrides';
const SMS_OVERRIDE_REASON_CHECK = 'cs_sms_pref_override_reason_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = '${CONNECTSHYFT_SCHEMA}'
          AND table_name = '${SMS_OVERRIDE_TABLE}'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${SMS_OVERRIDE_REASON_CHECK}'
          AND conrelid = 'connectshyft.${SMS_OVERRIDE_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${SMS_OVERRIDE_TABLE}
          ADD CONSTRAINT ${SMS_OVERRIDE_REASON_CHECK}
          CHECK (
            override_reason IN (
              'safety-follow-up',
              'care-plan-exception',
              'documented-consent',
              'critical-service-update'
            )
          );
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${SMS_OVERRIDE_TABLE}
      DROP CONSTRAINT IF EXISTS ${SMS_OVERRIDE_REASON_CHECK}
  `);
}
