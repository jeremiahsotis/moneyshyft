import express from 'express';
import request from 'supertest';

const mockExecutePlatformMutation = jest.fn();

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: 'user-1',
      email: 'user-1@example.com',
      householdId: 'tenant-1',
      activeTenantId: 'tenant-1',
      activeOrgUnitId: null,
      role: 'SYSTEM_ADMIN',
    };
    next();
  },
}));

jest.mock('../../../../platform/mutations/executePlatformMutation', () => ({
  executePlatformMutation: (...args: unknown[]) => mockExecutePlatformMutation(...args),
}));

jest.mock('../../../../config/knex', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(),
  },
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
    mockExecutePlatformMutation.mockRejectedValue(new Error('FORBIDDEN:platform:tenant:create'));

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
    mockExecutePlatformMutation.mockResolvedValue({
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
});
