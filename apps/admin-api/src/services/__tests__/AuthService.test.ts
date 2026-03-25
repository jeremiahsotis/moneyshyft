import AuthService from '../AuthService';

type FakeMembershipRow = {
  tenantId: string;
  roleSetJson: unknown;
  updatedAtUtc?: unknown;
  createdAtUtc?: unknown;
};

type FakeOrgUnitMembershipRow = {
  orgUnitId: string;
  roleSetJson: unknown;
  updatedAtUtc?: unknown;
  createdAtUtc?: unknown;
};

const buildFakeDb = (
  householdId: string | null,
  memberships: FakeMembershipRow[],
) => {
  const userQuery: any = {
    where: jest.fn(() => userQuery),
    first: jest.fn(async () => ({ household_id: householdId })),
  };

  const membershipQuery: any = {
    leftJoin: jest.fn(() => membershipQuery),
    where: jest.fn(() => membershipQuery),
    andWhere: jest.fn(() => membershipQuery),
    select: jest.fn(async () => memberships),
  };

  const fakeDb: any = ((table: string) => {
    if (table === 'users') {
      return userQuery;
    }

    throw new Error(`Unexpected table lookup: ${table}`);
  }) as any;

  fakeDb.withSchema = jest.fn((schema: string) => ({
    table: (table: string) => {
      if (schema === 'platform' && table === 'tenant_memberships as tm') {
        return membershipQuery;
      }

      throw new Error(`Unexpected scoped table lookup: ${schema}.${table}`);
    },
  }));

  return fakeDb;
};

const buildOrgUnitResolutionDb = (
  memberships: FakeOrgUnitMembershipRow[],
) => {
  const membershipQuery: any = {
    join: jest.fn(() => membershipQuery),
    where: jest.fn(() => membershipQuery),
    andWhere: jest.fn(() => membershipQuery),
    select: jest.fn(async () => memberships),
  };

  const tenantMembershipQuery: any = {
    where: jest.fn(() => tenantMembershipQuery),
    first: jest.fn(async () => ({ role_set_json: '[]' })),
  };

  const tenantOrgUnitsQuery: any = {
    where: jest.fn(() => tenantOrgUnitsQuery),
    select: jest.fn(() => tenantOrgUnitsQuery),
    orderBy: jest.fn(() => tenantOrgUnitsQuery),
    limit: jest.fn(async () => []),
  };

  const fakeDb: any = (() => {
    throw new Error('Unexpected root table lookup');
  }) as any;

  fakeDb.withSchema = jest.fn((schema: string) => ({
    table: (table: string) => {
      if (schema !== 'platform') {
        throw new Error(`Unexpected schema lookup: ${schema}`);
      }

      if (table === 'org_unit_memberships as om') {
        return membershipQuery;
      }

      if (table === 'tenant_memberships') {
        return tenantMembershipQuery;
      }

      if (table === 'org_units') {
        return tenantOrgUnitsQuery;
      }

      throw new Error(`Unexpected scoped table lookup: ${schema}.${table}`);
    },
  }));

  return fakeDb;
};

describe('AuthService.resolveActiveTenantIdForSession', () => {
  it('falls back to the household tenant id when no platform memberships exist', async () => {
    const householdId = '11111111-1111-4111-8111-111111111111';
    const fakeDb = buildFakeDb(householdId, []);

    const tenantId = await AuthService.resolveActiveTenantIdForSession(
      'user-1',
      fakeDb,
    );

    expect(tenantId).toBe(householdId);
  });

  it('prefers the household-matching tenant membership over unrelated memberships', async () => {
    const householdId = '11111111-1111-4111-8111-111111111111';
    const fakeDb = buildFakeDb(householdId, [
      {
        tenantId: '22222222-2222-4222-8222-222222222222',
        roleSetJson: '["TENANT_ADMIN"]',
        updatedAtUtc: '2026-03-24T10:00:00.000Z',
        createdAtUtc: '2026-03-24T09:00:00.000Z',
      },
      {
        tenantId: householdId,
        roleSetJson: '["TENANT_VIEWER"]',
        updatedAtUtc: '2026-03-20T10:00:00.000Z',
        createdAtUtc: '2026-03-20T09:00:00.000Z',
      },
    ]);

    const tenantId = await AuthService.resolveActiveTenantIdForSession(
      'user-1',
      fakeDb,
    );

    expect(tenantId).toBe(householdId);
  });

  it('prefers stronger tenant roles when the household id does not match any membership', async () => {
    const fakeDb = buildFakeDb(null, [
      {
        tenantId: '33333333-3333-4333-8333-333333333333',
        roleSetJson: '["TENANT_VIEWER"]',
        updatedAtUtc: '2026-03-24T10:00:00.000Z',
        createdAtUtc: '2026-03-24T09:00:00.000Z',
      },
      {
        tenantId: '22222222-2222-4222-8222-222222222222',
        roleSetJson: '["TENANT_ADMIN"]',
        updatedAtUtc: '2026-03-20T10:00:00.000Z',
        createdAtUtc: '2026-03-20T09:00:00.000Z',
      },
    ]);

    const tenantId = await AuthService.resolveActiveTenantIdForSession(
      'user-1',
      fakeDb,
    );

    expect(tenantId).toBe('22222222-2222-4222-8222-222222222222');
  });
});

describe('AuthService.resolveActiveOrgUnitIdForSession', () => {
  it('returns the only active orgUnit membership when exactly one exists', async () => {
    const orgUnitId = '11111111-1111-4111-8111-111111111111';
    const fakeDb = buildOrgUnitResolutionDb([
      {
        orgUnitId,
        roleSetJson: '["ORGUNIT_MEMBER"]',
        updatedAtUtc: '2026-03-25T10:00:00.000Z',
        createdAtUtc: '2026-03-25T09:00:00.000Z',
      },
    ]);

    const resolvedOrgUnitId = await AuthService.resolveActiveOrgUnitIdForSession(
      'user-1',
      'tenant-1',
      'member',
      fakeDb,
    );

    expect(resolvedOrgUnitId).toBe(orgUnitId);
  });

  it('prefers stronger orgUnit roles when multiple active memberships exist', async () => {
    const fakeDb = buildOrgUnitResolutionDb([
      {
        orgUnitId: '11111111-1111-4111-8111-111111111111',
        roleSetJson: '["ORGUNIT_MEMBER"]',
        updatedAtUtc: '2026-03-25T10:00:00.000Z',
        createdAtUtc: '2026-03-25T09:00:00.000Z',
      },
      {
        orgUnitId: '22222222-2222-4222-8222-222222222222',
        roleSetJson: '["ORGUNIT_ADMIN"]',
        updatedAtUtc: '2026-03-20T10:00:00.000Z',
        createdAtUtc: '2026-03-20T09:00:00.000Z',
      },
    ]);

    const resolvedOrgUnitId = await AuthService.resolveActiveOrgUnitIdForSession(
      'user-1',
      'tenant-1',
      'member',
      fakeDb,
    );

    expect(resolvedOrgUnitId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('prefers the most recently updated orgUnit when roles tie', async () => {
    const fakeDb = buildOrgUnitResolutionDb([
      {
        orgUnitId: '11111111-1111-4111-8111-111111111111',
        roleSetJson: '["ORGUNIT_MEMBER"]',
        updatedAtUtc: '2026-03-20T10:00:00.000Z',
        createdAtUtc: '2026-03-20T09:00:00.000Z',
      },
      {
        orgUnitId: '22222222-2222-4222-8222-222222222222',
        roleSetJson: '["ORGUNIT_MEMBER"]',
        updatedAtUtc: '2026-03-25T10:00:00.000Z',
        createdAtUtc: '2026-03-18T09:00:00.000Z',
      },
    ]);

    const resolvedOrgUnitId = await AuthService.resolveActiveOrgUnitIdForSession(
      'user-1',
      'tenant-1',
      'member',
      fakeDb,
    );

    expect(resolvedOrgUnitId).toBe('22222222-2222-4222-8222-222222222222');
  });
});
