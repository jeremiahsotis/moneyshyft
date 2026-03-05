import {
  CAPABILITIES,
  getCapabilitiesForRoles,
  hasCapability,
  normalizeRole,
  normalizeRoles,
} from '../capabilities';

describe('platform RBAC capabilities', () => {
  it('normalizes supported roles and rejects unknown roles', () => {
    expect(normalizeRole('tenant_admin')).toBe('TENANT_ADMIN');
    expect(normalizeRole('ORGUNIT_MEMBER')).toBe('ORGUNIT_MEMBER');
    expect(normalizeRole('unknown')).toBeNull();
  });

  it('deduplicates and normalizes role arrays', () => {
    expect(normalizeRoles(['tenant_admin', 'TENANT_ADMIN', 'orgunit_member'])).toEqual([
      'TENANT_ADMIN',
      'ORGUNIT_MEMBER',
    ]);
  });

  it('grants full capability set to system admin', () => {
    expect(hasCapability(['SYSTEM_ADMIN'], CAPABILITIES.TENANT_CREATE)).toBe(true);
    expect(hasCapability(['SYSTEM_ADMIN'], CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE)).toBe(true);
  });

  it('enforces tenant and orgunit capability boundaries', () => {
    expect(hasCapability(['TENANT_STAFF'], CAPABILITIES.ORG_UNIT_CREATE)).toBe(false);
    expect(hasCapability(['TENANT_ADMIN'], CAPABILITIES.ORG_UNIT_CREATE)).toBe(true);
    expect(hasCapability(['ORGUNIT_MEMBER'], CAPABILITIES.ORG_UNIT_SMS_SEND)).toBe(true);
    expect(hasCapability(['ORGUNIT_MEMBER'], CAPABILITIES.ORG_UNIT_MEMBERSHIP_MANAGE)).toBe(false);
  });

  it('unions capabilities across multiple role layers', () => {
    const capabilities = getCapabilitiesForRoles(['TENANT_VIEWER', 'ORGUNIT_MEMBER']);

    expect(capabilities.has(CAPABILITIES.TENANT_READ_ALL)).toBe(true);
    expect(capabilities.has(CAPABILITIES.ORG_UNIT_SMS_SEND)).toBe(true);
    expect(capabilities.has(CAPABILITIES.ORG_UNIT_CREATE)).toBe(false);
  });
});
