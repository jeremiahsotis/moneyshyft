import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS platform');

  await knex.schema.withSchema('platform').createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('household_id').references('id').inTable('households').onDelete('SET NULL');
    table.string('refresh_token_hash', 64).notNullable().unique();
    table.boolean('remember_me').notNullable().defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.timestamp('revoked_at');
    table.string('revoked_reason', 100);
    table
      .uuid('rotated_to_session_id')
      .references('id')
      .inTable('platform.sessions')
      .onDelete('SET NULL');
    table.timestamp('last_used_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['household_id']);
    table.index(['expires_at']);
    table.index(['revoked_at']);
    table.index(['rotated_to_session_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').dropTableIfExists('sessions');
}
