import { normalizePhone } from '../../../../../../domains/communication';
import {
  AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter,
  type ConnectShyftPeopleCoreIdentityCandidateLookup,
} from '../peoplecoreIdentityAdapter';
import {
  evaluateConnectShyftIdentityBoundary,
  type ConnectShyftIdentityBoundaryResult,
} from '../identityBoundary';
import { KnexConnectShyftNeighborStore } from '../neighbors';
import { resolveConnectShyftPhoneNormalizationContext } from '../phoneIdentityContext';

const INTERNAL_ACTOR_ROLES = ['SYSTEM_ADMIN'] as const;

export type ConnectShyftIdentityVisibility = {
  phone: string;
  resolution: 'single_match' | 'ambiguous' | 'no_match';
  source: 'peoplecore' | 'legacy';
  candidates?: Array<{ id: string; confidence: number }>;
  selectedId?: string;
};

export type ConnectShyftIdentityVisibilityReadResult =
  | {
    ok: true;
    data: ConnectShyftIdentityVisibility;
  }
  | {
    ok: false;
    code: 'CONNECTSHYFT_OPS_PHONE_INVALID';
    message: string;
    refusalType: 'client';
    httpStatus: 400;
    data: {
      fieldErrors: Array<{
        field: 'phone';
        reason: 'INVALID_FORMAT';
        message: string;
      }>;
    };
  };

const uniqueSortedStrings = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));

const collectDistinctCurrentPersonIds = (
  lookup: ConnectShyftPeopleCoreIdentityCandidateLookup,
): string[] =>
  uniqueSortedStrings(
    lookup.peopleCoreCurrentLinks
      .filter((link) => link.subjectType === 'person' && link.isCurrent !== false)
      .map((link) => link.subjectId),
  );

const collectExactMatchNeighborIds = (
  lookup: ConnectShyftPeopleCoreIdentityCandidateLookup,
): string[] => {
  if (!lookup.normalizedContactPointValue) {
    return [];
  }

  return uniqueSortedStrings(
    lookup.tenantNeighbors
      .filter((neighbor) =>
        neighbor.phones.some((phone) => phone.value === lookup.normalizedContactPointValue))
      .map((neighbor) => neighbor.neighborId),
  );
};

const hasLegacySameSubjectProof = (
  lookup: ConnectShyftPeopleCoreIdentityCandidateLookup,
  legacyResult: Extract<ConnectShyftIdentityBoundaryResult, { ok: true }>,
): boolean => {
  const legacyCandidateNeighborIds = uniqueSortedStrings(
    legacyResult.data.identityMatch.candidateNeighborIds,
  );
  const tenantExactMatchNeighborIds = collectExactMatchNeighborIds(lookup);

  return legacyCandidateNeighborIds.length === 1
    && tenantExactMatchNeighborIds.length === 1
    && tenantExactMatchNeighborIds[0] === legacyCandidateNeighborIds[0];
};

const buildCandidateConfidenceList = (
  candidateIds: string[],
): Array<{ id: string; confidence: number }> | undefined => {
  const normalized = uniqueSortedStrings(candidateIds);
  if (normalized.length === 0) {
    return undefined;
  }

  const confidence = 1 / normalized.length;
  return normalized.map((id) => ({
    id,
    confidence,
  }));
};

const buildForcedPeopleCoreAmbiguousVisibility = (
  phone: string,
  legacyResult: ConnectShyftIdentityBoundaryResult,
): ConnectShyftIdentityVisibility => {
  const legacyCandidates = legacyResult.ok
    ? legacyResult.data.identityMatch.candidateNeighborIds
    : (legacyResult.data?.identityMatch?.candidateNeighborIds || []);

  return {
    phone,
    resolution: 'ambiguous',
    source: 'peoplecore',
    candidates: buildCandidateConfidenceList(legacyCandidates),
  };
};

const mapLegacyResultToVisibility = (
  phone: string,
  legacyResult: ConnectShyftIdentityBoundaryResult,
): ConnectShyftIdentityVisibility => {
  if (!legacyResult.ok) {
    return {
      phone,
      resolution: 'ambiguous',
      source: 'legacy',
      candidates: buildCandidateConfidenceList(
        legacyResult.data?.identityMatch?.candidateNeighborIds || [],
      ),
    };
  }

  const selectedId = legacyResult.data.identityMatch.matchedNeighborId || undefined;
  return {
    phone,
    resolution: selectedId ? 'single_match' : 'no_match',
    source: 'legacy',
    ...(selectedId ? { selectedId } : {}),
  };
};

const createIdentityLookupAdapter = () => {
  const neighborStore = new KnexConnectShyftNeighborStore();

  return new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
    async (tenantId) => neighborStore.listActiveIdentityBoundaryNeighborsByTenant(tenantId),
    async (tenantId, normalizedContactPointValue) =>
      neighborStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
        tenantId,
        normalizedContactPointValue,
      ),
  );
};

export const readConnectShyftIdentityVisibility = async (input: {
  tenantId: string;
  orgUnitId: string;
  phone: string;
}): Promise<ConnectShyftIdentityVisibilityReadResult> => {
  const normalizedPhone = normalizePhone(
    input.phone.trim(),
    resolveConnectShyftPhoneNormalizationContext('user_entered'),
  );

  if (!normalizedPhone.ok) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_OPS_PHONE_INVALID',
      message: 'Provide a valid phone number (for example, 2605550199).',
      refusalType: 'client',
      httpStatus: 400,
      data: {
        fieldErrors: [
          {
            field: 'phone',
            reason: 'INVALID_FORMAT',
            message: 'Provide a valid phone number (for example, 2605550199).',
          },
        ],
      },
    };
  }

  const lookupAdapter = createIdentityLookupAdapter();
  const lookup = await lookupAdapter.evaluateIdentityCandidatesForContactPoint({
    tenantId: input.tenantId,
    contactPointValue: normalizedPhone.phone.normalizedE164,
  });

  const legacyResult = evaluateConnectShyftIdentityBoundary({
    actorRoles: [...INTERNAL_ACTOR_ROLES],
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    contactPoint: {
      label: 'mobile',
      value: normalizedPhone.phone.normalizedE164,
      isShared: false,
      verificationStatus: 'verified',
    },
  }, lookup.candidateNeighbors);

  const currentPersonIds = lookup.peopleCoreAvailable
    ? collectDistinctCurrentPersonIds(lookup)
    : [];
  const peopleCoreForcesAmbiguous = currentPersonIds.length > 1
    || (
      currentPersonIds.length === 1
      && legacyResult.ok
      && legacyResult.code === 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED'
      && !hasLegacySameSubjectProof(lookup, legacyResult)
    );

  return {
    ok: true,
    data: peopleCoreForcesAmbiguous
      ? buildForcedPeopleCoreAmbiguousVisibility(
        normalizedPhone.phone.normalizedE164,
        legacyResult,
      )
      : mapLegacyResultToVisibility(normalizedPhone.phone.normalizedE164, legacyResult),
  };
};
