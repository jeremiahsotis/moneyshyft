import { createHash } from 'node:crypto';
import { CAPABILITIES, hasCapability } from '../../platform/rbac/capabilities';

const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;
const REMOVABLE_PHONE_CHARS_PATTERN = /[\s().-]/g;
const INVALID_PHONE_CHAR_PATTERN = /[A-Za-z]/;

const normalizeNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizePhoneValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (INVALID_PHONE_CHAR_PATTERN.test(trimmed)) {
    return null;
  }

  const compact = trimmed.replace(REMOVABLE_PHONE_CHARS_PATTERN, '');
  if (!/^\+?\d+$/.test(compact)) {
    return null;
  }

  const normalized = compact.startsWith('+') ? compact : `+${compact}`;
  if (!E164_PHONE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeVerificationStatus = (
  value: unknown,
): 'verified' | 'unverified' => {
  if (value === 'verified') {
    return 'verified';
  }

  return 'unverified';
};

const hasIdentityBoundaryCapability = (
  actorRoles: Array<string | null | undefined>,
): boolean => {
  return hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED)
    || hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL)
    || hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE);
};

export type ConnectShyftIdentityBoundaryContactPoint = {
  label: string;
  value: string;
  isShared?: boolean;
  verificationStatus?: 'verified' | 'unverified';
};

export type ConnectShyftIdentityBoundaryPhone = {
  phoneId: string;
  value: string;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
};

export type ConnectShyftIdentityBoundaryNeighbor = {
  neighborId: string;
  phones: ConnectShyftIdentityBoundaryPhone[];
};

export type ConnectShyftIdentityBoundaryRequest = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  contactPoint: ConnectShyftIdentityBoundaryContactPoint;
  excludeNeighborId?: string;
  idempotencyKey?: string;
};

export type ConnectShyftIdentityBoundaryReplay = {
  key: string;
  semantics: 'REPLAY_SAFE';
};

export type ConnectShyftIdentityBoundaryFieldError = {
  field: 'phones';
  reason: 'INVALID_FORMAT';
  message: string;
};

export type ConnectShyftIdentityMatchCandidate = {
  neighborId: string;
  phoneId: string;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
};

export type ConnectShyftIdentityMatchDecisionReason =
  | 'VERIFIED_NON_SHARED_EXACT_CONTACT_POINT'
  | 'NO_EXACT_CONTACT_POINT_MATCH'
  | 'INPUT_CONTACT_UNVERIFIED'
  | 'INPUT_CONTACT_SHARED'
  | 'MATCH_CONTACT_UNVERIFIED'
  | 'MATCH_CONTACT_SHARED'
  | 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES';

export type ConnectShyftIdentityBoundaryManualResolutionContext = {
  required: true;
  reasonCode: 'IDENTITY_MATCH_AMBIGUOUS';
  nextAction: 'manual-merge';
  mergeEndpoint: '/api/v1/connectshyft/neighbors/merge';
  candidateNeighborIds: string[];
  guidance: string;
};

export type ConnectShyftIdentityBoundaryDecision = {
  decision: 'AUTO_MERGE_ALLOWED' | 'NO_AUTO_MERGE' | 'AMBIGUOUS';
  reason: ConnectShyftIdentityMatchDecisionReason;
  autoMergeAllowed: boolean;
  contactPoint: {
    value: string;
    isShared: boolean;
    verificationStatus: 'verified' | 'unverified';
  };
  matchedNeighborId: string | null;
  candidateCount: number;
  candidateNeighborIds: string[];
  exactMatches: ConnectShyftIdentityMatchCandidate[];
  manualResolution?: ConnectShyftIdentityBoundaryManualResolutionContext;
};

export type ConnectShyftIdentityBoundaryResult =
  | {
    ok: true;
    code:
      | 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED'
      | 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE'
      | 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH';
    httpStatus: 200;
    data: {
      identityMatch: ConnectShyftIdentityBoundaryDecision;
      idempotency: ConnectShyftIdentityBoundaryReplay;
    };
  }
  | {
    ok: false;
    code:
      | 'CONNECTSHYFT_IDENTITY_MATCH_FORBIDDEN'
      | 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT'
      | 'IDENTITY_MATCH_AMBIGUOUS'
      | 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE';
    message: string;
    data?: {
      fieldErrors?: ConnectShyftIdentityBoundaryFieldError[];
      identityMatch?: ConnectShyftIdentityBoundaryDecision;
      manualResolution?: ConnectShyftIdentityBoundaryManualResolutionContext;
      idempotency: ConnectShyftIdentityBoundaryReplay;
    };
  };

export interface ConnectShyftIdentityBoundaryAdapter {
  evaluateMatch(
    input: ConnectShyftIdentityBoundaryRequest,
  ): ConnectShyftIdentityBoundaryResult | Promise<ConnectShyftIdentityBoundaryResult>;
}

const aggregateIdentityMatchCandidates = (
  candidates: ConnectShyftIdentityMatchCandidate[],
): Array<{
  neighborId: string;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
}> => {
  const candidatesByNeighbor = new Map<string, ConnectShyftIdentityMatchCandidate[]>();
  candidates.forEach((candidate) => {
    const existing = candidatesByNeighbor.get(candidate.neighborId) || [];
    existing.push(candidate);
    candidatesByNeighbor.set(candidate.neighborId, existing);
  });

  return Array.from(candidatesByNeighbor.entries())
    .sort(([leftNeighborId], [rightNeighborId]) => leftNeighborId.localeCompare(rightNeighborId))
    .map(([neighborId, neighborCandidates]) => ({
      neighborId,
      isShared: neighborCandidates.some((candidate) => candidate.isShared === true),
      verificationStatus: neighborCandidates.every((candidate) => candidate.verificationStatus === 'verified')
        ? 'verified'
        : 'unverified',
    }));
};

const buildManualResolutionContext = (
  candidateNeighborIds: string[],
): ConnectShyftIdentityBoundaryManualResolutionContext => ({
  required: true,
  reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
  nextAction: 'manual-merge',
  mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
  candidateNeighborIds,
  guidance: 'Multiple identities share this contact point. Resolve manually before any merge.',
});

const buildIdentityMatchDecision = (input: {
  normalizedValue: string;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
  candidates: ConnectShyftIdentityMatchCandidate[];
}): ConnectShyftIdentityBoundaryDecision => {
  const candidateAggregates = aggregateIdentityMatchCandidates(input.candidates);
  const candidateNeighborIds = candidateAggregates.map((candidate) => candidate.neighborId);
  const candidateCount = candidateNeighborIds.length;

  if (candidateCount === 0) {
    return {
      decision: 'NO_AUTO_MERGE',
      reason: 'NO_EXACT_CONTACT_POINT_MATCH',
      autoMergeAllowed: false,
      contactPoint: {
        value: input.normalizedValue,
        isShared: input.isShared,
        verificationStatus: input.verificationStatus,
      },
      matchedNeighborId: null,
      candidateCount,
      candidateNeighborIds,
      exactMatches: [],
    };
  }

  if (candidateCount > 1) {
    return {
      decision: 'AMBIGUOUS',
      reason: 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES',
      autoMergeAllowed: false,
      contactPoint: {
        value: input.normalizedValue,
        isShared: input.isShared,
        verificationStatus: input.verificationStatus,
      },
      matchedNeighborId: null,
      candidateCount,
      candidateNeighborIds,
      exactMatches: input.candidates,
      manualResolution: buildManualResolutionContext(candidateNeighborIds),
    };
  }

  const matched = candidateAggregates[0];
  const isInputVerified = input.verificationStatus === 'verified';
  const isMatchedVerified = matched.verificationStatus === 'verified';
  const inputIsSafe = isInputVerified && input.isShared === false;
  const matchedIsSafe = isMatchedVerified && matched.isShared === false;

  const noAutoMergeReason: ConnectShyftIdentityMatchDecisionReason | null = input.isShared
    ? 'INPUT_CONTACT_SHARED'
    : !isInputVerified
      ? 'INPUT_CONTACT_UNVERIFIED'
      : matched.isShared
        ? 'MATCH_CONTACT_SHARED'
        : !isMatchedVerified
          ? 'MATCH_CONTACT_UNVERIFIED'
          : null;

  if (inputIsSafe && matchedIsSafe) {
    return {
      decision: 'AUTO_MERGE_ALLOWED',
      reason: 'VERIFIED_NON_SHARED_EXACT_CONTACT_POINT',
      autoMergeAllowed: true,
      contactPoint: {
        value: input.normalizedValue,
        isShared: input.isShared,
        verificationStatus: input.verificationStatus,
      },
      matchedNeighborId: matched.neighborId,
      candidateCount,
      candidateNeighborIds,
      exactMatches: input.candidates,
    };
  }

  return {
    decision: 'NO_AUTO_MERGE',
    reason: noAutoMergeReason || 'NO_EXACT_CONTACT_POINT_MATCH',
    autoMergeAllowed: false,
    contactPoint: {
      value: input.normalizedValue,
      isShared: input.isShared,
      verificationStatus: input.verificationStatus,
    },
    matchedNeighborId: matched.neighborId,
    candidateCount,
    candidateNeighborIds,
    exactMatches: input.candidates,
  };
};

const collectIdentityMatchCandidates = (
  neighbors: ConnectShyftIdentityBoundaryNeighbor[],
  normalizedValue: string,
  excludeNeighborId: string,
): ConnectShyftIdentityMatchCandidate[] => {
  return neighbors
    .flatMap((neighbor) => {
      if (excludeNeighborId && neighbor.neighborId === excludeNeighborId) {
        return [];
      }

      return neighbor.phones
        .filter((phone) => phone.value === normalizedValue)
        .map((phone) => ({
          neighborId: neighbor.neighborId,
          phoneId: phone.phoneId,
          isShared: phone.isShared === true,
          verificationStatus: normalizeVerificationStatus(phone.verificationStatus),
        }));
    })
    .sort((left, right) => {
      if (left.neighborId !== right.neighborId) {
        return left.neighborId.localeCompare(right.neighborId);
      }

      return left.phoneId.localeCompare(right.phoneId);
    });
};

const buildIdempotencyReplay = (input: {
  tenantId: string;
  explicitKey?: string;
  normalizedContactPointValue?: string | null;
  rawContactPointValue?: string;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
  excludeNeighborId: string;
}): ConnectShyftIdentityBoundaryReplay => {
  const explicitKey = normalizeNonEmptyString(input.explicitKey);
  if (explicitKey) {
    return {
      key: explicitKey,
      semantics: 'REPLAY_SAFE',
    };
  }

  const contactPointValue = input.normalizedContactPointValue
    || normalizeNonEmptyString(input.rawContactPointValue)
    || 'unknown-contact-point';

  const canonical = [
    normalizeNonEmptyString(input.tenantId),
    contactPointValue,
    input.isShared ? 'shared' : 'non-shared',
    input.verificationStatus,
    input.excludeNeighborId,
  ].join('|');

  return {
    key: `identity-match:${createHash('sha256').update(canonical).digest('hex')}`,
    semantics: 'REPLAY_SAFE',
  };
};

const buildIdentityMatchInvalidPhoneRefusal = (
  idempotency: ConnectShyftIdentityBoundaryReplay,
): ConnectShyftIdentityBoundaryResult => ({
  ok: false,
  code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
  message: 'Provide a valid phone value (for example, +12605550199).',
  data: {
    fieldErrors: [
      {
        field: 'phones',
        reason: 'INVALID_FORMAT',
        message: 'Provide a valid phone value (for example, +12605550199).',
      },
    ],
    idempotency,
  },
});

const buildIdentityMatchForbiddenRefusal = (
  idempotency: ConnectShyftIdentityBoundaryReplay,
): ConnectShyftIdentityBoundaryResult => ({
  ok: false,
  code: 'CONNECTSHYFT_IDENTITY_MATCH_FORBIDDEN',
  message: 'Identity matching requires an authorized ConnectShyft role.',
  data: {
    idempotency,
  },
});

const buildIdentityMatchAmbiguousRefusal = (
  decision: ConnectShyftIdentityBoundaryDecision,
  idempotency: ConnectShyftIdentityBoundaryReplay,
): ConnectShyftIdentityBoundaryResult => ({
  ok: false,
  code: 'IDENTITY_MATCH_AMBIGUOUS',
  message: 'Identity match is ambiguous and requires manual resolution.',
  data: {
    identityMatch: decision,
    manualResolution: decision.manualResolution,
    idempotency,
  },
});

const buildIdentityMatchSuccess = (
  decision: ConnectShyftIdentityBoundaryDecision,
  idempotency: ConnectShyftIdentityBoundaryReplay,
): ConnectShyftIdentityBoundaryResult => ({
  ok: true,
  code: decision.decision === 'AUTO_MERGE_ALLOWED'
    ? 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED'
    : decision.reason === 'NO_EXACT_CONTACT_POINT_MATCH'
      ? 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH'
      : 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
  httpStatus: 200,
  data: {
    identityMatch: decision,
    idempotency,
  },
});

type PreparedIdentityBoundaryEvaluation = {
  normalizedContactPointValue: string | null;
  isShared: boolean;
  verificationStatus: 'verified' | 'unverified';
  excludeNeighborId: string;
  idempotency: ConnectShyftIdentityBoundaryReplay;
};

const prepareIdentityBoundaryEvaluation = (
  input: ConnectShyftIdentityBoundaryRequest,
): PreparedIdentityBoundaryEvaluation => {
  const normalizedContactPointValue = normalizePhoneValue(normalizeNonEmptyString(input.contactPoint?.value));
  const isShared = input.contactPoint?.isShared === true;
  const verificationStatus = normalizeVerificationStatus(input.contactPoint?.verificationStatus);
  const excludeNeighborId = normalizeNonEmptyString(input.excludeNeighborId);

  return {
    normalizedContactPointValue,
    isShared,
    verificationStatus,
    excludeNeighborId,
    idempotency: buildIdempotencyReplay({
      tenantId: input.tenantId,
      explicitKey: input.idempotencyKey,
      normalizedContactPointValue,
      rawContactPointValue: input.contactPoint?.value,
      isShared,
      verificationStatus,
      excludeNeighborId,
    }),
  };
};

const evaluateConnectShyftIdentityBoundaryWithResolver = (
  input: ConnectShyftIdentityBoundaryRequest,
  resolveNeighborsByNormalizedContactPoint: (
    normalizedContactPointValue: string,
  ) => ConnectShyftIdentityBoundaryNeighbor[],
): ConnectShyftIdentityBoundaryResult => {
  const prepared = prepareIdentityBoundaryEvaluation(input);

  if (!hasIdentityBoundaryCapability(input.actorRoles)) {
    return buildIdentityMatchForbiddenRefusal(prepared.idempotency);
  }

  if (!prepared.normalizedContactPointValue) {
    return buildIdentityMatchInvalidPhoneRefusal(prepared.idempotency);
  }

  const decision = buildIdentityMatchDecision({
    normalizedValue: prepared.normalizedContactPointValue,
    isShared: prepared.isShared,
    verificationStatus: prepared.verificationStatus,
    candidates: collectIdentityMatchCandidates(
      resolveNeighborsByNormalizedContactPoint(prepared.normalizedContactPointValue),
      prepared.normalizedContactPointValue,
      prepared.excludeNeighborId,
    ),
  });

  if (decision.decision === 'AMBIGUOUS') {
    return buildIdentityMatchAmbiguousRefusal(decision, prepared.idempotency);
  }

  return buildIdentityMatchSuccess(decision, prepared.idempotency);
};

const evaluateConnectShyftIdentityBoundaryWithAsyncResolver = async (
  input: ConnectShyftIdentityBoundaryRequest,
  resolveNeighborsByNormalizedContactPoint: (
    normalizedContactPointValue: string,
  ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
): Promise<ConnectShyftIdentityBoundaryResult> => {
  const prepared = prepareIdentityBoundaryEvaluation(input);

  if (!hasIdentityBoundaryCapability(input.actorRoles)) {
    return buildIdentityMatchForbiddenRefusal(prepared.idempotency);
  }

  if (!prepared.normalizedContactPointValue) {
    return buildIdentityMatchInvalidPhoneRefusal(prepared.idempotency);
  }

  const decision = buildIdentityMatchDecision({
    normalizedValue: prepared.normalizedContactPointValue,
    isShared: prepared.isShared,
    verificationStatus: prepared.verificationStatus,
    candidates: collectIdentityMatchCandidates(
      await resolveNeighborsByNormalizedContactPoint(prepared.normalizedContactPointValue),
      prepared.normalizedContactPointValue,
      prepared.excludeNeighborId,
    ),
  });

  if (decision.decision === 'AMBIGUOUS') {
    return buildIdentityMatchAmbiguousRefusal(decision, prepared.idempotency);
  }

  return buildIdentityMatchSuccess(decision, prepared.idempotency);
};

export const evaluateConnectShyftIdentityBoundary = (
  input: ConnectShyftIdentityBoundaryRequest,
  neighbors: ConnectShyftIdentityBoundaryNeighbor[],
): ConnectShyftIdentityBoundaryResult => {
  return evaluateConnectShyftIdentityBoundaryWithResolver(
    input,
    () => neighbors,
  );
};

export class InProcessConnectShyftIdentityBoundaryAdapter
  implements ConnectShyftIdentityBoundaryAdapter {
  constructor(
    private readonly loadNeighborsByTenant: (tenantId: string) => ConnectShyftIdentityBoundaryNeighbor[],
    private readonly loadNeighborsByNormalizedContactPoint?: (
      tenantId: string,
      normalizedContactPointValue: string,
    ) => ConnectShyftIdentityBoundaryNeighbor[],
  ) {}

  evaluateMatch(
    input: ConnectShyftIdentityBoundaryRequest,
  ): ConnectShyftIdentityBoundaryResult {
    return evaluateConnectShyftIdentityBoundaryWithResolver(
      input,
      (normalizedContactPointValue) => this.loadNeighborsByNormalizedContactPoint
        ? this.loadNeighborsByNormalizedContactPoint(
          input.tenantId,
          normalizedContactPointValue,
        )
        : this.loadNeighborsByTenant(input.tenantId),
    );
  }
}

export class AsyncInProcessConnectShyftIdentityBoundaryAdapter
  implements ConnectShyftIdentityBoundaryAdapter {
  constructor(
    private readonly loadNeighborsByTenant: (
      tenantId: string,
    ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
    private readonly loadNeighborsByNormalizedContactPoint?: (
      tenantId: string,
      normalizedContactPointValue: string,
    ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
  ) {}

  async evaluateMatch(
    input: ConnectShyftIdentityBoundaryRequest,
  ): Promise<ConnectShyftIdentityBoundaryResult> {
    return evaluateConnectShyftIdentityBoundaryWithAsyncResolver(
      input,
      async (normalizedContactPointValue) => this.loadNeighborsByNormalizedContactPoint
        ? this.loadNeighborsByNormalizedContactPoint(
          input.tenantId,
          normalizedContactPointValue,
        )
        : this.loadNeighborsByTenant(input.tenantId),
    );
  }
}
