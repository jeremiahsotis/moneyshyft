import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const VOICEMAILS_TABLE = 'cs_voicemails';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(VOICEMAILS_TABLE, (table) => {
    table.timestamp('seen_at_utc', { useTz: true }).nullable();
    table.timestamp('reviewed_at_utc', { useTz: true }).nullable();
  });

  await knex.raw(`
    UPDATE ${CONNECTSHYFT_SCHEMA}.${VOICEMAILS_TABLE}
    SET
      seen_at_utc = COALESCE(seen_at_utc, created_at_utc),
      reviewed_at_utc = COALESCE(reviewed_at_utc, seen_at_utc, created_at_utc)
    WHERE COALESCE(direction, 'outbound') = 'outbound'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).alterTable(VOICEMAILS_TABLE, (table) => {
    table.dropColumn('seen_at_utc');
    table.dropColumn('reviewed_at_utc');
  });
}
