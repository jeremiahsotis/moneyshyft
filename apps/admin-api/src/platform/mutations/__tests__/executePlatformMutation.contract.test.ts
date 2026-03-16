import knex, { Knex } from 'knex';
import { executePlatformMutation } from '../executePlatformMutation';

const DATABASE_URL = process.env.MONEYSHYFT_TEST_DATABASE_URL;
const shouldRun = Boolean(DATABASE_URL);
const FIXTURE_SCHEMA = 'platform_mutation_contract_admin';
const TEST_TENANT_ID = '77777777-7777-4777-8777-777777777777';
const TEST_ACTOR_ID = '88888888-8888-4888-8888-888888888888';
const SUCCESS_EVENT_NAME = 'kernel.mutation.accepted.admin-contract';
const FAIL_EVENT_NAME = 'kernel.mutation.force-outbox-fail.admin-contract';
const OUTBOX_FAILURE_FUNCTION = 'raise_outbox_fail_admin_contract';
const OUTBOX_FAILURE_TRIGGER = 'trg_outbox_fail_admin_contract';

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
    await db.raw(`CREATE SCHEMA IF NOT EXISTS ${FIXTURE_SCHEMA}`);

    if (!(await db.schema.hasTable('users'))) {
      await db.schema.createTable('users', (table) => {
        table.uuid('id').primary();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('first_name', 100).notNullable();
        table.string('last_name', 100).notNullable();
        table.uuid('household_id').nullable();
        table.string('role', 50).notNullable().defaultTo('member');
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(db.fn.now());
        table.timestamp('last_login_at').nullable();
      });
    }

    if (!(await db.schema.hasColumn('users', 'email'))) {
      await db.schema.alterTable('users', (table) => {
        table.string('email', 255).nullable();
      });
    }
    if (!(await db.schema.hasColumn('users', 'password_hash'))) {
      await db.schema.alterTable('users', (table) => {
        table.string('password_hash', 255).nullable();
      });
    }
    if (!(await db.schema.hasColumn('users', 'first_name'))) {
      await db.schema.alterTable('users', (table) => {
        table.string('first_name', 100).nullable();
      });
    }
    if (!(await db.schema.hasColumn('users', 'last_name'))) {
      await db.schema.alterTable('users', (table) => {
        table.string('last_name', 100).nullable();
      });
    }
    if (!(await db.schema.hasColumn('users', 'household_id'))) {
      await db.schema.alterTable('users', (table) => {
        table.uuid('household_id').nullable();
      });
    }
    if (!(await db.schema.hasColumn('users', 'role'))) {
      await db.schema.alterTable('users', (table) => {
        table.string('role', 50).nullable().defaultTo('member');
      });
    }
    if (!(await db.schema.hasColumn('users', 'created_at'))) {
      await db.schema.alterTable('users', (table) => {
        table.timestamp('created_at').nullable().defaultTo(db.fn.now());
      });
    }
    if (!(await db.schema.hasColumn('users', 'updated_at'))) {
      await db.schema.alterTable('users', (table) => {
        table.timestamp('updated_at').nullable().defaultTo(db.fn.now());
      });
    }
    if (!(await db.schema.hasColumn('users', 'last_login_at'))) {
      await db.schema.alterTable('users', (table) => {
        table.timestamp('last_login_at').nullable();
      });
    }

    if (!(await db.schema.withSchema('platform').hasTable('tenants'))) {
      await db.schema.withSchema('platform').createTable('tenants', (table) => {
        table.uuid('id').primary();
        table.string('name', 255).notNullable();
        table.string('status', 32).notNullable().defaultTo('active');
        table.timestamp('created_at_utc').notNullable().defaultTo(db.fn.now());
        table.timestamp('updated_at_utc').notNullable().defaultTo(db.fn.now());
      });
    }

    if (!(await db.schema.withSchema(FIXTURE_SCHEMA).hasTable('kernel_mutation_rows'))) {
      await db.schema.withSchema(FIXTURE_SCHEMA).createTable('kernel_mutation_rows', (table) => {
        table.uuid('id').primary();
        table.string('value').notNullable();
      });
    }

    if (!(await db.schema.withSchema('platform').hasTable('events'))) {
      await db.schema.withSchema('platform').createTable('events', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
        table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.string('event_name', 150).notNullable();
        table.string('entity_type', 100).notNullable();
        table.uuid('entity_id').notNullable();
        table.timestamp('occurred_at_utc').notNullable().defaultTo(db.fn.now());
        table.jsonb('payload').notNullable().defaultTo('{}');
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
      });
    }

    if (!(await db.schema.withSchema('platform').hasTable('outbox_events'))) {
      await db.schema.withSchema('platform').createTable('outbox_events', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table
          .uuid('event_id')
          .notNullable()
          .unique()
          .references('id')
          .inTable('platform.events')
          .onDelete('CASCADE');
        table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
        table.string('event_name', 150).notNullable();
        table.string('entity_type', 100).notNullable();
        table.uuid('entity_id').notNullable();
        table.timestamp('occurred_at_utc').notNullable();
        table.jsonb('payload').notNullable().defaultTo('{}');
        table.string('delivery_status', 30).notNullable().defaultTo('pending');
        table.integer('delivery_attempts').notNullable().defaultTo(0);
        table.timestamp('available_at_utc').notNullable().defaultTo(db.fn.now());
      });
    }

    await db.withSchema('platform').table('tenants').insert({
      id: TEST_TENANT_ID,
      name: 'Admin Contract Tenant',
      status: 'active',
    }).onConflict('id').ignore();

    await db('users').insert({
      id: TEST_ACTOR_ID,
      email: 'admin-contract@example.com',
      password_hash: 'not-used',
      first_name: 'Admin',
      last_name: 'Contract',
      role: 'member',
    }).onConflict('id').ignore();

    await db.raw(`
      CREATE OR REPLACE FUNCTION platform.${OUTBOX_FAILURE_FUNCTION}()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.event_name = '${FAIL_EVENT_NAME}' THEN
          RAISE EXCEPTION 'forced contract outbox failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await db.raw(`DROP TRIGGER IF EXISTS ${OUTBOX_FAILURE_TRIGGER} ON platform.outbox_events`);
    await db.raw(`
      CREATE TRIGGER ${OUTBOX_FAILURE_TRIGGER}
      BEFORE INSERT ON platform.outbox_events
      FOR EACH ROW
      EXECUTE FUNCTION platform.${OUTBOX_FAILURE_FUNCTION}()
    `);
  });

  afterAll(async () => {
    await db.raw(`DROP TRIGGER IF EXISTS ${OUTBOX_FAILURE_TRIGGER} ON platform.outbox_events`);
    await db.raw(`DROP FUNCTION IF EXISTS platform.${OUTBOX_FAILURE_FUNCTION}()`);
    await db.withSchema(FIXTURE_SCHEMA).table('kernel_mutation_rows').whereNotNull('id').del();
    await db.withSchema('platform').table('outbox_events').whereIn('event_name', [SUCCESS_EVENT_NAME, FAIL_EVENT_NAME]).del();
    await db.withSchema('platform').table('events').whereIn('event_name', [SUCCESS_EVENT_NAME, FAIL_EVENT_NAME]).del();
    await db.withSchema('platform').table('tenants').where({ id: TEST_TENANT_ID }).del();
    await db('users').where({ id: TEST_ACTOR_ID }).del();
    await db.destroy();
  });

  afterEach(async () => {
    await db.withSchema(FIXTURE_SCHEMA).table('kernel_mutation_rows').del();
    await db.withSchema('platform').table('outbox_events').whereIn('event_name', [SUCCESS_EVENT_NAME, FAIL_EVENT_NAME]).del();
    await db.withSchema('platform').table('events').whereIn('event_name', [SUCCESS_EVENT_NAME, FAIL_EVENT_NAME]).del();
  });

  it('commits domain + event + outbox atomically in postgres', async () => {
    const mutationId = '33333333-3333-4333-8333-333333333333';

    await executePlatformMutation(
      {
        mutation: async (trx) => {
          await trx.withSchema(FIXTURE_SCHEMA).table('kernel_mutation_rows').insert({ id: mutationId, value: 'accepted' });
          return { id: mutationId };
        },
        event: {
          tenantId: TEST_TENANT_ID,
          actorId: TEST_ACTOR_ID,
          eventName: SUCCESS_EVENT_NAME,
          entityType: 'kernel_mutation_row',
          entityId: mutationId,
          payload: { value: 'accepted' },
        },
      },
      db
    );

    const rows = await db.withSchema(FIXTURE_SCHEMA).table('kernel_mutation_rows');
    const events = await db.withSchema('platform').table('events').where({ event_name: SUCCESS_EVENT_NAME });
    const outbox = await db.withSchema('platform').table('outbox_events').where({ event_name: SUCCESS_EVENT_NAME });

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
            await trx.withSchema(FIXTURE_SCHEMA).table('kernel_mutation_rows').insert({ id: mutationId, value: 'rollback-me' });
            return { id: mutationId };
          },
          event: {
            tenantId: TEST_TENANT_ID,
            actorId: TEST_ACTOR_ID,
            eventName: FAIL_EVENT_NAME,
            entityType: 'kernel_mutation_row',
            entityId: mutationId,
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow();

    const rows = await db.withSchema(FIXTURE_SCHEMA).table('kernel_mutation_rows');
    const events = await db.withSchema('platform').table('events').where({ event_name: FAIL_EVENT_NAME });
    const outbox = await db.withSchema('platform').table('outbox_events').where({ event_name: FAIL_EVENT_NAME });

    expect(rows).toHaveLength(0);
    expect(events).toHaveLength(0);
    expect(outbox).toHaveLength(0);
  });
});
