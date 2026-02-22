import { Request } from 'express';
import { resolveConnectShyftOrgUnitContext } from '../contextAccess';

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

describe('connectshyft context enforcement', () => {
  beforeEach(() => {
    delete process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  });

  it('requires orgUnit context on orgUnit-scoped routes', () => {
    const decision = resolveConnectShyftOrgUnitContext(createRequest({ orgUnitId: null }));

    expect(decision).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('rejects invalid orgUnit context identifiers', () => {
    const decision = resolveConnectShyftOrgUnitContext(createRequest({ orgUnitId: 'invalid-orgunit-context' }));

    expect(decision).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('rejects canonical orgUnit contexts that cross tenant boundaries', () => {
    const decision = resolveConnectShyftOrgUnitContext(
      createRequest({ orgUnitId: 'org-connectshyft-bravo-north' }),
    );

    expect(decision).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('blocks spoofed active-org-unit headers with security refusal', () => {
    const decision = resolveConnectShyftOrgUnitContext(
      createRequest({
        headers: {
          'x-active-org-unit-id': 'org-connectshyft-bravo-north',
        },
      }),
    );

    expect(decision).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      refusalType: 'security',
      httpStatus: 403,
    });
  });

  it('requires membership for non-privileged callers when explicit test memberships are empty', () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = resolveConnectShyftOrgUnitContext(
      createRequest({
        role: 'ORGUNIT_MEMBER',
        userId: 'user-connectshyft-a2-non-member',
        headers: {
          'x-test-connectshyft-orgunit-memberships': '[]',
        },
      }),
    );

    expect(decision).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('accepts explicit orgUnit memberships for non-privileged callers in test mode', () => {
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    const decision = resolveConnectShyftOrgUnitContext(
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
      },
    });
  });

  it('bypasses orgUnit membership for tenant-privileged callers', () => {
    const decision = resolveConnectShyftOrgUnitContext(
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
      },
    });
  });
});
