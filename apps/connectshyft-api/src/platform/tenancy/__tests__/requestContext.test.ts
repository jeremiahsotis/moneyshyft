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

  it('resolves orgunit scope from authenticated session claims', () => {
    const req = {
      user: {
        userId: 'u1',
        email: 'u1@example.com',
        householdId: 'tenant-a',
        activeTenantId: 'tenant-a',
        activeOrgUnitId: 'org-1',
        role: 'TENANT_STAFF',
      },
      cookies: {},
      header: () => undefined,
    } as unknown as Request;

    expect(resolveTenantRequestContext(req)).toEqual({
      tenantId: 'tenant-a',
      orgUnitId: 'org-1',
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    });
  });

  it('ignores caller-supplied tenant headers while honoring shell-selected orgunit context', () => {
    const req = {
      user: {
        userId: 'u1',
        email: 'u1@example.com',
        householdId: 'tenant-safe',
        activeTenantId: 'tenant-safe',
        activeOrgUnitId: null,
        role: 'TENANT_STAFF',
      },
      cookies: {},
      header: (name: string) => {
        if (name.toLowerCase() === 'x-active-tenant-id') {
          return 'tenant-spoof';
        }
        if (name.toLowerCase() === 'x-org-unit-id') {
          return 'org-shell-selected';
        }
        return undefined;
      },
    } as unknown as Request;

    expect(resolveTenantRequestContext(req)).toEqual({
      tenantId: 'tenant-safe',
      orgUnitId: 'org-shell-selected',
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    });
  });
});
