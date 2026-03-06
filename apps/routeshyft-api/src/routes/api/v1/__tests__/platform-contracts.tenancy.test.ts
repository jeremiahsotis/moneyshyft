import express from 'express';
import request from 'supertest';

const mockCreateKnexOrgUnitAccessStore = jest.fn();
const mockValidateOrgUnitScopedAccess = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../../../platform/tenancy/orgUnitAccess', () => {
  const actual = jest.requireActual('../../../../platform/tenancy/orgUnitAccess');
  return {
    ...actual,
    createKnexOrgUnitAccessStore: (...args: unknown[]) => mockCreateKnexOrgUnitAccessStore(...args),
    validateOrgUnitScopedAccess: (...args: unknown[]) => mockValidateOrgUnitScopedAccess(...args),
  };
});

jest.mock('../../../../config/knex', () => ({
  __esModule: true,
  default: {
    transaction: (...args: unknown[]) => mockTransaction(...args),
    queryBuilder: jest.fn(),
  },
}));

import router from '../platform-contracts';

type BuildAppOptions = {
  tenantId: string;
  orgUnitId: string | null;
  role: string;
  userId: string;
};

const buildApp = (options: BuildAppOptions) => {
  const app = express();
  app.use(express.json());

  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const scopeMode = options.orgUnitId ? 'ORG_UNIT' : 'TENANT';
    req.correlationId = 'corr-tenancy-test';
    req.tenantId = options.tenantId;
    req.orgUnitId = options.orgUnitId;
    req.scopeMode = scopeMode;
    req.user = {
      userId: options.userId,
      email: `${options.userId}@example.com`,
      householdId: options.tenantId,
      activeTenantId: options.tenantId,
      activeOrgUnitId: options.orgUnitId,
      role: options.role,
    };
    req.tenantContext = {
      tenantId: options.tenantId,
      orgUnitId: options.orgUnitId,
      scopeMode,
      source: 'auth',
    };
    next();
  });

  app.use('/api/v1/platform', router);
  return app;
};

describe('platform contracts tenancy diagnostics orgUnit access controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateKnexOrgUnitAccessStore.mockReturnValue({});
    mockTransaction.mockImplementation(async (callback: (trx: unknown) => unknown) => callback({}));
  });

  it('returns TENANT_SCOPE_VIOLATION when orgUnit scope lacks tenant membership', async () => {
    mockValidateOrgUnitScopedAccess.mockResolvedValue({
      ok: false,
      reason: 'TENANT_MEMBERSHIP_REQUIRED',
    });

    const app = buildApp({
      tenantId: 'tenant-alpha',
      orgUnitId: 'org-alpha',
      role: 'ORGUNIT_MEMBER',
      userId: 'user-alpha',
    });

    const response = await request(app).get('/api/v1/platform/_kernel/tenancy/diagnostics');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      message: 'Tenant membership is required for orgUnit-scoped access',
    });
  });

  it('returns bypassedOrgUnitMembership=true when tenant-privileged capability bypass applies', async () => {
    mockValidateOrgUnitScopedAccess.mockResolvedValue({
      ok: true,
      bypassedOrgUnitMembership: true,
      effectiveRoles: ['TENANT_ADMIN'],
    });

    const app = buildApp({
      tenantId: 'tenant-admin',
      orgUnitId: 'org-admin',
      role: 'TENANT_ADMIN',
      userId: 'user-admin',
    });

    const response = await request(app).get('/api/v1/platform/_kernel/tenancy/diagnostics');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'TENANCY_DIAGNOSTICS_READY',
      tenantId: 'tenant-admin',
      orgUnitId: 'org-admin',
      scopeMode: 'ORG_UNIT',
      bypassedOrgUnitMembership: true,
    });
    expect(mockValidateOrgUnitScopedAccess).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: 'tenant-admin',
        orgUnitId: 'org-admin',
        userId: 'user-admin',
        baseRoles: ['TENANT_ADMIN'],
      })
    );
  });
});
