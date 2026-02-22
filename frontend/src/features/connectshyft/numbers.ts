import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';

export type ConnectShyftNumberMapping = {
  mappingId: string;
  orgUnitId: string;
  twilioNumberE164: string;
  label: string;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    mappingId?: string;
    mappings?: ConnectShyftNumberMapping[];
    fieldErrors?: Array<{
      field?: string;
      reason?: string;
      message?: string;
    }>;
  };
};

export type ConnectShyftNumberSaveInput = {
  mappingId?: string;
  twilioNumberE164: string;
  label: string;
  isActive: boolean;
};

export type ConnectShyftNumberSaveResult =
  | {
    ok: true;
    code: string;
    mappings: ConnectShyftNumberMapping[];
    mappingId: string | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

const parseMappings = (payload: unknown): ConnectShyftNumberMapping[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftEnvelope;
  const mappings = envelope.data?.mappings;
  if (!Array.isArray(mappings)) {
    return [];
  }

  return mappings
    .filter((entry): entry is ConnectShyftNumberMapping => !!entry && typeof entry === 'object')
    .map((entry) => ({
      mappingId: entry.mappingId,
      orgUnitId: entry.orgUnitId,
      twilioNumberE164: entry.twilioNumberE164,
      label: entry.label || '',
      isActive: entry.isActive !== false,
      createdAtUtc: entry.createdAtUtc,
      updatedAtUtc: entry.updatedAtUtc,
    }));
};

const parseRefusalMessage = (payload: unknown, fallbackMessage: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const fieldErrorMessage = envelope.data?.fieldErrors?.find(
    (fieldError) => typeof fieldError?.message === 'string' && fieldError.message.trim().length > 0,
  )?.message;

  if (fieldErrorMessage) {
    return fieldErrorMessage;
  }

  if (typeof envelope.message === 'string' && envelope.message.trim().length > 0) {
    return envelope.message;
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

export const fetchConnectShyftNumberMappings = async (): Promise<ConnectShyftNumberMapping[]> => {
  try {
    const response = await api.get('/connectshyft/numbers', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    return parseMappings(response.data);
  } catch (_error) {
    return [];
  }
};

export const saveConnectShyftNumberMapping = async (
  input: ConnectShyftNumberSaveInput,
): Promise<ConnectShyftNumberSaveResult> => {
  const payload = {
    orgUnitId: resolveOrgUnitIdFromQuery(),
    twilioNumberE164: input.twilioNumberE164,
    label: input.label,
    isActive: input.isActive,
  };

  try {
    const response = input.mappingId
      ? await api.put(`/connectshyft/numbers/${input.mappingId}`, payload, {
        headers: buildConnectShyftTestOverrideHeaders(),
      })
      : await api.post('/connectshyft/numbers', payload, {
        headers: buildConnectShyftTestOverrideHeaders(),
      });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: typeof envelope?.code === 'string' ? envelope.code : 'CONNECTSHYFT_NUMBER_MAPPING_REFUSED',
        message: parseRefusalMessage(
          response.data,
          'Unable to save number mapping right now.',
        ),
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string' ? envelope.code : 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
      mappingId: typeof envelope.data?.mappingId === 'string' ? envelope.data.mappingId : null,
      mappings: parseMappings(response.data),
    };
  } catch (error: unknown) {
    const message = parseRefusalMessage(
      (error as { response?: { data?: unknown } })?.response?.data,
      'Unable to save number mapping right now.',
    );

    return {
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_REQUEST_FAILED',
      message,
    };
  }
};
