import express from 'express';
import request from 'supertest';

let activeScopeMode: 'TENANT' | 'ORG_UNIT' = 'TENANT';
const mockGetAllAccounts = jest.fn();

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: 'user-1',
      email: 'user-1@example.com',
      householdId: 'tenant-1',
      activeTenantId: 'tenant-1',
      activeOrgUnitId: activeScopeMode === 'ORG_UNIT' ? 'org-1' : null,
      role: 'TENANT_STAFF',
    };
    req.tenantId = 'tenant-1';
    req.orgUnitId = activeScopeMode === 'ORG_UNIT' ? 'org-1' : null;
    req.scopeMode = activeScopeMode;
    next();
  },
}));

jest.mock('../../../../services/AccountService', () => ({
  AccountService: {
    getAllAccounts: (...args: unknown[]) => mockGetAllAccounts(...args),
    getAccountById: jest.fn(),
    createAccount: jest.fn(),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    getAccountBalance: jest.fn(),
    recalculateBalance: jest.fn(),
  },
}));

jest.mock('../../../../services/CreditCardService', () => ({
  CreditCardService: {
    getCreditCardStatus: jest.fn(),
  },
}));

import router from '../accounts';

describe('accounts route scope guard', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/accounts', router);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    activeScopeMode = 'TENANT';
  });

  it('rejects orgUnit-scoped account access before repository calls', async () => {
    activeScopeMode = 'ORG_UNIT';
    const app = buildApp();

    const response = await request(app).get('/api/v1/accounts');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_ACCOUNTS_SCOPE_NOT_SUPPORTED',
      message: 'OrgUnit-scoped account access is not enabled for this module yet',
      refusalType: 'business',
    });
    expect(mockGetAllAccounts).not.toHaveBeenCalled();
  });

  it('allows tenant-scoped account access', async () => {
    activeScopeMode = 'TENANT';
    mockGetAllAccounts.mockResolvedValue([{ id: 'acct-1' }]);
    const app = buildApp();

    const response = await request(app).get('/api/v1/accounts');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'ACCOUNTS_LIST_RETRIEVED',
      message: 'Accounts retrieved successfully',
      data: [{ id: 'acct-1' }],
    });
    expect(mockGetAllAccounts).toHaveBeenCalledWith('tenant-1');
  });
});
