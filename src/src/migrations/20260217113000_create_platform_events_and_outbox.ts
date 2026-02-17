import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS platform');

  await knex.schema.withSchema('platform').createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('event_name', 150).notNullable();
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.timestamp('occurred_at_utc').notNullable().defaultTo(knex.fn.now());
    table.jsonb('payload').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['tenant_id', 'occurred_at_utc']);
    table.index(['entity_type', 'entity_id', 'occurred_at_utc']);
    table.index(['event_name', 'occurred_at_utc']);
  });

  await knex.schema.withSchema('platform').createTable('outbox_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('event_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('platform.events')
      .onDelete('CASCADE');

    table.uuid('tenant_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('event_name', 150).notNullable();
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.timestamp('occurred_at_utc').notNullable();
    table.jsonb('payload').notNullable().defaultTo('{}');

    table.string('delivery_status', 30).notNullable().defaultTo('pending');
    table.integer('delivery_attempts').notNullable().defaultTo(0);
    table.timestamp('available_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('leased_until_utc');
    table.timestamp('delivered_at_utc');
    table.text('last_delivery_error');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['delivery_status', 'available_at_utc']);
    table.index(['tenant_id', 'delivery_status', 'available_at_utc']);
    table.index(['event_name', 'occurred_at_utc']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').dropTableIfExists('outbox_events');
  await knex.schema.withSchema('platform').dropTableIfExists('events');
}
