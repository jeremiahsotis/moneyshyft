import {
  isTenantPrivileged,
  OrgUnitAccessStore,
  validateOrgUnitScopedAccess,
} from '../orgUnitAccess';

const createStore = (overrides: Partial<OrgUnitAccessStore> = {}): OrgUnitAccessStore => {
  return {
    findTenantMembership: jest.fn(async () => ({
      roleSetJson: JSON.stringify(['TENANT_STAFF']),
    })),
    findOrgUnit: jest.fn(async () => ({
      id: 'org-1',
      tenantId: 'tenant-1',
    })),
    findOrgUnitMembership: jest.fn(async () => ({
      roleSetJson: JSON.stringify(['ORGUNIT_MEMBER']),
    })),
    ...overrides,
  };
};

describe('orgUnit access validation', () => {
  it('requires tenant membership before orgunit access is evaluated', async () => {
    const store = createStore({
      findTenantMembership: jest.fn(async () => null),
    });

    await expect(validateOrgUnitScopedAccess(store, {
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      userId: 'user-1',
      baseRoles: ['TENANT_STAFF'],
    })).resolves.toEqual({
      ok: false,
      reason: 'TENANT_MEMBERSHIP_REQUIRED',
    });
  });

  it('rejects orgunit access when orgunit does not belong to tenant context', async () => {
    const store = createStore({
      findOrgUnit: jest.fn(async () => ({
        id: 'org-1',
        tenantId: 'tenant-2',
      })),
    });

    await expect(validateOrgUnitScopedAccess(store, {
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      userId: 'user-1',
      baseRoles: ['TENANT_STAFF'],
    })).resolves.toEqual({
      ok: false,
      reason: 'ORG_UNIT_TENANT_MISMATCH',
    });
  });

  it('bypasses orgunit membership only when tenant-privileged capability is present', async () => {
    const store = createStore({
      findTenantMembership: jest.fn(async () => ({
        roleSetJson: JSON.stringify(['TENANT_ADMIN']),
      })),
      findOrgUnitMembership: jest.fn(async () => null),
    });

    await expect(validateOrgUnitScopedAccess(store, {
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      userId: 'user-1',
      baseRoles: ['TENANT_ADMIN'],
    })).resolves.toMatchObject({
      ok: true,
      bypassedOrgUnitMembership: true,
    });
  });

  it('includes orgunit role-set capabilities in effective roles when membership exists', async () => {
    const store = createStore({
      findTenantMembership: jest.fn(async () => ({
        roleSetJson: JSON.stringify(['TENANT_ADMIN']),
      })),
      findOrgUnitMembership: jest.fn(async () => ({
        roleSetJson: JSON.stringify(['ORGUNIT_ADMIN']),
      })),
    });

    await expect(validateOrgUnitScopedAccess(store, {
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      userId: 'user-1',
      baseRoles: ['ORGUNIT_MEMBER'],
    })).resolves.toMatchObject({
      ok: true,
      bypassedOrgUnitMembership: true,
      effectiveRoles: expect.arrayContaining([
        'TENANT_ADMIN',
        'ORGUNIT_MEMBER',
        'ORGUNIT_ADMIN',
      ]),
    });
  });

  it('requires orgunit membership for non-privileged tenant scope', async () => {
    const store = createStore({
      findTenantMembership: jest.fn(async () => ({
        roleSetJson: JSON.stringify([]),
      })),
      findOrgUnitMembership: jest.fn(async () => null),
    });

    await expect(validateOrgUnitScopedAccess(store, {
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      userId: 'user-1',
      baseRoles: ['ORGUNIT_MEMBER'],
    })).resolves.toEqual({
      ok: false,
      reason: 'ORG_UNIT_MEMBERSHIP_REQUIRED',
    });
  });

  it('accepts orgunit membership for non-privileged tenant roles', async () => {
    const store = createStore({
      findTenantMembership: jest.fn(async () => ({
        roleSetJson: JSON.stringify([]),
      })),
    });

    await expect(validateOrgUnitScopedAccess(store, {
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      userId: 'user-1',
      baseRoles: ['ORGUNIT_MEMBER'],
    })).resolves.toMatchObject({
      ok: true,
      bypassedOrgUnitMembership: false,
    });
  });

  it('treats capability checks as the source of tenant-privileged bypass', () => {
    expect(isTenantPrivileged(['TENANT_STAFF'])).toBe(true);
    expect(isTenantPrivileged(['ORGUNIT_MEMBER'])).toBe(false);
  });
});
