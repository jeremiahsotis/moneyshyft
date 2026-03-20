import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import type { Knex } from 'knex';
import { refusal } from '../../../platform/envelopes/response';
import { executePlatformMutation } from '../../../platform/mutations/executePlatformMutation';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import { isConnectShyftTestOverrideEnabled } from '../featureFlags';
import {
  AsyncConnectShyftNeighborService,
  KnexConnectShyftNeighborStore,
  connectShyftNeighborServiceAsync,
  type ConnectShyftIdentityMatchDecision,
  type ConnectShyftNeighborPhoneInput,
  type ConnectShyftTextingPreference,
} from '../neighbors';
import {
  enforceConnectShyftCapability,
  loadConnectShyftPlatformDb,
  requestHasAnyCapability,
  resolveConnectShyftActorRoles,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEST_ACTIVE_THREAD_NEIGHBOR_IDS_HEADER = 'x-test-connectshyft-active-thread-neighbor-ids';
const NEIGHBOR_RELATIONSHIP_REQUIRED_CODE = 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED';
const NEIGHBOR_RELATIONSHIP_REQUIRED_MESSAGE = 'This edit requires an active thread relationship or tenant-privileged role.';
const NEIGHBOR_MERGE_FORBIDDEN_CODE = 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN';
const NEIGHBOR_MERGE_FORBIDDEN_MESSAGE = 'Neighbor merge requires an authorized role.';
const NEIGHBOR_MERGE_TRANSACTION_ABORTED_CODE = 'CONNECTSHYFT_NEIGHBOR_MERGE_TRANSACTION_ABORTED';
const NEIGHBOR_MERGE_TRANSACTION_ABORTED_MESSAGE = 'Neighbor merge aborted and no changes were persisted.';
const TENANT_PRIVILEGED_OVERRIDE_NOTICE = 'Tenant-privileged override applied';
const RELATIONSHIP_POLICY_INDICATOR = 'Active thread relationship';
const IDENTITY_MATCH_AMBIGUOUS_CODE = 'IDENTITY_MATCH_AMBIGUOUS';

type ConnectShyftNeighborMergeFailureStage = 'before-commit' | 'after-dependent-repoint';

type ConnectShyftNeighborEditPolicyPath =
  | 'relationship-gated'
  | 'tenant-privileged'
  | 'role-capability';

export type ConnectShyftNeighborEditPolicyDecision =
  | {
    ok: true;
    policyPath: ConnectShyftNeighborEditPolicyPath;
    indicator: string | null;
    contextOverrideNotice: string | null;
    relationshipValidated: boolean;
  }
  | {
    ok: false;
    code: typeof NEIGHBOR_RELATIONSHIP_REQUIRED_CODE;
    message: typeof NEIGHBOR_RELATIONSHIP_REQUIRED_MESSAGE;
    refusalType: 'business';
    httpStatus: 200;
  };

type ConnectShyftNeighborCreateBody = {
  orgUnitId: string | null;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: ConnectShyftNeighborPhoneInput[];
};

type ConnectShyftNeighborUpdateBody = ConnectShyftNeighborCreateBody;

type ConnectShyftNeighborDeleteBody = {
  orgUnitId: string | null;
  irreversibleConfirmation: boolean;
};

type ConnectShyftNeighborIdentityMatchBody = {
  orgUnitId: string | null;
  excludeNeighborId: string;
  idempotencyKey: string;
  contactPoint: ConnectShyftNeighborPhoneInput;
};

type ConnectShyftNeighborMergeBody = {
  orgUnitId: string | null;
  sourceNeighborId: string;
  survivorNeighborId: string;
  irreversibleConfirmation: {
    acknowledged: boolean;
    phrase: string;
  };
  reason: string;
  simulateFailureStage?: ConnectShyftNeighborMergeFailureStage;
};

type ConnectShyftNeighborRefusalShape = {
  data?: {
    reason?: 'duplicate_phone';
    fieldErrors?: Array<{ field: string; reason: string; message: string }>;
    identityMatch?: ConnectShyftIdentityMatchDecision;
    manualResolution?: unknown;
    idempotency?: unknown;
  };
};

export type ConnectShyftNeighborCreateAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  payload: ConnectShyftNeighborCreateBody;
};

export type ConnectShyftNeighborListAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
};

export type ConnectShyftNeighborDetailAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  actorUserId: string | null;
  neighborId: string;
  includeDeleted: boolean;
  policyDecision: Extract<ConnectShyftNeighborEditPolicyDecision, { ok: true }>;
};

export type ConnectShyftNeighborUpdateAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  actorUserId: string | null;
  neighborId: string;
  payload: ConnectShyftNeighborUpdateBody;
  policyDecision: Extract<ConnectShyftNeighborEditPolicyDecision, { ok: true }>;
  provenance: NeighborEditProvenancePayload;
};

export type ConnectShyftNeighborDeleteAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  actorUserId: string;
  neighborId: string;
  payload: ConnectShyftNeighborDeleteBody;
};

export type ConnectShyftNeighborIdentityMatchAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  actorUserId: string | null;
  payload: ConnectShyftNeighborIdentityMatchBody;
};

export type ConnectShyftNeighborMergeAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  actorUserId: string | null;
  payload: ConnectShyftNeighborMergeBody;
};

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseOptionalBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseNeighborPhones = (req: Request): ConnectShyftNeighborPhoneInput[] => {
  const rawPhones: unknown[] = Array.isArray(req.body?.phones) ? req.body.phones : [];
  return rawPhones.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') {
      return {
        label: '',
        value: '',
        isShared: false,
        verificationStatus: 'unverified',
      };
    }

    const candidate = entry as {
      label?: unknown;
      value?: unknown;
      isShared?: unknown;
      verificationStatus?: unknown;
    };

    return {
      label: typeof candidate.label === 'string' ? candidate.label : '',
      value: typeof candidate.value === 'string' ? candidate.value : '',
      isShared: candidate.isShared === true,
      verificationStatus: candidate.verificationStatus === 'verified'
        ? 'verified'
        : 'unverified',
    };
  });
};

const parseConnectShyftNeighborCreateBody = (req: Request): ConnectShyftNeighborCreateBody => {
  const rawPreference = req.body?.prefersTexting;
  const prefersTexting: ConnectShyftTextingPreference | undefined = rawPreference === 'YES'
    || rawPreference === 'NO'
    || rawPreference === 'UNKNOWN'
    ? rawPreference
    : undefined;

  return {
    orgUnitId: parseOrgUnitIdFromBody(req),
    firstName: typeof req.body?.firstName === 'string' ? req.body.firstName : '',
    lastName: typeof req.body?.lastName === 'string' ? req.body.lastName : '',
    prefersTexting,
    phones: parseNeighborPhones(req),
  };
};

const parseConnectShyftNeighborUpdateBody = (req: Request): ConnectShyftNeighborUpdateBody =>
  parseConnectShyftNeighborCreateBody(req);

const parseConnectShyftNeighborDeleteBody = (req: Request): ConnectShyftNeighborDeleteBody => ({
  orgUnitId: parseOrgUnitIdFromBody(req),
  irreversibleConfirmation: parseOptionalBoolean(req.body?.irreversibleConfirmation) === true,
});

const parseConnectShyftNeighborIdentityMatchBody = (
  req: Request,
): ConnectShyftNeighborIdentityMatchBody => {
  const rawContactPoint = req.body?.contactPoint;
  const contactPointCandidate = rawContactPoint && typeof rawContactPoint === 'object'
    ? rawContactPoint as {
      label?: unknown;
      value?: unknown;
      isShared?: unknown;
      verificationStatus?: unknown;
    }
    : null;
  const headerIdempotencyKey = typeof req.header('Idempotency-Key') === 'string'
    ? req.header('Idempotency-Key')?.trim() || ''
    : '';
  const bodyIdempotencyKey = typeof req.body?.idempotencyKey === 'string'
    ? req.body.idempotencyKey.trim()
    : '';

  return {
    orgUnitId: parseOrgUnitIdFromBody(req),
    excludeNeighborId: typeof req.body?.excludeNeighborId === 'string'
      ? req.body.excludeNeighborId.trim()
      : '',
    idempotencyKey: headerIdempotencyKey || bodyIdempotencyKey,
    contactPoint: {
      label: typeof contactPointCandidate?.label === 'string' ? contactPointCandidate.label : '',
      value: typeof contactPointCandidate?.value === 'string' ? contactPointCandidate.value : '',
      isShared: contactPointCandidate?.isShared === true,
      verificationStatus: contactPointCandidate?.verificationStatus === 'verified'
        ? 'verified'
        : 'unverified',
    },
  };
};

const parseConnectShyftNeighborMergeBody = (req: Request): ConnectShyftNeighborMergeBody => {
  const rawConfirmation = req.body?.irreversibleConfirmation;
  const confirmation = rawConfirmation && typeof rawConfirmation === 'object'
    ? rawConfirmation as { acknowledged?: unknown; phrase?: unknown }
    : null;
  const rawFailureStage = isConnectShyftTestOverrideEnabled()
    && typeof req.body?.simulateFailureStage === 'string'
    ? req.body.simulateFailureStage
    : '';

  const simulateFailureStage: ConnectShyftNeighborMergeFailureStage | undefined =
    rawFailureStage === 'before-commit' || rawFailureStage === 'after-dependent-repoint'
      ? rawFailureStage
      : undefined;

  return {
    orgUnitId: parseOrgUnitIdFromBody(req),
    sourceNeighborId: typeof req.body?.sourceNeighborId === 'string'
      ? req.body.sourceNeighborId.trim()
      : '',
    survivorNeighborId: typeof req.body?.survivorNeighborId === 'string'
      ? req.body.survivorNeighborId.trim()
      : '',
    irreversibleConfirmation: {
      acknowledged: confirmation?.acknowledged === true,
      phrase: typeof confirmation?.phrase === 'string' ? confirmation.phrase : '',
    },
    reason: typeof req.body?.reason === 'string' ? req.body.reason.trim() : '',
    simulateFailureStage,
  };
};

const parseNeighborIdParam = (req: Request): string => {
  if (typeof req.params.neighborId !== 'string') {
    return '';
  }

  return req.params.neighborId.trim();
};

const parseIncludeDeletedQuery = (req: Request): boolean =>
  parseOptionalBoolean(req.query?.includeDeleted) === true;

const resolveConnectShyftActiveThreadNeighborIds = (req: Request): Set<string> | null => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return null;
  }

  const rawHeader = req.header(TEST_ACTIVE_THREAD_NEIGHBOR_IDS_HEADER);
  if (!rawHeader) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawHeader);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    const normalizedIds = parsed
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);

    return new Set(normalizedIds);
  } catch (_error) {
    const normalizedIds = rawHeader
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    return new Set(normalizedIds);
  }
};

const hasPersistedNeighborEditRelationship = async (input: {
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  actorUserId: string | null;
}): Promise<boolean> => {
  if (!input.actorUserId || !UUID_PATTERN.test(input.actorUserId)) {
    return false;
  }

  try {
    const relationship = await loadConnectShyftPlatformDb()
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        neighbor_id: input.neighborId,
        claimed_by_user_id: input.actorUserId,
      })
      .whereNot('state', 'CLOSED')
      .first<{ id: string }>(['id']);

    return Boolean(relationship?.id);
  } catch (_error) {
    return false;
  }
};

export const evaluateConnectShyftNeighborEditPolicy = async (input: {
  req: Request;
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  actorUserId: string | null;
  scope: 'read' | 'edit';
}): Promise<ConnectShyftNeighborEditPolicyDecision> => {
  const { req, actorRoles, tenantId, orgUnitId, neighborId, actorUserId, scope } = input;

  if (requestHasAnyCapability(req, [CAPABILITIES.NEIGHBOR_EDIT_ALL], {
    effectiveRoles: actorRoles.filter((role): role is string => typeof role === 'string'),
  })) {
    return {
      ok: true,
      policyPath: 'tenant-privileged',
      indicator: null,
      contextOverrideNotice: TENANT_PRIVILEGED_OVERRIDE_NOTICE,
      relationshipValidated: true,
    };
  }

  const requiresRelationship = scope === 'edit' || actorRoles.some(
    (role) => typeof role === 'string' && role.trim().toUpperCase() === 'ORGUNIT_IDENTITY_LEAD',
  );
  if (!requiresRelationship) {
    return {
      ok: true,
      policyPath: 'role-capability',
      indicator: null,
      contextOverrideNotice: null,
      relationshipValidated: false,
    };
  }

  const activeThreadNeighborIds = resolveConnectShyftActiveThreadNeighborIds(req);
  const hasRelationship = activeThreadNeighborIds
    ? activeThreadNeighborIds.has(neighborId)
    : await hasPersistedNeighborEditRelationship({
      tenantId,
      orgUnitId,
      neighborId,
      actorUserId,
    });

  if (!hasRelationship) {
    return {
      ok: false,
      code: NEIGHBOR_RELATIONSHIP_REQUIRED_CODE,
      message: NEIGHBOR_RELATIONSHIP_REQUIRED_MESSAGE,
      refusalType: 'business',
      httpStatus: 200,
    };
  }

  return {
    ok: true,
    policyPath: 'relationship-gated',
    indicator: RELATIONSHIP_POLICY_INDICATOR,
    contextOverrideNotice: null,
    relationshipValidated: true,
  };
};

export const buildConnectShyftNeighborScopePayload = (
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>,
) => ({
  scope: {
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
  },
});

export const buildConnectShyftNeighborRefusalData = (
  result: ConnectShyftNeighborRefusalShape | undefined,
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>,
) => ({
  ...('data' in (result || {}) ? result?.data : undefined),
  ...buildConnectShyftNeighborScopePayload(context),
});

export const buildConnectShyftNeighborEditPolicyPayload = (
  policy: Extract<ConnectShyftNeighborEditPolicyDecision, { ok: true }>,
) => ({
  editPolicy: {
    path: policy.policyPath,
    indicator: policy.indicator,
  },
  contextOverrideNotice: policy.contextOverrideNotice,
});

const buildConnectShyftNeighborEditProvenancePayload = (
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>,
  policy: Extract<ConnectShyftNeighborEditPolicyDecision, { ok: true }>,
  neighborId: string,
  actorUserId: string | null,
) => {
  const resolvedActorUserId = actorUserId || 'unknown';
  const metadata = {
    tenant_id: context.tenantId,
    org_unit_id: context.orgUnitId,
    actor_user_id: resolvedActorUserId,
    policy_path: policy.policyPath,
    mutation_context: {
      policy_path: policy.policyPath,
      neighbor_id: neighborId,
    },
  };

  return {
    audit: {
      eventName: 'connectshyft.neighbor.updated',
      metadata,
    },
    outbox: {
      eventName: 'connectshyft.neighbor.updated',
      metadata: {
        tenant_id: context.tenantId,
        org_unit_id: context.orgUnitId,
        actor_user_id: resolvedActorUserId,
        policy_path: policy.policyPath,
      },
    },
  };
};

type NeighborEditProvenancePayload = ReturnType<typeof buildConnectShyftNeighborEditProvenancePayload>;

export const buildConnectShyftNeighborSoftDeleteProvenancePayload = (
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>,
  neighborId: string,
  actorUserId: string,
  deletedAtUtc: string | null,
) => {
  const resolvedDeletedAtUtc = deletedAtUtc || new Date().toISOString();
  const metadata = {
    tenant_id: context.tenantId,
    org_unit_id: context.orgUnitId,
    actor_user_id: actorUserId,
    neighbor_id: neighborId,
    deleted_at_utc: resolvedDeletedAtUtc,
  };

  return {
    audit: {
      eventName: 'connectshyft.neighbor.soft_deleted',
      metadata,
    },
    outbox: {
      eventName: 'connectshyft.neighbor.soft_deleted',
      metadata,
    },
  };
};

type NeighborSoftDeleteProvenancePayload = ReturnType<typeof buildConnectShyftNeighborSoftDeleteProvenancePayload>;

export const buildConnectShyftNeighborMergeProvenancePayload = (
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>,
  actorUserId: string | null,
  sourceNeighborId: string,
  survivorNeighborId: string,
  reason: string,
) => {
  const resolvedActorUserId = actorUserId || 'unknown';
  const metadata = {
    tenant_id: context.tenantId,
    org_unit_id: context.orgUnitId,
    actor_user_id: resolvedActorUserId,
    before_neighbor_id: sourceNeighborId,
    after_neighbor_id: survivorNeighborId,
    reason: reason || null,
  };

  return {
    audit: {
      eventName: 'connectshyft.neighbor.merged',
      metadata,
    },
    outbox: {
      eventName: 'connectshyft.neighbor.merged',
      metadata: {
        tenant_id: context.tenantId,
        org_unit_id: context.orgUnitId,
        actor_user_id: resolvedActorUserId,
        before_neighbor_id: sourceNeighborId,
        after_neighbor_id: survivorNeighborId,
        reason: reason || null,
      },
    },
  };
};

type NeighborMergeProvenancePayload = ReturnType<typeof buildConnectShyftNeighborMergeProvenancePayload>;

const maskIdentityContactPointValue = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  return `***${normalized.slice(-4)}`;
};

const resolveIdentityContactHashSecret = (): string => {
  const configuredSecret = [
    process.env.CONNECTSHYFT_CONTACT_HASH_SECRET,
    process.env.CONNECTSHYFT_AUDIT_HASH_SECRET,
    process.env.JWT_SECRET,
    process.env.DB_PASSWORD,
  ].find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);

  if (configuredSecret && configuredSecret.trim().length > 0) {
    return configuredSecret.trim();
  }

  return randomBytes(32).toString('hex');
};

const CONNECTSHYFT_CONTACT_HASH_SECRET = resolveIdentityContactHashSecret();

const hashIdentityContactPointValue = (value: string): string =>
  `hmac-sha256:${createHmac('sha256', CONNECTSHYFT_CONTACT_HASH_SECRET).update(value).digest('hex')}`;

const buildIdentityMatchEventPayload = (input: {
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>;
  actorUserId: string | null;
  decision: ConnectShyftIdentityMatchDecision;
}) => ({
  tenant_id: input.context.tenantId,
  org_unit_id: input.context.orgUnitId,
  actor_user_id: input.actorUserId || 'unknown',
  decision: input.decision.decision,
  reason: input.decision.reason,
  auto_merge_allowed: input.decision.autoMergeAllowed,
  match_count: input.decision.candidateCount,
  matched_neighbor_id: input.decision.matchedNeighborId,
  candidate_neighbor_ids: input.decision.candidateNeighborIds,
  contact_point: {
    kind: 'phone_e164',
    value_masked: maskIdentityContactPointValue(input.decision.contactPoint.value),
    value_hash: hashIdentityContactPointValue(input.decision.contactPoint.value),
    is_shared: input.decision.contactPoint.isShared,
    verification_status: input.decision.contactPoint.verificationStatus,
  },
  manual_resolution_required: input.decision.manualResolution?.required === true,
  manual_resolution_reason_code: input.decision.manualResolution?.reasonCode || null,
});

const canPersistIdentityMatchSideEffects = (input: {
  tenantId: string;
}): boolean => UUID_PATTERN.test(input.tenantId);

export const persistConnectShyftNeighborIdentityBridgeDecision = async (input: {
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId'>;
  actorUserId: string | null;
  decision: ConnectShyftIdentityMatchDecision;
}): Promise<boolean> => {
  if (!canPersistIdentityMatchSideEffects({ tenantId: input.context.tenantId })) {
    return false;
  }

  await executePlatformMutation({
    mutation: async () => ({
      persisted: true,
    }),
    event: {
      tenantId: input.context.tenantId,
      actorId: resolveMutationActorUserId(input.actorUserId),
      eventName: input.decision.decision === 'AMBIGUOUS'
        ? 'connectshyft.identity.match.ambiguous'
        : 'connectshyft.identity.match.evaluated',
      entityType: 'connectshyft.identity_match',
      entityId: randomUUID(),
      payload: buildIdentityMatchEventPayload(input),
    },
  }, loadConnectShyftPlatformDb());

  return true;
};

const resolveMutationActorUserId = (actorUserId: string | null): string | null => {
  const normalized = normalizeNonEmptyString(actorUserId);
  if (!normalized) {
    return null;
  }

  return UUID_PATTERN.test(normalized) ? normalized : null;
};

const canPersistNeighborEditSideEffects = (input: {
  tenantId: string;
  neighborId: string;
}): boolean => UUID_PATTERN.test(input.tenantId) && UUID_PATTERN.test(input.neighborId);

const canPersistNeighborSoftDeleteSideEffects = (input: {
  tenantId: string;
  neighborId: string;
  actorUserId: string;
}): boolean => {
  return UUID_PATTERN.test(input.tenantId)
    && UUID_PATTERN.test(input.neighborId)
    && UUID_PATTERN.test(input.actorUserId);
};

const canPersistNeighborMergeSideEffects = (input: {
  tenantId: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
}): boolean => {
  return UUID_PATTERN.test(input.tenantId)
    && UUID_PATTERN.test(input.sourceNeighborId)
    && UUID_PATTERN.test(input.survivorNeighborId);
};

class NeighborUpdateRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly data?: {
      fieldErrors?: Array<{ field: string; reason: string; message: string }>;
    },
  ) {
    super(message);
    this.name = 'NeighborUpdateRefusalError';
  }
}

class NeighborSoftDeleteRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NeighborSoftDeleteRefusalError';
  }
}

class NeighborAlreadyDeletedError extends Error {
  constructor(
    readonly neighbor: unknown,
  ) {
    super('Neighbor already soft-deleted');
    this.name = 'NeighborAlreadyDeletedError';
  }
}

class NeighborMergeRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NeighborMergeRefusalError';
  }
}

export const updateConnectShyftNeighborWithSideEffects = async (input: {
  actorRoles: string[];
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  actorUserId: string | null;
  firstName: string;
  lastName: string;
  prefersTexting?: ConnectShyftTextingPreference;
  phones: ConnectShyftNeighborPhoneInput[];
  policy: Extract<ConnectShyftNeighborEditPolicyDecision, { ok: true }>;
  provenance: NeighborEditProvenancePayload;
}): Promise<
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_UPDATED';
    httpStatus: 200;
    neighbor: unknown;
    sideEffectsPersisted: boolean;
  }
  | {
    ok: false;
    code: string;
    message: string;
    data?: {
      fieldErrors?: Array<{ field: string; reason: string; message: string }>;
    };
  }
> => {
  const command = {
    actorRoles: input.actorRoles,
    tenantId: input.tenantId,
    neighborId: input.neighborId,
    firstName: input.firstName,
    lastName: input.lastName,
    prefersTexting: input.prefersTexting,
    phones: input.phones,
    relationshipValidated: input.policy.relationshipValidated,
  };

  if (!canPersistNeighborEditSideEffects({
    tenantId: input.tenantId,
    neighborId: input.neighborId,
  })) {
    const updated = await connectShyftNeighborServiceAsync.updateNeighbor(command);
    if (!updated.ok) {
      return {
        ok: false,
        code: updated.code,
        message: updated.message,
        data: 'data' in updated ? updated.data : undefined,
      };
    }

    return {
      ok: true,
      code: updated.code,
      httpStatus: updated.httpStatus,
      neighbor: updated.data.neighbor,
      sideEffectsPersisted: false,
    };
  }

  try {
    const neighbor = await executePlatformMutation({
      mutation: async (trx) => {
        const txNeighborService = new AsyncConnectShyftNeighborService(
          new KnexConnectShyftNeighborStore(trx as unknown as Knex),
        );
        const updated = await txNeighborService.updateNeighbor(command);
        if (!updated.ok) {
          throw new NeighborUpdateRefusalError(
            updated.code,
            updated.message,
            'data' in updated ? updated.data : undefined,
          );
        }

        return updated.data.neighbor;
      },
      event: {
        tenantId: input.tenantId,
        actorId: resolveMutationActorUserId(input.actorUserId),
        eventName: input.provenance.audit.eventName,
        entityType: 'connectshyft.neighbor',
        entityId: input.neighborId,
        payload: input.provenance.audit.metadata,
      },
    }, loadConnectShyftPlatformDb());

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      httpStatus: 200,
      neighbor,
      sideEffectsPersisted: true,
    };
  } catch (error: unknown) {
    if (error instanceof NeighborUpdateRefusalError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        data: error.data,
      };
    }

    return {
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATE_SIDE_EFFECTS_UNAVAILABLE',
      message: 'Neighbor update side effects are temporarily unavailable. Please retry.',
    };
  }
};

export const softDeleteConnectShyftNeighborWithSideEffects = async (input: {
  actorRoles: string[];
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  actorUserId: string;
  irreversibleConfirmation: boolean;
}): Promise<
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED';
    httpStatus: 200;
    neighbor: unknown;
    alreadyDeleted: boolean;
    sideEffectsPersisted: boolean;
    provenance: NeighborSoftDeleteProvenancePayload | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
  }
> => {
  const command = {
    actorRoles: input.actorRoles,
    tenantId: input.tenantId,
    neighborId: input.neighborId,
    actorUserId: input.actorUserId,
    irreversibleConfirmation: input.irreversibleConfirmation,
  };

  if (!canPersistNeighborSoftDeleteSideEffects({
    tenantId: input.tenantId,
    neighborId: input.neighborId,
    actorUserId: input.actorUserId,
  })) {
    const deleted = await connectShyftNeighborServiceAsync.softDeleteNeighbor(command);
    if (!deleted.ok) {
      return {
        ok: false,
        code: deleted.code,
        message: deleted.message,
      };
    }

    return {
      ok: true,
      code: deleted.code,
      httpStatus: deleted.httpStatus,
      neighbor: deleted.data.neighbor,
      alreadyDeleted: deleted.data.alreadyDeleted,
      sideEffectsPersisted: false,
      provenance: deleted.data.alreadyDeleted
        ? null
        : buildConnectShyftNeighborSoftDeleteProvenancePayload(
          {
            tenantId: input.tenantId,
            orgUnitId: input.orgUnitId,
          },
          input.neighborId,
          input.actorUserId,
          deleted.data.neighbor.deletedAtUtc,
        ),
    };
  }

  try {
    const deleted = await executePlatformMutation({
      mutation: async (trx) => {
        const txNeighborService = new AsyncConnectShyftNeighborService(
          new KnexConnectShyftNeighborStore(trx as unknown as Knex),
        );
        const deletedResult = await txNeighborService.softDeleteNeighbor(command);
        if (!deletedResult.ok) {
          throw new NeighborSoftDeleteRefusalError(deletedResult.code, deletedResult.message);
        }
        if (deletedResult.data.alreadyDeleted) {
          throw new NeighborAlreadyDeletedError(deletedResult.data.neighbor);
        }

        return deletedResult.data;
      },
      event: (result) => {
        const provenance = buildConnectShyftNeighborSoftDeleteProvenancePayload(
          {
            tenantId: input.tenantId,
            orgUnitId: input.orgUnitId,
          },
          input.neighborId,
          input.actorUserId,
          result.neighbor.deletedAtUtc,
        );

        return {
          tenantId: input.tenantId,
          actorId: resolveMutationActorUserId(input.actorUserId),
          eventName: provenance.audit.eventName,
          entityType: 'connectshyft.neighbor',
          entityId: input.neighborId,
          payload: provenance.audit.metadata,
        };
      },
    }, loadConnectShyftPlatformDb());

    const provenance = buildConnectShyftNeighborSoftDeleteProvenancePayload(
      {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
      },
      input.neighborId,
      input.actorUserId,
      deleted.neighbor.deletedAtUtc,
    );

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
      httpStatus: 200,
      neighbor: deleted.neighbor,
      alreadyDeleted: false,
      sideEffectsPersisted: true,
      provenance,
    };
  } catch (error: unknown) {
    if (error instanceof NeighborAlreadyDeletedError) {
      return {
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
        httpStatus: 200,
        neighbor: error.neighbor,
        alreadyDeleted: true,
        sideEffectsPersisted: false,
        provenance: null,
      };
    }
    if (error instanceof NeighborSoftDeleteRefusalError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_SIDE_EFFECTS_UNAVAILABLE',
      message: 'Neighbor soft delete side effects are temporarily unavailable. Please retry.',
    };
  }
};

export const mergeConnectShyftNeighborsWithSideEffects = async (input: {
  actorRoles: string[];
  tenantId: string;
  orgUnitId: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
  actorUserId: string | null;
  irreversibleConfirmation: {
    acknowledged: boolean;
    phrase: string;
  };
  reason: string;
  simulateFailureStage?: ConnectShyftNeighborMergeFailureStage;
  provenance: NeighborMergeProvenancePayload;
}): Promise<
  | {
    ok: true;
    code: 'CONNECTSHYFT_NEIGHBOR_MERGED';
    httpStatus: 200;
    merge: {
      sourceNeighborId: string;
      survivorNeighborId: string;
      irreversibleConfirmed: true;
    };
    neighbor: unknown;
    sideEffectsPersisted: boolean;
  }
  | {
    ok: false;
    code: string;
    message: string;
  }
> => {
  if (input.simulateFailureStage === 'before-commit') {
    return {
      ok: false,
      code: NEIGHBOR_MERGE_TRANSACTION_ABORTED_CODE,
      message: NEIGHBOR_MERGE_TRANSACTION_ABORTED_MESSAGE,
    };
  }

  const command = {
    actorRoles: input.actorRoles,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    sourceNeighborId: input.sourceNeighborId,
    survivorNeighborId: input.survivorNeighborId,
    irreversibleConfirmation: input.irreversibleConfirmation,
    reason: input.reason,
  };

  if (!canPersistNeighborMergeSideEffects({
    tenantId: input.tenantId,
    sourceNeighborId: input.sourceNeighborId,
    survivorNeighborId: input.survivorNeighborId,
  })) {
    return {
      ok: false,
      code: NEIGHBOR_MERGE_TRANSACTION_ABORTED_CODE,
      message: NEIGHBOR_MERGE_TRANSACTION_ABORTED_MESSAGE,
    };
  }

  try {
    const merged = await executePlatformMutation({
      mutation: async (trx) => {
        const txNeighborService = new AsyncConnectShyftNeighborService(
          new KnexConnectShyftNeighborStore(trx as unknown as Knex),
        );
        const mergedResult = await txNeighborService.mergeNeighbor(command);
        if (!mergedResult.ok) {
          throw new NeighborMergeRefusalError(mergedResult.code, mergedResult.message);
        }
        if (input.simulateFailureStage === 'after-dependent-repoint') {
          throw new Error(NEIGHBOR_MERGE_TRANSACTION_ABORTED_MESSAGE);
        }

        return mergedResult.data;
      },
      event: {
        tenantId: input.tenantId,
        actorId: resolveMutationActorUserId(input.actorUserId),
        eventName: input.provenance.audit.eventName,
        entityType: 'connectshyft.neighbor',
        entityId: input.survivorNeighborId,
        payload: input.provenance.audit.metadata,
      },
    }, loadConnectShyftPlatformDb());

    return {
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
      httpStatus: 200,
      merge: merged.merge,
      neighbor: merged.neighbor,
      sideEffectsPersisted: true,
    };
  } catch (error: unknown) {
    if (error instanceof NeighborMergeRefusalError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      code: NEIGHBOR_MERGE_TRANSACTION_ABORTED_CODE,
      message: NEIGHBOR_MERGE_TRANSACTION_ABORTED_MESSAGE,
    };
  }
};

const ensureNeighborCreateCapability = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
): boolean => {
  if (requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
    CAPABILITIES.NEIGHBOR_EDIT_ALL,
  ], context)) {
    return true;
  }

  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
    message: 'Neighbor creation requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const ensureNeighborReadCapability = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
): boolean => {
  if (requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
    CAPABILITIES.NEIGHBOR_EDIT_ALL,
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
    CAPABILITIES.TENANT_READ_ALL,
  ], context)) {
    return true;
  }

  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN',
    message: 'Neighbor profile access requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const ensureNeighborUpdateCapability = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
): boolean => {
  if (requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
    CAPABILITIES.NEIGHBOR_EDIT_ALL,
    CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE,
  ], context)) {
    return true;
  }

  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_NEIGHBOR_UPDATE_FORBIDDEN',
    message: 'Neighbor profile updates require an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const ensureTenantPrivilegedNeighborAdminCapability = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
  options: {
    code: string;
    message: string;
  } = {
    code: 'CONNECTSHYFT_NEIGHBOR_DELETE_FORBIDDEN',
    message: 'Neighbor soft delete requires a tenant-privileged ConnectShyft admin role.',
  },
): boolean => {
  if (requestHasAnyCapability(req, [CAPABILITIES.NEIGHBOR_EDIT_ALL], context)) {
    return true;
  }

  sendConnectShyftRouteRefusal(res, {
    code: options.code,
    message: options.message,
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const ensureNeighborMergeCapability = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
): boolean => {
  if (requestHasAnyCapability(req, [CAPABILITIES.NEIGHBOR_MERGE], context)) {
    return true;
  }

  sendConnectShyftRouteRefusal(res, {
    code: NEIGHBOR_MERGE_FORBIDDEN_CODE,
    message: NEIGHBOR_MERGE_FORBIDDEN_MESSAGE,
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const resolveScopedNeighborContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
): Promise<ResolvedConnectShyftContext | null> => {
  const contextDecision = await resolveConnectShyftRouteContextDecision(req, {
    attemptedOrgUnitId,
  });
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  return contextDecision.context;
};

export const resolveConnectShyftNeighborCreateAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborCreateAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const payload = parseConnectShyftNeighborCreateBody(req);
  const context = await resolveScopedNeighborContext(req, res, payload.orgUnitId);
  if (!context) {
    return null;
  }

  if (!ensureNeighborCreateCapability(req, res, context)) {
    return null;
  }

  return {
    context,
    actorRoles: resolveConnectShyftActorRoles(req, context),
    payload,
  };
};

export const resolveConnectShyftNeighborListAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborListAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const context = await resolveScopedNeighborContext(req, res);
  if (!context) {
    return null;
  }

  if (!ensureNeighborReadCapability(req, res, context)) {
    return null;
  }

  return {
    context,
    actorRoles: resolveConnectShyftActorRoles(req, context),
  };
};

export const resolveConnectShyftNeighborDetailAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborDetailAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const neighborId = parseNeighborIdParam(req);
  if (!neighborId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NEIGHBOR_ID_REQUIRED',
      message: 'neighborId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  const context = await resolveScopedNeighborContext(req, res);
  if (!context) {
    return null;
  }

  if (!ensureNeighborReadCapability(req, res, context)) {
    return null;
  }

  const includeDeleted = parseIncludeDeletedQuery(req);
  if (
    includeDeleted
    && !ensureTenantPrivilegedNeighborAdminCapability(req, res, context, {
      code: 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN',
      message: 'Deleted neighbor detail requires a tenant-privileged ConnectShyft admin role.',
    })
  ) {
    return null;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, context);
  const actorUserId = resolveConnectShyftRequestedActorUserId(req);
  const policyDecision = await evaluateConnectShyftNeighborEditPolicy({
    req,
    actorRoles,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    actorUserId,
    scope: 'read',
  });
  if (!policyDecision.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: policyDecision.code,
      message: policyDecision.message,
      refusalType: policyDecision.refusalType,
      httpStatus: policyDecision.httpStatus,
      data: buildConnectShyftNeighborScopePayload(context),
    });
    return null;
  }

  return {
    context,
    actorRoles,
    actorUserId,
    neighborId,
    includeDeleted,
    policyDecision,
  };
};

export const resolveConnectShyftNeighborUpdateAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborUpdateAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const neighborId = parseNeighborIdParam(req);
  if (!neighborId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NEIGHBOR_ID_REQUIRED',
      message: 'neighborId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  const payload = parseConnectShyftNeighborUpdateBody(req);
  const context = await resolveScopedNeighborContext(req, res, payload.orgUnitId);
  if (!context) {
    return null;
  }

  if (!ensureNeighborUpdateCapability(req, res, context)) {
    return null;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, context);
  const actorUserId = resolveConnectShyftRequestedActorUserId(req);
  const policyDecision = await evaluateConnectShyftNeighborEditPolicy({
    req,
    actorRoles,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId,
    actorUserId,
    scope: 'edit',
  });
  if (!policyDecision.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: policyDecision.code,
      message: policyDecision.message,
      refusalType: policyDecision.refusalType,
      httpStatus: policyDecision.httpStatus,
      data: buildConnectShyftNeighborScopePayload(context),
    });
    return null;
  }

  return {
    context,
    actorRoles,
    actorUserId,
    neighborId,
    payload,
    policyDecision,
    provenance: buildConnectShyftNeighborEditProvenancePayload(
      context,
      policyDecision,
      neighborId,
      actorUserId,
    ),
  };
};

export const resolveConnectShyftNeighborDeleteAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborDeleteAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const neighborId = parseNeighborIdParam(req);
  if (!neighborId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NEIGHBOR_ID_REQUIRED',
      message: 'neighborId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  const payload = parseConnectShyftNeighborDeleteBody(req);
  const context = await resolveScopedNeighborContext(req, res, payload.orgUnitId);
  if (!context) {
    return null;
  }

  if (!ensureTenantPrivilegedNeighborAdminCapability(req, res, context)) {
    return null;
  }

  const actorUserId = resolveMutationActorUserId(resolveConnectShyftRequestedActorUserId(req));
  if (!actorUserId) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
      message: 'Neighbor soft delete requires an authenticated actor context.',
      refusalType: 'business',
      httpStatus: 200,
      data: buildConnectShyftNeighborScopePayload(context),
    });
    return null;
  }

  return {
    context,
    actorRoles: resolveConnectShyftActorRoles(req, context),
    actorUserId,
    neighborId,
    payload,
  };
};

export const resolveConnectShyftNeighborIdentityMatchAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborIdentityMatchAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const payload = parseConnectShyftNeighborIdentityMatchBody(req);
  const context = await resolveScopedNeighborContext(req, res, payload.orgUnitId);
  if (!context) {
    return null;
  }

  if (!ensureNeighborUpdateCapability(req, res, context)) {
    return null;
  }

  return {
    context,
    actorRoles: resolveConnectShyftActorRoles(req, context),
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
    payload,
  };
};

export const resolveConnectShyftNeighborMergeAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNeighborMergeAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const payload = parseConnectShyftNeighborMergeBody(req);
  const context = await resolveScopedNeighborContext(req, res, payload.orgUnitId);
  if (!context) {
    return null;
  }

  if (!ensureNeighborMergeCapability(req, res, context)) {
    return null;
  }

  return {
    context,
    actorRoles: resolveConnectShyftActorRoles(req, context),
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
    payload,
  };
};

export const buildConnectShyftNeighborIdentityMatchSuccessMessage = (code: string): string => {
  if (code === 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED') {
    return 'Identity match permits auto-merge.';
  }
  if (code === 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH') {
    return 'No exact identity matches found.';
  }
  return 'Identity match resolved without auto-merge eligibility.';
};

// This helper intentionally keeps the neighbor/identity bridge ConnectShyft-local for now.
// Slice 7 only isolates the seam so future PeopleCore convergence can swap internals later.
