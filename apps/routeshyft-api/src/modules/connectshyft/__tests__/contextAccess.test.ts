import { Request } from 'express';
import {
  resolveConnectShyftOrgUnitContext,
  type ConnectShyftContextDecision,
} from '../contextAccess';

type RequestBuilderOptions = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  activeOrgUnitId?: string | null;
  headers?: Record<string, string>;
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
      userId: options.userId ?? 'user-connectshyft-a2-member',
      email: 'member@example.com',
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId:
        options.activeOrgUnitId === undefined
          ? orgUnitId
          : options.activeOrgUnitId,
      role: options.role ?? 'TENANT_STAFF',
    },
    header: (name: string) => normalizedHeaders[name.toLowerCase()] || undefined,
  } as unknown as Request;
};

const decisionMatches = (
  decision: ConnectShyftContextDecision,
  expected: Partial<ConnectShyftContextDecision>,
): void => {
  expect(decision).toMatchObject(expected);
};

describe('connectshyft context enforcement', () => {
  beforeEach(() => {
    delete process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  });

  it('requires orgUnit context on orgUnit-scoped routes', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(createRequest({ orgUnitId: null }));

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('rejects invalid orgUnit context identifiers', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(createRequest({ orgUnitId: 'invalid-orgunit-context' }));

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('rejects canonical orgUnit contexts that cross tenant boundaries', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({ orgUnitId: 'org-connectshyft-bravo-north' }),
    );

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('blocks spoofed active-org-unit headers with security refusal', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({
        headers: {
          'x-active-org-unit-id': 'org-connectshyft-bravo-north',
        },
      }),
    );

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      refusalType: 'security',
      httpStatus: 403,
    });
  });

  it('requires membership for non-privileged callers when explicit test memberships are empty', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({
        role: 'ORGUNIT_MEMBER',
        userId: 'user-connectshyft-a2-non-member',
        headers: {
          'x-test-connectshyft-orgunit-memberships': '[]',
        },
      }),
    );

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('accepts explicit orgUnit memberships for non-privileged callers in test mode', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(
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

  it('bypasses orgUnit membership for tenant-privileged callers in test mode', async () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({
        role: 'TENANT_ADMIN',
        orgUnitId: 'org-connectshyft-alpha-west',
      }),
      { attemptedOrgUnitId: 'org-connectshyft-alpha-west' },
    );

    expect(decision).toEqual({
      ok: true,
      context: {
        tenantId: 'tenant-connectshyft-alpha',
        orgUnitId: 'org-connectshyft-alpha-west',
        bypassedOrgUnitMembership: true,
        effectiveRoles: ['TENANT_ADMIN'],
      },
    });
  });

  it('requires authoritative access resolver for UUID-based context validation', async () => {
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({
        tenantId: '11111111-1111-4111-8111-111111111111',
        orgUnitId: '22222222-2222-4222-8222-222222222222',
      }),
    );

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_ACCESS_VALIDATION_UNAVAILABLE',
      refusalType: 'security',
      httpStatus: 500,
    });
  });

  it('maps authoritative ORG_UNIT_TENANT_MISMATCH to connectshyft mismatch refusal', async () => {
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({
        tenantId: '11111111-1111-4111-8111-111111111111',
        orgUnitId: '22222222-2222-4222-8222-222222222222',
      }),
      {
        resolveOrgUnitAccess: async () => ({
          ok: false,
          reason: 'ORG_UNIT_TENANT_MISMATCH',
        }),
      },
    );

    decisionMatches(decision, {
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('uses authoritative membership decision for UUID-based context checks', async () => {
    const decision = await resolveConnectShyftOrgUnitContext(
      createRequest({
        role: 'ORGUNIT_MEMBER',
        tenantId: '11111111-1111-4111-8111-111111111111',
        orgUnitId: '22222222-2222-4222-8222-222222222222',
      }),
      {
        resolveOrgUnitAccess: async () => ({
          ok: true,
          bypassedOrgUnitMembership: false,
          effectiveRoles: ['ORGUNIT_MEMBER'],
        }),
      },
    );

    expect(decision).toEqual({
      ok: true,
      context: {
        tenantId: '11111111-1111-4111-8111-111111111111',
        orgUnitId: '22222222-2222-4222-8222-222222222222',
        bypassedOrgUnitMembership: false,
        effectiveRoles: ['ORGUNIT_MEMBER'],
      },
    });
  });
});
