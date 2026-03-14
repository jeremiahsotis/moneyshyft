import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('tags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.uuid('parent_tag_id').nullable().references('id').inTable('tags').onDelete('SET NULL');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.string('color', 7).nullable();
    table.string('icon', 50).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('household_id');
    table.index('parent_tag_id');
  });

  await knex.schema.createTable('transaction_tags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('transaction_id').notNullable().references('id').inTable('transactions').onDelete('CASCADE');
    table.uuid('tag_id').notNullable().references('id').inTable('tags').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['transaction_id']);
    table.index('tag_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transaction_tags');
  await knex.schema.dropTableIfExists('tags');
}
