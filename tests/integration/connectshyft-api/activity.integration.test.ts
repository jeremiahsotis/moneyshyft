import knex, { Knex } from 'knex';
import request from 'supertest';
import { up as migrateThreadsUp } from '../../../apps/connectshyft-api/src/migrations/20260224170000_create_connectshyft_threads';
import { up as migratePeopleCoreIdentityFoundationUp } from '../../../apps/connectshyft-api/src/migrations/20260321100000_create_peoplecore_identity_foundation';
import { up as migrateThreadPersonIdentityUp } from '../../../apps/connectshyft-api/src/migrations/20260323180000_add_connectshyft_thread_person_identity';
import { up as migratePeopleActivitiesUp } from '../../../apps/connectshyft-api/src/migrations/20260324130000_create_people_activities';
import { up as migrateThreadActivityIdUp } from '../../../apps/connectshyft-api/src/migrations/20260324131000_add_activity_id_to_connectshyft_threads';
import {
  buildApp,
  buildHeaders,
} from '../../../apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared';

const DATABASE_URL = process.env.MONEYSHYFT_TEST_DATABASE_URL || process.env.DATABASE_URL;
const shouldRun = Boolean(DATABASE_URL);
const describeIfDb = shouldRun ? describe : describe.skip;

const TENANT_PREFIX = 'tenant-connectshyft-activity-';

const seedPerson = async (db: Knex, input: {
  tenantId: string;
  orgUnitId: string;
  personId: string;
}): Promise<void> => {
  await db
    .withSchema('people')
    .table('persons')
    .insert({
      id: input.personId,
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      first_name: 'Integration',
      last_name: 'Person',
    })
    .onConflict('id')
    .ignore();
};

const seedActivity = async (db: Knex, input: {
  activityId: string;
  createdAtUtc?: string;
  orgUnitId: string;
  personId: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  tenantId: string;
  type?: string;
}): Promise<void> => {
  await db
    .withSchema('people')
    .table('activities')
    .insert({
      id: input.activityId,
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      person_id: input.personId,
      type: input.type ?? 'housing-intake',
      status: input.status ?? 'ACTIVE',
      created_at_utc: input.createdAtUtc ?? '2026-03-23T12:00:00.000Z',
      updated_at_utc: input.createdAtUtc ?? '2026-03-23T12:00:00.000Z',
    })
    .onConflict('id')
    .ignore();
};

const seedThread = async (db: Knex, input: {
  activityId?: string | null;
  createdAtUtc?: string;
  neighborId: string;
  orgUnitId: string;
  personId: string;
  tenantId: string;
  threadId: string;
}): Promise<void> => {
  const createdAtUtc = input.createdAtUtc ?? '2026-03-23T13:00:00.000Z';

  await db
    .withSchema('connectshyft')
    .table('cs_threads')
    .insert({
      id: input.threadId,
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId,
      neighbor_id: input.neighborId,
      person_id: input.personId,
      activity_id: input.activityId ?? null,
      source: 'VOICE',
      state: 'UNCLAIMED',
      escalation_stage: 0,
      next_evaluation_at_utc: createdAtUtc,
      last_inbound_cs_number_id: `cs-inbound-${input.threadId}`,
      preferred_outbound_cs_number_id: `cs-outbound-${input.threadId}`,
      created_at_utc: createdAtUtc,
      updated_at_utc: createdAtUtc,
    })
    .onConflict('id')
    .ignore();
};

describeIfDb('connectshyft activity integration', () => {
  let db: Knex;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';

    db = knex({
      client: 'pg',
      connection: DATABASE_URL,
    });

    await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', (table) => {
        table.uuid('id').primary();
      });
    }

    await migratePeopleCoreIdentityFoundationUp(db);
    await migrateThreadsUp(db);
    await migrateThreadPersonIdentityUp(db);
    await migratePeopleActivitiesUp(db);
    await migrateThreadActivityIdUp(db);
  });

  afterEach(async () => {
    await db
      .withSchema('connectshyft')
      .table('cs_threads')
      .where('tenant_id', 'like', `${TENANT_PREFIX}%`)
      .del();
    await db
      .withSchema('people')
      .table('activities')
      .where('tenant_id', 'like', `${TENANT_PREFIX}%`)
      .del();
    await db
      .withSchema('people')
      .table('persons')
      .where('tenant_id', 'like', `${TENANT_PREFIX}%`)
      .del();
  });

  afterAll(async () => {
    await db.destroy();
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });

  it('creates an activity through POST /people/:personId/activities', async () => {
    const tenantId = `${TENANT_PREFIX}create`;
    const orgUnitId = 'org-connectshyft-activity-create-east';
    const personId = '99999999-aaaa-4999-8999-999999999991';

    await seedPerson(db, { tenantId, orgUnitId, personId });

    const response = await (request as any)(buildApp())
      .post(`/api/v1/connectshyft/people/${personId}/activities`)
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': tenantId,
        'x-test-connectshyft-orgunit-id': orgUnitId,
        'x-test-connectshyft-orgunit-memberships': JSON.stringify([orgUnitId]),
      }))
      .send({
        type: 'housing-intake',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ACTIVITY_CREATED',
      data: {
        activity: {
          tenantId,
          orgUnitId,
          personId,
          type: 'housing-intake',
          status: 'ACTIVE',
        },
      },
    });
  });

  it('lists person activities in created_at_utc order', async () => {
    const tenantId = `${TENANT_PREFIX}list`;
    const orgUnitId = 'org-connectshyft-activity-list-east';
    const personId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

    await seedPerson(db, { tenantId, orgUnitId, personId });
    await seedActivity(db, {
      tenantId,
      orgUnitId,
      personId,
      activityId: '11111111-aaaa-4111-8111-111111111111',
      type: 'first-activity',
      createdAtUtc: '2026-03-23T10:00:00.000Z',
    });
    await seedActivity(db, {
      tenantId,
      orgUnitId,
      personId,
      activityId: '22222222-aaaa-4222-8222-222222222222',
      type: 'second-activity',
      createdAtUtc: '2026-03-23T11:00:00.000Z',
    });

    const response = await (request as any)(buildApp())
      .get(`/api/v1/connectshyft/people/${personId}/activities`)
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': tenantId,
        'x-test-connectshyft-orgunit-id': orgUnitId,
        'x-test-connectshyft-orgunit-memberships': JSON.stringify([orgUnitId]),
      }));

    expect(response.status).toBe(200);
    expect(response.body.data.activities.map((activity: { id: string }) => activity.id)).toEqual([
      '11111111-aaaa-4111-8111-111111111111',
      '22222222-aaaa-4222-8222-222222222222',
    ]);
  });

  it('binds activityId on POST /threads and returns it in the thread DTO', async () => {
    const tenantId = `${TENANT_PREFIX}thread-create`;
    const orgUnitId = 'org-connectshyft-activity-thread-create-east';
    const personId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
    const activityId = '33333333-aaaa-4333-8333-333333333333';

    await seedPerson(db, { tenantId, orgUnitId, personId });
    await seedActivity(db, {
      tenantId,
      orgUnitId,
      personId,
      activityId,
    });

    const response = await (request as any)(buildApp())
      .post('/api/v1/connectshyft/threads')
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': tenantId,
        'x-test-connectshyft-orgunit-id': orgUnitId,
        'x-test-connectshyft-orgunit-memberships': JSON.stringify([orgUnitId]),
      }))
      .send({
        neighborId: 'neighbor-activity-integration-thread-create',
        personId,
        activityId,
        source: 'SMS',
        lastInboundCsNumberId: 'cs-inbound-activity-route',
        preferredOutboundCsNumberId: 'cs-outbound-activity-route',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_ENSURED',
      data: {
        thread: {
          tenantId,
          orgUnitId,
          personId,
          activityId,
        },
      },
    });
  });

  it('returns only threads bound to the requested activity', async () => {
    const tenantId = `${TENANT_PREFIX}thread-list`;
    const orgUnitId = 'org-connectshyft-activity-thread-list-east';
    const personId = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
    const activityId = '44444444-aaaa-4444-8444-444444444444';
    const otherActivityId = '55555555-aaaa-4555-8555-555555555555';

    await seedPerson(db, { tenantId, orgUnitId, personId });
    await seedActivity(db, {
      tenantId,
      orgUnitId,
      personId,
      activityId,
    });
    await seedActivity(db, {
      tenantId,
      orgUnitId,
      personId,
      activityId: otherActivityId,
      type: 'other-activity',
    });
    await seedThread(db, {
      tenantId,
      orgUnitId,
      personId,
      threadId: '66666666-6666-4666-8666-666666666666',
      neighborId: 'neighbor-activity-integration-thread-list-1',
      activityId,
      createdAtUtc: '2026-03-23T14:00:00.000Z',
    });
    await seedThread(db, {
      tenantId,
      orgUnitId,
      personId,
      threadId: '77777777-7777-4777-8777-777777777777',
      neighborId: 'neighbor-activity-integration-thread-list-2',
      activityId,
      createdAtUtc: '2026-03-23T14:05:00.000Z',
    });
    await seedThread(db, {
      tenantId,
      orgUnitId,
      personId,
      threadId: '88888888-8888-4888-8888-888888888888',
      neighborId: 'neighbor-activity-integration-thread-list-3',
      activityId: otherActivityId,
      createdAtUtc: '2026-03-23T14:10:00.000Z',
    });

    const response = await (request as any)(buildApp())
      .get(`/api/v1/connectshyft/activities/${activityId}/threads`)
      .set(buildHeaders({
        'x-test-connectshyft-tenant-id': tenantId,
        'x-test-connectshyft-orgunit-id': orgUnitId,
        'x-test-connectshyft-orgunit-memberships': JSON.stringify([orgUnitId]),
      }));

    expect(response.status).toBe(200);
    expect(response.body.data.threads.map((thread: { threadId: string }) => thread.threadId)).toEqual([
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777',
    ]);
  });
});
