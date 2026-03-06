import express from 'express';
import request from 'supertest';

const mockEvaluateRequestCapabilities = jest.fn();
const mockEnsureScopedAdminUser = jest.fn();
const mockCreateMapping = jest.fn();
const mockUpdateMapping = jest.fn();

type MockDbInsertCall = {
  table: string;
  payload: unknown;
};

type MockDbUpdateCall = {
  table: string;
  payload: unknown;
};

const mockDbState: {
  firstByTable: Map<string, unknown>;
  selectByTable: Map<string, unknown[]>;
  insertCalls: MockDbInsertCall[];
  updateCalls: MockDbUpdateCall[];
} = {
  firstByTable: new Map<string, unknown>(),
  selectByTable: new Map<string, unknown[]>(),
  insertCalls: [],
  updateCalls: [],
};

const createMockQuery = (table: string) => {
  const query: any = {};

  query.where = jest.fn(() => query);
  query.andWhere = jest.fn(() => query);
  query.whereIn = jest.fn(() => query);
  query.andWhereRaw = jest.fn(() => query);
  query.orderBy = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.offset = jest.fn(() => query);
  query.clone = jest.fn(() => query);
  query.count = jest.fn(() => query);
  query.first = jest.fn(async () => mockDbState.firstByTable.get(table) ?? null);
  query.select = jest.fn(async () => mockDbState.selectByTable.get(table) ?? []);
  query.del = jest.fn(async () => 1);
  query.update = jest.fn(async (payload: unknown) => {
    mockDbState.updateCalls.push({ table, payload });
    return 1;
  });
  query.insert = jest.fn((payload: unknown) => {
    mockDbState.insertCalls.push({ table, payload });
    const result = undefined;
    const conflictResult = {
      ignore: jest.fn(async () => undefined),
      merge: jest.fn(async () => undefined),
    };
    const insertQuery: any = {
      onConflict: jest.fn(() => conflictResult),
      returning: jest.fn(async () => []),
      catch: (handler: (error: unknown) => unknown) => Promise.resolve(result).catch(handler),
      then: (
        resolve: (value: unknown) => unknown,
        reject?: (error: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return insertQuery;
  });

  return query;
};

const mockDb = {
  withSchema: jest.fn(() => ({
    table: (table: string) => createMockQuery(table),
  })),
  fn: {
    now: jest.fn(() => '2026-02-24T00:00:00.000Z'),
  },
};

jest.mock('../../../../config/knex', () => ({
  __esModule: true,
  default: mockDb,
}));

jest.mock('../../../../services/PlatformAdminService', () => ({
  evaluateRequestCapabilities: (...args: unknown[]) => mockEvaluateRequestCapabilities(...args),
  ensureScopedAdminUser: (...args: unknown[]) => mockEnsureScopedAdminUser(...args),
}));

jest.mock('../../../../modules/connectshyft/numberMappings', () => ({
  connectShyftNumberMappingServiceAsync: {
    createMapping: (...args: unknown[]) => mockCreateMapping(...args),
    updateMapping: (...args: unknown[]) => mockUpdateMapping(...args),
  },
}));

import router from '../platform-admin-console';

const TENANT_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR_USER_ID = '11111111-1111-4111-8111-111111111111';
const NODE_ID = '33333333-3333-4333-8333-333333333333';
const NEW_PARENT_ID = '44444444-4444-4444-8444-444444444444';

const buildApp = (role = 'SYSTEM_ADMIN') => {
  const app = express();
  app.use(express.json());
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: ACTOR_USER_ID,
      email: 'system-admin@example.com',
      householdId: TENANT_ID,
      activeTenantId: TENANT_ID,
      activeOrgUnitId: null,
      role,
    };
    next();
  });
  app.use('/api/v1/platform/admin', router);
  return app;
};

describe('platform admin console routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbState.firstByTable.clear();
    mockDbState.selectByTable.clear();
    mockDbState.insertCalls = [];
    mockDbState.updateCalls = [];
    mockEvaluateRequestCapabilities.mockResolvedValue({
      roles: ['SYSTEM_ADMIN'],
    });
  });

  it('requires Idempotency-Key for integrity fixes', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/platform/admin/integrity/fix')
      .send({
        tenantId: TENANT_ID,
        actionType: 'MOVE_NODE',
        target: { nodeId: NODE_ID },
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  });

  it('returns refusal envelope for unsupported integrity fix action', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/platform/admin/integrity/fix')
      .set('Idempotency-Key', 'fix-unsupported-1')
      .send({
        tenantId: TENANT_ID,
        actionType: 'UNKNOWN_ACTION',
        target: {},
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'INTEGRITY_FIX_ACTION_UNSUPPORTED',
      refusalType: 'client',
    });
    expect(mockDbState.insertCalls.some((call) => call.table === 'idempotency_requests')).toBe(true);
  });

  it('returns client refusal when MOVE_NODE is missing target node id', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/platform/admin/integrity/fix')
      .set('Idempotency-Key', 'fix-move-invalid-1')
      .send({
        tenantId: TENANT_ID,
        actionType: 'MOVE_NODE',
        target: {
          newParentId: NEW_PARENT_ID,
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'TARGET_NODE_REQUIRED',
      refusalType: 'client',
    });
  });

  it('applies MOVE_NODE fix action and returns success envelope', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/v1/platform/admin/integrity/fix')
      .set('Idempotency-Key', 'fix-move-success-1')
      .send({
        tenantId: TENANT_ID,
        actionType: 'MOVE_NODE',
        target: {
          nodeId: NODE_ID,
          newParentId: NEW_PARENT_ID,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'INTEGRITY_FIX_APPLIED',
      data: {
        tenantId: TENANT_ID,
        actionType: 'MOVE_NODE',
      },
    });
    expect(mockDbState.updateCalls).toContainEqual({
      table: 'org_units',
      payload: expect.objectContaining({
        parent_org_unit_id: NEW_PARENT_ID,
      }),
    });
  });

  it('requires system role when querying audit events without explicit tenantId', async () => {
    mockEvaluateRequestCapabilities.mockResolvedValueOnce({
      roles: ['TENANT_ADMIN'],
    });

    const app = buildApp('TENANT_ADMIN');
    const response = await request(app).get('/api/v1/platform/admin/audit/events');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
      refusalType: 'security',
    });
  });
});
