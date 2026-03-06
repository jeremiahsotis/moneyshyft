export const testUserData = {
  tenantAdmin: {
    userId: 'user-tenant-admin-001',
    tenantId: 'tenant-a',
    role: 'TENANT_ADMIN',
  },
  systemAdmin: {
    userId: 'user-system-admin-001',
    tenantId: 'platform',
    role: 'SYSTEM_ADMIN',
  },
  orgUnit: {
    id: 'org-1',
    tenantId: 'tenant-a',
    name: 'Regional Ops',
  },
};

export const connectShyftFeatureFlagData = {
  tenantId: 'tenant-connectshyft-a',
  orgUnitId: 'org-connectshyft-east',
  flagsOff: {
    connectshyft_enabled: false,
    connectshyft_inbox_enabled: false,
    connectshyft_escalation_enabled: false,
    connectshyft_webhooks_enabled: false,
  },
  inboxOnly: {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: false,
    connectshyft_webhooks_enabled: false,
  },
  inboxAndEscalation: {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: false,
  },
};

export const connectShyftContextEnforcementData = {
  tenantAlphaId: 'tenant-connectshyft-alpha',
  tenantBravoId: 'tenant-connectshyft-bravo',
  orgUnitAlphaEastId: 'org-connectshyft-alpha-east',
  orgUnitAlphaWestId: 'org-connectshyft-alpha-west',
  orgUnitBravoNorthId: 'org-connectshyft-bravo-north',
  staffUserId: 'user-connectshyft-a2-staff',
  nonMemberUserId: 'user-connectshyft-a2-non-member',
  tenantAdminUserId: 'user-connectshyft-a2-tenant-admin',
  flagsAllEnabled: {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  },
};

export const connectShyftNumberMappingData = {
  tenantAlphaId: 'tenant-connectshyft-alpha',
  tenantBravoId: 'tenant-connectshyft-bravo',
  orgUnitAlphaEastId: 'org-connectshyft-alpha-east',
  orgUnitAlphaWestId: 'org-connectshyft-alpha-west',
  orgUnitBravoNorthId: 'org-connectshyft-bravo-north',
  orgUnitAdminUserId: 'user-connectshyft-a3-orgunit-admin',
  tenantStaffUserId: 'user-connectshyft-a3-tenant-staff',
  validPrimaryNumber: '+12605550111',
  validSecondaryNumber: '+12605550112',
  validUpdatedNumber: '+12605550119',
  duplicateTenantNumber: '+12605550123',
  invalidNonE164Number: '260-555-0111',
  flagsAllEnabled: {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  },
};

export const connectShyftEscalationConfigData = {
  tenantAlphaId: 'tenant-connectshyft-alpha',
  tenantBravoId: 'tenant-connectshyft-bravo',
  orgUnitAlphaEastId: 'org-connectshyft-alpha-east',
  orgUnitAlphaWestId: 'org-connectshyft-alpha-west',
  orgUnitBravoNorthId: 'org-connectshyft-bravo-north',
  orgUnitAdminUserId: 'user-connectshyft-a4-orgunit-admin',
  tenantStaffUserId: 'user-connectshyft-a4-tenant-staff',
  primaryRecipientUserId: 'user-connectshyft-a4-primary-recipient',
  secondaryRecipientUserId: 'user-connectshyft-a4-secondary-recipient',
  tenantStaffRecipientUserId: 'user-connectshyft-a4-tenant-staff-recipient',
  crossTenantRecipientUserId: 'user-connectshyft-a4-cross-tenant-recipient',
  defaultBaselineHours: 24,
  validBaselineHours: 6,
  invalidBaselineLow: 0,
  invalidBaselineHigh: 25,
  invalidBaselineFractional: 2.5,
  flagsAllEnabled: {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  },
};

export const connectShyftCapabilityEnvelopeData = {
  tenantAlphaId: 'tenant-connectshyft-alpha',
  tenantBravoId: 'tenant-connectshyft-bravo',
  orgUnitAlphaEastId: 'org-connectshyft-alpha-east',
  orgUnitAlphaWestId: 'org-connectshyft-alpha-west',
  orgUnitBravoNorthId: 'org-connectshyft-bravo-north',
  orgUnitAdminUserId: 'user-connectshyft-a5-orgunit-admin',
  orgUnitMemberUserId: 'user-connectshyft-a5-orgunit-member',
  tenantStaffUserId: 'user-connectshyft-a5-tenant-staff',
  tenantViewerUserId: 'user-connectshyft-a5-tenant-viewer',
  tenantAdminUserId: 'user-connectshyft-a5-tenant-admin',
  unauthorizedUserId: 'user-connectshyft-a5-unauthorized',
  existingMappingId: 'mapping-a5-existing-1001',
  validPrimaryNumber: '+12605550201',
  validUpdatedNumber: '+12605550202',
  validEscalationBaselineHours: 8,
  fallbackEscalationBaselineHours: 24,
  flagsAllEnabled: {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  },
};
