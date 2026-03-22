import { Knex } from 'knex';

const USERS_TABLE = 'users';
const USER_PHONE_COLUMN = 'phone_e164';
const USER_PHONE_E164_CHECK = 'users_phone_e164_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${USERS_TABLE}
      ADD COLUMN IF NOT EXISTS ${USER_PHONE_COLUMN} TEXT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('public.${USERS_TABLE}') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${USER_PHONE_E164_CHECK}'
            AND conrelid = 'public.${USERS_TABLE}'::regclass
        )
      THEN
        ALTER TABLE ${USERS_TABLE}
          ADD CONSTRAINT ${USER_PHONE_E164_CHECK}
          CHECK (
            ${USER_PHONE_COLUMN} IS NULL
            OR ${USER_PHONE_COLUMN} ~ '^\\+[1-9][0-9]{1,14}$'
          );
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${USERS_TABLE}
      DROP CONSTRAINT IF EXISTS ${USER_PHONE_E164_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${USERS_TABLE}
      DROP COLUMN IF EXISTS ${USER_PHONE_COLUMN}
  `);
}
