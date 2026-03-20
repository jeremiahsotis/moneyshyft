import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  requestHasAnyCapability,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} from '../http/accessContext';
import type { ConnectShyftContextDecision } from '../contextAccess';

type RequestBuilderOptions = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  activeOrgUnitId?: string | null;
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
      source: 'auth',
    },
    user: {
      userId: options.userId ?? 'user-connectshyft-handler-access',
      email: 'handler-access@example.com',
      householdId: tenantId,
      activeTenantId: tenantId,
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
