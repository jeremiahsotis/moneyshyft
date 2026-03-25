import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import * as accessContextModule from '../http/accessContext';
import type { ConnectShyftContextDecision } from '../contextAccess';

const {
  requestHasAnyCapability,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} = accessContextModule;

type RequestBuilderOptions = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  householdId?: string | null;
  activeTenantId?: string | null;
  activeOrgUnitId?: string | null;
  source?: 'auth' | 'public';
  headers?: Record<string, string>;
};

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const createRequest = (options: RequestBuilderOptions = {}): Request => {
  const tenantId = options.tenantId ?? 'tenant-connectshyft-alpha';
  const orgUnitId = options.orgUnitId === undefined
    ? 'org-connectshyft-alpha-east'
    : options.orgUnitId;
  const normalizedHeaders = Object.entries(options.headers || {}).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  return {
    tenantId,
    orgUnitId,
    tenantContext: {
      tenantId,
      orgUnitId,
      scopeMode: orgUnitId ? 'ORG_UNIT' : 'TENANT',
      source: options.source ?? 'auth',
    },
    user: {
      userId: options.userId ?? 'user-connectshyft-handler-access',
      email: 'handler-access@example.com',
      householdId:
        options.householdId === undefined
          ? tenantId
          : options.householdId,
      activeTenantId:
        options.activeTenantId === undefined
          ? tenantId
          : options.activeTenantId,
      activeOrgUnitId:
        options.activeOrgUnitId === undefined
          ? orgUnitId
          : options.activeOrgUnitId,
      role: options.role ?? 'ORGUNIT_MEMBER',
    },
    header: (name: string) => normalizedHeaders[name.toLowerCase()] || undefined,
  } as unknown as Request;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: {
      responseEnvelope: {
        correlationId: 'corr-handlers-access-context',
        tenantId: 'tenant-connectshyft-alpha',
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

const expectRefusalDecision: (
  decision: ConnectShyftContextDecision,
  expected: Partial<Extract<ConnectShyftContextDecision, { ok: false }>>,
) => asserts decision is Extract<ConnectShyftContextDecision, { ok: false }> = (
  decision: ConnectShyftContextDecision,
  expected: Partial<Extract<ConnectShyftContextDecision, { ok: false }>>,
): asserts decision is Extract<ConnectShyftContextDecision, { ok: false }> => {
  expect(decision).toMatchObject(expected);
  expect(decision.ok).toBe(false);
};

const createThenableQuery = (rows: unknown[], firstRow: unknown = rows[0] ?? null) => {
  const chain: any = {
    join: jest.fn(() => chain),
    where: jest.fn(() => chain),
    andWhere: jest.fn(() => chain),
    select: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(async () => rows),
    first: jest.fn(async () => firstRow),
  };

  chain.then = (resolve: (value: unknown[]) => unknown, reject?: (error: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);

  return chain;
};

const buildPlatformDbMock = (input: {
  tenantMembershipTenantIds: string[];
  tenantMembershipRoleSetJson: string;
  orgUnitMembershipIds: string[];
  directMembershipRows?: Array<{
    orgUnitId: string;
    roleSetJson?: unknown;
    updatedAtUtc?: unknown;
    createdAtUtc?: unknown;
  }>;
  orgUnitMembershipRoleSetJson: string;
  orgUnit: { id: string; tenantId: string };
}) => ({
  withSchema: jest.fn((schema: string) => ({
    table: (table: string) => {
      if (schema !== 'platform') {
        throw new Error(`Unexpected schema lookup: ${schema}`);
      }

      if (table === 'tenant_memberships') {
        return createThenableQuery(
          input.tenantMembershipTenantIds.map((tenantId) => ({ tenant_id: tenantId })),
          { role_set_json: input.tenantMembershipRoleSetJson },
        );
      }

      if (table === 'org_unit_memberships as om') {
        return createThenableQuery(
          input.directMembershipRows ?? input.orgUnitMembershipIds.map((orgUnitId) => ({ orgUnitId })),
        );
      }

      if (table === 'org_units') {
        return createThenableQuery(
          [{ id: input.orgUnit.id, tenant_id: input.orgUnit.tenantId }],
          { id: input.orgUnit.id, tenant_id: input.orgUnit.tenantId },
        );
      }

      if (table === 'org_unit_memberships') {
        return createThenableQuery(
          [],
          { role_set_json: input.orgUnitMembershipRoleSetJson },
        );
      }

      throw new Error(`Unexpected table lookup: ${schema}.${table}`);
    },
  })),
});

const buildActiveScopedPlatformDbMock = (input: {
  tenantId: string;
  activeOrgUnitId: string;
  archivedOrgUnitId: string;
  tenantMembershipRoleSetJson: string;
  orgUnitMembershipRoleSetJson: string;
}) => {
  const directMembershipQuery: any = {
    statusFilter: null as string | null,
    join: jest.fn(() => directMembershipQuery),
    where: jest.fn(() => directMembershipQuery),
    andWhere: jest.fn((column: string, value: string) => {
      if (column === 'ou.status') {
        directMembershipQuery.statusFilter = value;
      }
      return directMembershipQuery;
    }),
    select: jest.fn(() => directMembershipQuery),
    orderBy: jest.fn(() => directMembershipQuery),
  };

  directMembershipQuery.then = (
    resolve: (value: Array<{ orgUnitId: string }>) => unknown,
    reject?: (error: unknown) => unknown,
  ) => Promise.resolve(
    directMembershipQuery.statusFilter === 'active'
      ? [{ orgUnitId: input.activeOrgUnitId }]
      : [
        { orgUnitId: input.activeOrgUnitId },
        { orgUnitId: input.archivedOrgUnitId },
      ],
  ).then(resolve, reject);

  return {
    directMembershipQuery,
    db: {
      withSchema: jest.fn((schema: string) => ({
        table: (table: string) => {
          if (schema !== 'platform') {
            throw new Error(`Unexpected schema lookup: ${schema}`);
          }

          if (table === 'tenant_memberships') {
            return createThenableQuery(
              [{ tenant_id: input.tenantId }],
              { role_set_json: input.tenantMembershipRoleSetJson },
            );
          }

          if (table === 'org_unit_memberships as om') {
            return directMembershipQuery;
          }

          if (table === 'org_units') {
            return createThenableQuery(
              [{ id: input.activeOrgUnitId, tenant_id: input.tenantId }],
              { id: input.activeOrgUnitId, tenant_id: input.tenantId },
            );
          }

          if (table === 'org_unit_memberships') {
            return createThenableQuery(
              [],
              { role_set_json: input.orgUnitMembershipRoleSetJson },
            );
          }

          throw new Error(`Unexpected table lookup: ${schema}.${table}`);
        },
      })),
    } as any,
  };
};

describe('connectshyft handler access context helper', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
  });

  it('returns only the resolved access context for the extracted route family', async () => {
    const decision = await resolveConnectShyftRouteContextDecision(
      createRequest({
        role: 'ORGUNIT_MEMBER',
        headers: {
          'x-test-connectshyft-orgunit-memberships': JSON.stringify([
            'org-connectshyft-alpha-east',
          ]),
        },
      }),
    );

    expect(decision).toEqual({
      ok: true,
      context: {
        tenantId: 'tenant-connectshyft-alpha',
        orgUnitId: 'org-connectshyft-alpha-east',
        bypassedOrgUnitMembership: false,
        effectiveRoles: ['ORGUNIT_MEMBER'],
      },
    });
  });

  it('returns the current orgUnit refusal decision when context is missing', async () => {
    const decision = await resolveConnectShyftRouteContextDecision(
      createRequest({
        orgUnitId: null,
        activeOrgUnitId: null,
      }),
    );

    expectRefusalDecision(decision, {
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('hydrates tenant and orgUnit context from single persisted memberships when the request starts public-scoped', async () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const orgUnitId = '22222222-2222-4222-8222-222222222222';
    const userId = '33333333-3333-4333-8333-333333333333';
    jest.spyOn(accessContextModule, 'loadConnectShyftPlatformDb').mockReturnValue(
      buildPlatformDbMock({
        tenantMembershipTenantIds: [tenantId],
        tenantMembershipRoleSetJson: '["TENANT_STAFF"]',
        orgUnitMembershipIds: [orgUnitId],
        orgUnitMembershipRoleSetJson: '["ORGUNIT_MEMBER"]',
        orgUnit: {
          id: orgUnitId,
          tenantId,
        },
      }) as any,
    );

    const req = createRequest({
      tenantId: 'public',
      orgUnitId: null,
      role: 'member',
      userId,
      householdId: null,
      activeTenantId: null,
      activeOrgUnitId: null,
      source: 'public',
    });

    const decision = await resolveConnectShyftRouteContextDecision(req);

    expect(decision).toMatchObject({
      ok: true,
      context: {
        tenantId,
        orgUnitId,
        bypassedOrgUnitMembership: true,
        effectiveRoles: expect.arrayContaining(['TENANT_STAFF', 'ORGUNIT_MEMBER']),
      },
    });
    expect(req.tenantId).toBe(tenantId);
    expect(req.orgUnitId).toBe(orgUnitId);
    expect(req.tenantContext).toMatchObject({
      tenantId,
      orgUnitId,
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    });
  });

  it('prefers the strongest active orgUnit membership when bootstrapping fallback context', async () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const memberOrgUnitId = '22222222-2222-4222-8222-222222222222';
    const adminOrgUnitId = '33333333-3333-4333-8333-333333333333';
    const userId = '44444444-4444-4444-8444-444444444444';
    jest.spyOn(accessContextModule, 'loadConnectShyftPlatformDb').mockReturnValue(
      buildPlatformDbMock({
        tenantMembershipTenantIds: [tenantId],
        tenantMembershipRoleSetJson: '["TENANT_STAFF"]',
        orgUnitMembershipIds: [memberOrgUnitId, adminOrgUnitId],
        directMembershipRows: [
          {
            orgUnitId: memberOrgUnitId,
            roleSetJson: '["ORGUNIT_MEMBER"]',
            updatedAtUtc: '2026-03-25T10:00:00.000Z',
            createdAtUtc: '2026-03-25T09:00:00.000Z',
          },
          {
            orgUnitId: adminOrgUnitId,
            roleSetJson: '["ORGUNIT_ADMIN"]',
            updatedAtUtc: '2026-03-20T10:00:00.000Z',
            createdAtUtc: '2026-03-20T09:00:00.000Z',
          },
        ],
        orgUnitMembershipRoleSetJson: '["ORGUNIT_ADMIN"]',
        orgUnit: {
          id: adminOrgUnitId,
          tenantId,
        },
      }) as any,
    );

    const req = createRequest({
      tenantId: 'public',
      orgUnitId: null,
      role: 'member',
      userId,
      householdId: null,
      activeTenantId: null,
      activeOrgUnitId: null,
      source: 'public',
    });

    const decision = await resolveConnectShyftRouteContextDecision(req);

    expect(decision).toMatchObject({
      ok: true,
      context: {
        tenantId,
        orgUnitId: adminOrgUnitId,
        bypassedOrgUnitMembership: true,
        effectiveRoles: expect.arrayContaining(['TENANT_STAFF', 'ORGUNIT_ADMIN']),
      },
    });
    expect(req.orgUnitId).toBe(adminOrgUnitId);
    expect(req.tenantContext).toMatchObject({
      tenantId,
      orgUnitId: adminOrgUnitId,
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    });
  });

  it('ignores archived orgUnit memberships when bootstrapping fallback context', async () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const activeOrgUnitId = '22222222-2222-4222-8222-222222222222';
    const archivedOrgUnitId = '33333333-3333-4333-8333-333333333333';
    const userId = '44444444-4444-4444-8444-444444444444';
    const platformDbMock = buildActiveScopedPlatformDbMock({
      tenantId,
      activeOrgUnitId,
      archivedOrgUnitId,
      tenantMembershipRoleSetJson: '["TENANT_VIEWER"]',
      orgUnitMembershipRoleSetJson: '["ORGUNIT_MEMBER"]',
    });
    jest.spyOn(accessContextModule, 'loadConnectShyftPlatformDb').mockReturnValue(
      platformDbMock.db,
    );

    const req = createRequest({
      tenantId: 'public',
      orgUnitId: null,
      role: 'member',
      userId,
      householdId: null,
      activeTenantId: null,
      activeOrgUnitId: null,
      source: 'public',
    });

    const decision = await resolveConnectShyftRouteContextDecision(req);

    expect(decision).toMatchObject({
      ok: true,
      context: {
        tenantId,
        orgUnitId: activeOrgUnitId,
        bypassedOrgUnitMembership: true,
        effectiveRoles: expect.arrayContaining(['TENANT_VIEWER', 'ORGUNIT_MEMBER']),
      },
    });
    expect(platformDbMock.directMembershipQuery.andWhere).toHaveBeenCalledWith('ou.status', 'active');
  });

  it('maps a context refusal decision to the shared refusal envelope shape', async () => {
    const decision = await resolveConnectShyftRouteContextDecision(
      createRequest({
        orgUnitId: 'invalid-orgunit-context',
        activeOrgUnitId: 'invalid-orgunit-context',
      }),
    );
    expectRefusalDecision(decision, {
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      refusalType: 'business',
      httpStatus: 200,
    });

    const res = createMockResponse();
    respondWithConnectShyftContextRefusal(res, decision);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      message: 'orgUnit context is invalid for ConnectShyft routes',
      refusalType: 'business',
      correlationId: 'corr-handlers-access-context',
      tenantId: 'tenant-connectshyft-alpha',
    });
  });

  it('checks capabilities against resolved context roles instead of duplicating route-specific rules', () => {
    const req = createRequest({
      role: 'UNAUTHORIZED',
    });

    expect(requestHasAnyCapability(
      req,
      [CAPABILITIES.ORG_UNIT_THREAD_VIEW],
      {
        effectiveRoles: ['ORGUNIT_MEMBER'],
      },
    )).toBe(true);

    expect(requestHasAnyCapability(
      req,
      [CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG],
      {
        effectiveRoles: ['ORGUNIT_MEMBER'],
      },
    )).toBe(false);
  });
});
