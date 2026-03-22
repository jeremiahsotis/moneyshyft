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
  defaultOperatorPhoneE164: string | null;
};

export type ConnectShyftEscalationRecipientOption = {
  value: string;
  label: string;
  scope: ConnectShyftEscalationRecipientScope;
};

export const connectShyftEscalationRecipientScopes = {
  ORG_UNIT: 'ORG_UNIT',
  TENANT: 'TENANT',
  TEST_ONLY: 'TEST_ONLY',
} as const;

export type ConnectShyftEscalationRecipientScope =
  (typeof connectShyftEscalationRecipientScopes)[keyof typeof connectShyftEscalationRecipientScopes];

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
    defaultOperatorPhoneE164?: string | null;
    recipientOptions?: Array<{
      value?: string;
      label?: string;
      scope?: string;
    }>;
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
  defaultOperatorPhoneE164?: string | null;
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
  defaultOperatorPhoneE164: null,
};

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
    defaultOperatorPhoneE164: typeof envelope.data?.defaultOperatorPhoneE164 === 'string'
      ? envelope.data.defaultOperatorPhoneE164
      : null,
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

const parseRecipientOptions = (payload: unknown): ConnectShyftEscalationRecipientOption[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftEscalationEnvelope;
  const recipientOptions = envelope.data?.recipientOptions;
  if (!Array.isArray(recipientOptions)) {
    return [];
  }

  return recipientOptions
    .filter((recipientOption) => recipientOption && typeof recipientOption === 'object')
    .map((recipientOption) => {
      const value = typeof recipientOption?.value === 'string'
        ? recipientOption.value.trim()
        : '';
      const label = typeof recipientOption?.label === 'string'
        ? recipientOption.label.trim()
        : '';
      const rawScope = typeof recipientOption?.scope === 'string'
        ? recipientOption.scope.trim().toUpperCase()
        : '';
      const scope = rawScope === connectShyftEscalationRecipientScopes.ORG_UNIT
        || rawScope === connectShyftEscalationRecipientScopes.TENANT
        || rawScope === connectShyftEscalationRecipientScopes.TEST_ONLY
        ? rawScope as ConnectShyftEscalationRecipientScope
        : null;

      if (!value || !scope) {
        return null;
      }

      return {
        value,
        label: label || value,
        scope,
      };
    })
    .filter((recipientOption): recipientOption is ConnectShyftEscalationRecipientOption => recipientOption !== null);
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
  const response = await api.get('/connectshyft/escalation/config', {
    headers: buildConnectShyftTestOverrideHeaders(),
  });

  const envelope = response.data as ConnectShyftEscalationEnvelope;
  if (envelope?.ok !== true) {
    throw new Error(parseRefusalMessage(response.data, 'Unable to load escalation settings right now.'));
  }

  return parseEscalationConfig(response.data);
};

export const fetchConnectShyftEscalationRecipientOptions = async (): Promise<ConnectShyftEscalationRecipientOption[]> => {
  try {
    const response = await api.get('/connectshyft/escalation/recipients', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEscalationEnvelope;
    if (envelope?.ok !== true) {
      throw new Error(parseRefusalMessage(response.data, 'Unable to load escalation recipients right now.'));
    }

    return parseRecipientOptions(response.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
      throw error;
    }

    const errorPayload = (error as { response?: { data?: unknown } })?.response?.data;
    throw new Error(parseRefusalMessage(errorPayload, 'Unable to load escalation recipients right now.'));
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
    defaultOperatorPhoneE164: input.defaultOperatorPhoneE164 ?? '',
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
