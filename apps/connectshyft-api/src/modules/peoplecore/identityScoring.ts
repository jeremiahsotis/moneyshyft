import type {
  ContactPoint,
  ContactPointLink,
  HouseholdMembership,
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
  riskFlags: string[];
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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

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

  void ADDITIVE;
  void SUBTRACTIVE;

  throw new Error('scoreIdentityCandidates not implemented');
}
