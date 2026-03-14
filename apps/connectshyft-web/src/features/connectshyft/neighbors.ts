import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';

export type ConnectShyftNeighborPhoneInput = {
  label: string;
  value: string;
  isShared?: boolean;
  verificationStatus?: 'verified' | 'unverified';
};

export type ConnectShyftNeighborPhone = {
  phoneId: string;
  label: string;
  value: string;
  sortOrder: number;
  isPrimary: boolean;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
};

export type ConnectShyftTextingPreference = 'UNKNOWN' | 'YES' | 'NO';

export type ConnectShyftNeighbor = {
  neighborId: string;
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  prefersTexting: ConnectShyftTextingPreference;
  phones: ConnectShyftNeighborPhone[];
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type ConnectShyftNeighborScope = {
  tenantId: string;
  orgUnitId: string;
};

export type ConnectShyftNeighborEditPolicy = {
  path: string;
  indicator: string | null;
};

export type ConnectShyftNeighborProvenance = {
  orgUnitId: string;
  actorUserId: string;
  policyPath: string;
};

export type ConnectShyftNeighborMerge = {
  sourceNeighborId: string;
  survivorNeighborId: string;
  irreversibleConfirmed: boolean;
};

export type ConnectShyftNeighborMergeAudit = {
  beforeNeighborId: string;
  afterNeighborId: string;
  actorUserId: string;
  orgUnitId: string;
  reason: string | null;
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    neighbor?: Partial<ConnectShyftNeighbor>;
    neighbors?: Partial<ConnectShyftNeighbor>[];
    scope?: Partial<ConnectShyftNeighborScope>;
    context?: Partial<ConnectShyftNeighborScope>;
    editPolicy?: {
      path?: string;
      indicator?: string | null;
    };
    contextOverrideNotice?: string;
    audit?: {
      metadata?: {
        org_unit_id?: string;
        actor_user_id?: string;
        policy_path?: string;
        before_neighbor_id?: string;
        after_neighbor_id?: string;
        reason?: string | null;
      };
    };
    outbox?: {
      metadata?: {
        org_unit_id?: string;
        actor_user_id?: string;
        policy_path?: string;
        before_neighbor_id?: string;
        after_neighbor_id?: string;
        reason?: string | null;
      };
    };
    merge?: {
      sourceNeighborId?: string;
      survivorNeighborId?: string;
      irreversibleConfirmed?: boolean;
    };
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
  prefersTexting?: ConnectShyftTextingPreference;
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

export type ConnectShyftNeighborResolveResult =
  | {
    ok: true;
    code: string;
    neighbor: ConnectShyftNeighbor;
    scope: ConnectShyftNeighborScope | null;
    editPolicy: ConnectShyftNeighborEditPolicy | null;
    contextOverrideNotice: string | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
    scope: ConnectShyftNeighborScope | null;
  };

export type ConnectShyftNeighborUpdateInput = {
  orgUnitId?: string;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: ConnectShyftNeighborPhoneInput[];
};

export type ConnectShyftNeighborUpdateResult =
  | {
    ok: true;
    code: string;
    neighbor: ConnectShyftNeighbor;
    scope: ConnectShyftNeighborScope | null;
    editPolicy: ConnectShyftNeighborEditPolicy | null;
    contextOverrideNotice: string | null;
    provenance: ConnectShyftNeighborProvenance | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
    scope: ConnectShyftNeighborScope | null;
  };

export type ConnectShyftNeighborListResult =
  | {
    ok: true;
    code: string;
    neighbors: ConnectShyftNeighbor[];
    scope: ConnectShyftNeighborScope | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
    scope: ConnectShyftNeighborScope | null;
  };

export type ConnectShyftNeighborMergeInput = {
  orgUnitId?: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
  irreversibleConfirmation: {
    acknowledged: boolean;
    phrase: string;
  };
  reason: string;
  simulateFailureStage?: 'before-commit' | 'after-dependent-repoint';
};

export type ConnectShyftNeighborMergeResult =
  | {
    ok: true;
    code: string;
    scope: ConnectShyftNeighborScope | null;
    merge: ConnectShyftNeighborMerge;
    audit: ConnectShyftNeighborMergeAudit | null;
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

const parseNeighborPhone = (payload: unknown): ConnectShyftNeighborPhone | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Partial<ConnectShyftNeighborPhone>;
  return {
    phoneId: normalizeString(candidate.phoneId),
    label: normalizeString(candidate.label),
    value: normalizeString(candidate.value),
    sortOrder: typeof candidate.sortOrder === 'number' ? candidate.sortOrder : 0,
    isPrimary: candidate.isPrimary === true,
    isShared: candidate.isShared === true,
    verificationStatus: candidate.verificationStatus === 'verified'
      ? 'verified'
      : 'unverified',
  };
};

const parseNeighbor = (payload: unknown): ConnectShyftNeighbor | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const rawNeighbor = payload as Partial<ConnectShyftNeighbor> & {
    prefers_texting?: unknown;
  };

  const phones = Array.isArray(rawNeighbor.phones)
    ? rawNeighbor.phones
      .map(parseNeighborPhone)
      .filter((entry): entry is ConnectShyftNeighborPhone => entry !== null)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return a.phoneId.localeCompare(b.phoneId);
      })
    : [];

  return {
    neighborId: normalizeString(rawNeighbor.neighborId),
    tenantId: normalizeString(rawNeighbor.tenantId),
    orgUnitId: normalizeString(rawNeighbor.orgUnitId),
    firstName: normalizeString(rawNeighbor.firstName),
    lastName: normalizeString(rawNeighbor.lastName),
    prefersTexting:
      rawNeighbor.prefersTexting === 'YES'
      || rawNeighbor.prefersTexting === 'NO'
      || rawNeighbor.prefersTexting === 'UNKNOWN'
        ? rawNeighbor.prefersTexting
        : rawNeighbor.prefers_texting === 'YES'
          || rawNeighbor.prefers_texting === 'NO'
          || rawNeighbor.prefers_texting === 'UNKNOWN'
          ? rawNeighbor.prefers_texting
          : 'UNKNOWN',
    phones,
    createdAtUtc: normalizeString(rawNeighbor.createdAtUtc),
    updatedAtUtc: normalizeString(rawNeighbor.updatedAtUtc),
  };
};

const parseNeighbors = (payload: unknown): ConnectShyftNeighbor[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftEnvelope;
  const rawNeighbors = envelope.data?.neighbors;
  if (!Array.isArray(rawNeighbors)) {
    return [];
  }

  return rawNeighbors
    .map(parseNeighbor)
    .filter((neighbor): neighbor is ConnectShyftNeighbor => neighbor !== null)
    .sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      const firstNameCompare = a.firstName.localeCompare(b.firstName);
      if (firstNameCompare !== 0) {
        return firstNameCompare;
      }

      return a.neighborId.localeCompare(b.neighborId);
    });
};

const parseNeighborFromEnvelope = (payload: unknown): ConnectShyftNeighbor | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  return parseNeighbor(envelope.data?.neighbor);
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

const parseEditPolicy = (payload: unknown): ConnectShyftNeighborEditPolicy | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const candidate = envelope.data?.editPolicy;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const path = normalizeString(candidate.path);
  if (!path) {
    return null;
  }

  const indicatorCandidate = candidate.indicator;
  return {
    path,
    indicator: typeof indicatorCandidate === 'string' && indicatorCandidate.trim().length > 0
      ? indicatorCandidate.trim()
      : null,
  };
};

const parseContextOverrideNotice = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const notice = envelope.data?.contextOverrideNotice;
  if (typeof notice !== 'string') {
    return null;
  }

  const normalized = notice.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseProvenance = (payload: unknown): ConnectShyftNeighborProvenance | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const auditMetadata = envelope.data?.audit?.metadata;
  const outboxMetadata = envelope.data?.outbox?.metadata;
  const metadata = auditMetadata || outboxMetadata;
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const orgUnitId = normalizeString(metadata.org_unit_id);
  const actorUserId = normalizeString(metadata.actor_user_id);
  const policyPath = normalizeString(metadata.policy_path);
  if (!orgUnitId || !actorUserId || !policyPath) {
    return null;
  }

  return {
    orgUnitId,
    actorUserId,
    policyPath,
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

const parseMerge = (payload: unknown): ConnectShyftNeighborMerge | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const merge = envelope.data?.merge;
  if (!merge || typeof merge !== 'object') {
    return null;
  }

  const sourceNeighborId = normalizeString(merge.sourceNeighborId);
  const survivorNeighborId = normalizeString(merge.survivorNeighborId);
  if (!sourceNeighborId || !survivorNeighborId) {
    return null;
  }

  return {
    sourceNeighborId,
    survivorNeighborId,
    irreversibleConfirmed: merge.irreversibleConfirmed === true,
  };
};

const parseMergeAudit = (payload: unknown): ConnectShyftNeighborMergeAudit | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const metadata = envelope.data?.audit?.metadata || envelope.data?.outbox?.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const beforeNeighborId = normalizeString(metadata.before_neighbor_id);
  const afterNeighborId = normalizeString(metadata.after_neighbor_id);
  const actorUserId = normalizeString(metadata.actor_user_id);
  const orgUnitId = normalizeString(metadata.org_unit_id);
  if (!beforeNeighborId || !afterNeighborId || !actorUserId || !orgUnitId) {
    return null;
  }

  const reason = typeof metadata.reason === 'string' && metadata.reason.trim().length > 0
    ? metadata.reason.trim()
    : null;

  return {
    beforeNeighborId,
    afterNeighborId,
    actorUserId,
    orgUnitId,
    reason,
  };
};

const parseCode = (payload: unknown, fallbackCode: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallbackCode;
  }

  const envelope = payload as ConnectShyftEnvelope;
  if (typeof envelope.code === 'string' && envelope.code.trim().length > 0) {
    return envelope.code;
  }

  return fallbackCode;
};

export const createConnectShyftNeighbor = async (
  input: ConnectShyftNeighborCreateInput,
): Promise<ConnectShyftNeighborCreateResult> => {
  const payload = {
    firstName: input.firstName,
    lastName: input.lastName,
    prefersTexting: input.prefersTexting,
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
        code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_CREATE_REFUSED'),
        message: parseRefusalMessage(
          response.data,
          'Unable to create neighbor right now.',
        ),
        scope: parseScope(response.data),
      };
    }

    const neighbor = parseNeighborFromEnvelope(response.data);
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
      code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_CREATED'),
      neighbor,
      scope: parseScope(response.data),
    };
  } catch (error: unknown) {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;

    return {
      ok: false,
      code: parseCode(responseData, 'CONNECTSHYFT_NEIGHBOR_CREATE_REQUEST_FAILED'),
      message: parseRefusalMessage(
        responseData,
        'Unable to create neighbor right now.',
      ),
      scope: parseScope(responseData),
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

export const fetchConnectShyftNeighborProfile = async (
  neighborId: string,
): Promise<ConnectShyftNeighborResolveResult> => {
  try {
    const response = await api.get(`/connectshyft/neighbors/${encodeURIComponent(neighborId)}`, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_RESOLVE_REFUSED'),
        message: parseRefusalMessage(response.data, 'Unable to load neighbor profile.'),
        scope: parseScope(response.data),
      };
    }

    const neighbor = parseNeighborFromEnvelope(response.data);
    if (!neighbor) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_RESOLVE_INVALID_RESPONSE',
        message: 'Unable to load neighbor profile.',
        scope: parseScope(response.data),
      };
    }

    return {
      ok: true,
      code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_RESOLVED'),
      neighbor,
      scope: parseScope(response.data),
      editPolicy: parseEditPolicy(response.data),
      contextOverrideNotice: parseContextOverrideNotice(response.data),
    };
  } catch (error: unknown) {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;

    return {
      ok: false,
      code: parseCode(responseData, 'CONNECTSHYFT_NEIGHBOR_RESOLVE_REQUEST_FAILED'),
      message: parseRefusalMessage(responseData, 'Unable to load neighbor profile.'),
      scope: parseScope(responseData),
    };
  }
};

export const updateConnectShyftNeighborProfile = async (
  neighborId: string,
  input: ConnectShyftNeighborUpdateInput,
): Promise<ConnectShyftNeighborUpdateResult> => {
  try {
    const response = await api.put(
      `/connectshyft/neighbors/${encodeURIComponent(neighborId)}`,
      {
        orgUnitId: input.orgUnitId,
        firstName: input.firstName,
        lastName: input.lastName,
        prefersTexting: input.prefersTexting,
        phones: input.phones,
      },
      {
        headers: buildConnectShyftTestOverrideHeaders(),
      },
    );

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_UPDATE_REFUSED'),
        message: parseRefusalMessage(response.data, 'Unable to update neighbor profile.'),
        scope: parseScope(response.data),
      };
    }

    const neighbor = parseNeighborFromEnvelope(response.data);
    if (!neighbor) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_UPDATE_INVALID_RESPONSE',
        message: 'Unable to update neighbor profile.',
        scope: parseScope(response.data),
      };
    }

    return {
      ok: true,
      code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_UPDATED'),
      neighbor,
      scope: parseScope(response.data),
      editPolicy: parseEditPolicy(response.data),
      contextOverrideNotice: parseContextOverrideNotice(response.data),
      provenance: parseProvenance(response.data),
    };
  } catch (error: unknown) {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;

    return {
      ok: false,
      code: parseCode(responseData, 'CONNECTSHYFT_NEIGHBOR_UPDATE_REQUEST_FAILED'),
      message: parseRefusalMessage(responseData, 'Unable to update neighbor profile.'),
      scope: parseScope(responseData),
    };
  }
};

export const fetchConnectShyftNeighborsCollection = async (
  options: {
    mode?: 'name' | 'phone';
    query?: string;
  } = {},
): Promise<ConnectShyftNeighborListResult> => {
  try {
    const response = await api.get('/connectshyft/neighbors', {
      params: {
        mode: options.mode,
        query: options.query,
      },
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_LIST_REFUSED'),
        message: parseRefusalMessage(response.data, 'Unable to load neighbors.'),
        scope: parseScope(response.data),
      };
    }

    return {
      ok: true,
      code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBORS_RESOLVED'),
      neighbors: parseNeighbors(response.data),
      scope: parseScope(response.data),
    };
  } catch (error: unknown) {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;

    return {
      ok: false,
      code: parseCode(responseData, 'CONNECTSHYFT_NEIGHBOR_LIST_REQUEST_FAILED'),
      message: parseRefusalMessage(responseData, 'Unable to load neighbors.'),
      scope: parseScope(responseData),
    };
  }
};

export const mergeConnectShyftNeighborProfiles = async (
  input: ConnectShyftNeighborMergeInput,
): Promise<ConnectShyftNeighborMergeResult> => {
  try {
    const response = await api.post(
      '/connectshyft/neighbors/merge',
      {
        orgUnitId: input.orgUnitId,
        sourceNeighborId: input.sourceNeighborId,
        survivorNeighborId: input.survivorNeighborId,
        irreversibleConfirmation: input.irreversibleConfirmation,
        reason: input.reason,
        simulateFailureStage: input.simulateFailureStage,
      },
      {
        headers: buildConnectShyftTestOverrideHeaders(),
      },
    );

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_MERGE_REFUSED'),
        message: parseRefusalMessage(response.data, 'Unable to merge neighbors right now.'),
        scope: parseScope(response.data),
      };
    }

    const merge = parseMerge(response.data);
    if (!merge) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_MERGE_INVALID_RESPONSE',
        message: 'Unable to merge neighbors right now.',
        scope: parseScope(response.data),
      };
    }

    return {
      ok: true,
      code: parseCode(response.data, 'CONNECTSHYFT_NEIGHBOR_MERGED'),
      scope: parseScope(response.data),
      merge,
      audit: parseMergeAudit(response.data),
    };
  } catch (error: unknown) {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;

    return {
      ok: false,
      code: parseCode(responseData, 'CONNECTSHYFT_NEIGHBOR_MERGE_REQUEST_FAILED'),
      message: parseRefusalMessage(responseData, 'Unable to merge neighbors right now.'),
      scope: parseScope(responseData),
    };
  }
};
