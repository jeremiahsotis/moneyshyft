import type {
  ContactPoint,
  ContactPointLink,
  Household,
  HouseholdMembership,
  Person,
} from '@shyft/contracts';
import {
  AsyncPeopleCoreService,
  peopleCoreServiceAsync,
} from './service';

export type PeopleCoreIdentityCandidateGenerationReason =
  | 'current_person_link'
  | 'current_household_link'
  | 'historical_person_link'
  | 'historical_household_link'
  | 'current_household_member';

export type PeopleCoreIdentityResolutionOutcome = 'canonical' | 'provisional' | 'resolver_needed';

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
const HIGH_CONFIDENCE_BANDS = new Set<PeopleCoreScoredIdentityCandidate['confidenceBand']>([
  'high',
  'very_high',
]);
const BAND_ORDER: Array<PeopleCoreScoredIdentityCandidate['confidenceBand']> = [
  'very_low',
  'low',
  'medium',
  'high',
  'very_high',
];
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

const daysBetweenUtc = (value: string | undefined, asOfUtc: string): number | null => {
  if (!value) {
    return null;
  }

  const valueMs = Date.parse(value);
  const asOfMs = Date.parse(asOfUtc);
  if (Number.isNaN(valueMs) || Number.isNaN(asOfMs)) {
    return null;
  }

  return Math.max(0, Math.floor((asOfMs - valueMs) / (24 * 60 * 60 * 1000)));
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

const toBand = (
  score: number,
): PeopleCoreScoredIdentityCandidate['confidenceBand'] => {
  if (score <= 0) {
    return 'very_low';
  }
  if (score < 40) {
    return 'low';
  }
  if (score < 80) {
    return 'medium';
  }
  if (score < 120) {
    return 'high';
  }
  return 'very_high';
};

const capBand = (
  band: PeopleCoreScoredIdentityCandidate['confidenceBand'],
  maxBand: PeopleCoreScoredIdentityCandidate['confidenceBand'],
): PeopleCoreScoredIdentityCandidate['confidenceBand'] =>
  BAND_ORDER.indexOf(band) > BAND_ORDER.indexOf(maxBand) ? maxBand : band;

const isActivePerson = (person: Person | undefined): boolean =>
  Boolean(person && ACTIVE_PERSON_STATUSES.has(person.status));

const isActiveHousehold = (household: Household | undefined): boolean =>
  Boolean(household && ACTIVE_HOUSEHOLD_STATUSES.has(household.status));

const buildSupportingLinkMap = (
  links: ContactPointLink[],
): Map<string, ContactPointLink[]> => {
  const map = new Map<string, ContactPointLink[]>();

  links.forEach((link) => {
    const key = `${link.subjectType}:${link.subjectId}`;
    const existing = map.get(key) || [];
    existing.push(link);
    map.set(key, existing);
  });

  return map;
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

const getOrCreateResolverReviewAsync = async (
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
  contactPoint: ContactPoint,
  provisionalPersonId: string,
  scoredCandidates: PeopleCoreScoredIdentityCandidate[],
): Promise<string | null> => {
  const existingReviews = await service.listResolverReviews({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
  });
  const existing = existingReviews.find((review) =>
    review.triggerSourceType === input.relatedObjectType
    && review.triggerSourceId === input.relatedObjectId);

  if (existing) {
    return existing.id;
  }

  const candidatePersonIds = uniqueStrings(
    scoredCandidates
      .filter((candidate) => candidate.subjectType === 'person')
      .map((candidate) => candidate.subjectId),
  );
  const topCandidate = scoredCandidates[0];
  const confidenceBand = topCandidate?.confidenceBand || 'medium';
  const confidenceReasons = topCandidate
    ? [...topCandidate.scoreReasons, 'Resolver review required because inbound identity is not decisive.']
    : ['Resolver review required because inbound identity is not decisive.'];

  const review = await service.createResolverReview({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    reviewType: 'shared_contact_ambiguity',
    reviewStatus: 'pending',
    priority: 'high',
    triggerSourceType: input.relatedObjectType,
    triggerSourceId: input.relatedObjectId,
    provisionalPersonId,
    candidatePersonIds,
    contactPointId: contactPoint.id,
    confidenceBand,
    confidenceReasons,
    riskFlags: ['shared_contact_possible'],
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
  const currentLinksBySubject = buildSupportingLinkMap(input.currentLinks);
  const historicalLinksBySubject = buildSupportingLinkMap(input.historicalLinks);
  const currentPersonLinkCount = input.currentLinks.filter((link) => link.subjectType === 'person').length;
  const currentHouseholdLinkIds = new Set(
    input.currentLinks
      .filter((link) => link.subjectType === 'household')
      .map((link) => link.subjectId),
  );
  const currentHouseholdIdsByPersonId = new Map<string, Set<string>>();
  const currentPersonIdsByHouseholdId = new Map<string, Set<string>>();

  input.householdMemberships
    .filter((membership) => membership.isCurrent)
    .forEach((membership) => {
      const personHouseholds = currentHouseholdIdsByPersonId.get(membership.personId) || new Set<string>();
      personHouseholds.add(membership.householdId);
      currentHouseholdIdsByPersonId.set(membership.personId, personHouseholds);

      const householdPeople = currentPersonIdsByHouseholdId.get(membership.householdId) || new Set<string>();
      householdPeople.add(membership.personId);
      currentPersonIdsByHouseholdId.set(membership.householdId, householdPeople);
    });

  const scoreLinkRecency = (links: ContactPointLink[]): { score: number; reasons: string[] } => {
    const reasons: string[] = [];
    const linkAges = links
      .map((link) => daysBetweenUtc(link.lastUsedAt, input.asOfUtc))
      .filter((days): days is number => days !== null);

    if (linkAges.some((days) => days <= 30)) {
      reasons.push('recent activity in last 0-30 days (+20)');
      return { score: 20, reasons };
    }

    if (linkAges.some((days) => days >= 31 && days <= 180)) {
      reasons.push('recent activity in last 31-180 days (+10)');
      return { score: 10, reasons };
    }

    if (linkAges.length > 0 && linkAges.every((days) => days > 365)) {
      reasons.push('no recent use over 365 days (-15)');
      return { score: -15, reasons };
    }

    return { score: 0, reasons };
  };

  const scoreLinkConfirmation = (links: ContactPointLink[]): { score: number; reasons: string[] } => {
    const reasons: string[] = [];
    if (links.some((link) => link.manuallyConfirmed)) {
      reasons.push('manual confirmation on current link (+40)');
    }
    if (links.some((link) => link.confirmationSource === 'resolver')) {
      reasons.push('resolver verified current link (+60)');
    }
    if (links.some((link) => {
      const age = daysBetweenUtc(link.lastConfirmedAt, input.asOfUtc);
      return age !== null && age <= 180;
    })) {
      reasons.push('recent confirmation in last 0-180 days (+15)');
    }

    return {
      score:
        (links.some((link) => link.manuallyConfirmed) ? 40 : 0)
        + (links.some((link) => link.confirmationSource === 'resolver') ? 60 : 0)
        + (links.some((link) => {
          const age = daysBetweenUtc(link.lastConfirmedAt, input.asOfUtc);
          return age !== null && age <= 180;
        }) ? 15 : 0),
      reasons,
    };
  };

  return input.candidates
    .map((candidate, index) => {
      let score = 0;
      const scoreReasons: string[] = [];
      const subjectKey = `${candidate.subjectType}:${candidate.subjectId}`;
      const directCurrentLinks = currentLinksBySubject.get(subjectKey) || [];
      const directHistoricalLinks = historicalLinksBySubject.get(subjectKey) || [];
      const personHouseholdIds = currentHouseholdIdsByPersonId.get(candidate.subjectId) || new Set<string>();
      const corroboratingCurrentHouseholdLinks = candidate.subjectType === 'person'
        ? input.currentLinks.filter((link) =>
          link.subjectType === 'household' && personHouseholdIds.has(link.subjectId))
        : [];
      const corroboratingCurrentPersonLinks = candidate.subjectType === 'household'
        ? input.currentLinks.filter((link) =>
          link.subjectType === 'person'
          && (currentPersonIdsByHouseholdId.get(candidate.subjectId) || new Set<string>()).has(link.subjectId))
        : [];

      if (candidate.subjectType === 'person' && directCurrentLinks.length > 0) {
        score += 60;
        scoreReasons.push('exact current person link (+60)');
      }

      if (
        (candidate.subjectType === 'household' && directCurrentLinks.length > 0)
        || (candidate.subjectType === 'person' && corroboratingCurrentHouseholdLinks.length > 0)
      ) {
        score += 20;
        scoreReasons.push('exact current household link (+20)');
      }

      const currentPrimaryLinks = [
        ...directCurrentLinks,
        ...corroboratingCurrentHouseholdLinks,
        ...corroboratingCurrentPersonLinks,
      ];
      if (currentPrimaryLinks.some((link) => link.isPrimary)) {
        score += 15;
        scoreReasons.push('current primary link (+15)');
      }

      const confirmationScore = scoreLinkConfirmation(currentPrimaryLinks);
      score += confirmationScore.score;
      scoreReasons.push(...confirmationScore.reasons);

      const activityScore = scoreLinkRecency([
        ...currentPrimaryLinks,
        ...directHistoricalLinks,
      ]);
      score += activityScore.score;
      scoreReasons.push(...activityScore.reasons);

      if (candidate.subjectType === 'person' && corroboratingCurrentHouseholdLinks.length > 0) {
        score += 15;
        scoreReasons.push('same-household corroboration (+15)');
      }

      if (currentPersonLinkCount > 1) {
        score -= 35;
        scoreReasons.push('multiple current person links on same ContactPoint (-35)');
      }

      if (input.contactPoint.status === 'active_shared_possible') {
        score -= 20;
        scoreReasons.push('ContactPoint status active_shared_possible (-20)');
      }
      if (input.contactPoint.status === 'active_shared_confirmed') {
        score -= 45;
        scoreReasons.push('ContactPoint status active_shared_confirmed (-45)');
      }
      if (input.contactPoint.status === 'stale') {
        score -= 25;
        scoreReasons.push('ContactPoint status stale (-25)');
      }
      if (input.contactPoint.status === 'reassignment_suspected') {
        score -= 70;
        scoreReasons.push('ContactPoint status reassignment_suspected (-70)');
      }

      if (directCurrentLinks.length === 0 && directHistoricalLinks.length > 0) {
        score -= 40;
        scoreReasons.push('historical-only link (-40)');
      }

      if (candidate.subjectType === 'person' && currentHouseholdLinkIds.size > 0) {
        if (directCurrentLinks.length > 0 && corroboratingCurrentHouseholdLinks.length === 0) {
          score -= 60;
          scoreReasons.push('conflicting identity fields (-60)');
        } else if (
          corroboratingCurrentHouseholdLinks.length > 0
          && corroboratingCurrentHouseholdLinks.length < currentHouseholdLinkIds.size
        ) {
          score -= 25;
          scoreReasons.push('cross-household conflict (-25)');
        }
      }

      if (candidate.subjectType === 'household' && corroboratingCurrentPersonLinks.length > 0) {
        score += 15;
        scoreReasons.push('same-household corroboration (+15)');
      }

      let confidenceBand = toBand(score);
      if (input.contactPoint.status === 'reassignment_suspected' || input.contactPoint.reassignmentSuspected) {
        confidenceBand = capBand(confidenceBand, 'medium');
      }
      if (input.contactPoint.status === 'active_shared_confirmed' || input.contactPoint.confirmedShared) {
        confidenceBand = capBand(confidenceBand, 'high');
      }
      if (currentPersonLinkCount > 1) {
        confidenceBand = capBand(confidenceBand, 'high');
      }

      return {
        ...candidate,
        score,
        confidenceBand,
        scoreReasons,
        __index: index,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.__index - right.__index;
    })
    .map(({ __index, ...candidate }) => candidate);
}

async function resolveInboundContactPointIdentityWithServiceAsync(
  service: PeopleCoreIdentityResolutionService,
  input: ResolveInboundContactPointIdentityInput,
): Promise<ResolveInboundContactPointIdentityResult> {
  const contactPoint = await findOrCreateContactPointAsync(service, input);
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

  let outcome: PeopleCoreIdentityResolutionOutcome = candidates.length === 0
    ? 'provisional'
    : 'resolver_needed';

  if (
    topCandidate
    && topCandidate.subjectType === 'person'
    && HIGH_CONFIDENCE_BANDS.has(topCandidate.confidenceBand)
  ) {
    outcome = 'canonical';
  }

  if (topCandidate && nextCandidate && topCandidate.score - nextCandidate.score < 20) {
    outcome = 'resolver_needed';
  }

  let personId = selectedCandidatePersonId;
  let provisionalPersonId: string | null = null;
  let resolverReviewId: string | null = null;

  if (outcome === 'provisional' || outcome === 'resolver_needed') {
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

    personId = provisionalPerson.id;
    provisionalPersonId = provisionalPerson.id;
  }

  if (outcome === 'resolver_needed' && provisionalPersonId) {
    resolverReviewId = await getOrCreateResolverReviewAsync(
      service,
      input,
      contactPoint,
      provisionalPersonId,
      candidates,
    );
  }

  if (!personId) {
    throw new Error('PeopleCore inbound identity resolution requires a concrete personId.');
  }

  return {
    outcome,
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
