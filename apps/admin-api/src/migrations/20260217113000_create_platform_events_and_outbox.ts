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
    table.index(['delivery_status', 'available_at_utc', 'leased_until_utc']);
    table.index(['event_name', 'occurred_at_utc']);
  });

  await knex.raw(`
    ALTER TABLE platform.outbox_events
    ADD CONSTRAINT outbox_events_delivery_status_chk
    CHECK (delivery_status IN ('pending', 'leased', 'delivered', 'failed'))
  `);

  await knex.raw(`
    ALTER TABLE platform.outbox_events
    ADD CONSTRAINT outbox_events_delivery_attempts_nonnegative_chk
    CHECK (delivery_attempts >= 0)
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION platform.set_outbox_events_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    CREATE TRIGGER trg_outbox_events_set_updated_at
    BEFORE UPDATE ON platform.outbox_events
    FOR EACH ROW
    EXECUTE FUNCTION platform.set_outbox_events_updated_at()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_outbox_events_set_updated_at ON platform.outbox_events');
  await knex.raw('DROP FUNCTION IF EXISTS platform.set_outbox_events_updated_at()');
  await knex.schema.withSchema('platform').dropTableIfExists('outbox_events');
  await knex.schema.withSchema('platform').dropTableIfExists('events');
}
