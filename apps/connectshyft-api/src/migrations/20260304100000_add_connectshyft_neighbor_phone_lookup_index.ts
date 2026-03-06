import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const NEIGHBOR_PHONES_TABLE = 'cs_neighbor_phones';
const NEIGHBOR_PHONES_LOOKUP_INDEX = 'connectshyft_cs_neighbor_phones_tenant_value_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${NEIGHBOR_PHONES_LOOKUP_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_TABLE} (tenant_id, value_e164, neighbor_id, sort_order, id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${NEIGHBOR_PHONES_LOOKUP_INDEX}
  `);
}
