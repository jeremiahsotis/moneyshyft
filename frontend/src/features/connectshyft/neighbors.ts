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

export type ConnectShyftNeighborScope = {
  tenantId: string;
  orgUnitId: string;
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    neighbor?: Partial<ConnectShyftNeighbor>;
    scope?: Partial<ConnectShyftNeighborScope>;
    context?: Partial<ConnectShyftNeighborScope>;
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
    scope: ConnectShyftNeighborScope | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
    scope: ConnectShyftNeighborScope | null;
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

const parseScope = (payload: unknown): ConnectShyftNeighborScope | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const candidate = envelope.data?.scope || envelope.data?.context;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const tenantId = normalizeString(candidate.tenantId);
  const orgUnitId = normalizeString(candidate.orgUnitId);
  if (!tenantId || !orgUnitId) {
    return null;
  }

  return {
    tenantId,
    orgUnitId,
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

export const createConnectShyftNeighbor = async (
  input: ConnectShyftNeighborCreateInput,
): Promise<ConnectShyftNeighborCreateResult> => {
  const payload = {
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
        scope: parseScope(response.data),
      };
    }

    const neighbor = parseNeighbor(response.data);
    if (!neighbor) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATE_INVALID_RESPONSE',
        message: 'Unable to create neighbor right now.',
        scope: parseScope(response.data),
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string' ? envelope.code : 'CONNECTSHYFT_NEIGHBOR_CREATED',
      neighbor,
      scope: parseScope(response.data),
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
      scope: parseScope((error as { response?: { data?: unknown } })?.response?.data),
    };
  }
};

export const fetchConnectShyftNeighborScope = async (): Promise<ConnectShyftNeighborScope | null> => {
  try {
    const response = await api.get('/connectshyft/context', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    return parseScope(response.data);
  } catch (error: unknown) {
    return parseScope((error as { response?: { data?: unknown } })?.response?.data);
  }
};
