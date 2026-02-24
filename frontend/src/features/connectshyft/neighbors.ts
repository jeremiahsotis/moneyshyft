import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';

export type ConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
};

export type ConnectShyftNeighborPhone = {
  phoneId: string;
  label: string;
  value: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ConnectShyftNeighbor = {
  neighborId: string;
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  phones: ConnectShyftNeighborPhone[];
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    neighbor?: Partial<ConnectShyftNeighbor>;
    fieldErrors?: Array<{
      field?: string;
      reason?: string;
      message?: string;
    }>;
  };
};

export type ConnectShyftNeighborCreateInput = {
  firstName: string;
  lastName: string;
  phones: ConnectShyftNeighborPhoneInput[];
};

export type ConnectShyftNeighborCreateResult =
  | {
    ok: true;
    code: string;
    neighbor: ConnectShyftNeighbor;
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const parseNeighbor = (payload: unknown): ConnectShyftNeighbor | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const rawNeighbor = envelope.data?.neighbor;
  if (!rawNeighbor || typeof rawNeighbor !== 'object') {
    return null;
  }

  const phones = Array.isArray(rawNeighbor.phones)
    ? rawNeighbor.phones
      .filter((entry): entry is ConnectShyftNeighborPhone => !!entry && typeof entry === 'object')
      .map((entry) => ({
        phoneId: normalizeString(entry.phoneId),
        label: normalizeString(entry.label),
        value: normalizeString(entry.value),
        sortOrder: typeof entry.sortOrder === 'number' ? entry.sortOrder : 0,
        isPrimary: entry.isPrimary === true,
      }))
    : [];

  return {
    neighborId: normalizeString(rawNeighbor.neighborId),
    tenantId: normalizeString(rawNeighbor.tenantId),
    orgUnitId: normalizeString(rawNeighbor.orgUnitId),
    firstName: normalizeString(rawNeighbor.firstName),
    lastName: normalizeString(rawNeighbor.lastName),
    phones,
  };
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
  const contextMode = normalizeString(query.get('context'));
  if (contextMode.toLowerCase() === 'missing-orgunit') {
    return null;
  }

  const orgUnitId = normalizeString(query.get('orgUnitId'));
  return orgUnitId || null;
};

export const createConnectShyftNeighbor = async (
  input: ConnectShyftNeighborCreateInput,
): Promise<ConnectShyftNeighborCreateResult> => {
  const payload = {
    orgUnitId: resolveOrgUnitIdFromQuery(),
    firstName: input.firstName,
    lastName: input.lastName,
    phones: input.phones,
  };

  try {
    const response = await api.post('/connectshyft/neighbors', payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: typeof envelope?.code === 'string' ? envelope.code : 'CONNECTSHYFT_NEIGHBOR_CREATE_REFUSED',
        message: parseRefusalMessage(
          response.data,
          'Unable to create neighbor right now.',
        ),
      };
    }

    const neighbor = parseNeighbor(response.data);
    if (!neighbor) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATE_INVALID_RESPONSE',
        message: 'Unable to create neighbor right now.',
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string' ? envelope.code : 'CONNECTSHYFT_NEIGHBOR_CREATED',
      neighbor,
    };
  } catch (error: unknown) {
    const message = parseRefusalMessage(
      (error as { response?: { data?: unknown } })?.response?.data,
      'Unable to create neighbor right now.',
    );

    return {
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_REQUEST_FAILED',
      message,
    };
  }
};
