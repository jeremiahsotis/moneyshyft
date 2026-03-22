import {
  ConnectShyftEscalationConfigService,
  InMemoryConnectShyftEscalationConfigStore,
  KnexConnectShyftEscalationConfigStore,
  connectShyftEscalationRecipientScopes,
  createEscalationRecipientDirectory,
} from '../escalationConfig';

const RECIPIENT_DIRECTORY = createEscalationRecipientDirectory({
  orgUnitRecipientIds: [
    'user-connectshyft-a4-primary-recipient',
    'user-connectshyft-a4-secondary-recipient',
  ],
  tenantRecipientIds: [
    'user-connectshyft-a4-primary-recipient',
    'user-connectshyft-a4-secondary-recipient',
    'user-connectshyft-a4-tenant-staff-recipient',
  ],
  options: [
    {
      value: 'user-connectshyft-a4-primary-recipient',
      label: 'Primary OrgUnit Admin',
      scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
    },
    {
      value: 'user-connectshyft-a4-secondary-recipient',
      label: 'Secondary OrgUnit Admin',
      scope: connectShyftEscalationRecipientScopes.ORG_UNIT,
    },
    {
      value: 'user-connectshyft-a4-tenant-staff-recipient',
      label: 'Tenant Staff Recipient',
      scope: connectShyftEscalationRecipientScopes.TENANT,
    },
  ],
});

describe('connectshyft escalation config service', () => {
  let store: InMemoryConnectShyftEscalationConfigStore;
  let service: ConnectShyftEscalationConfigService;

  beforeEach(() => {
    store = new InMemoryConnectShyftEscalationConfigStore();
    service = new ConnectShyftEscalationConfigService(store);
  });

  it('persists valid escalation baseline and recipients for orgUnit scope', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
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

  it('applies default baseline of 24 when baseline is omitted', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      data: {
        escalationBaselineHours: 24,
      },
    });
  });

  it('refuses non-integer baseline values', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 2.5,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
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

  it('refuses baseline values outside the supported 1-24 hour range', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 25,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
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

  it('refuses persistence when required primary recipient is missing', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: ' ',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
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

  it('refuses cross-tenant or out-of-scope recipient assignments', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-cross-tenant-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
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

  it('does not mutate previously saved configuration when a subsequent update is invalid', async () => {
    const initialSave = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
    });

    expect(initialSave.ok).toBe(true);

    const invalidUpdate = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 0,
      actorRoles: ['ORGUNIT_ADMIN'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
    });

    expect(invalidUpdate).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
    });

    const stored = await service.getConfig('tenant-connectshyft-alpha', 'org-connectshyft-alpha-east');
    expect(stored).toMatchObject({
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
      },
    });
  });

  it('refuses persistence when actor lacks escalation configuration capability', async () => {
    const result = await service.saveConfig({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      actorRoles: ['ORGUNIT_MEMBER'],
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
      recipientDirectory: RECIPIENT_DIRECTORY,
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
    });
  });

  it('preserves a stored default operator phone on the config seam', async () => {
    await store.setDefaultOperatorPhone(
      'tenant-connectshyft-alpha',
      'org-connectshyft-alpha-east',
      '+12605550123',
    );

    await expect(service.getConfig(
      'tenant-connectshyft-alpha',
      'org-connectshyft-alpha-east',
    )).resolves.toMatchObject({
      orgUnitId: 'org-connectshyft-alpha-east',
      defaultOperatorPhoneE164: '+12605550123',
      escalationBaselineHours: 24,
      recipients: {
        primaryOrgUnitAdminUserId: '',
        secondaryOrgUnitAdminUserId: '',
        tenantStaffUserId: '',
      },
    });
  });
});

function buildEscalationKnexMock(firstResults: Array<Record<string, unknown> | null>) {
  const first = jest.fn(async () => firstResults.shift() ?? null);
  const where = jest.fn(() => ({
    first,
  }));
  const merge = jest.fn(async () => undefined);
  const onConflict = jest.fn(() => ({
    merge,
  }));
  const insert = jest.fn(() => ({
    onConflict,
  }));
  const table = jest.fn(() => ({
    where,
    insert,
  }));
  const withSchema = jest.fn(() => ({
    table,
  }));

  const knex: any = {
    withSchema,
  };

  return {
    knex,
    withSchema,
    table,
    where,
    first,
    insert,
    onConflict,
    merge,
  };
}

describe('KnexConnectShyftEscalationConfigStore', () => {
  it('stores the default operator phone on the escalation-config seam', async () => {
    const { knex, withSchema, table, insert, onConflict, merge } = buildEscalationKnexMock([null]);
    const store = new KnexConnectShyftEscalationConfigStore(() => knex);

    await expect(store.setDefaultOperatorPhone(
      'tenant-connectshyft-alpha',
      'org-connectshyft-alpha-east',
      '+12605550123',
    )).resolves.toMatchObject({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 24,
      defaultOperatorPhoneE164: '+12605550123',
      recipients: {
        primaryOrgUnitAdminUserId: '',
        secondaryOrgUnitAdminUserId: '',
        tenantStaffUserId: '',
      },
    });

    expect(withSchema).toHaveBeenCalledWith('connectshyft');
    expect(table).toHaveBeenCalledWith('cs_org_unit_escalation_config');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-connectshyft-alpha',
      org_unit_id: 'org-connectshyft-alpha-east',
      escalation_baseline_hours: 24,
      primary_org_unit_admin_user_id: '',
      secondary_org_unit_admin_user_id: null,
      tenant_staff_user_id: null,
      default_operator_phone_e164: '+12605550123',
    }));
    expect(onConflict).toHaveBeenCalledWith(['tenant_id', 'org_unit_id']);
    expect(merge).toHaveBeenCalledWith(expect.objectContaining({
      default_operator_phone_e164: '+12605550123',
    }));
  });

  it('preserves an existing default operator phone when saving escalation recipients', async () => {
    const { knex, insert, merge } = buildEscalationKnexMock([
      {
        tenant_id: 'tenant-connectshyft-alpha',
        org_unit_id: 'org-connectshyft-alpha-east',
        escalation_baseline_hours: 12,
        primary_org_unit_admin_user_id: 'user-connectshyft-a4-primary-recipient',
        secondary_org_unit_admin_user_id: 'user-connectshyft-a4-secondary-recipient',
        tenant_staff_user_id: 'user-connectshyft-a4-tenant-staff-recipient',
        default_operator_phone_e164: '+12605550123',
        created_at_utc: '2026-03-22T12:00:00.000Z',
        updated_at_utc: '2026-03-22T13:00:00.000Z',
      },
    ]);
    const store = new KnexConnectShyftEscalationConfigStore(() => knex);

    await expect(store.saveConfig(
      'tenant-connectshyft-alpha',
      'org-connectshyft-alpha-east',
      6,
      {
        primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
        tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
      },
    )).resolves.toMatchObject({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      defaultOperatorPhoneE164: '+12605550123',
      createdAtUtc: '2026-03-22T12:00:00.000Z',
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      default_operator_phone_e164: '+12605550123',
    }));
    expect(merge).toHaveBeenCalledWith(expect.objectContaining({
      escalation_baseline_hours: 6,
      primary_org_unit_admin_user_id: 'user-connectshyft-a4-primary-recipient',
      secondary_org_unit_admin_user_id: 'user-connectshyft-a4-secondary-recipient',
      tenant_staff_user_id: 'user-connectshyft-a4-tenant-staff-recipient',
    }));
  });
});
