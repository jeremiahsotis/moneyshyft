import type { Activity } from '../activity';
import {
  AsyncPeopleCoreService,
  PeopleCorePersistenceUnavailableError,
} from '../service';
import {
  KnexPeopleCoreStore,
  PeopleCoreScopeViolationError,
} from '../store';

const PERSON_ID = '11111111-1111-4111-8111-111111111111';
const PERSON_ID_TWO = '22222222-2222-4222-8222-222222222222';
const ACTIVITY_ID_ONE = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID_TWO = '44444444-4444-4444-8444-444444444444';

type TableFixture = {
  rows: any[];
  firstQueue: any[];
  returningQueue: any[][];
  inserted: any[];
  whereCalls: Array<Record<string, unknown>>;
  orderByCalls: Array<[string, string]>;
};

const createFixture = (input: Partial<TableFixture> = {}): TableFixture => ({
  rows: input.rows || [],
  firstQueue: input.firstQueue ? [...input.firstQueue] : [],
  returningQueue: input.returningQueue ? [...input.returningQueue] : [],
  inserted: [],
  whereCalls: [],
  orderByCalls: [],
});

const buildKnexMock = (initial: Record<string, Partial<TableFixture>> = {}) => {
  const fixtures = new Map<string, TableFixture>(
    Object.entries(initial).map(([key, value]) => [key, createFixture(value)]),
  );

  const getFixture = (key: string): TableFixture => {
    const existing = fixtures.get(key);
    if (existing) {
      return existing;
    }

    const created = createFixture();
    fixtures.set(key, created);
    return created;
  };

  const knex: any = {
    fn: {
      now: () => 'NOW()',
    },
    withSchema: (schema: string) => ({
      table: (tableName: string) => {
        const fixture = getFixture(`${schema}.${tableName}`);
        const builder: any = {
          where: (clause: Record<string, unknown>) => {
            fixture.whereCalls.push(clause);
            return builder;
          },
          orderBy: (column: string, direction: string = 'asc') => {
            fixture.orderByCalls.push([column, direction]);
            return builder;
          },
          select: async () => fixture.rows,
          first: async () => (
            fixture.firstQueue.length > 0 ? fixture.firstQueue.shift() || null : null
          ),
          insert: (value: Record<string, unknown>) => {
            fixture.inserted.push(value);
            return {
              returning: async () => (
                fixture.returningQueue.length > 0 ? fixture.returningQueue.shift() || [] : []
              ),
            };
          },
        };

        return builder;
      },
    }),
  };

  return {
    knex,
    getFixture,
  };
};

const buildActivityRow = (input: {
  id: string;
  personId: string;
  type: string;
  status: Activity['status'];
  createdAtUtc: string;
  updatedAtUtc?: string;
}) => ({
  id: input.id,
  tenant_id: 'tenant-1',
  org_unit_id: 'org-1',
  person_id: input.personId,
  type: input.type,
  status: input.status,
  created_at_utc: input.createdAtUtc,
  updated_at_utc: input.updatedAtUtc ?? input.createdAtUtc,
});

describe('PeopleCore activity persistence', () => {
  it('creates an activity with a default ACTIVE status and returns the normalized DTO', async () => {
    const createdRow = buildActivityRow({
      id: ACTIVITY_ID_ONE,
      personId: PERSON_ID,
      type: 'housing-intake',
      status: 'ACTIVE',
      createdAtUtc: '2026-03-24T13:00:00.000Z',
    });
    const { knex, getFixture } = buildKnexMock({
      'people.persons': {
        firstQueue: [{ id: PERSON_ID }],
      },
      'people.activities': {
        returningQueue: [[createdRow]],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const created = await store.createActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
      type: 'housing-intake',
    });

    expect(created).toEqual({
      id: ACTIVITY_ID_ONE,
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
      type: 'housing-intake',
      status: 'ACTIVE',
      createdAtUtc: '2026-03-24T13:00:00.000Z',
      updatedAtUtc: '2026-03-24T13:00:00.000Z',
    });
    expect(getFixture('people.persons').whereCalls).toEqual([
      {
        id: PERSON_ID,
        tenant_id: 'tenant-1',
        org_unit_id: 'org-1',
      },
    ]);
    expect(getFixture('people.activities').inserted[0]).toMatchObject({
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      person_id: PERSON_ID,
      type: 'housing-intake',
      status: 'ACTIVE',
      created_at_utc: 'NOW()',
      updated_at_utc: 'NOW()',
    });
  });

  it('gets an activity when it exists and returns null when it does not', async () => {
    const activityRow = buildActivityRow({
      id: ACTIVITY_ID_ONE,
      personId: PERSON_ID,
      type: 'food-pantry',
      status: 'COMPLETED',
      createdAtUtc: '2026-03-24T13:01:00.000Z',
    });
    const { knex, getFixture } = buildKnexMock({
      'people.activities': {
        firstQueue: [activityRow, null],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const found = await store.getActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      activityId: ACTIVITY_ID_ONE,
    });
    const missing = await store.getActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      activityId: ACTIVITY_ID_TWO,
    });

    expect(found).toEqual({
      id: ACTIVITY_ID_ONE,
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
      type: 'food-pantry',
      status: 'COMPLETED',
      createdAtUtc: '2026-03-24T13:01:00.000Z',
      updatedAtUtc: '2026-03-24T13:01:00.000Z',
    });
    expect(missing).toBeNull();
    expect(getFixture('people.activities').whereCalls).toEqual([
      {
        id: ACTIVITY_ID_ONE,
        tenant_id: 'tenant-1',
        org_unit_id: 'org-1',
      },
      {
        id: ACTIVITY_ID_TWO,
        tenant_id: 'tenant-1',
        org_unit_id: 'org-1',
      },
    ]);
  });

  it('lists activities in created order for the requested person scope', async () => {
    const firstActivity = buildActivityRow({
      id: ACTIVITY_ID_ONE,
      personId: PERSON_ID,
      type: 'housing-intake',
      status: 'ACTIVE',
      createdAtUtc: '2026-03-24T13:00:00.000Z',
    });
    const secondActivity = buildActivityRow({
      id: ACTIVITY_ID_TWO,
      personId: PERSON_ID,
      type: 'job-search',
      status: 'CANCELLED',
      createdAtUtc: '2026-03-24T13:05:00.000Z',
    });
    const { knex, getFixture } = buildKnexMock({
      'people.persons': {
        firstQueue: [{ id: PERSON_ID }],
      },
      'people.activities': {
        rows: [firstActivity, secondActivity],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const activities = await store.listActivities({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
    });

    expect(activities.map((activity) => activity.id)).toEqual([
      ACTIVITY_ID_ONE,
      ACTIVITY_ID_TWO,
    ]);
    expect(getFixture('people.activities').whereCalls).toEqual([
      {
        tenant_id: 'tenant-1',
        org_unit_id: 'org-1',
        person_id: PERSON_ID,
      },
    ]);
    expect(getFixture('people.activities').orderByCalls).toEqual([
      ['created_at_utc', 'asc'],
      ['id', 'asc'],
    ]);
  });

  it('throws PeopleCoreScopeViolationError when creating or listing outside the tenant org scope', async () => {
    const { knex } = buildKnexMock({
      'people.persons': {
        firstQueue: [null, null],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    await expect(
      store.createActivity({
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        personId: PERSON_ID_TWO,
        type: 'housing-intake',
      }),
    ).rejects.toBeInstanceOf(PeopleCoreScopeViolationError);

    await expect(
      store.listActivities({
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        personId: PERSON_ID_TWO,
      }),
    ).rejects.toBeInstanceOf(PeopleCoreScopeViolationError);
  });
});

describe('AsyncPeopleCoreService activity methods', () => {
  const activity: Activity = {
    id: ACTIVITY_ID_ONE,
    tenantId: 'tenant-1',
    orgUnitId: 'org-1',
    personId: PERSON_ID,
    type: 'housing-intake',
    status: 'ACTIVE',
    createdAtUtc: '2026-03-24T13:00:00.000Z',
    updatedAtUtc: '2026-03-24T13:00:00.000Z',
  };

  it('delegates create, get, and list activity operations to the configured store', async () => {
    const store = {
      createActivity: jest.fn(async () => activity),
      getActivity: jest.fn(async () => activity),
      listActivities: jest.fn(async () => [activity]),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.createActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
      type: 'housing-intake',
    })).resolves.toEqual(activity);
    await expect(service.getActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      activityId: ACTIVITY_ID_ONE,
    })).resolves.toEqual(activity);
    await expect(service.listActivities({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
    })).resolves.toEqual([activity]);
  });

  it.each([
    ['createActivity', (service: AsyncPeopleCoreService) => service.createActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
      type: 'housing-intake',
    })],
    ['getActivity', (service: AsyncPeopleCoreService) => service.getActivity({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      activityId: ACTIVITY_ID_ONE,
    })],
    ['listActivities', (service: AsyncPeopleCoreService) => service.listActivities({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      personId: PERSON_ID,
    })],
  ])('wraps missing persistence for %s', async (_name, invoke) => {
    const missingTableError = Object.assign(
      new Error('relation "people.activities" does not exist'),
      { code: '42P01' },
    );
    const store = {
      [_name]: jest.fn(async () => {
        throw missingTableError;
      }),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(invoke(service)).rejects.toBeInstanceOf(PeopleCorePersistenceUnavailableError);
  });
});
