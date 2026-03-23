import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE connectshyft.cs_threads
      ADD COLUMN IF NOT EXISTS activity_id UUID NULL;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS cs_threads_activity_idx
    ON connectshyft.cs_threads (tenant_id, org_unit_id, activity_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS connectshyft.cs_threads_activity_idx');
  await knex.raw(`
    ALTER TABLE connectshyft.cs_threads
      DROP COLUMN IF EXISTS activity_id
  `);
}
