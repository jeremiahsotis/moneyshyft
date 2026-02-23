import { randomUUID } from 'node:crypto';
import { executePlatformMutation } from '../../platform/mutations/executePlatformMutation';
import {
  createTenant,
  ensureScopedAdminUser,
  evaluateActorTenantModuleEntitlement,
  evaluateTenantModuleEntitlement,
  lookupScopedUsers,
  updateOrgUnit,
  upsertTenantMembership,
  upsertTenantModuleEntitlement,
} from '../PlatformAdminService';

jest.mock('../../platform/mutations/executePlatformMutation', () => ({
  executePlatformMutation: jest.fn(),
}));

type InsertRecord = {
  table: string;
  payload: Record<string, unknown>;
};

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  household_id: string | null;
  role?: string;
  password_hash?: string;
};

type TenantRow = {
  id: string;
  name: string;
  status: string;
  tenancy_model?: string;
  created_at_utc?: string;
};

type HouseholdRow = {
  id: string;
  name: string;
  invitation_code?: string;
};

type TenantMembershipRow = {
  tenant_id: string;
  user_id: string;
  role_set_json: string;
};

type OrgUnitMembershipRow = {
  org_unit_id: string;
  user_id: string;
  role_set_json: string;
};

type OrgUnitRow = {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: string;
  parent_org_unit_id: string | null;
};

type TenantModuleEntitlementRow = {
  id: string;
  tenant_id: string;
  module_key: string;
  enabled: boolean;
  reason: string;
};

type FakeTrxState = {
  inserts: InsertRecord[];
  users: UserRow[];
  tenants: TenantRow[];
  households: HouseholdRow[];
  tenantMemberships: TenantMembershipRow[];
  orgUnitMemberships: OrgUnitMembershipRow[];
  orgUnits: OrgUnitRow[];
  tenantModuleEntitlements: TenantModuleEntitlementRow[];
  lockedOrgUnitIds: Set<string>;
};

const TEST_TENANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_TENANT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const TEST_ACTOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEST_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ORG_UNIT_ALPHA_ID = '11111111-1111-4111-8111-111111111111';
const ORG_UNIT_BRAVO_ID = '22222222-2222-4222-8222-222222222222';

const normalizeColumn = (column: string): string => {
  const trimmed = column.trim();
  const withoutAlias = trimmed.includes('.') ? trimmed.split('.').pop() : trimmed;
  return (withoutAlias || trimmed).trim();
};

const stripAlias = (tableName: string): string => {
  return tableName.split(/\s+as\s+/i)[0].trim();
};

const pickColumns = (
  row: Record<string, unknown>,
  columns?: string[] | null
): Record<string, unknown> => {
  if (!columns || columns.length === 0) {
    return { ...row };
  }

  const picked: Record<string, unknown> = {};
  columns.forEach((column) => {
    const key = normalizeColumn(column);
    picked[key] = row[key];
  });
  return picked;
};

const parseRoleSet = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const isTenantScopedUser = (state: FakeTrxState, tenantId: string, userId: string): boolean => {
  if (state.tenantMemberships.some((row) => row.tenant_id === tenantId && row.user_id === userId)) {
    return true;
  }

  if (
    state.orgUnitMemberships.some((row) => {
      if (row.user_id !== userId) {
        return false;
      }
      const orgUnit = state.orgUnits.find((candidate) => candidate.id === row.org_unit_id);
      return orgUnit?.tenant_id === tenantId;
    })
  ) {
    return true;
  }

  return state.users.some((row) => row.id === userId && row.household_id === tenantId);
};

const createDefaultState = (overrides: Partial<FakeTrxState> = {}): FakeTrxState => ({
  inserts: overrides.inserts || [],
  users: overrides.users || [],
  tenants: overrides.tenants || [{
    id: TEST_TENANT_ID,
    name: 'Tenant A',
    status: 'active',
  }],
  households: overrides.households || [{
    id: TEST_TENANT_ID,
    name: 'Tenant A',
  }],
  tenantMemberships: overrides.tenantMemberships || [],
  orgUnitMemberships: overrides.orgUnitMemberships || [],
  orgUnits: overrides.orgUnits || [],
  tenantModuleEntitlements: overrides.tenantModuleEntitlements || [],
  lockedOrgUnitIds: overrides.lockedOrgUnitIds || new Set<string>(),
});

const buildFakeTrx = (state: FakeTrxState) => {
  const resolveBaseRows = (tableName: string): Record<string, unknown>[] => {
    const canonicalTable = stripAlias(tableName);
    if (canonicalTable === 'users') {
      return state.users.map((row) => ({ ...row }));
    }
    if (canonicalTable === 'households') {
      return state.households.map((row) => ({ ...row }));
    }
    if (canonicalTable === 'platform.tenants') {
      return state.tenants.map((row) => ({ ...row }));
    }
    if (canonicalTable === 'platform.tenant_memberships') {
      return state.tenantMemberships.map((row) => ({ ...row }));
    }
    if (canonicalTable === 'platform.org_unit_memberships') {
      return state.orgUnitMemberships.map((row) => {
        const orgUnit = state.orgUnits.find((candidate) => candidate.id === row.org_unit_id);
        return {
          ...row,
          tenant_id: orgUnit?.tenant_id || null,
        };
      });
    }
    if (canonicalTable === 'platform.org_units') {
      return state.orgUnits.map((row) => ({ ...row }));
    }
    if (canonicalTable === 'platform.tenant_module_entitlements') {
      return state.tenantModuleEntitlements.map((row) => ({ ...row }));
    }

    return [];
  };

  const createQuery = (tableName: string) => {
    const canonicalTable = stripAlias(tableName);
    const whereFilters: Record<string, unknown> = {};
    const rawFilters: Array<{ sql: string; args: unknown[] }> = [];
    const queryState: {
      selectColumns: string[] | null;
      countMode: boolean;
      limitValue: number | null;
      offsetValue: number;
      sortByLowerEmail: boolean;
      sortById: boolean;
      scopeTenantId: string | null;
      scopeOrgUnitId: string | null;
      searchTerm: string | null;
      lockForUpdate: boolean;
      noWait: boolean;
      metadata: {
        tenantId: string | null;
        orgUnitId: string | null;
      };
    } = {
      selectColumns: null,
      countMode: false,
      limitValue: null,
      offsetValue: 0,
      sortByLowerEmail: false,
      sortById: false,
      scopeTenantId: null,
      scopeOrgUnitId: null,
      searchTerm: null,
      lockForUpdate: false,
      noWait: false,
      metadata: {
        tenantId: null,
        orgUnitId: null,
      },
    };

    const applyWhereFilters = (rows: Record<string, unknown>[]): Record<string, unknown>[] => {
      let filtered = [...rows];

      Object.entries(whereFilters).forEach(([column, value]) => {
        const normalizedColumn = normalizeColumn(column);
        filtered = filtered.filter((row) => row[normalizedColumn] === value);
      });

      rawFilters.forEach(({ sql, args }) => {
        if (sql.includes('LOWER(email) = ?') && typeof args[0] === 'string') {
          const normalized = args[0].toLowerCase();
          filtered = filtered.filter((row) => String(row.email || '').toLowerCase() === normalized);
          return;
        }

        if (sql.includes('role_set_json @>') && typeof args[0] === 'string') {
          const expected = parseRoleSet(args[0]);
          filtered = filtered.filter((row) => {
            const current = parseRoleSet(row.role_set_json);
            return expected.every((role) => current.includes(role));
          });
        }
      });

      return filtered;
    };

    const applyLookupFilters = (rows: Record<string, unknown>[]): Record<string, unknown>[] => {
      let filtered = [...rows];

      if (queryState.scopeTenantId) {
        filtered = filtered.filter((row) =>
          isTenantScopedUser(state, queryState.scopeTenantId as string, String(row.id))
        );
      }

      if (queryState.scopeOrgUnitId) {
        filtered = filtered.filter((row) => (
          state.orgUnitMemberships.some((membership) => (
            membership.org_unit_id === queryState.scopeOrgUnitId
            && membership.user_id === row.id
          ))
        ));
      }

      if (queryState.searchTerm) {
        filtered = filtered.filter((row) => {
          const normalizedEmail = String(row.email || '').toLowerCase();
          const normalizedName = `${String(row.first_name || '').toLowerCase()} ${String(row.last_name || '').toLowerCase()}`;
          return normalizedEmail.includes(queryState.searchTerm as string)
            || normalizedName.includes(queryState.searchTerm as string);
        });
      }

      if (queryState.sortByLowerEmail || queryState.sortById) {
        filtered.sort((a, b) => {
          const emailA = String(a.email || '').toLowerCase();
          const emailB = String(b.email || '').toLowerCase();
          if (emailA !== emailB) {
            return emailA.localeCompare(emailB);
          }
          return String(a.id || '').localeCompare(String(b.id || ''));
        });
      }

      return filtered;
    };

    const resolveRows = (): Record<string, unknown>[] => {
      let rows = resolveBaseRows(canonicalTable);
      rows = applyWhereFilters(rows);

      if (canonicalTable === 'users') {
        rows = applyLookupFilters(rows);
      }

      if (queryState.offsetValue > 0) {
        rows = rows.slice(queryState.offsetValue);
      }

      if (queryState.limitValue !== null) {
        rows = rows.slice(0, queryState.limitValue);
      }

      if (queryState.selectColumns) {
        rows = rows.map((row) => pickColumns(row, queryState.selectColumns));
      }

      return rows;
    };

    const query: any = {
      __meta: queryState.metadata,
      where: (first: unknown, second?: unknown) => {
        if (typeof first === 'function') {
          const scopedBuilder = {
            whereExists: (subquery: any) => {
              if (subquery?.__meta?.tenantId) {
                queryState.scopeTenantId = subquery.__meta.tenantId;
              }
              if (subquery?.__meta?.orgUnitId) {
                queryState.scopeOrgUnitId = subquery.__meta.orgUnitId;
              }
              return scopedBuilder;
            },
            orWhereExists: (subquery: any) => {
              if (subquery?.__meta?.tenantId) {
                queryState.scopeTenantId = subquery.__meta.tenantId;
              }
              if (subquery?.__meta?.orgUnitId) {
                queryState.scopeOrgUnitId = subquery.__meta.orgUnitId;
              }
              return scopedBuilder;
            },
          };
          first(scopedBuilder);
          return query;
        }

        if (typeof first === 'string') {
          whereFilters[first] = second;
          const normalizedColumn = normalizeColumn(first);
          if (normalizedColumn === 'tenant_id' && typeof second === 'string') {
            queryState.metadata.tenantId = second;
          }
          if (normalizedColumn === 'org_unit_id' && typeof second === 'string') {
            queryState.metadata.orgUnitId = second;
          }
          return query;
        }

        if (first && typeof first === 'object') {
          Object.assign(whereFilters, first as Record<string, unknown>);
        }

        return query;
      },
      andWhere: (first: unknown, second?: unknown) => {
        if (typeof first === 'function') {
          const searchBuilder = {
            whereRaw: (_sql: string, args: unknown[]) => {
              if (typeof args[0] === 'string') {
                queryState.searchTerm = args[0].toLowerCase().replace(/%/g, '');
              }
              return searchBuilder;
            },
            orWhereRaw: (_sql: string, args: unknown[]) => {
              if (typeof args[0] === 'string') {
                queryState.searchTerm = args[0].toLowerCase().replace(/%/g, '');
              }
              return searchBuilder;
            },
          };
          first(searchBuilder);
          return query;
        }

        if (typeof first === 'string') {
          whereFilters[first] = second;
          const normalizedColumn = normalizeColumn(first);
          if (normalizedColumn === 'tenant_id' && typeof second === 'string') {
            queryState.metadata.tenantId = second;
          }
          if (normalizedColumn === 'org_unit_id' && typeof second === 'string') {
            queryState.metadata.orgUnitId = second;
          }
          return query;
        }

        return query;
      },
      whereRaw: (sql: string, args: unknown[] = []) => {
        rawFilters.push({ sql, args });
        return query;
      },
      whereExists: (subquery: any) => {
        if (subquery?.__meta?.tenantId) {
          queryState.scopeTenantId = subquery.__meta.tenantId;
        }
        if (subquery?.__meta?.orgUnitId) {
          queryState.scopeOrgUnitId = subquery.__meta.orgUnitId;
        }
        return query;
      },
      orWhereExists: (subquery: any) => {
        if (subquery?.__meta?.tenantId) {
          queryState.scopeTenantId = subquery.__meta.tenantId;
        }
        if (subquery?.__meta?.orgUnitId) {
          queryState.scopeOrgUnitId = subquery.__meta.orgUnitId;
        }
        return query;
      },
      select: (...columns: string[]) => {
        queryState.selectColumns = columns;
        return query;
      },
      join: (_table: string, _left: string, _right: string) => query,
      orderByRaw: (sql: string) => {
        if (sql.toLowerCase().includes('lower(users.email)')) {
          queryState.sortByLowerEmail = true;
        }
        return query;
      },
      orderBy: (column: string, _direction?: string) => {
        if (normalizeColumn(column) === 'id') {
          queryState.sortById = true;
        }
        return query;
      },
      limit: (value: number) => {
        queryState.limitValue = value;
        return query;
      },
      offset: (value: number) => {
        queryState.offsetValue = value;
        return query;
      },
      clone: () => query,
      count: () => {
        queryState.countMode = true;
        queryState.selectColumns = null;
        return query;
      },
      forUpdate: () => {
        queryState.lockForUpdate = true;
        return query;
      },
      noWait: () => {
        queryState.noWait = true;
        return query;
      },
      first: async (columns?: string[]) => {
        if (
          canonicalTable === 'platform.org_units'
          && queryState.lockForUpdate
          && queryState.noWait
          && typeof whereFilters.id === 'string'
          && state.lockedOrgUnitIds.has(whereFilters.id)
        ) {
          throw { code: '55P03' };
        }

        if (queryState.countMode) {
          const rows = resolveRows();
          return { count: String(rows.length) };
        }

        if (columns && columns.length > 0) {
          queryState.selectColumns = columns;
        }
        const rows = resolveRows();
        return rows.length > 0 ? rows[0] : null;
      },
      insert: (rawPayload: Record<string, unknown>) => {
        const payload = { ...rawPayload };
        let conflictColumns: string[] | null = null;
        let mergePatch: Record<string, unknown> | null = null;
        let committedRows: Record<string, unknown>[] | null = null;

        const commit = (): Record<string, unknown>[] => {
          if (committedRows) {
            return committedRows;
          }

          const rows = resolveBaseRows(canonicalTable);
          const normalizedConflictColumns = conflictColumns?.map((column) => normalizeColumn(column)) || [];
          let existingIndex = -1;

          if (normalizedConflictColumns.length > 0) {
            existingIndex = rows.findIndex((row) => (
              normalizedConflictColumns.every((column) => row[column] === payload[column])
            ));
          }

          const resolveInsertedRow = (): Record<string, unknown> => {
            if (canonicalTable === 'platform.tenants') {
              const row: TenantRow = {
                id: typeof payload.id === 'string' ? payload.id : randomUUID(),
                name: String(payload.name || 'Tenant'),
                status: String(payload.status || 'active'),
                tenancy_model: typeof payload.tenancy_model === 'string' ? payload.tenancy_model : undefined,
                created_at_utc: '2026-02-20T12:00:00.000Z',
              };
              state.tenants.push(row);
              return row;
            }

            if (canonicalTable === 'households') {
              const row: HouseholdRow = {
                id: String(payload.id || randomUUID()),
                name: String(payload.name || 'Household'),
                invitation_code: typeof payload.invitation_code === 'string' ? payload.invitation_code : undefined,
              };
              state.households.push(row);
              return row;
            }

            if (canonicalTable === 'users') {
              const row: UserRow = {
                id: String(payload.id || randomUUID()),
                email: String(payload.email || ''),
                password_hash: typeof payload.password_hash === 'string' ? payload.password_hash : undefined,
                first_name: String(payload.first_name || ''),
                last_name: String(payload.last_name || ''),
                household_id: typeof payload.household_id === 'string' ? payload.household_id : null,
                role: typeof payload.role === 'string' ? payload.role : undefined,
              };
              state.users.push(row);
              return row;
            }

            if (canonicalTable === 'platform.tenant_memberships') {
              const row: TenantMembershipRow = {
                tenant_id: String(payload.tenant_id),
                user_id: String(payload.user_id),
                role_set_json: String(payload.role_set_json || '[]'),
              };
              state.tenantMemberships.push(row);
              return row;
            }

            if (canonicalTable === 'platform.org_unit_memberships') {
              const row: OrgUnitMembershipRow = {
                org_unit_id: String(payload.org_unit_id),
                user_id: String(payload.user_id),
                role_set_json: String(payload.role_set_json || '[]'),
              };
              state.orgUnitMemberships.push(row);
              return row;
            }

            if (canonicalTable === 'platform.org_units') {
              const row: OrgUnitRow = {
                id: String(payload.id || randomUUID()),
                tenant_id: String(payload.tenant_id || TEST_TENANT_ID),
                name: String(payload.name || 'Org Unit'),
                type: String(payload.type || 'ORG_UNIT'),
                status: String(payload.status || 'active'),
                parent_org_unit_id: typeof payload.parent_org_unit_id === 'string'
                  ? payload.parent_org_unit_id
                  : null,
              };
              state.orgUnits.push(row);
              return row;
            }

            if (canonicalTable === 'platform.tenant_module_entitlements') {
              const row: TenantModuleEntitlementRow = {
                id: String(payload.id || randomUUID()),
                tenant_id: String(payload.tenant_id || ''),
                module_key: String(payload.module_key || ''),
                enabled: Boolean(payload.enabled),
                reason: String(payload.reason || 'test-reason'),
              };
              state.tenantModuleEntitlements.push(row);
              return row;
            }

            if (canonicalTable === 'platform.events') {
              const row = { ...payload, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' };
              return row;
            }

            if (canonicalTable === 'platform.outbox_events') {
              const row = { ...payload, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' };
              return row;
            }

            return payload;
          };

          let targetRow: Record<string, unknown>;

          if (existingIndex >= 0) {
            targetRow = { ...rows[existingIndex] };
            if (mergePatch) {
              Object.assign(targetRow, mergePatch);
            }

            if (canonicalTable === 'platform.tenant_memberships') {
              state.tenantMemberships[existingIndex] = targetRow as TenantMembershipRow;
            } else if (canonicalTable === 'platform.org_unit_memberships') {
              state.orgUnitMemberships[existingIndex] = targetRow as OrgUnitMembershipRow;
            } else if (canonicalTable === 'platform.tenant_module_entitlements') {
              state.tenantModuleEntitlements[existingIndex] = targetRow as TenantModuleEntitlementRow;
            } else if (canonicalTable === 'platform.tenants') {
              state.tenants[existingIndex] = targetRow as TenantRow;
            }
          } else {
            targetRow = resolveInsertedRow();
          }

          if (canonicalTable === 'platform.events' || canonicalTable === 'platform.outbox_events') {
            state.inserts.push({
              table: canonicalTable,
              payload: { ...payload },
            });
          }

          if (
            canonicalTable !== 'platform.events'
            && canonicalTable !== 'platform.outbox_events'
            && canonicalTable !== 'users'
            && canonicalTable !== 'platform.tenants'
            && canonicalTable !== 'households'
            && canonicalTable !== 'platform.tenant_memberships'
            && canonicalTable !== 'platform.org_unit_memberships'
            && canonicalTable !== 'platform.org_units'
            && canonicalTable !== 'platform.tenant_module_entitlements'
          ) {
            state.inserts.push({
              table: canonicalTable,
              payload,
            });
          }

          committedRows = [targetRow];
          return committedRows;
        };

        const insertBuilder: any = {
          onConflict: (columns: string[] | string) => {
            conflictColumns = Array.isArray(columns) ? columns : [columns];
            return insertBuilder;
          },
          merge: (patch: Record<string, unknown>) => {
            mergePatch = patch;
            return insertBuilder;
          },
          ignore: async () => {
            commit();
          },
          returning: async (columns: string[]) => {
            const rows = commit();
            return rows.map((row) => pickColumns(row, columns));
          },
          then: (onFulfilled: (value: unknown) => unknown, onRejected: (error: unknown) => unknown) =>
            Promise.resolve(commit()).then(onFulfilled, onRejected),
          catch: (onRejected: (error: unknown) => unknown) =>
            Promise.resolve(commit()).catch(onRejected),
        };

        return insertBuilder;
      },
      update: (patch: Record<string, unknown>) => ({
        returning: async (columns: string[]) => {
          const rows = resolveBaseRows(canonicalTable);
          const filtered = rows.filter((row) => (
            Object.entries(whereFilters).every(([column, value]) => row[normalizeColumn(column)] === value)
          ));

          const updatedRows = filtered.map((row) => ({ ...row, ...patch }));

          if (canonicalTable === 'platform.org_units') {
            state.orgUnits = state.orgUnits.map((candidate) => {
              const changed = updatedRows.find((row) => row.id === candidate.id);
              return changed ? changed as OrgUnitRow : candidate;
            });
          }

          return updatedRows.map((row) => pickColumns(row, columns));
        },
      }),
      del: async () => {
        if (canonicalTable === 'platform.tenant_memberships') {
          const before = state.tenantMemberships.length;
          state.tenantMemberships = state.tenantMemberships.filter((row) => (
            !Object.entries(whereFilters).every(([column, value]) => {
              const record = row as unknown as Record<string, unknown>;
              return record[normalizeColumn(column)] === value;
            })
          ));
          return before - state.tenantMemberships.length;
        }

        if (canonicalTable === 'platform.org_unit_memberships') {
          const before = state.orgUnitMemberships.length;
          state.orgUnitMemberships = state.orgUnitMemberships.filter((row) => (
            !Object.entries(whereFilters).every(([column, value]) => {
              const record = row as unknown as Record<string, unknown>;
              return record[normalizeColumn(column)] === value;
            })
          ));
          return before - state.orgUnitMemberships.length;
        }

        return 0;
      },
      then: (onFulfilled: (value: unknown) => unknown, onRejected: (error: unknown) => unknown) => {
        return Promise.resolve(resolveRows()).then(onFulfilled, onRejected);
      },
      catch: (onRejected: (error: unknown) => unknown) => Promise.resolve(resolveRows()).catch(onRejected),
    };

    return query;
  };

  const trx = ((tableName: string) => createQuery(tableName)) as any;
  trx.fn = { now: () => 'NOW()' };
  trx.raw = (value: string) => ({ raw: value });
  trx.withSchema = (schema: string) => ({
    table: (tableName: string) => createQuery(`${schema}.${tableName}`),
  });
  return trx;
};

describe('PlatformAdminService authorization and audit coverage', () => {
  const mockedExecutePlatformMutation = executePlatformMutation as jest.MockedFunction<typeof executePlatformMutation>;

  const useMutationHarness = (state: FakeTrxState, emittedEvents?: Array<Record<string, unknown>>) => {
    mockedExecutePlatformMutation.mockImplementation(async (options: any) => {
      const result = await options.mutation(buildFakeTrx(state));
      if (typeof options.event === 'function') {
        const eventPayload = options.event(result) as Record<string, unknown>;
        if (emittedEvents) {
          emittedEvents.push(eventPayload);
        }
      }
      return result;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects tenant membership role assignment for TENANT_STAFF actor (role matrix)', async () => {
    const state = createDefaultState();
    useMutationHarness(state);

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
    const state = createDefaultState({
      tenantModuleEntitlements: [{
        id: randomUUID(),
        tenant_id: TEST_TENANT_ID,
        module_key: 'rbac',
        enabled: false,
        reason: 'rbac-disabled',
      }],
    });
    useMutationHarness(state);

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
    const state = createDefaultState();
    useMutationHarness(state);

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

  it('rejects scoped lookup queries shorter than 3 characters', async () => {
    const state = createDefaultState();
    useMutationHarness(state);

    await expect(
      lookupScopedUsers({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_ADMIN',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        q: 'ab',
      })
    ).rejects.toThrow('USER_LOOKUP_QUERY_TOO_SHORT');
    expect(mockedExecutePlatformMutation).not.toHaveBeenCalled();
  });

  it('returns only in-scope users from scoped lookup and enforces deterministic ordering/page-size cap', async () => {
    const inScopeFirstId = '10000000-0000-4000-8000-000000000001';
    const inScopeSecondId = '10000000-0000-4000-8000-000000000002';
    const outOfScopeId = '10000000-0000-4000-8000-000000000099';
    const events: Array<Record<string, unknown>> = [];
    const state = createDefaultState({
      users: [
        {
          id: inScopeSecondId,
          email: 'ALPHA.SCOPE@example.com',
          first_name: 'Alpha',
          last_name: 'Scoped',
          household_id: TEST_TENANT_ID,
        },
        {
          id: inScopeFirstId,
          email: 'alpha.scope@example.com',
          first_name: 'Alpha',
          last_name: 'Scoped',
          household_id: TEST_TENANT_ID,
        },
        {
          id: outOfScopeId,
          email: 'alpha.scope.outside@example.com',
          first_name: 'Alpha',
          last_name: 'Outside',
          household_id: OTHER_TENANT_ID,
        },
      ],
      tenantMemberships: [
        { tenant_id: TEST_TENANT_ID, user_id: inScopeFirstId, role_set_json: '["TENANT_VIEWER"]' },
        { tenant_id: TEST_TENANT_ID, user_id: inScopeSecondId, role_set_json: '["TENANT_VIEWER"]' },
        { tenant_id: OTHER_TENANT_ID, user_id: outOfScopeId, role_set_json: '["TENANT_VIEWER"]' },
      ],
    });
    useMutationHarness(state, events);

    const result = await lookupScopedUsers({} as any, {
      userId: TEST_ACTOR_ID,
      baseRole: 'TENANT_ADMIN',
      headerRoles: [],
      activeTenantId: TEST_TENANT_ID,
    }, {
      q: 'scope',
      page: 1,
      pageSize: 500,
    });

    expect(result).toMatchObject({
      tenantId: TEST_TENANT_ID,
      page: 1,
      pageSize: 25,
      total: 2,
    });
    expect(result.users.map((user) => user.id)).toEqual([
      inScopeFirstId,
      inScopeSecondId,
    ]);
    expect(events[0]).toMatchObject({
      eventName: 'platform.identity.lookup.executed',
      payload: {
        queryLength: 5,
        pageSize: 25,
        resultCount: 2,
      },
    });
  });

  it('creates inline admin users and writes inline-create audit/outbox records', async () => {
    const state = createDefaultState();
    useMutationHarness(state);

    const result = await ensureScopedAdminUser({} as any, {
      userId: TEST_ACTOR_ID,
      baseRole: 'TENANT_ADMIN',
      headerRoles: [],
      activeTenantId: TEST_TENANT_ID,
    }, {
      userEmail: 'inline.admin@example.com',
      firstName: 'Inline',
      lastName: 'Admin',
      reason: 'inline-create-coverage',
    });

    expect(result).toMatchObject({
      tenantId: TEST_TENANT_ID,
      email: 'inline.admin@example.com',
      createdInline: true,
    });
    expect(state.users.some((user) => user.email === 'inline.admin@example.com')).toBe(true);
    expect(state.inserts.some((entry) => (
      entry.table === 'platform.events'
      && entry.payload.event_name === 'platform.user.inline_created'
    ))).toBe(true);
    expect(state.inserts.some((entry) => (
      entry.table === 'platform.outbox_events'
      && entry.payload.event_name === 'platform.user.inline_created'
    ))).toBe(true);
  });

  it('denies out-of-scope user resolution for non-system actors', async () => {
    const outOfScopeUserId = '30000000-0000-4000-8000-000000000003';
    const state = createDefaultState({
      users: [{
        id: outOfScopeUserId,
        email: 'outside.scope@example.com',
        first_name: 'Outside',
        last_name: 'Scope',
        household_id: OTHER_TENANT_ID,
      }],
    });
    useMutationHarness(state);

    await expect(
      ensureScopedAdminUser({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_ADMIN',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        userId: outOfScopeUserId,
        reason: 'out-of-scope-check',
      })
    ).rejects.toThrow('USER_OUT_OF_SCOPE');
  });

  it('enforces bounded module assignment rules for tenant actors', async () => {
    const state = createDefaultState({
      tenantModuleEntitlements: [{
        id: randomUUID(),
        tenant_id: TEST_TENANT_ID,
        module_key: 'connectshyft',
        enabled: false,
        reason: 'baseline-disabled',
      }],
    });
    useMutationHarness(state);

    await expect(
      upsertTenantModuleEntitlement({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_ADMIN',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        tenantId: TEST_TENANT_ID,
        moduleKey: 'connectshyft',
        enabled: true,
        reason: 'attempt-out-of-bounds-enable',
      })
    ).rejects.toThrow('FORBIDDEN_MODULE_ASSIGNMENT_BOUNDARY');
  });

  it('detects hierarchy cycles on orgUnit re-parent operations', async () => {
    const state = createDefaultState({
      orgUnits: [
        {
          id: ORG_UNIT_ALPHA_ID,
          tenant_id: TEST_TENANT_ID,
          name: 'Alpha',
          type: 'ORG_UNIT',
          status: 'active',
          parent_org_unit_id: null,
        },
        {
          id: ORG_UNIT_BRAVO_ID,
          tenant_id: TEST_TENANT_ID,
          name: 'Bravo',
          type: 'ORG_UNIT',
          status: 'active',
          parent_org_unit_id: ORG_UNIT_ALPHA_ID,
        },
      ],
    });
    useMutationHarness(state);

    await expect(
      updateOrgUnit({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_ADMIN',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        tenantId: TEST_TENANT_ID,
        orgUnitId: ORG_UNIT_ALPHA_ID,
        parentOrgUnitId: ORG_UNIT_BRAVO_ID,
        reason: 'cycle-guard-check',
      })
    ).rejects.toThrow('ORG_UNIT_CYCLE_DETECTED');
  });

  it('returns deterministic re-parent conflict when orgUnit row locks contend', async () => {
    const state = createDefaultState({
      orgUnits: [
        {
          id: ORG_UNIT_ALPHA_ID,
          tenant_id: TEST_TENANT_ID,
          name: 'Alpha',
          type: 'ORG_UNIT',
          status: 'active',
          parent_org_unit_id: null,
        },
        {
          id: ORG_UNIT_BRAVO_ID,
          tenant_id: TEST_TENANT_ID,
          name: 'Bravo',
          type: 'ORG_UNIT',
          status: 'active',
          parent_org_unit_id: null,
        },
      ],
      lockedOrgUnitIds: new Set([ORG_UNIT_BRAVO_ID]),
    });
    useMutationHarness(state);

    await expect(
      updateOrgUnit({} as any, {
        userId: TEST_ACTOR_ID,
        baseRole: 'TENANT_ADMIN',
        headerRoles: [],
        activeTenantId: TEST_TENANT_ID,
      }, {
        tenantId: TEST_TENANT_ID,
        orgUnitId: ORG_UNIT_ALPHA_ID,
        parentOrgUnitId: ORG_UNIT_BRAVO_ID,
        reason: 'reparent-contention-check',
      })
    ).rejects.toThrow('ORG_UNIT_REPARENT_CONFLICT');
  });

  it('treats missing governed-module entitlement rows as disabled', async () => {
    const state = createDefaultState();
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
    const state = createDefaultState({
      tenantModuleEntitlements: [{
        id: randomUUID(),
        tenant_id: TEST_TENANT_ID,
        module_key: 'moneyshyft',
        enabled: false,
        reason: 'disabled',
      }],
    });
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
    const state = createDefaultState({
      tenantModuleEntitlements: [{
        id: randomUUID(),
        tenant_id: TEST_TENANT_ID,
        module_key: 'moneyshyft',
        enabled: false,
        reason: 'disabled',
      }],
    });
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
