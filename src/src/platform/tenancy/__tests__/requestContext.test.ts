import { Request } from 'express';
import { resolveTenantRequestContext } from '../requestContext';

const buildRequest = (overrides: Partial<Request> = {}): Request => {
  const headers = new Map<string, string>();

  if (typeof overrides.header === 'function') {
    return overrides as Request;
  }

  return {
    cookies: {},
    header: (name: string) => headers.get(name.toLowerCase()) || undefined,
    ...overrides,
  } as unknown as Request;
};

describe('resolveTenantRequestContext', () => {
  it('returns public tenant context when unauthenticated', () => {
    const req = buildRequest();

    expect(resolveTenantRequestContext(req)).toEqual({
      tenantId: 'public',
      orgUnitId: null,
      scopeMode: 'TENANT',
      source: 'public',
    });
  });

  it('uses authenticated active tenant context by default', () => {
    const req = buildRequest({
      user: {
        userId: 'u1',
        email: 'u1@example.com',
        householdId: 'tenant-a',
        activeTenantId: 'tenant-a',
        activeOrgUnitId: null,
        role: 'TENANT_STAFF',
      },
    });

    expect(resolveTenantRequestContext(req)).toEqual({
      tenantId: 'tenant-a',
      orgUnitId: null,
      scopeMode: 'TENANT',
      source: 'auth',
    });
  });

  it('resolves orgunit scope when active orgunit is set via header', () => {
    const req = {
      user: {
        userId: 'u1',
        email: 'u1@example.com',
        householdId: 'tenant-a',
        activeTenantId: 'tenant-a',
        activeOrgUnitId: null,
        role: 'TENANT_STAFF',
      },
      cookies: {},
      header: (name: string) => {
        if (name.toLowerCase() === 'x-active-org-unit-id') {
          return 'org-1';
        }
        return undefined;
      },
    } as unknown as Request;

    expect(resolveTenantRequestContext(req)).toEqual({
      tenantId: 'tenant-a',
      orgUnitId: 'org-1',
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    });
  });

  it('allows system admin to override active tenant via header', () => {
    const req = {
      user: {
        userId: 'sys-1',
        email: 'sys@example.com',
        householdId: null,
        activeTenantId: null,
        activeOrgUnitId: null,
        role: 'SYSTEM_ADMIN',
      },
      cookies: {},
      header: (name: string) => {
        if (name.toLowerCase() === 'x-active-tenant-id') {
          return 'tenant-z';
        }
        return undefined;
      },
    } as unknown as Request;

    expect(resolveTenantRequestContext(req)).toEqual({
      tenantId: 'tenant-z',
      orgUnitId: null,
      scopeMode: 'TENANT',
      source: 'auth',
    });
  });
});
