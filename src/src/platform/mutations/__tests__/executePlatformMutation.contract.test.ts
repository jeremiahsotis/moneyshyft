import knex, { Knex } from 'knex';
import { executePlatformMutation } from '../executePlatformMutation';

const DATABASE_URL = process.env.MONEYSHYFT_TEST_DATABASE_URL;
const shouldRun = Boolean(DATABASE_URL);

const describeIfDb = shouldRun ? describe : describe.skip;

describeIfDb('executePlatformMutation (postgres contract)', () => {
  let db: Knex;

  beforeAll(async () => {
    db = knex({
      client: 'pg',
      connection: DATABASE_URL,
    });

    await db.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await db.raw('CREATE SCHEMA IF NOT EXISTS platform');
    await db.schema.dropTableIfExists('kernel_mutation_rows');
    await db.schema.withSchema('platform').dropTableIfExists('outbox_events');
    await db.schema.withSchema('platform').dropTableIfExists('events');
    await db.schema.dropTableIfExists('users');
    await db.schema.dropTableIfExists('households');

    await db.schema.createTable('households', (table) => {
      table.uuid('id').primary();
    });

    await db.schema.createTable('users', (table) => {
      table.uuid('id').primary();
    });

    await db.schema.createTable('kernel_mutation_rows', (table) => {
      table.uuid('id').primary();
      table.string('value').notNullable();
    });

    await db.schema.withSchema('platform').createTable('events', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
      table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('event_name', 150).notNullable();
      table.string('entity_type', 100).notNullable();
      table.uuid('entity_id').notNullable();
      table.timestamp('occurred_at_utc').notNullable().defaultTo(db.fn.now());
      table.jsonb('payload').notNullable().defaultTo('{}');
    });

    await db.schema.withSchema('platform').createTable('outbox_events', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
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
      table.timestamp('available_at_utc').notNullable().defaultTo(db.fn.now());
    });

    await db.raw(`
      ALTER TABLE platform.outbox_events
      ADD CONSTRAINT outbox_events_event_name_guard
      CHECK (event_name <> 'kernel.mutation.force-outbox-fail')
    `);

    await db('households').insert({ id: '11111111-1111-4111-8111-111111111111' });
    await db('users').insert({ id: '22222222-2222-4222-8222-222222222222' });
  });

  afterAll(async () => {
    await db.schema.dropTableIfExists('kernel_mutation_rows');
    await db.schema.withSchema('platform').dropTableIfExists('outbox_events');
    await db.schema.withSchema('platform').dropTableIfExists('events');
    await db.schema.dropTableIfExists('users');
    await db.schema.dropTableIfExists('households');
    await db.destroy();
  });

  afterEach(async () => {
    await db('kernel_mutation_rows').del();
    await db.withSchema('platform').table('outbox_events').del();
    await db.withSchema('platform').table('events').del();
  });

  it('commits domain + event + outbox atomically in postgres', async () => {
    const mutationId = '33333333-3333-4333-8333-333333333333';

    await executePlatformMutation(
      {
        mutation: async (trx) => {
          await trx('kernel_mutation_rows').insert({ id: mutationId, value: 'accepted' });
          return { id: mutationId };
        },
        event: {
          tenantId: '11111111-1111-4111-8111-111111111111',
          actorId: '22222222-2222-4222-8222-222222222222',
          eventName: 'kernel.mutation.accepted',
          entityType: 'kernel_mutation_row',
          entityId: mutationId,
          payload: { value: 'accepted' },
        },
      },
      db
    );

    const rows = await db('kernel_mutation_rows');
    const events = await db.withSchema('platform').table('events');
    const outbox = await db.withSchema('platform').table('outbox_events');

    expect(rows).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].event_id).toBe(events[0].id);
  });

  it('rolls back domain write when outbox insert fails in postgres', async () => {
    const mutationId = '44444444-4444-4444-8444-444444444444';

    await expect(
      executePlatformMutation(
        {
          mutation: async (trx) => {
            await trx('kernel_mutation_rows').insert({ id: mutationId, value: 'rollback-me' });
            return { id: mutationId };
          },
          event: {
            tenantId: '11111111-1111-4111-8111-111111111111',
            actorId: '22222222-2222-4222-8222-222222222222',
            eventName: 'kernel.mutation.force-outbox-fail',
            entityType: 'kernel_mutation_row',
            entityId: mutationId,
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow();

    const rows = await db('kernel_mutation_rows');
    const events = await db.withSchema('platform').table('events');
    const outbox = await db.withSchema('platform').table('outbox_events');

    expect(rows).toHaveLength(0);
    expect(events).toHaveLength(0);
    expect(outbox).toHaveLength(0);
  });
});
