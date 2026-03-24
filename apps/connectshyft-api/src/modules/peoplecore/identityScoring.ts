import type {
  ContactPoint,
  ContactPointStatus,
  ContactPointLink,
  HouseholdMembership,
  ResolverRiskFlag,
} from '@shyft/contracts';

export type CandidateSubjectGenerationReason =
  | 'current_person_link'
  | 'current_household_link'
  | 'historical_person_link'
  | 'historical_household_link'
  | 'current_household_member';

export interface CandidateSubject {
  subjectType: 'person' | 'household';
  subjectId: string;
  generationReason: CandidateSubjectGenerationReason;
  directness: 'direct' | 'indirect';
  recencyHint: 'current' | 'historical';
  supportingLinkIds: string[];
}

export interface ScoreContext {
  contactPoint: Pick<ContactPoint, 'status' | 'confirmedShared' | 'reassignmentSuspected'>;
  contactPointStatus: ContactPoint['status'];
  currentLinkCount: number;
  currentLinks: ContactPointLink[];
  historicalLinks: ContactPointLink[];
  householdMemberships: HouseholdMembership[];
  recentActivity: string[];
  recentConfirmation: string[];
  asOfUtc: string;
}

export interface ScoredCandidate extends CandidateSubject {
  score: number;
  confidenceReasons: string[];
  riskFlags: ResolverRiskFlag[];
}

const ADDITIVE = {
  exactCurrentPersonLink: 60,
  exactCurrentHouseholdLink: 20,
  currentPrimaryLink: 15,
  manualConfirmation: 40,
  resolverVerified: 60,
  recentActivity30: 20,
  recentActivity180: 10,
  recentConfirmation180: 15,
  sameHousehold: 15,
} as const;

const SUBTRACTIVE = {
  multipleCurrentLinks: -35,
  activeSharedPossible: -20,
  activeSharedConfirmed: -45,
  stale: -25,
  reassignmentSuspected: -70,
  historicalOnly: -40,
  conflictingIdentity: -60,
  crossHouseholdConflict: -25,
  noRecentUse: -15,
} as const;
const ARCHIVED_STATUS_PENALTY = -1_000_000_000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

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

const appendRiskFlag = (
  riskFlags: ResolverRiskFlag[],
  riskFlag: ResolverRiskFlag,
): void => {
  if (!riskFlags.includes(riskFlag)) {
    riskFlags.push(riskFlag);
  }
};

const assertCandidateSubject = (candidate: CandidateSubject, index: number): void => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to be an object.`);
  }
  if (candidate.subjectType !== 'person' && candidate.subjectType !== 'household') {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to have a valid subjectType.`);
  }
  if (!isNonEmptyString(candidate.subjectId)) {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to have a subjectId.`);
  }
  if (!isNonEmptyString(candidate.generationReason)) {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to have a generationReason.`);
  }
  if (candidate.directness !== 'direct' && candidate.directness !== 'indirect') {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to have a valid directness.`);
  }
  if (candidate.recencyHint !== 'current' && candidate.recencyHint !== 'historical') {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to have a valid recencyHint.`);
  }
  if (!Array.isArray(candidate.supportingLinkIds)) {
    throw new Error(`scoreIdentityCandidates requires candidate ${index} to have supportingLinkIds.`);
  }
};

const assertScoreContext = (context: ScoreContext): void => {
  if (!context || typeof context !== 'object') {
    throw new Error('scoreIdentityCandidates requires a score context object.');
  }
  if (!context.contactPoint || typeof context.contactPoint !== 'object') {
    throw new Error('scoreIdentityCandidates requires contactPoint details in the score context.');
  }
  if (!isNonEmptyString(context.contactPointStatus)) {
    throw new Error('scoreIdentityCandidates requires contactPointStatus in the score context.');
  }
  if (typeof context.currentLinkCount !== 'number' || Number.isNaN(context.currentLinkCount)) {
    throw new Error('scoreIdentityCandidates requires currentLinkCount in the score context.');
  }
  if (!Array.isArray(context.currentLinks)) {
    throw new Error('scoreIdentityCandidates requires currentLinks in the score context.');
  }
  if (!Array.isArray(context.historicalLinks)) {
    throw new Error('scoreIdentityCandidates requires historicalLinks in the score context.');
  }
  if (!Array.isArray(context.householdMemberships)) {
    throw new Error('scoreIdentityCandidates requires householdMemberships in the score context.');
  }
  if (!Array.isArray(context.recentActivity)) {
    throw new Error('scoreIdentityCandidates requires recentActivity in the score context.');
  }
  if (!Array.isArray(context.recentConfirmation)) {
    throw new Error('scoreIdentityCandidates requires recentConfirmation in the score context.');
  }
  if (!isNonEmptyString(context.asOfUtc)) {
    throw new Error('scoreIdentityCandidates requires asOfUtc in the score context.');
  }
};

export function applyStatusPenalty(status: ContactPointStatus): number {
  switch (status) {
    case 'active_personal':
      return 0;
    case 'active_shared_possible':
      return SUBTRACTIVE.activeSharedPossible;
    case 'active_shared_confirmed':
      return SUBTRACTIVE.activeSharedConfirmed;
    case 'stale':
      return SUBTRACTIVE.stale;
    case 'reassignment_suspected':
      return SUBTRACTIVE.reassignmentSuspected;
    case 'archived':
      return ARCHIVED_STATUS_PENALTY;
    default:
      return 0;
  }
}

export function scoreIdentityCandidates(
  candidates: CandidateSubject[],
  context: ScoreContext,
): ScoredCandidate[] {
  if (!Array.isArray(candidates)) {
    throw new Error('scoreIdentityCandidates requires candidates to be an array.');
  }

  candidates.forEach((candidate, index) => {
    assertCandidateSubject(candidate, index);
  });
  assertScoreContext(context);

  const currentLinksBySubject = buildSupportingLinkMap(context.currentLinks);
  const historicalLinksBySubject = buildSupportingLinkMap(context.historicalLinks);
  const currentHouseholdLinkIds = new Set(
    context.currentLinks
      .filter((link) => link.subjectType === 'household')
      .map((link) => link.subjectId),
  );
  const currentHouseholdIdsByPersonId = new Map<string, Set<string>>();
  const currentPersonIdsByHouseholdId = new Map<string, Set<string>>();

  context.householdMemberships
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
      .map((link) => daysBetweenUtc(link.lastUsedAt, context.asOfUtc))
      .filter((days): days is number => days !== null);

    if (linkAges.some((days) => days <= 30)) {
      reasons.push(`recent activity in last 0-30 days (+${ADDITIVE.recentActivity30})`);
      return { score: ADDITIVE.recentActivity30, reasons };
    }

    if (linkAges.some((days) => days >= 31 && days <= 180)) {
      reasons.push(`recent activity in last 31-180 days (+${ADDITIVE.recentActivity180})`);
      return { score: ADDITIVE.recentActivity180, reasons };
    }

    if (linkAges.length > 0 && linkAges.every((days) => days > 365)) {
      reasons.push(`no recent use over 365 days (${SUBTRACTIVE.noRecentUse})`);
      return { score: SUBTRACTIVE.noRecentUse, reasons };
    }

    return { score: 0, reasons };
  };

  const scoreLinkConfirmation = (links: ContactPointLink[]): { score: number; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];

    if (links.some((link) => link.manuallyConfirmed)) {
      score += ADDITIVE.manualConfirmation;
      reasons.push(`manual confirmation on current link (+${ADDITIVE.manualConfirmation})`);
    }
    if (links.some((link) => link.confirmationSource === 'resolver')) {
      score += ADDITIVE.resolverVerified;
      reasons.push(`resolver verified current link (+${ADDITIVE.resolverVerified})`);
    }
    if (links.some((link) => {
      const age = daysBetweenUtc(link.lastConfirmedAt, context.asOfUtc);
      return age !== null && age <= 180;
    })) {
      score += ADDITIVE.recentConfirmation180;
      reasons.push(`recent confirmation in last 0-180 days (+${ADDITIVE.recentConfirmation180})`);
    }

    return { score, reasons };
  };

  return candidates
    .map((candidate, index) => {
      let score = 0;
      const confidenceReasons: string[] = [];
      const riskFlags: ResolverRiskFlag[] = [];
      const subjectKey = `${candidate.subjectType}:${candidate.subjectId}`;
      const directCurrentLinks = currentLinksBySubject.get(subjectKey) || [];
      const directHistoricalLinks = historicalLinksBySubject.get(subjectKey) || [];
      const personHouseholdIds = currentHouseholdIdsByPersonId.get(candidate.subjectId) || new Set<string>();
      const corroboratingCurrentHouseholdLinks = candidate.subjectType === 'person'
        ? context.currentLinks.filter((link) =>
          link.subjectType === 'household' && personHouseholdIds.has(link.subjectId))
        : [];
      const corroboratingCurrentPersonLinks = candidate.subjectType === 'household'
        ? context.currentLinks.filter((link) =>
          link.subjectType === 'person'
          && (currentPersonIdsByHouseholdId.get(candidate.subjectId) || new Set<string>()).has(link.subjectId))
        : [];
      const currentPrimaryLinks = [
        ...directCurrentLinks,
        ...corroboratingCurrentHouseholdLinks,
        ...corroboratingCurrentPersonLinks,
      ];

      if (candidate.subjectType === 'person' && directCurrentLinks.length > 0) {
        score += ADDITIVE.exactCurrentPersonLink;
        confidenceReasons.push(`exact current person link (+${ADDITIVE.exactCurrentPersonLink})`);
      }

      if (
        (candidate.subjectType === 'household' && directCurrentLinks.length > 0)
        || (candidate.subjectType === 'person' && corroboratingCurrentHouseholdLinks.length > 0)
      ) {
        score += ADDITIVE.exactCurrentHouseholdLink;
        confidenceReasons.push(`exact current household link (+${ADDITIVE.exactCurrentHouseholdLink})`);
      }

      if (currentPrimaryLinks.some((link) => link.isPrimary)) {
        score += ADDITIVE.currentPrimaryLink;
        confidenceReasons.push(`current primary link (+${ADDITIVE.currentPrimaryLink})`);
      }

      const confirmationScore = scoreLinkConfirmation(currentPrimaryLinks);
      score += confirmationScore.score;
      confidenceReasons.push(...confirmationScore.reasons);

      const activityScore = scoreLinkRecency([
        ...currentPrimaryLinks,
        ...directHistoricalLinks,
      ]);
      score += activityScore.score;
      confidenceReasons.push(...activityScore.reasons);

      if (candidate.subjectType === 'person' && corroboratingCurrentHouseholdLinks.length > 0) {
        score += ADDITIVE.sameHousehold;
        confidenceReasons.push(`same-household corroboration (+${ADDITIVE.sameHousehold})`);
      }

      if (candidate.subjectType === 'household' && corroboratingCurrentPersonLinks.length > 0) {
        score += ADDITIVE.sameHousehold;
        confidenceReasons.push(`same-household corroboration (+${ADDITIVE.sameHousehold})`);
      }

      if (context.currentLinkCount > 1) {
        score += SUBTRACTIVE.multipleCurrentLinks;
        confidenceReasons.push(
          `multiple current person links on same ContactPoint (${SUBTRACTIVE.multipleCurrentLinks})`,
        );
        appendRiskFlag(riskFlags, 'shared_contact_possible');
      }

      const statusPenalty = applyStatusPenalty(context.contactPointStatus);
      if (context.contactPointStatus === 'active_shared_possible') {
        score += statusPenalty;
        confidenceReasons.push(
          `ContactPoint status active_shared_possible (${statusPenalty})`,
        );
        appendRiskFlag(riskFlags, 'shared_contact_possible');
      }
      if (context.contactPointStatus === 'active_shared_confirmed') {
        score += statusPenalty;
        confidenceReasons.push(
          `ContactPoint status active_shared_confirmed (${statusPenalty})`,
        );
        appendRiskFlag(riskFlags, 'shared_contact_confirmed');
      }
      if (context.contactPointStatus === 'stale') {
        score += statusPenalty;
        confidenceReasons.push(`ContactPoint status stale (${statusPenalty})`);
        appendRiskFlag(riskFlags, 'stale_contact');
      }
      if (context.contactPointStatus === 'reassignment_suspected') {
        score += statusPenalty;
        confidenceReasons.push(
          `ContactPoint status reassignment_suspected (${statusPenalty})`,
        );
        appendRiskFlag(riskFlags, 'rapid_contact_reuse');
      }
      if (context.contactPointStatus === 'archived') {
        score += statusPenalty;
        confidenceReasons.push(`ContactPoint status archived (${statusPenalty})`);
        appendRiskFlag(riskFlags, 'archived_prior_owner');
      }

      if (directCurrentLinks.length === 0 && directHistoricalLinks.length > 0) {
        score += SUBTRACTIVE.historicalOnly;
        confidenceReasons.push(`historical-only link (${SUBTRACTIVE.historicalOnly})`);
        appendRiskFlag(riskFlags, 'archived_prior_owner');
      }

      if (candidate.subjectType === 'person' && currentHouseholdLinkIds.size > 0) {
        if (directCurrentLinks.length > 0 && corroboratingCurrentHouseholdLinks.length === 0) {
          score += SUBTRACTIVE.conflictingIdentity;
          confidenceReasons.push(`conflicting identity fields (${SUBTRACTIVE.conflictingIdentity})`);
          appendRiskFlag(riskFlags, 'conflicting_name_dob');
        } else if (
          corroboratingCurrentHouseholdLinks.length > 0
          && corroboratingCurrentHouseholdLinks.length < currentHouseholdLinkIds.size
        ) {
          score += SUBTRACTIVE.crossHouseholdConflict;
          confidenceReasons.push(`cross-household conflict (${SUBTRACTIVE.crossHouseholdConflict})`);
        }
      }

      if (context.contactPoint.confirmedShared) {
        appendRiskFlag(riskFlags, 'shared_contact_confirmed');
      }
      if (context.contactPoint.reassignmentSuspected) {
        appendRiskFlag(riskFlags, 'rapid_contact_reuse');
      }

      return {
        ...candidate,
        score,
        confidenceReasons,
        riskFlags,
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
