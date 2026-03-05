import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').createTable('tenant_module_entitlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('module_key', 128).notNullable();
    table.boolean('enabled').notNullable().defaultTo(true);
    table.string('reason', 512).notNullable();
    table.uuid('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('updated_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'module_key']);
    table.index(['tenant_id']);
    table.index(['module_key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').dropTableIfExists('tenant_module_entitlements');
}
