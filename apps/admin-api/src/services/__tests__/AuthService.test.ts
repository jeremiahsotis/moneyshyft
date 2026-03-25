import AuthService from '../AuthService';

type FakeMembershipRow = {
  tenantId: string;
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
