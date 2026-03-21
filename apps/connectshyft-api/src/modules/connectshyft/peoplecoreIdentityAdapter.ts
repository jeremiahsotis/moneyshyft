import { normalizePhone } from '../../../../../domains/communication';
import logger from '../../utils/logger';
import {
  AsyncPeopleCoreService,
  peopleCoreServiceAsync,
} from '../peoplecore/service';
import {
  createIdentityAmbiguityEvent,
  type ConnectShyftIdentityAmbiguityReasonCode,
} from './ambiguityEvents';
import {
  evaluateConnectShyftIdentityBoundary,
  type ConnectShyftIdentityBoundaryDecision,
  type ConnectShyftIdentityBoundaryManualResolutionContext,
  type ConnectShyftIdentityBoundaryNeighbor,
  type ConnectShyftIdentityBoundaryRequest,
  type ConnectShyftIdentityBoundaryResult,
} from './identityBoundary';
import {
  ConnectShyftPeopleCoreIdentityHooks,
  type ConnectShyftPeopleCoreIdentityLookupSnapshot,
} from './peoplecoreIdentityHooks';
import { resolveConnectShyftPhoneNormalizationContext } from './phoneIdentityContext';

type PeopleCoreIdentityLookupService = Pick<
  AsyncPeopleCoreService,
  | 'createContactPoint'
  | 'createContactPointLink'
  | 'createPerson'
  | 'createResolverReview'
  | 'listContactPointsByNormalizedValue'
  | 'listCurrentContactPointLinks'
  | 'listResolverReviews'
>;

export type ConnectShyftPeopleCoreIdentityCandidateLookup =
  ConnectShyftPeopleCoreIdentityLookupSnapshot & {
    tenantNeighbors: ConnectShyftIdentityBoundaryNeighbor[];
  };

type ConnectShyftPeopleCoreLookupData = Pick<
  ConnectShyftPeopleCoreIdentityCandidateLookup,
  'peopleCoreAvailable' | 'peopleCoreContactPoints' | 'peopleCoreCurrentLinks'
>;

const normalizeContactPointValue = (contactPointValue: string): string | null => {
  const resolved = normalizePhone(
    contactPointValue.trim(),
    resolveConnectShyftPhoneNormalizationContext('user_entered'),
  );

  return resolved.ok ? resolved.phone.normalizedE164 : null;
};

const emptyPeopleCoreLookup = (): ConnectShyftPeopleCoreLookupData => ({
  peopleCoreAvailable: false,
  peopleCoreContactPoints: [] as ConnectShyftPeopleCoreIdentityCandidateLookup['peopleCoreContactPoints'],
  peopleCoreCurrentLinks: [] as ConnectShyftPeopleCoreIdentityCandidateLookup['peopleCoreCurrentLinks'],
});

const AMBIGUOUS_IDENTITY_MATCH_MESSAGE =
  'Identity match is ambiguous and requires manual resolution.';
const AMBIGUOUS_IDENTITY_MATCH_GUIDANCE =
  'Multiple identities share this contact point. Resolve manually before any merge.';

const uniqueSortedStrings = (values: string[]): string[] =>
  Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((left, right) =>
    left.localeCompare(right));

const collectDistinctCurrentPersonIds = (
  lookup: ConnectShyftPeopleCoreIdentityCandidateLookup,
): string[] =>
  uniqueSortedStrings(
    lookup.peopleCoreCurrentLinks
      .filter((link) => link.subjectType === 'person' && link.isCurrent !== false)
      .map((link) => link.subjectId),
  );

const buildManualResolutionContext = (
  candidateNeighborIds: string[],
): ConnectShyftIdentityBoundaryManualResolutionContext => ({
  required: true,
  reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
  nextAction: 'manual-merge',
  mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
  candidateNeighborIds,
  guidance: AMBIGUOUS_IDENTITY_MATCH_GUIDANCE,
});

const buildForcedAmbiguousDecision = (
  legacyDecision: ConnectShyftIdentityBoundaryDecision,
): ConnectShyftIdentityBoundaryDecision => {
  const candidateNeighborIds = uniqueSortedStrings([
    ...legacyDecision.candidateNeighborIds,
    ...(legacyDecision.manualResolution?.candidateNeighborIds || []),
  ]);
  const manualResolution = buildManualResolutionContext(candidateNeighborIds);

  return {
    decision: 'AMBIGUOUS',
    reason: 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES',
    autoMergeAllowed: false,
    contactPoint: legacyDecision.contactPoint,
    matchedNeighborId: null,
    candidateCount: candidateNeighborIds.length,
    candidateNeighborIds,
    exactMatches: legacyDecision.exactMatches,
    manualResolution,
  };
};

const collectExactMatchNeighborIds = (
  neighbors: ConnectShyftIdentityBoundaryNeighbor[],
  normalizedContactPointValue: string | null,
): string[] => {
  if (!normalizedContactPointValue) {
    return [];
  }

  return uniqueSortedStrings(
    neighbors
      .filter((neighbor) =>
        neighbor.phones.some((phone) => phone.value === normalizedContactPointValue))
      .map((neighbor) => neighbor.neighborId),
  );
};

const hasLegacySameSubjectProof = (
  lookup: ConnectShyftPeopleCoreIdentityCandidateLookup,
  legacyDecision: ConnectShyftIdentityBoundaryDecision,
): boolean => {
  const legacyCandidateNeighborIds = uniqueSortedStrings(legacyDecision.candidateNeighborIds);
  if (legacyCandidateNeighborIds.length !== 1) {
    return false;
  }

  const tenantExactMatchNeighborIds = collectExactMatchNeighborIds(
    lookup.tenantNeighbors,
    lookup.normalizedContactPointValue,
  );

  return tenantExactMatchNeighborIds.length === 1
    && tenantExactMatchNeighborIds[0] === legacyCandidateNeighborIds[0];
};

const resolveAmbiguityReasonCode = (
  lookup: ConnectShyftPeopleCoreIdentityCandidateLookup | null,
  legacyResult: ConnectShyftIdentityBoundaryResult,
): ConnectShyftIdentityAmbiguityReasonCode => {
  if (!legacyResult.ok && legacyResult.code === 'IDENTITY_MATCH_AMBIGUOUS') {
    return 'IDENTITY_MATCH_AMBIGUOUS';
  }

  const currentPersonIds = lookup ? collectDistinctCurrentPersonIds(lookup) : [];
  if (currentPersonIds.length > 1) {
    return 'PEOPLECORE_MULTI_CURRENT_LINKS';
  }

  return 'PEOPLECORE_LEGACY_DISAGREEMENT';
};

export class AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter
{
  private readonly hooks: ConnectShyftPeopleCoreIdentityHooks;

  constructor(
    private readonly loadNeighborsByTenant: (
      tenantId: string,
    ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
    private readonly loadNeighborsByNormalizedContactPoint?: (
      tenantId: string,
      normalizedContactPointValue: string,
    ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
    private readonly peopleCoreService: PeopleCoreIdentityLookupService = peopleCoreServiceAsync,
  ) {
    this.hooks = new ConnectShyftPeopleCoreIdentityHooks(this.peopleCoreService);
  }

  private async loadFallbackCandidates(
    tenantId: string,
    normalizedContactPointValue: string,
  ): Promise<ConnectShyftIdentityBoundaryNeighbor[]> {
    if (this.loadNeighborsByNormalizedContactPoint) {
      return this.loadNeighborsByNormalizedContactPoint(tenantId, normalizedContactPointValue);
    }

    return this.loadNeighborsByTenant(tenantId);
  }

  private async loadPeopleCoreLookup(input: {
    tenantId: string;
    normalizedContactPointValue: string;
  }): Promise<ConnectShyftPeopleCoreLookupData> {
    try {
      const peopleCoreContactPoints = await this.peopleCoreService.listContactPointsByNormalizedValue({
        tenantId: input.tenantId,
        type: 'phone',
        normalizedValue: input.normalizedContactPointValue,
      });

      const peopleCoreCurrentLinks = (
        await Promise.all(
          peopleCoreContactPoints.map((contactPoint) =>
            this.peopleCoreService.listCurrentContactPointLinks({
              tenantId: input.tenantId,
              contactPointId: contactPoint.id,
            })),
        )
      ).flat();

      return {
        peopleCoreAvailable: true,
        peopleCoreContactPoints,
        peopleCoreCurrentLinks,
      };
    } catch (error) {
      if (error instanceof Error) {
        return emptyPeopleCoreLookup();
      }

      throw error;
    }
  }

  async evaluateIdentityCandidatesForContactPoint(input: {
    tenantId: string;
    contactPointValue: string;
  }): Promise<ConnectShyftPeopleCoreIdentityCandidateLookup> {
    const normalizedContactPointValue = normalizeContactPointValue(input.contactPointValue);

    if (!normalizedContactPointValue) {
      return {
        normalizedContactPointValue: null,
        ...emptyPeopleCoreLookup(),
        tenantNeighbors: [],
        candidateNeighbors: [],
      };
    }

    return this.evaluateIdentityCandidatesByNormalizedContactPoint({
      tenantId: input.tenantId,
      normalizedContactPointValue,
    });
  }

  async evaluateIdentityCandidatesByNormalizedContactPoint(input: {
    tenantId: string;
    normalizedContactPointValue: string;
  }): Promise<ConnectShyftPeopleCoreIdentityCandidateLookup> {
    const peopleCoreLookup = await this.loadPeopleCoreLookup(input);
    const tenantNeighbors = await this.loadNeighborsByTenant(input.tenantId);
    const candidateNeighbors = await this.loadFallbackCandidates(
      input.tenantId,
      input.normalizedContactPointValue,
    );

    return {
      normalizedContactPointValue: input.normalizedContactPointValue,
      ...peopleCoreLookup,
      tenantNeighbors,
      candidateNeighbors,
    };
  }

  async evaluateMatch(
    input: ConnectShyftIdentityBoundaryRequest,
  ): Promise<ConnectShyftIdentityBoundaryResult> {
    const normalizedContactPointValue = normalizeContactPointValue(input.contactPoint.value);
    const lookup = normalizedContactPointValue
      ? await this.evaluateIdentityCandidatesByNormalizedContactPoint({
        tenantId: input.tenantId,
        normalizedContactPointValue,
      })
      : null;
    const legacyResult = evaluateConnectShyftIdentityBoundary(
      input,
      lookup?.candidateNeighbors || [],
    );
    const result = this.applyPeopleCoreAuthorityPolicy(lookup, legacyResult);

    try {
      await this.persistAmbiguityEventIfNeeded(input, lookup, legacyResult, result);
    } catch (error) {
      const ambiguityReasonCode = resolveAmbiguityReasonCode(lookup, legacyResult);
      const sourceContext = input.hookContext?.triggerSourceType || 'connectshyft_identity_seam';
      const idempotencyKey = result.data?.idempotency.key || input.idempotencyKey || null;
      logger.warn('ConnectShyft identity ambiguity event persistence failed', {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId || null,
        normalizedContactPoint: result.data?.identityMatch?.contactPoint.value || normalizedContactPointValue,
        ambiguityReasonCode,
        sourceContext,
        correlationId: null,
        idempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (lookup) {
      try {
        await this.hooks.applyIdentityHooks(input, result, lookup);
      } catch (_error) {
        // Hook writes are intentionally best-effort so current ConnectShyft behavior remains stable.
      }
    }

    return result;
  }

  private async persistAmbiguityEventIfNeeded(
    input: ConnectShyftIdentityBoundaryRequest,
    lookup: ConnectShyftPeopleCoreIdentityCandidateLookup | null,
    legacyResult: ConnectShyftIdentityBoundaryResult,
    result: ConnectShyftIdentityBoundaryResult,
  ): Promise<void> {
    if (result.ok || result.code !== 'IDENTITY_MATCH_AMBIGUOUS' || !result.data?.identityMatch) {
      return;
    }

    const identityMatch = result.data.identityMatch;
    await createIdentityAmbiguityEvent({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId || null,
      sourceContext: input.hookContext?.triggerSourceType || 'connectshyft_identity_seam',
      sourceContextId: input.hookContext?.triggerSourceId || result.data.idempotency.key,
      normalizedContactPoint: identityMatch.contactPoint.value,
      contactPointType: 'phone',
      candidateNeighborIds: [...identityMatch.candidateNeighborIds],
      candidateCount: identityMatch.candidateCount,
      ambiguityReasonCode: resolveAmbiguityReasonCode(lookup, legacyResult),
      requestedByUserId: input.hookContext?.requestedByUserId || null,
      correlationId: null,
      idempotencyKey: result.data.idempotency.key,
    });
  }

  private applyPeopleCoreAuthorityPolicy(
    lookup: ConnectShyftPeopleCoreIdentityCandidateLookup | null,
    legacyResult: ConnectShyftIdentityBoundaryResult,
  ): ConnectShyftIdentityBoundaryResult {
    if (!lookup?.peopleCoreAvailable) {
      return legacyResult;
    }

    const currentPersonIds = collectDistinctCurrentPersonIds(lookup);
    if (currentPersonIds.length === 0) {
      return legacyResult;
    }

    if (currentPersonIds.length > 1) {
      return this.forceLegacyResultToAmbiguous(legacyResult);
    }

    if (
      legacyResult.ok
      && legacyResult.code === 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED'
      && !hasLegacySameSubjectProof(lookup, legacyResult.data.identityMatch)
    ) {
      // Checkpoint 2 intentionally treats current PeopleCore evidence as sufficient to block
      // a silent legacy winner until a real same-subject proof exists.
      return this.forceLegacyResultToAmbiguous(legacyResult);
    }

    return legacyResult;
  }

  private forceLegacyResultToAmbiguous(
    legacyResult: ConnectShyftIdentityBoundaryResult,
  ): ConnectShyftIdentityBoundaryResult {
    if (!legacyResult.data?.idempotency || !legacyResult.data.identityMatch) {
      return legacyResult;
    }

    const identityMatch = buildForcedAmbiguousDecision(legacyResult.data.identityMatch);

    return {
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      message: AMBIGUOUS_IDENTITY_MATCH_MESSAGE,
      data: {
        identityMatch,
        manualResolution: identityMatch.manualResolution,
        idempotency: legacyResult.data.idempotency,
      },
    };
  }
}
