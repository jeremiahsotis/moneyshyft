import { Knex } from 'knex';

const TABLE = 'password_reset_tokens';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS platform');

  const exists = await knex.schema.withSchema('platform').hasTable(TABLE);
  if (exists) {
    return;
  }

  await knex.schema.withSchema('platform').createTable(TABLE, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('requested_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('purpose', 32).notNullable().defaultTo('self-service');
    table.text('token_hash').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('consumed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['expires_at']);
    table.index(['consumed_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').dropTableIfExists(TABLE);
}
