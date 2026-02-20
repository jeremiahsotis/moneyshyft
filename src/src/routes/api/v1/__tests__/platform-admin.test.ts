import express from 'express';
import request from 'supertest';

const mockCreateTenant = jest.fn();
const mockUpsertTenantModuleEntitlement = jest.fn();
const mockCreateOrgUnit = jest.fn();
const mockUpdateOrgUnit = jest.fn();
const mockUpsertTenantMembership = jest.fn();
const mockRevokeTenantMembership = jest.fn();
const mockUpsertOrgUnitMembership = jest.fn();
const mockRevokeOrgUnitMembership = jest.fn();
const mockEvaluateRequestCapabilities = jest.fn();

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: '11111111-1111-4111-8111-111111111111',
      email: 'user-1@example.com',
      householdId: '22222222-2222-4222-8222-222222222222',
      activeTenantId: '22222222-2222-4222-8222-222222222222',
      activeOrgUnitId: null,
      role: 'SYSTEM_ADMIN',
    };
    next();
  },
}));

jest.mock('../../../../services/PlatformAdminService', () => ({
  createTenant: (...args: unknown[]) => mockCreateTenant(...args),
  upsertTenantModuleEntitlement: (...args: unknown[]) => mockUpsertTenantModuleEntitlement(...args),
  createOrgUnit: (...args: unknown[]) => mockCreateOrgUnit(...args),
  updateOrgUnit: (...args: unknown[]) => mockUpdateOrgUnit(...args),
  parseRoleSetBody: (value: unknown) => Array.isArray(value) ? value : [],
  upsertTenantMembership: (...args: unknown[]) => mockUpsertTenantMembership(...args),
  revokeTenantMembership: (...args: unknown[]) => mockRevokeTenantMembership(...args),
  upsertOrgUnitMembership: (...args: unknown[]) => mockUpsertOrgUnitMembership(...args),
  revokeOrgUnitMembership: (...args: unknown[]) => mockRevokeOrgUnitMembership(...args),
  evaluateRequestCapabilities: (...args: unknown[]) => mockEvaluateRequestCapabilities(...args),
}));

jest.mock('../../../../config/knex', () => ({
  __esModule: true,
  default: {},
}));

import router from '../platform-admin';

describe('platform admin routes', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/platform/admin', router);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates required tenant creation input', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/platform/admin/tenants')
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'TENANT_NAME_REQUIRED',
    });
  });

  it('returns refusal envelope when capability checks fail', async () => {
    const app = buildApp();
    mockCreateTenant.mockRejectedValue(new Error('FORBIDDEN:platform:tenant:create'));

    const response = await request(app)
      .post('/api/v1/platform/admin/tenants')
      .send({ name: 'Tenant A' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
    });
  });

  it('returns success envelope for tenant creation', async () => {
    const app = buildApp();
    mockCreateTenant.mockResolvedValue({
      tenant: {
        id: 'tenant-a',
        name: 'Tenant A',
        status: 'active',
      },
      billingAccount: null,
    });

    const response = await request(app)
      .post('/api/v1/platform/admin/tenants')
      .send({ name: 'Tenant A' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'TENANT_CREATED',
      data: {
        tenant: {
          id: 'tenant-a',
          name: 'Tenant A',
          status: 'active',
        },
      },
    });
  });

  it('validates module entitlement toggle payload', async () => {
    const app = buildApp();

    const response = await request(app)
      .put('/api/v1/platform/admin/module-entitlements')
      .send({ moduleKey: 'dispatch', enabled: true });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'MODULE_ENTITLEMENT_INPUT_INVALID',
    });
  });

  it('returns forbidden refusal for unauthorized initial tenant-admin assignment during tenant creation', async () => {
    const app = buildApp();
    mockCreateTenant.mockRejectedValue(new Error('FORBIDDEN:platform:tenant_admin:assign'));

    const response = await request(app)
      .post('/api/v1/platform/admin/tenants')
      .send({
        name: 'Tenant A',
        assignTenantAdminUserId: '33333333-3333-4333-8333-333333333333',
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
    });
  });

  it('returns forbidden refusal for unauthorized initial tenant-admin assignment during membership upsert', async () => {
    const app = buildApp();
    mockUpsertTenantMembership.mockRejectedValue(new Error('FORBIDDEN:platform:tenant_admin:assign'));

    const response = await request(app)
      .post('/api/v1/platform/admin/tenant-memberships')
      .send({
        userId: '33333333-3333-4333-8333-333333333333',
        roleSet: ['TENANT_ADMIN'],
        reason: 'bootstrap-admin',
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions for tenant membership update',
    });
  });
});
