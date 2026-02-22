import {
  ConnectShyftEscalationConfigService,
  InMemoryConnectShyftEscalationConfigStore,
} from '../escalationConfig';

describe('connectshyft escalation config service', () => {
  let store: InMemoryConnectShyftEscalationConfigStore;
  let service: ConnectShyftEscalationConfigService;

  beforeEach(() => {
    store = new InMemoryConnectShyftEscalationConfigStore();
    service = new ConnectShyftEscalationConfigService(store);
  });

  it('persists valid escalation baseline and recipients for orgUnit scope', () => {
    const result = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      data: {
        orgUnitId: 'org-connectshyft-alpha-east',
        escalationBaselineHours: 6,
      },
    });
  });

  it('applies default baseline of 24 when baseline is omitted', () => {
    const result = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      data: {
        escalationBaselineHours: 24,
      },
    });
  });

  it('refuses non-integer baseline values', () => {
    const result = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 2.5,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'escalationBaselineHours',
            reason: 'NOT_INTEGER',
          }),
        ]),
      },
    });
  });

  it('refuses baseline values outside the supported 1-24 hour range', () => {
    const result = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 25,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'escalationBaselineHours',
            reason: 'OUT_OF_RANGE',
          }),
        ]),
      },
    });
  });

  it('refuses persistence when required primary recipient is missing', () => {
    const result = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: ' ',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_RECIPIENT_REQUIRED',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'recipients.primaryOrgUnitAdminUserId',
            reason: 'REQUIRED',
          }),
        ]),
      },
    });
  });

  it('refuses cross-tenant or out-of-scope recipient assignments', () => {
    const result = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-cross-tenant-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_RECIPIENT_INVALID_ASSIGNMENT',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'recipients.primaryOrgUnitAdminUserId',
            reason: 'RECIPIENT_OUTSIDE_TENANT_OR_ORGUNIT_SCOPE',
          }),
        ]),
      },
    });
  });

  it('does not mutate previously saved configuration when a subsequent update is invalid', () => {
    const initialSave = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(initialSave.ok).toBe(true);

    const invalidUpdate = service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 0,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    });

    expect(invalidUpdate).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
    });

    const stored = service.getConfig('tenant-connectshyft-alpha', 'org-connectshyft-alpha-east');
    expect(stored).toMatchObject({
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
      },
    });
  });
});
