import { Knex } from 'knex';

const SESSIONS_SCHEMA = 'platform';
const SESSIONS_TABLE = 'sessions';

export async function up(knex: Knex): Promise<void> {
  const hasTenantColumn = await knex.schema.withSchema(SESSIONS_SCHEMA).hasColumn(SESSIONS_TABLE, 'tenant_id');

  if (!hasTenantColumn) {
    await knex.schema.withSchema(SESSIONS_SCHEMA).alterTable(SESSIONS_TABLE, (table) => {
      table.uuid('tenant_id').references('id').inTable('households').onDelete('CASCADE');
    });
  }

  await knex.raw(`
    UPDATE platform.sessions
    SET tenant_id = household_id
    WHERE tenant_id IS NULL
      AND household_id IS NOT NULL
  `);

  await knex.raw(`
    UPDATE platform.sessions AS sessions
    SET tenant_id = users.household_id
    FROM users
    WHERE sessions.tenant_id IS NULL
      AND sessions.user_id = users.id
      AND users.household_id IS NOT NULL
  `);

  // Legacy sessions without a tenant cannot be safely scoped and are invalidated.
  await knex.withSchema(SESSIONS_SCHEMA).table(SESSIONS_TABLE).whereNull('tenant_id').delete();

  await knex.schema.withSchema(SESSIONS_SCHEMA).alterTable(SESSIONS_TABLE, (table) => {
    table.uuid('tenant_id').notNullable().alter();
    table.index(['tenant_id']);
    table.index(['tenant_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTenantColumn = await knex.schema.withSchema(SESSIONS_SCHEMA).hasColumn(SESSIONS_TABLE, 'tenant_id');

  if (!hasTenantColumn) {
    return;
  }

  await knex.schema.withSchema(SESSIONS_SCHEMA).alterTable(SESSIONS_TABLE, (table) => {
    table.dropIndex(['tenant_id', 'user_id']);
    table.dropIndex(['tenant_id']);
    table.dropColumn('tenant_id');
  });
}
