import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('analytics_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').nullable();
    table.uuid('user_id').nullable();
    table.string('event_name').notNullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.foreign('household_id').references('households.id').onDelete('SET NULL');
    table.foreign('user_id').references('users.id').onDelete('SET NULL');

    table.index(['household_id']);
    table.index(['user_id']);
    table.index(['event_name']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('analytics_events');
}
