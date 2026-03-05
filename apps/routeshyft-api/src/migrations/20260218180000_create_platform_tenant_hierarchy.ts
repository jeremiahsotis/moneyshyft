import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS platform');

  await knex.schema.withSchema('platform').createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('status', 32).notNullable().defaultTo('active');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.index(['status']);
  });

  // Keep existing household-scoped tenant identifiers compatible by backfilling
  // platform.tenants with household ids where possible.
  await knex.raw(`
    INSERT INTO platform.tenants (id, name, status, created_at_utc, updated_at_utc)
    SELECT id, name, 'active', COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
    FROM households
    ON CONFLICT (id) DO NOTHING
  `);

  await knex.schema.withSchema('platform').createTable('billing_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('status', 32).notNullable().defaultTo('active');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.index(['status']);
  });

  await knex.schema.withSchema('platform').createTable('tenant_billing', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('billing_account_id').notNullable().references('id').inTable('platform.billing_accounts').onDelete('CASCADE');
    table.timestamp('starts_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ends_at_utc');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['billing_account_id']);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX tenant_billing_one_active_per_tenant_idx
    ON platform.tenant_billing(tenant_id)
    WHERE ends_at_utc IS NULL
  `);

  await knex.schema.withSchema('platform').createTable('org_units', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('parent_org_unit_id').references('id').inTable('platform.org_units').onDelete('RESTRICT');
    table.string('type', 64).notNullable().defaultTo('ORG_UNIT');
    table.string('name', 255).notNullable();
    table.string('status', 32).notNullable().defaultTo('active');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'name']);
    table.index(['tenant_id']);
    table.index(['parent_org_unit_id']);
  });

  await knex.schema.withSchema('platform').createTable('tenant_memberships', (table) => {
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('role_set_json').notNullable().defaultTo('[]');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.primary(['tenant_id', 'user_id']);
    table.index(['user_id']);
  });

  await knex.schema.withSchema('platform').createTable('org_unit_memberships', (table) => {
    table.uuid('org_unit_id').notNullable().references('id').inTable('platform.org_units').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('role_set_json').notNullable().defaultTo('[]');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.primary(['org_unit_id', 'user_id']);
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').dropTableIfExists('org_unit_memberships');
  await knex.schema.withSchema('platform').dropTableIfExists('tenant_memberships');
  await knex.schema.withSchema('platform').dropTableIfExists('org_units');
  await knex.raw('DROP INDEX IF EXISTS platform.tenant_billing_one_active_per_tenant_idx');
  await knex.schema.withSchema('platform').dropTableIfExists('tenant_billing');
  await knex.schema.withSchema('platform').dropTableIfExists('billing_accounts');
  await knex.schema.withSchema('platform').dropTableIfExists('tenants');
}
