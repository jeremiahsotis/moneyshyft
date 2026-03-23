import { Knex } from 'knex';

const PEOPLE_SCHEMA = 'people';
const ACTIVITIES_TABLE = 'activities';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${PEOPLE_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${ACTIVITIES_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      person_id UUID NOT NULL REFERENCES ${PEOPLE_SCHEMA}.persons(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS activities_tenant_org_person_idx
    ON ${PEOPLE_SCHEMA}.${ACTIVITIES_TABLE} (tenant_id, org_unit_id, person_id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS activities_tenant_id_idx
    ON ${PEOPLE_SCHEMA}.${ACTIVITIES_TABLE} (tenant_id, id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TABLE IF EXISTS ${PEOPLE_SCHEMA}.${ACTIVITIES_TABLE}`);
}
