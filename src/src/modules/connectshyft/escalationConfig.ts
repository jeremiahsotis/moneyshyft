import type { Knex } from 'knex';

const DEFAULT_ESCALATION_BASELINE_HOURS = 24;
const MIN_ESCALATION_BASELINE_HOURS = 1;
const MAX_ESCALATION_BASELINE_HOURS = 24;

const ESCALATION_RECIPIENT_SCOPES = {
  ORG_UNIT: 'ORG_UNIT',
  TENANT: 'TENANT',
  TEST_ONLY: 'TEST_ONLY',
} as const;

type EscalationRecipientScope =
  (typeof ESCALATION_RECIPIENT_SCOPES)[keyof typeof ESCALATION_RECIPIENT_SCOPES];

type EscalationRecipientField =
  | 'recipients.primaryOrgUnitAdminUserId'
  | 'recipients.secondaryOrgUnitAdminUserId'
  | 'recipients.tenantStaffUserId';

type EscalationFieldErrorReason =
  | 'NOT_INTEGER'
  | 'OUT_OF_RANGE'
  | 'REQUIRED'
  | 'RECIPIENT_OUTSIDE_TENANT_OR_ORGUNIT_SCOPE';

export type ConnectShyftEscalationFieldError = {
  field: 'escalationBaselineHours' | EscalationRecipientField;
  reason: EscalationFieldErrorReason;
  message: string;
};

export type ConnectShyftEscalationRecipients = {
  primaryOrgUnitAdminUserId: string;
  secondaryOrgUnitAdminUserId: string;
  tenantStaffUserId: string;
};

export type ConnectShyftEscalationConfig = {
  tenantId: string;
  orgUnitId: string;
  escalationBaselineHours: number;
  recipients: ConnectShyftEscalationRecipients;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ConnectShyftEscalationRecipientOption = {
  value: string;
  label: string;
  scope: EscalationRecipientScope;
};

export type ConnectShyftEscalationRecipientDirectory = {
  orgUnitRecipientIds: Set<string>;
  tenantRecipientIds: Set<string>;
  options: ConnectShyftEscalationRecipientOption[];
};

export type EscalationConfigSaveInput = {
  tenantId: string;
  orgUnitId: string;
  escalationBaselineHours?: unknown;
  recipients?: unknown;
  recipientDirectory: ConnectShyftEscalationRecipientDirectory;
};

type EscalationConfigSuccessResult = {
  ok: true;
  code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED';
  httpStatus: 200;
  data: {
    orgUnitId: string;
    escalationBaselineHours: number;
    recipients: ConnectShyftEscalationRecipients;
    updatedAtUtc: string;
  };
};

type EscalationConfigRefusalResult = {
  ok: false;
  code:
    | 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER'
    | 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE'
    | 'CONNECTSHYFT_ESCALATION_RECIPIENT_REQUIRED'
    | 'CONNECTSHYFT_ESCALATION_RECIPIENT_INVALID_ASSIGNMENT';
  message: string;
  data: {
    fieldErrors: ConnectShyftEscalationFieldError[];
  };
};

export type EscalationConfigSaveResult = EscalationConfigSuccessResult | EscalationConfigRefusalResult;

type StoredEscalationConfigRow = {
  tenant_id: string;
  org_unit_id: string;
  escalation_baseline_hours: number;
  primary_org_unit_admin_user_id: string;
  secondary_org_unit_admin_user_id: string | null;
  tenant_staff_user_id: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

export type ConnectShyftEscalationConfigStore = {
  getConfig(tenantId: string, orgUnitId: string): Promise<ConnectShyftEscalationConfig | null>;
  saveConfig(
    tenantId: string,
    orgUnitId: string,
    escalationBaselineHours: number,
    recipients: ConnectShyftEscalationRecipients,
  ): Promise<ConnectShyftEscalationConfig>;
};

const buildTenantOrgUnitKey = (tenantId: string, orgUnitId: string): string =>
  `${tenantId}::${orgUnitId}`;

const nowIsoUtc = (): string => new Date().toISOString();

const toIsoUtc = (value: unknown, fallbackIsoUtc: string): string => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toISOString();
    }
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }

  return fallbackIsoUtc;
};

const normalizeRecipientValue = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const parseRecipients = (value: unknown): ConnectShyftEscalationRecipients => {
  if (!value || typeof value !== 'object') {
    return {
      primaryOrgUnitAdminUserId: '',
      secondaryOrgUnitAdminUserId: '',
      tenantStaffUserId: '',
    };
  }

  const candidate = value as Record<string, unknown>;
  return {
    primaryOrgUnitAdminUserId: normalizeRecipientValue(candidate.primaryOrgUnitAdminUserId),
    secondaryOrgUnitAdminUserId: normalizeRecipientValue(candidate.secondaryOrgUnitAdminUserId),
    tenantStaffUserId: normalizeRecipientValue(candidate.tenantStaffUserId),
  };
};

const buildInvalidIntegerRefusal = (): EscalationConfigRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
  message: 'Use whole hours between 1 and 24.',
  data: {
    fieldErrors: [
      {
        field: 'escalationBaselineHours',
        reason: 'NOT_INTEGER',
        message: 'Use whole hours between 1 and 24.',
      },
    ],
  },
});

const buildInvalidRangeRefusal = (): EscalationConfigRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
  message: 'Use whole hours between 1 and 24.',
  data: {
    fieldErrors: [
      {
        field: 'escalationBaselineHours',
        reason: 'OUT_OF_RANGE',
        message: 'Use whole hours between 1 and 24.',
      },
    ],
  },
});

const buildRequiredPrimaryRecipientRefusal = (): EscalationConfigRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_RECIPIENT_REQUIRED',
  message: 'Primary recipient is required.',
  data: {
    fieldErrors: [
      {
        field: 'recipients.primaryOrgUnitAdminUserId',
        reason: 'REQUIRED',
        message: 'Primary recipient is required.',
      },
    ],
  },
});

const buildInvalidRecipientAssignmentRefusal = (
  fieldErrors: ConnectShyftEscalationFieldError[],
): EscalationConfigRefusalResult => ({
  ok: false,
  code: 'CONNECTSHYFT_ESCALATION_RECIPIENT_INVALID_ASSIGNMENT',
  message: 'Recipient must belong to the active tenant and orgUnit scope.',
  data: {
    fieldErrors,
  },
});

const resolveBaselineHours = (value: unknown): { ok: true; baselineHours: number } | EscalationConfigRefusalResult => {
  if (value === undefined || value === null) {
    return {
      ok: true,
      baselineHours: DEFAULT_ESCALATION_BASELINE_HOURS,
    };
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return buildInvalidIntegerRefusal();
  }

  if (value < MIN_ESCALATION_BASELINE_HOURS || value > MAX_ESCALATION_BASELINE_HOURS) {
    return buildInvalidRangeRefusal();
  }

  return {
    ok: true,
    baselineHours: value,
  };
};

const normalizeRecipientDirectory = (
  input: {
    orgUnitRecipientIds: string[];
    tenantRecipientIds: string[];
    options: ConnectShyftEscalationRecipientOption[];
  },
): ConnectShyftEscalationRecipientDirectory => {
  const orgUnitRecipientIds = new Set(
    input.orgUnitRecipientIds
      .map((value) => normalizeRecipientValue(value))
      .filter((value) => value.length > 0),
  );

  const tenantRecipientIds = new Set(
    input.tenantRecipientIds
      .map((value) => normalizeRecipientValue(value))
      .filter((value) => value.length > 0),
  );

  orgUnitRecipientIds.forEach((value) => tenantRecipientIds.add(value));

  const seenOptions = new Set<string>();
  const options = input.options
    .map((option) => ({
      value: normalizeRecipientValue(option.value),
      label: typeof option.label === 'string' ? option.label.trim() : '',
      scope: option.scope,
    }))
    .filter((option) => option.value.length > 0)
    .filter((option) => {
      if (seenOptions.has(option.value)) {
        return false;
      }
      seenOptions.add(option.value);
      return true;
    });

  return {
    orgUnitRecipientIds,
    tenantRecipientIds,
    options,
  };
};

export const createEscalationRecipientDirectory = (
  input: {
    orgUnitRecipientIds: string[];
    tenantRecipientIds: string[];
    options: ConnectShyftEscalationRecipientOption[];
  },
): ConnectShyftEscalationRecipientDirectory => normalizeRecipientDirectory(input);

const validateRecipients = (
  recipients: ConnectShyftEscalationRecipients,
  recipientDirectory: ConnectShyftEscalationRecipientDirectory,
): EscalationConfigRefusalResult | null => {
  if (!recipients.primaryOrgUnitAdminUserId) {
    return buildRequiredPrimaryRecipientRefusal();
  }

  const recipientChecks: Array<{
    field: EscalationRecipientField;
    value: string;
    isAllowed: boolean;
  }> = [
    {
      field: 'recipients.primaryOrgUnitAdminUserId',
      value: recipients.primaryOrgUnitAdminUserId,
      isAllowed: recipientDirectory.orgUnitRecipientIds.has(recipients.primaryOrgUnitAdminUserId),
    },
    {
      field: 'recipients.secondaryOrgUnitAdminUserId',
      value: recipients.secondaryOrgUnitAdminUserId,
      isAllowed: recipientDirectory.orgUnitRecipientIds.has(recipients.secondaryOrgUnitAdminUserId),
    },
    {
      field: 'recipients.tenantStaffUserId',
      value: recipients.tenantStaffUserId,
      isAllowed: recipientDirectory.tenantRecipientIds.has(recipients.tenantStaffUserId),
    },
  ];

  const assignmentErrors = recipientChecks
    .filter((recipientCheck) => recipientCheck.value.length > 0)
    .filter((recipientCheck) => !recipientCheck.isAllowed)
    .map((recipientCheck): ConnectShyftEscalationFieldError => ({
      field: recipientCheck.field,
      reason: 'RECIPIENT_OUTSIDE_TENANT_OR_ORGUNIT_SCOPE',
      message: 'Recipient must belong to the active tenant and orgUnit scope.',
    }));

  if (assignmentErrors.length > 0) {
    return buildInvalidRecipientAssignmentRefusal(assignmentErrors);
  }

  return null;
};

const mapStoredRowToConfig = (row: StoredEscalationConfigRow): ConnectShyftEscalationConfig => {
  const fallbackNow = nowIsoUtc();

  return {
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    escalationBaselineHours: row.escalation_baseline_hours,
    recipients: {
      primaryOrgUnitAdminUserId: normalizeRecipientValue(row.primary_org_unit_admin_user_id),
      secondaryOrgUnitAdminUserId: normalizeRecipientValue(row.secondary_org_unit_admin_user_id),
      tenantStaffUserId: normalizeRecipientValue(row.tenant_staff_user_id),
    },
    createdAtUtc: toIsoUtc(row.created_at_utc, fallbackNow),
    updatedAtUtc: toIsoUtc(row.updated_at_utc, fallbackNow),
  };
};

export class InMemoryConnectShyftEscalationConfigStore implements ConnectShyftEscalationConfigStore {
  private configByTenantOrgUnit = new Map<string, ConnectShyftEscalationConfig>();

  async getConfig(tenantId: string, orgUnitId: string): Promise<ConnectShyftEscalationConfig | null> {
    return this.configByTenantOrgUnit.get(buildTenantOrgUnitKey(tenantId, orgUnitId)) || null;
  }

  async saveConfig(
    tenantId: string,
    orgUnitId: string,
    escalationBaselineHours: number,
    recipients: ConnectShyftEscalationRecipients,
  ): Promise<ConnectShyftEscalationConfig> {
    const existing = await this.getConfig(tenantId, orgUnitId);
    const now = nowIsoUtc();

    const next: ConnectShyftEscalationConfig = {
      tenantId,
      orgUnitId,
      escalationBaselineHours,
      recipients: { ...recipients },
      createdAtUtc: existing?.createdAtUtc || now,
      updatedAtUtc: now,
    };

    this.configByTenantOrgUnit.set(buildTenantOrgUnitKey(tenantId, orgUnitId), next);
    return next;
  }
}

export class KnexConnectShyftEscalationConfigStore implements ConnectShyftEscalationConfigStore {
  constructor(private readonly resolveDb: () => Knex) {}

  private table() {
    return this.resolveDb().withSchema('connectshyft').table<StoredEscalationConfigRow>('cs_org_unit_escalation_config');
  }

  async getConfig(tenantId: string, orgUnitId: string): Promise<ConnectShyftEscalationConfig | null> {
    const row = await this.table()
      .where({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
      })
      .first();

    return row ? mapStoredRowToConfig(row) : null;
  }

  async saveConfig(
    tenantId: string,
    orgUnitId: string,
    escalationBaselineHours: number,
    recipients: ConnectShyftEscalationRecipients,
  ): Promise<ConnectShyftEscalationConfig> {
    const now = nowIsoUtc();
    const existing = await this.getConfig(tenantId, orgUnitId);

    await this.table()
      .insert({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        escalation_baseline_hours: escalationBaselineHours,
        primary_org_unit_admin_user_id: recipients.primaryOrgUnitAdminUserId,
        secondary_org_unit_admin_user_id: recipients.secondaryOrgUnitAdminUserId || null,
        tenant_staff_user_id: recipients.tenantStaffUserId || null,
        created_at_utc: existing?.createdAtUtc || now,
        updated_at_utc: now,
      })
      .onConflict(['tenant_id', 'org_unit_id'])
      .merge({
        escalation_baseline_hours: escalationBaselineHours,
        primary_org_unit_admin_user_id: recipients.primaryOrgUnitAdminUserId,
        secondary_org_unit_admin_user_id: recipients.secondaryOrgUnitAdminUserId || null,
        tenant_staff_user_id: recipients.tenantStaffUserId || null,
        updated_at_utc: now,
      });

    return {
      tenantId,
      orgUnitId,
      escalationBaselineHours,
      recipients: {
        ...recipients,
      },
      createdAtUtc: existing?.createdAtUtc || now,
      updatedAtUtc: now,
    };
  }
}

export class ConnectShyftEscalationConfigService {
  constructor(
    private readonly store: ConnectShyftEscalationConfigStore,
  ) {}

  async getConfig(tenantId: string, orgUnitId: string): Promise<ConnectShyftEscalationConfig> {
    const stored = await this.store.getConfig(tenantId, orgUnitId);
    if (stored) {
      return stored;
    }

    const now = nowIsoUtc();
    return {
      tenantId,
      orgUnitId,
      escalationBaselineHours: DEFAULT_ESCALATION_BASELINE_HOURS,
      recipients: {
        primaryOrgUnitAdminUserId: '',
        secondaryOrgUnitAdminUserId: '',
        tenantStaffUserId: '',
      },
      createdAtUtc: now,
      updatedAtUtc: now,
    };
  }

  async saveConfig(input: EscalationConfigSaveInput): Promise<EscalationConfigSaveResult> {
    const baselineResolution = resolveBaselineHours(input.escalationBaselineHours);
    if (!baselineResolution.ok) {
      return baselineResolution;
    }

    const recipients = parseRecipients(input.recipients);
    const recipientValidation = validateRecipients(
      recipients,
      input.recipientDirectory,
    );
    if (recipientValidation) {
      return recipientValidation;
    }

    const persisted = await this.store.saveConfig(
      input.tenantId,
      input.orgUnitId,
      baselineResolution.baselineHours,
      recipients,
    );

    return {
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      httpStatus: 200,
      data: {
        orgUnitId: persisted.orgUnitId,
        escalationBaselineHours: persisted.escalationBaselineHours,
        recipients: { ...persisted.recipients },
        updatedAtUtc: persisted.updatedAtUtc,
      },
    };
  }
}

export const connectShyftEscalationRecipientScopes = ESCALATION_RECIPIENT_SCOPES;
