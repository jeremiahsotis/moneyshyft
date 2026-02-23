import { executePlatformMutation } from '../../platform/mutations/executePlatformMutation';
import {
  createTenant,
  evaluateActorTenantModuleEntitlement,
  evaluateTenantModuleEntitlement,
  upsertTenantMembership,
} from '../PlatformAdminService';

jest.mock('../../platform/mutations/executePlatformMutation', () => ({
  executePlatformMutation: jest.fn(),
}));

type InsertRecord = {
  table: string;
  payload: Record<string, unknown>;
};

type FakeTrxState = {
  inserts: InsertRecord[];
  moduleEntitlements: Record<string, boolean>;
};

const TEST_TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEST_ACTOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEST_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const buildFakeTrx = (state: FakeTrxState) => {
  const buildQuery = (tableName: string) => {
    const whereFilters: Record<string, unknown> = {};
    const query = {
      where: (filters: Record<string, unknown>) => {
        Object.assign(whereFilters, filters);
        return query;
      },
      whereRaw: (_sql: string, _args: unknown[]) => query,
      first: async () => {
        if (tableName === 'platform.tenants') {
          if (whereFilters.id === TEST_TENANT_ID) {
            return {
              id: TEST_TENANT_ID,
              name: 'Tenant A',
              status: 'active',
            };
          }

          return null;
        }

        if (tableName === 'households') {
          if (whereFilters.id === TEST_TENANT_ID) {
            return {
              id: TEST_TENANT_ID,
              name: 'Tenant A',
            };
          }

          return null;
        }

        if (tableName === 'platform.tenant_module_entitlements') {
          const tenantId = String(whereFilters.tenant_id || '');
          const moduleKey = String(whereFilters.module_key || '');
          const key = `${tenantId}:${moduleKey}`;
          if (Object.prototype.hasOwnProperty.call(state.moduleEntitlements, key)) {
            return { enabled: state.moduleEntitlements[key] };
          }
          return null;
        }

        if (tableName === 'platform.tenant_memberships' || tableName === 'platform.org_unit_memberships') {
          return { role_set_json: '[]' };
        }

        return null;
      },
      insert: (payload: Record<string, unknown>) => {
        state.inserts.push({ table: tableName, payload });

        const returning = async () => {
          if (tableName === 'platform.tenants') {
            return [{
              id: TEST_TENANT_ID,
              name: payload.name,
              status: payload.status,
              created_at_utc: '2026-02-20T12:00:00.000Z',
            }];
          }

          if (tableName === 'platform.events') {
            return [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }];
          }

          if (tableName === 'platform.outbox_events') {
            return [{ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }];
          }

          return [];
        };

        return {
          returning,
          onConflict: (_columns: string[]) => ({
            merge: async (_patch: Record<string, unknown>) => undefined,
          }),
        };
      },
      del: async () => 1,
    };

    return query;
  };

  const trx = ((tableName: string) => buildQuery(tableName)) as any;
  trx.fn = { now: () => 'NOW()' };
  trx.withSchema = (schema: string) => ({
    table: (tableName: string) => buildQuery(`${schema}.${tableName}`),
  });
  return trx;
};

describe('PlatformAdminService authorization and audit coverage', () => {
  const mockedExecutePlatformMutation = executePlatformMutation as jest.MockedFunction<typeof executePlatformMutation>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects tenant membership role assignment for TENANT_STAFF actor (role matrix)', async () => {
    const state: FakeTrxState = {
      inserts: [],
      moduleEntitlements: {},
    };
    mockedExecutePlatformMutation.mockImplementation(async (options: any) => {
      const trx = buildFakeTrx(state);
      return options.mutation(trx);
    });

    await expect(
      upsertTenantMembership({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_STAFF',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        roleSet: ['TENANT_STAFF'],
        reason: 'matrix-check',
      })
    ).rejects.toThrow('FORBIDDEN:tenant:role:assign');
  });

  it('blocks membership mutation immediately when RBAC module entitlement is disabled', async () => {
    const state: FakeTrxState = {
      inserts: [],
      moduleEntitlements: {
        [`${TEST_TENANT_ID}:rbac`]: false,
      },
    };
    mockedExecutePlatformMutation.mockImplementation(async (options: any) => {
      const trx = buildFakeTrx(state);
      return options.mutation(trx);
    });

    await expect(
      upsertTenantMembership({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_ADMIN',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        roleSet: ['TENANT_STAFF'],
        reason: 'entitlement-off',
      })
    ).rejects.toThrow('MODULE_DISABLED:rbac');
  });

  it('writes bootstrap tenant-admin membership event and outbox records during tenant create', async () => {
    const state: FakeTrxState = {
      inserts: [],
      moduleEntitlements: {},
    };
    mockedExecutePlatformMutation.mockImplementation(async (options: any) => {
      const trx = buildFakeTrx(state);
      return options.mutation(trx);
    });

    await createTenant({} as any, {
      userId: TEST_ACTOR_ID,
      baseRole: 'SYSTEM_ADMIN',
      headerRoles: [],
      activeTenantId: TEST_TENANT_ID,
    }, {
      name: 'Tenant A',
      assignTenantAdminUserId: TEST_USER_ID,
      reason: 'bootstrap-admin',
    });

    const membershipEvents = state.inserts.filter((entry) => (
      entry.table === 'platform.events'
      && entry.payload.event_name === 'platform.tenant_membership.upserted'
    ));
    const membershipOutbox = state.inserts.filter((entry) => (
      entry.table === 'platform.outbox_events'
      && entry.payload.event_name === 'platform.tenant_membership.upserted'
    ));

    expect(membershipEvents).toHaveLength(1);
    expect(membershipOutbox).toHaveLength(1);
  });

  it('treats missing governed-module entitlement rows as disabled', async () => {
    const state: FakeTrxState = {
      inserts: [],
      moduleEntitlements: {},
    };
    const trx = buildFakeTrx(state);

    const decision = await evaluateTenantModuleEntitlement(trx, TEST_TENANT_ID, 'connectshyft');

    expect(decision).toMatchObject({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'connectshyft',
      enabled: false,
      reason: 'missing',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_MISSING',
    });
  });

  it('returns disabled decision when governed-module entitlement exists and is false', async () => {
    const state: FakeTrxState = {
      inserts: [],
      moduleEntitlements: {
        [`${TEST_TENANT_ID}:moneyshyft`]: false,
      },
    };
    const trx = buildFakeTrx(state);

    const decision = await evaluateTenantModuleEntitlement(trx, TEST_TENANT_ID, 'moneyshyft');

    expect(decision).toMatchObject({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'moneyshyft',
      enabled: false,
      reason: 'disabled',
      refusalCode: 'MONEYSHYFT_MODULE_DISABLED',
    });
  });

  it('applies system-admin override for governed-module entitlement reads', async () => {
    const state: FakeTrxState = {
      inserts: [],
      moduleEntitlements: {
        [`${TEST_TENANT_ID}:moneyshyft`]: false,
      },
    };
    const trx = buildFakeTrx(state);

    const decision = await evaluateActorTenantModuleEntitlement(trx, {
      userId: TEST_ACTOR_ID,
      baseRole: 'SYSTEM_ADMIN',
      headerRoles: [],
      activeTenantId: TEST_TENANT_ID,
    }, TEST_TENANT_ID, 'moneyshyft');

    expect(decision).toMatchObject({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'moneyshyft',
      enabled: true,
      reason: 'system-admin-override',
      refusalCode: 'MONEYSHYFT_ENTITLEMENT_ENABLED',
    });
  });
});
