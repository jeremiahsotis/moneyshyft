import { normalizePhone } from '../../../../../../domains/communication';
import { AsyncPeopleCoreService } from '../../peoplecore/service';
import {
  evaluateConnectShyftIdentityBoundary,
  type ConnectShyftIdentityBoundaryNeighbor,
} from '../identityBoundary';
import { KnexConnectShyftNeighborStore } from '../neighbors';

const DEFAULT_PHONE_COUNTRY = 'US';
const INTERNAL_ACTOR_ROLES = ['SYSTEM_ADMIN'] as const;

type ConnectShyftPeopleCoreLookup = {
  peopleCoreAvailable: boolean;
  currentPersonIds: string[];
};

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

const normalizeOptionalEnvValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
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

const buildPhoneNormalizationContext = () => ({
  defaultCountry:
    normalizeOptionalEnvValue(process.env.CONNECTSHYFT_PHONE_DEFAULT_COUNTRY)
    || DEFAULT_PHONE_COUNTRY,
  defaultAreaCode: normalizeOptionalEnvValue(process.env.CONNECTSHYFT_PHONE_DEFAULT_AREA_CODE),
  source: 'user_entered' as const,
});

const collectExactMatchNeighborIds = (
  neighbors: ConnectShyftIdentityBoundaryNeighbor[],
  normalizedPhone: string,
): string[] =>
  uniqueSortedStrings(
    neighbors
      .filter((neighbor) => neighbor.phones.some((phone) => phone.value === normalizedPhone))
      .map((neighbor) => neighbor.neighborId),
  );

const loadPeopleCoreLookup = async (input: {
  tenantId: string;
  normalizedPhone: string;
}): Promise<ConnectShyftPeopleCoreLookup> => {
  const peopleCoreService = new AsyncPeopleCoreService();

  try {
    const contactPoints = await peopleCoreService.listContactPointsByNormalizedValue({
      tenantId: input.tenantId,
      type: 'phone',
      normalizedValue: input.normalizedPhone,
    });

    const currentLinks = (
      await Promise.all(
        contactPoints.map((contactPoint) =>
          peopleCoreService.listCurrentContactPointLinks({
            tenantId: input.tenantId,
            contactPointId: contactPoint.id,
            subjectType: 'person',
          })),
      )
    ).flat();

    return {
      peopleCoreAvailable: true,
      currentPersonIds: uniqueSortedStrings(
        currentLinks
          .filter((link) => link.isCurrent !== false && link.subjectType === 'person')
          .map((link) => link.subjectId),
      ),
    };
  } catch (_error) {
    return {
      peopleCoreAvailable: false,
      currentPersonIds: [],
    };
  }
};

const mapLegacyResultToVisibility = (input: {
  phone: string;
  legacyResult: ReturnType<typeof evaluateConnectShyftIdentityBoundary>;
}): ConnectShyftIdentityVisibility => {
  if (!input.legacyResult.ok) {
    return {
      phone: input.phone,
      resolution: 'ambiguous',
      source: 'legacy',
      candidates: buildCandidateConfidenceList(
        input.legacyResult.data?.identityMatch?.candidateNeighborIds || [],
      ),
    };
  }

  const selectedId = input.legacyResult.data.identityMatch.matchedNeighborId || undefined;
  return {
    phone: input.phone,
    resolution: selectedId ? 'single_match' : 'no_match',
    source: 'legacy',
    ...(selectedId ? { selectedId } : {}),
  };
};

export const readConnectShyftIdentityVisibility = async (input: {
  tenantId: string;
  orgUnitId: string;
  phone: string;
}): Promise<ConnectShyftIdentityVisibilityReadResult> => {
  const normalizedPhone = normalizePhone(
    input.phone.trim(),
    buildPhoneNormalizationContext(),
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

  const neighborStore = new KnexConnectShyftNeighborStore();
  const normalizedValue = normalizedPhone.phone.normalizedE164;
  const [peopleCoreLookup, candidateNeighbors, tenantNeighbors] = await Promise.all([
    loadPeopleCoreLookup({
      tenantId: input.tenantId,
      normalizedPhone: normalizedValue,
    }),
    neighborStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
      input.tenantId,
      normalizedValue,
    ),
    neighborStore.listActiveIdentityBoundaryNeighborsByTenant(input.tenantId),
  ]);

  const legacyResult = evaluateConnectShyftIdentityBoundary({
    actorRoles: [...INTERNAL_ACTOR_ROLES],
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    contactPoint: {
      label: 'mobile',
      value: normalizedValue,
      isShared: false,
      verificationStatus: 'verified',
    },
  }, candidateNeighbors);

  const legacyCandidateIds = legacyResult.ok
    ? uniqueSortedStrings(legacyResult.data.identityMatch.candidateNeighborIds)
    : uniqueSortedStrings(legacyResult.data?.identityMatch?.candidateNeighborIds || []);
  const tenantExactMatchNeighborIds = collectExactMatchNeighborIds(tenantNeighbors, normalizedValue);
  const peopleCoreForcesAmbiguous = peopleCoreLookup.peopleCoreAvailable
    && (
      peopleCoreLookup.currentPersonIds.length > 1
      || (
        peopleCoreLookup.currentPersonIds.length === 1
        && legacyResult.ok
        && legacyResult.code === 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED'
        && !(
          legacyCandidateIds.length === 1
          && tenantExactMatchNeighborIds.length === 1
          && tenantExactMatchNeighborIds[0] === legacyCandidateIds[0]
        )
      )
    );

  if (peopleCoreForcesAmbiguous) {
    return {
      ok: true,
      data: {
        phone: normalizedValue,
        resolution: 'ambiguous',
        source: 'peoplecore',
        candidates: buildCandidateConfidenceList(legacyCandidateIds),
      },
    };
  }

  return {
    ok: true,
    data: mapLegacyResultToVisibility({
      phone: normalizedValue,
      legacyResult,
    }),
  };
};
