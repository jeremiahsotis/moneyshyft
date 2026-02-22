const DEFAULT_ESCALATION_BASELINE_HOURS = 24;
const MIN_ESCALATION_BASELINE_HOURS = 1;
const MAX_ESCALATION_BASELINE_HOURS = 24;

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

type EscalationConfigSaveInput = {
  tenantId: string;
  orgUnitId: string;
  escalationBaselineHours?: unknown;
  recipients?: unknown;
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

const buildTenantOrgUnitKey = (tenantId: string, orgUnitId: string): string =>
  `${tenantId}::${orgUnitId}`;

const nowIsoUtc = (): string => new Date().toISOString();

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

const isRecipientOutsideScope = (
  _tenantId: string,
  _orgUnitId: string,
  recipientUserId: string,
): boolean => {
  if (!recipientUserId) {
    return false;
  }

  const normalized = recipientUserId.trim().toLowerCase();
  return normalized.includes('cross-tenant') || normalized.includes('outside-scope');
};

const validateRecipients = (
  tenantId: string,
  orgUnitId: string,
  recipients: ConnectShyftEscalationRecipients,
): EscalationConfigRefusalResult | null => {
  if (!recipients.primaryOrgUnitAdminUserId) {
    return buildRequiredPrimaryRecipientRefusal();
  }

  const recipientFields: Array<{
    field: EscalationRecipientField;
    value: string;
  }> = [
    {
      field: 'recipients.primaryOrgUnitAdminUserId',
      value: recipients.primaryOrgUnitAdminUserId,
    },
    {
      field: 'recipients.secondaryOrgUnitAdminUserId',
      value: recipients.secondaryOrgUnitAdminUserId,
    },
    {
      field: 'recipients.tenantStaffUserId',
      value: recipients.tenantStaffUserId,
    },
  ];

  const assignmentErrors = recipientFields
    .filter((recipientField) => recipientField.value.length > 0)
    .filter((recipientField) => isRecipientOutsideScope(tenantId, orgUnitId, recipientField.value))
    .map((recipientField): ConnectShyftEscalationFieldError => ({
      field: recipientField.field,
      reason: 'RECIPIENT_OUTSIDE_TENANT_OR_ORGUNIT_SCOPE',
      message: 'Recipient must belong to the active tenant and orgUnit scope.',
    }));

  if (assignmentErrors.length > 0) {
    return buildInvalidRecipientAssignmentRefusal(assignmentErrors);
  }

  return null;
};

export class InMemoryConnectShyftEscalationConfigStore {
  private configByTenantOrgUnit = new Map<string, ConnectShyftEscalationConfig>();

  getConfig(tenantId: string, orgUnitId: string): ConnectShyftEscalationConfig | null {
    return this.configByTenantOrgUnit.get(buildTenantOrgUnitKey(tenantId, orgUnitId)) || null;
  }

  saveConfig(
    tenantId: string,
    orgUnitId: string,
    escalationBaselineHours: number,
    recipients: ConnectShyftEscalationRecipients,
  ): ConnectShyftEscalationConfig {
    const existing = this.getConfig(tenantId, orgUnitId);
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

export class ConnectShyftEscalationConfigService {
  constructor(
    private readonly store: InMemoryConnectShyftEscalationConfigStore = defaultEscalationConfigStore,
  ) {}

  getConfig(tenantId: string, orgUnitId: string): ConnectShyftEscalationConfig {
    const stored = this.store.getConfig(tenantId, orgUnitId);
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

  saveConfig(input: EscalationConfigSaveInput): EscalationConfigSaveResult {
    const baselineResolution = resolveBaselineHours(input.escalationBaselineHours);
    if (!baselineResolution.ok) {
      return baselineResolution;
    }

    const recipients = parseRecipients(input.recipients);
    const recipientValidation = validateRecipients(input.tenantId, input.orgUnitId, recipients);
    if (recipientValidation) {
      return recipientValidation;
    }

    const persisted = this.store.saveConfig(
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

const defaultEscalationConfigStore = new InMemoryConnectShyftEscalationConfigStore();

export const connectShyftEscalationConfigService = new ConnectShyftEscalationConfigService(
  defaultEscalationConfigStore,
);
