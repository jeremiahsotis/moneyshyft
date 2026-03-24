import { Knex } from 'knex';

const PEOPLE_SCHEMA = 'people';
const CONTACT_POINTS_TABLE = 'contact_points';
const STATUS_COLUMN = 'status';
const STATUS_CHECK = 'people_contact_points_status_ck';
const DEFAULT_STATUS = 'active_personal';
const STATUS_VALUES = [
  'active_personal',
  'active_shared_possible',
  'active_shared_confirmed',
  'stale',
  'reassignment_suspected',
  'archived',
] as const;

const statusListSql = STATUS_VALUES.map((value) => `'${value}'`).join(', ');

export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const hasContactPointsTable = await trx.schema
      .withSchema(PEOPLE_SCHEMA)
      .hasTable(CONTACT_POINTS_TABLE);

    if (!hasContactPointsTable) {
      return;
    }

    const hasStatusColumn = await trx.schema
      .withSchema(PEOPLE_SCHEMA)
      .hasColumn(CONTACT_POINTS_TABLE, STATUS_COLUMN);

    if (!hasStatusColumn) {
      await trx.raw(`
        ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}
          ADD COLUMN IF NOT EXISTS ${STATUS_COLUMN} TEXT DEFAULT '${DEFAULT_STATUS}'
      `);
    }

    await trx.raw(`
      UPDATE ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}
      SET ${STATUS_COLUMN} = '${DEFAULT_STATUS}'
      WHERE ${STATUS_COLUMN} IS NULL
    `);

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}
        ALTER COLUMN ${STATUS_COLUMN} SET DEFAULT '${DEFAULT_STATUS}'
    `);

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}
        ALTER COLUMN ${STATUS_COLUMN} SET NOT NULL
    `);

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}
        DROP CONSTRAINT IF EXISTS ${STATUS_CHECK}
    `);

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}
        ADD CONSTRAINT ${STATUS_CHECK}
        CHECK (${STATUS_COLUMN} IN (${statusListSql}))
    `);
  });
}

export async function down(_knex: Knex): Promise<void> {
  // The canonical PeopleCore foundation migration already owns this column and constraint.
}
