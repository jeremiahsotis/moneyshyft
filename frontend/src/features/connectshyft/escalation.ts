import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';

export type ConnectShyftEscalationRecipients = {
  primaryOrgUnitAdminUserId: string;
  secondaryOrgUnitAdminUserId: string;
  tenantStaffUserId: string;
};

export type ConnectShyftEscalationConfig = {
  orgUnitId: string | null;
  escalationBaselineHours: number;
  recipients: ConnectShyftEscalationRecipients;
};

export type ConnectShyftEscalationRecipientOption = {
  value: string;
  label: string;
};

export type ConnectShyftEscalationFieldError = {
  field: string;
  reason: string;
  message: string;
};

type ConnectShyftEscalationEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    orgUnitId?: string;
    escalationBaselineHours?: number;
    recipients?: Partial<ConnectShyftEscalationRecipients>;
    fieldErrors?: Array<{
      field?: string;
      reason?: string;
      message?: string;
    }>;
  };
};

export type ConnectShyftEscalationSaveInput = {
  escalationBaselineHours?: number;
  recipients: ConnectShyftEscalationRecipients;
};

export type ConnectShyftEscalationSaveResult =
  | {
    ok: true;
    code: string;
    config: ConnectShyftEscalationConfig;
  }
  | {
    ok: false;
    code: string;
    message: string;
    fieldErrors: ConnectShyftEscalationFieldError[];
  };

export const DEFAULT_CONNECTSHYFT_ESCALATION_CONFIG: ConnectShyftEscalationConfig = {
  orgUnitId: null,
  escalationBaselineHours: 24,
  recipients: {
    primaryOrgUnitAdminUserId: '',
    secondaryOrgUnitAdminUserId: '',
    tenantStaffUserId: '',
  },
};

export const DEFAULT_CONNECTSHYFT_ESCALATION_RECIPIENT_OPTIONS: ConnectShyftEscalationRecipientOption[] = [
  {
    value: 'user-connectshyft-a4-primary-recipient',
    label: 'Primary OrgUnit Admin',
  },
  {
    value: 'user-connectshyft-a4-secondary-recipient',
    label: 'Secondary OrgUnit Admin',
  },
  {
    value: 'user-connectshyft-a4-tenant-staff-recipient',
    label: 'Tenant Staff Recipient',
  },
  {
    value: 'user-connectshyft-a4-cross-tenant-recipient',
    label: 'Cross-tenant recipient (invalid test option)',
  },
];

const parseRecipients = (value: unknown): ConnectShyftEscalationRecipients => {
  if (!value || typeof value !== 'object') {
    return {
      ...DEFAULT_CONNECTSHYFT_ESCALATION_CONFIG.recipients,
    };
  }

  const candidate = value as Partial<ConnectShyftEscalationRecipients>;
  return {
    primaryOrgUnitAdminUserId: typeof candidate.primaryOrgUnitAdminUserId === 'string'
      ? candidate.primaryOrgUnitAdminUserId
      : '',
    secondaryOrgUnitAdminUserId: typeof candidate.secondaryOrgUnitAdminUserId === 'string'
      ? candidate.secondaryOrgUnitAdminUserId
      : '',
    tenantStaffUserId: typeof candidate.tenantStaffUserId === 'string'
      ? candidate.tenantStaffUserId
      : '',
  };
};

const parseEscalationConfig = (payload: unknown): ConnectShyftEscalationConfig => {
  if (!payload || typeof payload !== 'object') {
    return { ...DEFAULT_CONNECTSHYFT_ESCALATION_CONFIG };
  }

  const envelope = payload as ConnectShyftEscalationEnvelope;
  return {
    orgUnitId: typeof envelope.data?.orgUnitId === 'string' ? envelope.data.orgUnitId : null,
    escalationBaselineHours:
      typeof envelope.data?.escalationBaselineHours === 'number'
      && Number.isInteger(envelope.data.escalationBaselineHours)
      ? envelope.data.escalationBaselineHours
      : DEFAULT_CONNECTSHYFT_ESCALATION_CONFIG.escalationBaselineHours,
    recipients: parseRecipients(envelope.data?.recipients),
  };
};

const parseFieldErrors = (payload: unknown): ConnectShyftEscalationFieldError[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftEscalationEnvelope;
  const fieldErrors = envelope.data?.fieldErrors;
  if (!Array.isArray(fieldErrors)) {
    return [];
  }

  return fieldErrors
    .filter((fieldError) => fieldError && typeof fieldError === 'object')
    .map((fieldError) => ({
      field: typeof fieldError?.field === 'string' ? fieldError.field : '',
      reason: typeof fieldError?.reason === 'string' ? fieldError.reason : '',
      message: typeof fieldError?.message === 'string' ? fieldError.message : '',
    }));
};

const parseRefusalMessage = (payload: unknown, fallbackMessage: string): string => {
  const fieldErrorMessage = parseFieldErrors(payload)
    .find((fieldError) => fieldError.message.trim().length > 0)?.message;

  if (fieldErrorMessage) {
    return fieldErrorMessage;
  }

  if (payload && typeof payload === 'object') {
    const envelope = payload as ConnectShyftEscalationEnvelope;
    if (typeof envelope.message === 'string' && envelope.message.trim().length > 0) {
      return envelope.message;
    }
  }

  return fallbackMessage;
};

const resolveOrgUnitIdFromQuery = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const query = new URLSearchParams(window.location.search);
  const contextMode = query.get('context');
  if (contextMode && contextMode.trim().toLowerCase() === 'missing-orgunit') {
    return null;
  }

  const orgUnitId = query.get('orgUnitId');
  if (!orgUnitId) {
    return null;
  }

  const normalized = orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

export const fetchConnectShyftEscalationConfig = async (): Promise<ConnectShyftEscalationConfig> => {
  try {
    const response = await api.get('/connectshyft/escalation/config', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    return parseEscalationConfig(response.data);
  } catch (_error) {
    return { ...DEFAULT_CONNECTSHYFT_ESCALATION_CONFIG };
  }
};

export const saveConnectShyftEscalationConfig = async (
  input: ConnectShyftEscalationSaveInput,
): Promise<ConnectShyftEscalationSaveResult> => {
  const payload = {
    orgUnitId: resolveOrgUnitIdFromQuery(),
    escalationBaselineHours: input.escalationBaselineHours,
    recipients: {
      ...input.recipients,
    },
  };

  try {
    const response = await api.put('/connectshyft/escalation/config', payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEscalationEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: typeof envelope?.code === 'string' ? envelope.code : 'CONNECTSHYFT_ESCALATION_CONFIG_REFUSED',
        message: parseRefusalMessage(response.data, 'Unable to save escalation settings right now.'),
        fieldErrors: parseFieldErrors(response.data),
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string' ? envelope.code : 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      config: parseEscalationConfig(response.data),
    };
  } catch (error: unknown) {
    const errorPayload = (error as { response?: { data?: unknown } })?.response?.data;
    return {
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_REQUEST_FAILED',
      message: parseRefusalMessage(errorPayload, 'Unable to save escalation settings right now.'),
      fieldErrors: parseFieldErrors(errorPayload),
    };
  }
};
