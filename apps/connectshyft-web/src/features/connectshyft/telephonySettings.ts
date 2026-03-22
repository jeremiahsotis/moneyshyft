import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';
import { sanitizeConnectShyftOperatorCopy } from '@/features/connectshyft/uiContracts';

export type ConnectShyftOperatorCallbackNumber = {
  value: string | null;
  rawInput: string | null;
  createdAtUtc: string | null;
  updatedAtUtc: string | null;
};

export type ConnectShyftTelephonyReadinessBlockingReason = {
  code: string;
  category: string;
  message: string;
  blocking: boolean;
};

export type ConnectShyftTelephonyReadinessNextAction = {
  code: string;
  message: string;
};

export type ConnectShyftTelephonyReadiness = {
  providerReady: boolean;
  providerSelectionPathActive: boolean;
  webhookSignatureConfigured: boolean;
  orgUnitNumberMappingReady: boolean;
  voiceSupported: boolean;
  callbackNumberConfigured: boolean;
  callbackNumberNormalized: boolean;
  voiceReady: boolean;
  bridgeCallRunnable: boolean;
  callbackNumber: {
    value: string | null;
    rawInput: string | null;
    persistenceAvailable: boolean;
  };
  blockingReasons: ConnectShyftTelephonyReadinessBlockingReason[];
  nextActions: ConnectShyftTelephonyReadinessNextAction[];
};

export type ConnectShyftOperatorCallbackNumberFieldError = {
  field: string;
  reason: string;
  message: string;
};

type ConnectShyftTelephonySettingsEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  refusalType?: 'business' | 'security' | 'client' | 'system';
  data?: {
    callbackNumber?: {
      value?: string | null;
      rawInput?: string | null;
      createdAtUtc?: string | null;
      updatedAtUtc?: string | null;
      persistenceAvailable?: boolean;
    };
    providerReady?: boolean;
    providerSelectionPathActive?: boolean;
    webhookSignatureConfigured?: boolean;
    orgUnitNumberMappingReady?: boolean;
    voiceSupported?: boolean;
    callbackNumberConfigured?: boolean;
    callbackNumberNormalized?: boolean;
    voiceReady?: boolean;
    bridgeCallRunnable?: boolean;
    blockingReasons?: Array<{
      code?: string;
      category?: string;
      message?: string;
      blocking?: boolean;
    }>;
    nextActions?: Array<{
      code?: string;
      message?: string;
    }>;
    fieldErrors?: Array<{
      field?: string;
      reason?: string;
      message?: string;
    }>;
  };
};

export type ConnectShyftOperatorCallbackNumberSaveResult =
  | {
    ok: true;
    code: string;
    callbackNumber: ConnectShyftOperatorCallbackNumber;
  }
  | {
    ok: false;
    code: string;
    message: string;
    fieldErrors: ConnectShyftOperatorCallbackNumberFieldError[];
  };

export const DEFAULT_CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER: ConnectShyftOperatorCallbackNumber = {
  value: null,
  rawInput: null,
  createdAtUtc: null,
  updatedAtUtc: null,
};

export const DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS: ConnectShyftTelephonyReadiness = {
  providerReady: false,
  providerSelectionPathActive: false,
  webhookSignatureConfigured: false,
  orgUnitNumberMappingReady: false,
  voiceSupported: false,
  callbackNumberConfigured: false,
  callbackNumberNormalized: false,
  voiceReady: false,
  bridgeCallRunnable: false,
  callbackNumber: {
    value: null,
    rawInput: null,
    persistenceAvailable: true,
  },
  blockingReasons: [],
  nextActions: [],
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const parseFieldErrors = (
  payload: unknown,
): ConnectShyftOperatorCallbackNumberFieldError[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftTelephonySettingsEnvelope;
  const fieldErrors = envelope.data?.fieldErrors;
  if (!Array.isArray(fieldErrors)) {
    return [];
  }

  return fieldErrors
    .filter((fieldError) => fieldError && typeof fieldError === 'object')
    .map((fieldError) => ({
      field: normalizeString(fieldError?.field),
      reason: normalizeString(fieldError?.reason),
      message: sanitizeConnectShyftOperatorCopy(
        fieldError?.message,
        'Unable to save the callback number right now.',
      ),
    }));
};

const parseRefusalMessage = (
  payload: unknown,
  fallbackMessage: string,
): string => {
  const firstFieldErrorMessage = parseFieldErrors(payload)
    .find((fieldError) => fieldError.message.length > 0)?.message;

  if (firstFieldErrorMessage) {
    return firstFieldErrorMessage;
  }

  if (payload && typeof payload === 'object') {
    const envelope = payload as ConnectShyftTelephonySettingsEnvelope;
    return sanitizeConnectShyftOperatorCopy(envelope.message, fallbackMessage);
  }

  return sanitizeConnectShyftOperatorCopy('', fallbackMessage);
};

const parseCallbackNumber = (payload: unknown): ConnectShyftOperatorCallbackNumber => {
  if (!payload || typeof payload !== 'object') {
    return { ...DEFAULT_CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER };
  }

  const envelope = payload as ConnectShyftTelephonySettingsEnvelope;
  const callbackNumber = envelope.data?.callbackNumber;

  return {
    value: normalizeString(callbackNumber?.value) || null,
    rawInput: normalizeString(callbackNumber?.rawInput) || null,
    createdAtUtc: normalizeString(callbackNumber?.createdAtUtc) || null,
    updatedAtUtc: normalizeString(callbackNumber?.updatedAtUtc) || null,
  };
};

const parseBlockingReasons = (
  payload: unknown,
): ConnectShyftTelephonyReadinessBlockingReason[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftTelephonySettingsEnvelope;
  const blockingReasons = envelope.data?.blockingReasons;
  if (!Array.isArray(blockingReasons)) {
    return [];
  }

  return blockingReasons
    .filter((reason) => reason && typeof reason === 'object')
    .map((reason) => ({
      code: normalizeString(reason?.code),
      category: normalizeString(reason?.category),
      message: sanitizeConnectShyftOperatorCopy(
        reason?.message,
        'Voice forwarding needs additional setup.',
      ),
      blocking: reason?.blocking === true,
    }))
    .filter((reason) => reason.code.length > 0 && reason.message.length > 0);
};

const parseNextActions = (
  payload: unknown,
): ConnectShyftTelephonyReadinessNextAction[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftTelephonySettingsEnvelope;
  const nextActions = envelope.data?.nextActions;
  if (!Array.isArray(nextActions)) {
    return [];
  }

  return nextActions
    .filter((action) => action && typeof action === 'object')
    .map((action) => ({
      code: normalizeString(action?.code),
      message: sanitizeConnectShyftOperatorCopy(
        action?.message,
        'Complete the remaining voice-forwarding setup steps.',
      ),
    }))
    .filter((action) => action.code.length > 0 && action.message.length > 0);
};

const parseTelephonyReadiness = (
  payload: unknown,
): ConnectShyftTelephonyReadiness => {
  if (!payload || typeof payload !== 'object') {
    return { ...DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS };
  }

  const envelope = payload as ConnectShyftTelephonySettingsEnvelope;
  const callbackNumber = envelope.data?.callbackNumber;

  return {
    providerReady: envelope.data?.providerReady === true,
    providerSelectionPathActive: envelope.data?.providerSelectionPathActive === true,
    webhookSignatureConfigured: envelope.data?.webhookSignatureConfigured === true,
    orgUnitNumberMappingReady: envelope.data?.orgUnitNumberMappingReady === true,
    voiceSupported: envelope.data?.voiceSupported === true,
    callbackNumberConfigured: envelope.data?.callbackNumberConfigured === true,
    callbackNumberNormalized: envelope.data?.callbackNumberNormalized === true,
    voiceReady: envelope.data?.voiceReady === true,
    bridgeCallRunnable: envelope.data?.bridgeCallRunnable === true,
    callbackNumber: {
      value: normalizeString(callbackNumber?.value) || null,
      rawInput: normalizeString(callbackNumber?.rawInput) || null,
      persistenceAvailable: callbackNumber?.persistenceAvailable !== false,
    },
    blockingReasons: parseBlockingReasons(payload),
    nextActions: parseNextActions(payload),
  };
};

export const fetchConnectShyftOperatorCallbackNumber = async (): Promise<ConnectShyftOperatorCallbackNumber> => {
  try {
    const response = await api.get('/connectshyft/operator/callback-number', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftTelephonySettingsEnvelope;
    if (envelope?.ok !== true) {
      throw new Error(
        parseRefusalMessage(
          response.data,
          'Unable to load callback settings right now.',
        ),
      );
    }

    return parseCallbackNumber(response.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
      throw error;
    }

    const errorPayload = (error as { response?: { data?: unknown } })?.response?.data;
    throw new Error(
      parseRefusalMessage(
        errorPayload,
        'Unable to load callback settings right now.',
      ),
    );
  }
};

export const fetchConnectShyftTelephonyReadiness = async (): Promise<ConnectShyftTelephonyReadiness> => {
  try {
    const response = await api.get('/connectshyft/telephony-readiness', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftTelephonySettingsEnvelope;
    if (envelope?.ok !== true) {
      throw new Error(
        parseRefusalMessage(
          response.data,
          'Unable to load voice-forwarding readiness right now.',
        ),
      );
    }

    return parseTelephonyReadiness(response.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
      throw error;
    }

    const errorPayload = (error as { response?: { data?: unknown } })?.response?.data;
    throw new Error(
      parseRefusalMessage(
        errorPayload,
        'Unable to load voice-forwarding readiness right now.',
      ),
    );
  }
};

export const saveConnectShyftOperatorCallbackNumber = async (
  input: {
    callbackNumber: string;
  },
): Promise<ConnectShyftOperatorCallbackNumberSaveResult> => {
  try {
    const response = await api.put('/connectshyft/operator/callback-number', {
      callbackNumber: input.callbackNumber,
    }, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftTelephonySettingsEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: normalizeString(envelope?.code) || 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_REFUSED',
        message: parseRefusalMessage(
          response.data,
          'Unable to save the callback number right now.',
        ),
        fieldErrors: parseFieldErrors(response.data),
      };
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED',
      callbackNumber: parseCallbackNumber(response.data),
    };
  } catch (error: unknown) {
    const errorPayload = (error as { response?: { data?: unknown } })?.response?.data;
    return {
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_REQUEST_FAILED',
      message: parseRefusalMessage(
        errorPayload,
        'Unable to save the callback number right now.',
      ),
      fieldErrors: parseFieldErrors(errorPayload),
    };
  }
};
