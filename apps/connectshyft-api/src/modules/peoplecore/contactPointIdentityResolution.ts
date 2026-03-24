import type {
  ContactPoint,
  ContactPointLink,
  Household,
  HouseholdMembership,
  Person,
  ResolverReview,
  ResolverReviewStatus,
  ResolverRiskFlag,
} from '@shyft/contracts';
import {
  AsyncPeopleCoreService,
  peopleCoreServiceAsync,
} from './service';
import {
  assignConfidenceBand,
} from './confidenceBand';
import {
  scoreIdentityCandidates,
  type ScoreContext,
} from './identityScoring';

export type PeopleCoreIdentityCandidateGenerationReason =
  | 'current_person_link'
  | 'current_household_link'
  | 'historical_person_link'
  | 'historical_household_link'
  | 'current_household_member';

export type PeopleCoreIdentityResolutionOutcome = 'canonical' | 'provisional' | 'resolver_required';

export interface PeopleCoreGeneratedIdentityCandidate {
  subjectType: 'person' | 'household';
  subjectId: string;
  generationReason: PeopleCoreIdentityCandidateGenerationReason;
  directness: 'direct' | 'indirect';
  recencyHint: 'current' | 'historical';
  supportingLinkIds: string[];
}

export interface PeopleCoreScoredIdentityCandidate extends PeopleCoreGeneratedIdentityCandidate {
  score: number;
  confidenceBand: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  scoreReasons: string[];
  riskFlags: ResolverRiskFlag[];
  contactPointStatus: ContactPoint['status'];
}

export interface ResolveInboundContactPointIdentityInput {
  tenantId: string;
  orgUnitId: string;
  normalizedContactPointValue: string;
  rawContactPointValue: string;
  contactPointType: 'phone';
  eventSource: string;
  relatedObjectType: string;
  relatedObjectId: string;
  requestedByUserId: string | null;
}

export interface ResolveInboundContactPointIdentityResult {
  outcome: PeopleCoreIdentityResolutionOutcome;
  confidenceBand: PeopleCoreScoredIdentityCandidate['confidenceBand'];
  contactPointStatus: ContactPoint['status'];
  personId: string;
  contactPointId: string;
  contactPointEventId: string;
  provisionalPersonId: string | null;
  resolverReviewId: string | null;
  candidates: PeopleCoreScoredIdentityCandidate[];
  selectedCandidatePersonId: string | null;
}

type PeopleCoreIdentityResolutionService = Pick<
  AsyncPeopleCoreService,
  | 'appendContactPointEvent'
  | 'createContactPoint'
  | 'createContactPointLink'
  | 'createPerson'
  | 'createResolverReview'
  | 'getHousehold'
  | 'getPerson'
  | 'listContactPointEvents'
  | 'listContactPointLinks'
  | 'listContactPointsByNormalizedValue'
  | 'listHouseholdMemberships'
  | 'listResolverReviews'
>;

const DEFAULT_REQUESTED_BY_USER_ID = 'system-connectshyft-identity-seam';
const UNIQUE_VIOLATION_CODE = '23505';
const ACTIVE_PERSON_STATUSES = new Set<Person['status']>([
  'active_confirmed',
  'active_provisional',
]);
const ACTIVE_HOUSEHOLD_STATUSES = new Set<Household['status']>(['active']);
const ATTACHABLE_CONFIDENCE_BANDS = new Set<PeopleCoreScoredIdentityCandidate['confidenceBand']>([
  'low',
  'medium',
  'high',
]);
const PENDING_RESOLVER_REVIEW_STATUSES = new Set<ResolverReviewStatus>([
  'pending',
  'queued',
  'in_review',
  'waiting_for_more_info',
]);
const MAX_SCORING_CANDIDATES = 10;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const nowIsoUtc = (): string => new Date().toISOString();

const isUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: string }).code === UNIQUE_VIOLATION_CODE;
};

const uniqueStrings = (values: Iterable<string>): string[] =>
  Array.from(new Set(Array.from(values).filter((value) => value.length > 0)));

const appendUnique = (target: string[], values: Iterable<string>): string[] => {
  const merged = new Set(target);
  Array.from(values).forEach((value) => {
    if (value.length > 0) {
      merged.add(value);
    }
  });

  return Array.from(merged);
};

const isActivePerson = (person: Person | undefined): boolean =>
  Boolean(person && ACTIVE_PERSON_STATUSES.has(person.status));

const isActiveHousehold = (household: Household | undefined): boolean =>
  Boolean(household && ACTIVE_HOUSEHOLD_STATUSES.has(household.status));

const assertResolveInboundContactPointIdentityInput = (
  input: ResolveInboundContactPointIdentityInput,
): void => {
  if (!normalizeString(input.tenantId)) {
    throw new Error('ResolveInboundContactPointIdentityInput requires tenantId.');
  }
  if (!normalizeString(input.orgUnitId)) {
    throw new Error('ResolveInboundContactPointIdentityInput requires orgUnitId.');
  }
  if (!normalizeString(input.normalizedContactPointValue)) {
    throw new Error('ResolveInboundContactPointIdentityInput requires normalizedContactPointValue.');
  }
};

const addCandidate = (
  candidates: PeopleCoreGeneratedIdentityCandidate[],
  seen: Map<string, number>,
  candidate: PeopleCoreGeneratedIdentityCandidate,
): void => {
  const key = `${candidate.subjectType}:${candidate.subjectId}`;
  const existingIndex = seen.get(key);
  if (existingIndex !== undefined) {
    const existing = candidates[existingIndex];
    existing.supportingLinkIds = appendUnique(existing.supportingLinkIds, candidate.supportingLinkIds);
    return;
  }

  seen.set(key, candidates.length);
  candidates.push({
    ...candidate,
    supportingLinkIds: uniqueStrings(candidate.supportingLinkIds),
  });
};

const loadPeopleCoreIdentitySnapshotAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: {
    tenantId: string;
    contactPointId: string;
  },
): Promise<{
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  persons: Person[];
  households: Household[];
}> => {
  const [currentLinks, historicalLinks] = await Promise.all([
    service.listContactPointLinks({
      tenantId: input.tenantId,
      contactPointId: input.contactPointId,
      isCurrent: true,
    }),
    service.listContactPointLinks({
      tenantId: input.tenantId,
      contactPointId: input.contactPointId,
      isCurrent: false,
    }),
  ]);

  const householdIds = uniqueStrings(
    [...currentLinks, ...historicalLinks]
      .filter((link) => link.subjectType === 'household')
      .map((link) => link.subjectId),
  );
  const directPersonIds = uniqueStrings(
    [...currentLinks, ...historicalLinks]
      .filter((link) => link.subjectType === 'person')
      .map((link) => link.subjectId),
  );

  const householdMemberships = (
    await Promise.all([
      ...householdIds.map((householdId) =>
        service.listHouseholdMemberships({
          tenantId: input.tenantId,
          householdId,
          isCurrent: true,
        })),
      ...directPersonIds.map((personId) =>
        service.listHouseholdMemberships({
          tenantId: input.tenantId,
          personId,
          isCurrent: true,
        })),
    ])
  ).flat();

  const personIds = uniqueStrings([
    ...directPersonIds,
    ...householdMemberships.map((membership) => membership.personId),
  ]);
  const householdIdsForLoad = uniqueStrings([
    ...householdIds,
    ...householdMemberships.map((membership) => membership.householdId),
  ]);

  const [persons, households] = await Promise.all([
    Promise.all(personIds.map((personId) => service.getPerson({
      tenantId: input.tenantId,
      personId,
    }))),
    Promise.all(householdIdsForLoad.map((householdId) => service.getHousehold({
      tenantId: input.tenantId,
      householdId,
    }))),
  ]);

  return {
    currentLinks,
    historicalLinks,
    householdMemberships: householdMemberships.filter((membership, index, collection) =>
      collection.findIndex((candidate) => candidate.id === membership.id) === index),
    persons: persons.filter((person): person is Person => Boolean(person)),
    households: households.filter((household): household is Household => Boolean(household)),
  };
};

const findOrCreateContactPointAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
): Promise<ContactPoint> => {
  const existing = await service.listContactPointsByNormalizedValue({
    tenantId: input.tenantId,
    type: input.contactPointType,
    normalizedValue: input.normalizedContactPointValue,
  });
  if (existing[0]) {
    return existing[0];
  }

  const observedAt = nowIsoUtc();

  try {
    return await service.createContactPoint({
      tenantId: input.tenantId,
      type: input.contactPointType,
      normalizedValue: input.normalizedContactPointValue,
      rawValue: input.rawContactPointValue,
      status: 'active_personal',
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      lastInboundAt: observedAt,
      suspectedShared: false,
      confirmedShared: false,
      reassignmentSuspected: false,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const reloaded = await service.listContactPointsByNormalizedValue({
      tenantId: input.tenantId,
      type: input.contactPointType,
      normalizedValue: input.normalizedContactPointValue,
    });
    if (reloaded[0]) {
      return reloaded[0];
    }

    throw error;
  }
};

const getOrCreateInboundSeenEventAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
  contactPoint: ContactPoint,
) => {
  const existingEvents = await service.listContactPointEvents({
    tenantId: input.tenantId,
    contactPointId: contactPoint.id,
    limit: 200,
  });
  const existing = existingEvents.find((event) =>
    event.eventType === 'inbound_seen'
    && normalizeString(event.relatedObjectType) === normalizeString(input.relatedObjectType)
    && normalizeString(event.relatedObjectId) === normalizeString(input.relatedObjectId));

  if (existing) {
    return existing;
  }

  return service.appendContactPointEvent({
    tenantId: input.tenantId,
    contactPointId: contactPoint.id,
    eventType: 'inbound_seen',
    eventSource: input.eventSource,
    relatedObjectType: input.relatedObjectType,
    relatedObjectId: input.relatedObjectId,
  });
};

const findExistingPendingResolverReviewAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
): Promise<ResolverReview | null> => {
  const existingReviews = await service.listResolverReviews({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
  });

  return existingReviews.find((review) =>
    review.triggerSourceType === 'contact_point_resolution'
    && review.triggerSourceId === input.relatedObjectId
    && PENDING_RESOLVER_REVIEW_STATUSES.has(review.reviewStatus)) || null;
};

const createProvisionalPersonAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
  contactPoint: ContactPoint,
): Promise<string> => {
  const provisionalPerson = await service.createPerson({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    firstName: 'Unknown',
    lastName: 'Contact',
    status: 'active_provisional',
  });

  await service.createContactPointLink({
    tenantId: input.tenantId,
    contactPointId: contactPoint.id,
    subjectType: 'person',
    subjectId: provisionalPerson.id,
    linkType: 'unknown',
    confidenceBand: 'low',
    isCurrent: true,
    isPrimary: true,
    manuallyConfirmed: false,
    firstLinkedAt: nowIsoUtc(),
    linkedBy: 'system',
  });

  return provisionalPerson.id;
};

const attachContactPointToPersonAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: {
    tenantId: string;
    contactPoint: ContactPoint;
    personId: string;
    confidenceBand: PeopleCoreScoredIdentityCandidate['confidenceBand'];
    currentLinks: ContactPointLink[];
  },
): Promise<void> => {
  const currentPersonLinks = input.currentLinks.filter((link) =>
    link.subjectType === 'person' && link.isCurrent);

  if (currentPersonLinks.some((link) => link.subjectId === input.personId)) {
    return;
  }

  if (currentPersonLinks.length > 0) {
    return;
  }

  try {
    await service.createContactPointLink({
      tenantId: input.tenantId,
      contactPointId: input.contactPoint.id,
      subjectType: 'person',
      subjectId: input.personId,
      linkType: 'primary',
      confidenceBand: input.confidenceBand,
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: false,
      firstLinkedAt: nowIsoUtc(),
      linkedBy: 'system',
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }
};

const getOrCreateResolverReviewAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
  contactPoint: ContactPoint,
  provisionalPersonId: string,
  scoredCandidates: PeopleCoreScoredIdentityCandidate[],
  confidenceBand: PeopleCoreScoredIdentityCandidate['confidenceBand'],
): Promise<string | null> => {
  const existing = await findExistingPendingResolverReviewAsync(service, input);

  if (existing) {
    return existing.id;
  }

  const candidatePersonIds = uniqueStrings(
    scoredCandidates
      .filter((candidate) => candidate.subjectType === 'person')
      .map((candidate) => candidate.subjectId),
  );
  const topCandidate = scoredCandidates[0];
  const confidenceReasons = topCandidate
    ? [...topCandidate.scoreReasons, 'Resolver review required because inbound identity is not decisive.']
    : ['Resolver review required because inbound identity is not decisive.'];
  const riskFlags: ResolverRiskFlag[] = Array.from(new Set([
    ...(topCandidate?.riskFlags || []),
    ...(confidenceBand === 'very_high' ? ['high_confidence_override_attempt' as const] : []),
  ]));

  const review = await service.createResolverReview({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    reviewType: 'identity_conflict',
    reviewStatus: 'pending',
    priority: 'normal',
    triggerSourceType: 'contact_point_resolution',
    triggerSourceId: input.relatedObjectId,
    provisionalPersonId,
    candidatePersonIds,
    contactPointId: contactPoint.id,
    confidenceBand,
    confidenceReasons,
    riskFlags,
    requestedByUserId: normalizeString(input.requestedByUserId) || DEFAULT_REQUESTED_BY_USER_ID,
    requestedAt: nowIsoUtc(),
  });

  return review.id;
};

export function generatePeopleCoreIdentityCandidates(input: {
  contactPoint: ContactPoint;
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  persons: Person[];
  households: Household[];
}): PeopleCoreGeneratedIdentityCandidate[] {
  const candidates: PeopleCoreGeneratedIdentityCandidate[] = [];
  const seen = new Map<string, number>();
  const personById = new Map(input.persons.map((person) => [person.id, person]));
  const householdById = new Map(input.households.map((household) => [household.id, household]));
  const membershipsByHouseholdId = new Map<string, HouseholdMembership[]>();

  input.householdMemberships.forEach((membership) => {
    const existing = membershipsByHouseholdId.get(membership.householdId) || [];
    existing.push(membership);
    membershipsByHouseholdId.set(membership.householdId, existing);
  });

  const currentPersonLinks = input.currentLinks.filter((link) =>
    link.subjectType === 'person' && isActivePerson(personById.get(link.subjectId)));
  const currentHouseholdLinks = input.currentLinks.filter((link) =>
    link.subjectType === 'household' && isActiveHousehold(householdById.get(link.subjectId)));
  const historicalPersonLinks = currentPersonLinks.length === 0
    ? input.historicalLinks.filter((link) =>
      link.subjectType === 'person' && isActivePerson(personById.get(link.subjectId)))
    : [];
  const historicalHouseholdLinks = currentHouseholdLinks.length === 0
    ? input.historicalLinks.filter((link) =>
      link.subjectType === 'household' && Boolean(householdById.get(link.subjectId)))
    : [];

  currentPersonLinks.forEach((link) => {
    addCandidate(candidates, seen, {
      subjectType: 'person',
      subjectId: link.subjectId,
      generationReason: 'current_person_link',
      directness: 'direct',
      recencyHint: 'current',
      supportingLinkIds: [link.id],
    });
  });

  currentHouseholdLinks.forEach((link) => {
    addCandidate(candidates, seen, {
      subjectType: 'household',
      subjectId: link.subjectId,
      generationReason: 'current_household_link',
      directness: 'direct',
      recencyHint: 'current',
      supportingLinkIds: [link.id],
    });
  });

  historicalPersonLinks.forEach((link) => {
    addCandidate(candidates, seen, {
      subjectType: 'person',
      subjectId: link.subjectId,
      generationReason: 'historical_person_link',
      directness: 'direct',
      recencyHint: 'historical',
      supportingLinkIds: [link.id],
    });
  });

  historicalHouseholdLinks.forEach((link) => {
    addCandidate(candidates, seen, {
      subjectType: 'household',
      subjectId: link.subjectId,
      generationReason: 'historical_household_link',
      directness: 'direct',
      recencyHint: 'historical',
      supportingLinkIds: [link.id],
    });
  });

  currentHouseholdLinks.forEach((link) => {
    const memberships = membershipsByHouseholdId.get(link.subjectId) || [];
    memberships
      .filter((membership) => membership.isCurrent)
      .filter((membership) => isActivePerson(personById.get(membership.personId)))
      .forEach((membership) => {
        addCandidate(candidates, seen, {
          subjectType: 'person',
          subjectId: membership.personId,
          generationReason: 'current_household_member',
          directness: 'indirect',
          recencyHint: 'current',
          supportingLinkIds: [link.id],
        });
      });
  });

  return candidates;
}

export function scorePeopleCoreIdentityCandidates(input: {
  contactPoint: ContactPoint;
  candidates: PeopleCoreGeneratedIdentityCandidate[];
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  asOfUtc: string;
}): PeopleCoreScoredIdentityCandidate[] {
  const currentPersonLinkCount = input.currentLinks.filter((link) => link.subjectType === 'person').length;
  const scoreContext: ScoreContext = {
    contactPoint: {
      status: input.contactPoint.status,
      confirmedShared: input.contactPoint.confirmedShared,
      reassignmentSuspected: input.contactPoint.reassignmentSuspected,
    },
    contactPointStatus: input.contactPoint.status,
    currentLinkCount: currentPersonLinkCount,
    currentLinks: input.currentLinks,
    historicalLinks: input.historicalLinks,
    householdMemberships: input.householdMemberships,
    recentActivity: uniqueStrings([
      ...input.currentLinks.map((link) => normalizeString(link.lastUsedAt)),
      ...input.historicalLinks.map((link) => normalizeString(link.lastUsedAt)),
    ]),
    recentConfirmation: uniqueStrings([
      ...input.currentLinks.map((link) => normalizeString(link.lastConfirmedAt)),
      ...input.historicalLinks.map((link) => normalizeString(link.lastConfirmedAt)),
    ]),
    asOfUtc: input.asOfUtc,
  };

  return scoreIdentityCandidates(input.candidates, scoreContext)
    .map((candidate) => ({
      ...candidate,
      contactPointStatus: input.contactPoint.status,
      confidenceBand: assignConfidenceBand(
        candidate.score,
        input.contactPoint.status,
        currentPersonLinkCount > 1,
      ),
      scoreReasons: candidate.confidenceReasons,
      riskFlags: candidate.riskFlags,
    }));
}

async function resolveInboundContactPointIdentityWithServiceAsync(
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
): Promise<ResolveInboundContactPointIdentityResult> {
  assertResolveInboundContactPointIdentityInput(input);
  const contactPoint = await findOrCreateContactPointAsync(service, input);
  if (!normalizeString(contactPoint.id)) {
    throw new Error('Resolved ContactPoint must include an id.');
  }
  const contactPointEvent = await getOrCreateInboundSeenEventAsync(service, input, contactPoint);
  const snapshot = await loadPeopleCoreIdentitySnapshotAsync(service, {
    tenantId: input.tenantId,
    contactPointId: contactPoint.id,
  });
  const generatedCandidates = generatePeopleCoreIdentityCandidates({
    contactPoint,
    currentLinks: snapshot.currentLinks,
    historicalLinks: snapshot.historicalLinks,
    householdMemberships: snapshot.householdMemberships,
    persons: snapshot.persons,
    households: snapshot.households,
  });
  const candidates = scorePeopleCoreIdentityCandidates({
    contactPoint,
    candidates: generatedCandidates.slice(0, MAX_SCORING_CANDIDATES),
    currentLinks: snapshot.currentLinks,
    historicalLinks: snapshot.historicalLinks,
    householdMemberships: snapshot.householdMemberships,
    asOfUtc: nowIsoUtc(),
  });

  const topCandidate = candidates[0];
  const nextCandidate = candidates[1];
  const selectedCandidatePersonId = candidates.find((candidate) => candidate.subjectType === 'person')?.subjectId || null;
  const finalBand = topCandidate
    ? assignConfidenceBand(
      topCandidate.score,
      contactPoint.status,
      snapshot.currentLinks.filter((link) => link.subjectType === 'person').length > 1,
    )
    : 'very_low';
  const isTie = Boolean(topCandidate && nextCandidate && topCandidate.score - nextCandidate.score < 20);

  let outcome: PeopleCoreIdentityResolutionOutcome;
  if (!topCandidate || finalBand === 'very_low') {
    outcome = 'provisional';
  } else if (
    topCandidate.subjectType !== 'person'
    || isTie
    || finalBand === 'very_high'
  ) {
    outcome = 'resolver_required';
  } else if (ATTACHABLE_CONFIDENCE_BANDS.has(finalBand)) {
    outcome = 'canonical';
  } else {
    outcome = 'resolver_required';
  }

  let personId = selectedCandidatePersonId;
  let provisionalPersonId: string | null = null;
  let resolverReviewId: string | null = null;

  if (outcome === 'canonical' && topCandidate?.subjectType === 'person') {
    await attachContactPointToPersonAsync(service, {
      tenantId: input.tenantId,
      contactPoint,
      personId: topCandidate.subjectId,
      confidenceBand: finalBand,
      currentLinks: snapshot.currentLinks,
    });
    personId = topCandidate.subjectId;
  }

  if (outcome === 'resolver_required') {
    const existingReview = await findExistingPendingResolverReviewAsync(service, input);
    if (existingReview?.provisionalPersonId) {
      resolverReviewId = existingReview.id;
      provisionalPersonId = existingReview.provisionalPersonId;
      personId = existingReview.provisionalPersonId;
    } else {
      provisionalPersonId = await createProvisionalPersonAsync(service, input, contactPoint);
      personId = provisionalPersonId;
      resolverReviewId = await getOrCreateResolverReviewAsync(
        service,
        input,
        contactPoint,
        provisionalPersonId,
        candidates,
        finalBand,
      );
    }
  }

  if (outcome === 'provisional') {
    provisionalPersonId = await createProvisionalPersonAsync(service, input, contactPoint);
    personId = provisionalPersonId;
  }

  if (!personId) {
    throw new Error('PeopleCore inbound identity resolution requires a concrete personId.');
  }

  return {
    outcome,
    confidenceBand: finalBand,
    contactPointStatus: contactPoint.status,
    personId,
    contactPointId: contactPoint.id,
    contactPointEventId: contactPointEvent.id,
    provisionalPersonId,
    resolverReviewId,
    candidates,
    selectedCandidatePersonId,
  };
}

export async function resolveInboundContactPointIdentityAsync(
  input: ResolveInboundContactPointIdentityInput,
): Promise<ResolveInboundContactPointIdentityResult> {
  return resolveInboundContactPointIdentityWithServiceAsync(peopleCoreServiceAsync, input);
}
