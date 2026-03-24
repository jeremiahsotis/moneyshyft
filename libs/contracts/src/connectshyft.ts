import type {
  ContactPointStatus,
  IdentityConfidenceBand,
  ResolverActionType,
  ResolverDecisionResult,
  ResolverDecisionStatus,
  ResolverReview,
  ResolverReviewStatus,
} from './people';

export type ConnectShyftIdentityResolutionCandidate = {
  personId: string;
  score: number;
  reasons: string[];
  contactPointStatus: ContactPointStatus;
};

export type ConnectShyftIdentityResolutionOutcome =
  | 'canonical'
  | 'provisional'
  | 'resolver_required';

export const CONNECTSHYFT_IDENTITY_RESOLUTION_OUTCOMES = [
  'canonical',
  'provisional',
  'resolver_required',
] as const;

export const isConnectShyftIdentityResolutionOutcome = (
  value: unknown,
): value is ConnectShyftIdentityResolutionOutcome =>
  typeof value === 'string'
  && (CONNECTSHYFT_IDENTITY_RESOLUTION_OUTCOMES as readonly string[]).includes(value);

export const CONNECTSHYFT_IDENTITY_AMBIGUITY_ACTIVE_STATUSES = [
  'pending',
] as const;

export const CONNECTSHYFT_IDENTITY_AMBIGUITY_TERMINAL_STATUSES = [
  'reviewed',
  'resolved',
  'dismissed',
] as const;

export const CONNECTSHYFT_IDENTITY_AMBIGUITY_STATUSES = [
  ...CONNECTSHYFT_IDENTITY_AMBIGUITY_ACTIVE_STATUSES,
  ...CONNECTSHYFT_IDENTITY_AMBIGUITY_TERMINAL_STATUSES,
] as const;

export type ConnectShyftIdentityAmbiguityStatus =
  typeof CONNECTSHYFT_IDENTITY_AMBIGUITY_STATUSES[number];

export type ConnectShyftIdentityAmbiguityTerminalStatus =
  typeof CONNECTSHYFT_IDENTITY_AMBIGUITY_TERMINAL_STATUSES[number];

export type ConnectShyftIdentityAmbiguityConsumptionOutcome =
  Extract<ConnectShyftIdentityAmbiguityTerminalStatus, 'resolved' | 'dismissed'>;

export type ConnectShyftIdentityAmbiguityReasonCode =
  | 'IDENTITY_MATCH_AMBIGUOUS'
  | 'PEOPLECORE_LEGACY_DISAGREEMENT'
  | 'PEOPLECORE_MULTI_CURRENT_LINKS';

export type ConnectShyftResolverOutcomeAudit = {
  reviewId: string;
  action: ResolverActionType;
  reviewStatus: ResolverReviewStatus;
  actorUserId: string;
  occurredAtUtc: string;
  reason?: string | null;
  notes?: string | null;
  personId?: string | null;
  sourcePersonId?: string | null;
  targetPersonId?: string | null;
  contactPointId?: string | null;
};

export type ConnectShyftIdentityAmbiguityEvent = {
  id: string;
  tenantId: string;
  orgUnitId: string | null;
  sourceContext: string;
  sourceContextId: string | null;
  normalizedContactPoint: string;
  contactPointType: 'phone';
  candidateNeighborIds: string[];
  candidateCount: number;
  ambiguityReasonCode: ConnectShyftIdentityAmbiguityReasonCode;
  status: ConnectShyftIdentityAmbiguityStatus;
  requestedByUserId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  resolverReviewId: string | null;
  resolverConsumedByUserId: string | null;
  resolverConsumedAtUtc: string | null;
  resolverOutcome: ConnectShyftResolverOutcomeAudit | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ConnectShyftIdentityAmbiguityRecord = ConnectShyftIdentityAmbiguityEvent & {
  actionable: boolean;
  terminal: boolean;
};

export type ConnectShyftIdentityAmbiguityListData = {
  events: ConnectShyftIdentityAmbiguityRecord[];
  nextCursor: string | null;
};

export type ConnectShyftIdentityAmbiguityDetailData = {
  event: ConnectShyftIdentityAmbiguityRecord;
};

export type ConnectShyftResolverReviewRecord = ResolverReview & {
  actionable: boolean;
  terminal: boolean;
  decisionStatus: ResolverDecisionStatus | null;
};

export type ConnectShyftResolverReviewListData = {
  reviews: ConnectShyftResolverReviewRecord[];
};

export type ConnectShyftResolverReviewDetailData = {
  review: ConnectShyftResolverReviewRecord;
};

export const CONNECTSHYFT_RESOLVER_QUEUE_ITEM_TYPES = [
  'identity_review',
  'rebind_review',
] as const;

export type ConnectShyftResolverQueueItemType =
  typeof CONNECTSHYFT_RESOLVER_QUEUE_ITEM_TYPES[number];

export const CONNECTSHYFT_RESOLVER_QUEUE_CLAIM_STATES = [
  'unclaimed',
  'claimed_by_current_user',
  'claimed_by_other',
] as const;

export type ConnectShyftResolverQueueClaimState =
  typeof CONNECTSHYFT_RESOLVER_QUEUE_CLAIM_STATES[number];

export const CONNECTSHYFT_THREAD_SUBJECT_IMPACT_TYPES = [
  'provisional_identity',
  'resolver_required',
  'rebind_review',
] as const;

export type ConnectShyftThreadSubjectImpactType =
  typeof CONNECTSHYFT_THREAD_SUBJECT_IMPACT_TYPES[number];

export type ConnectShyftThreadSubjectImpact = {
  impactType: ConnectShyftThreadSubjectImpactType;
  actionable: boolean;
  resolverQueueItemId: string | null;
  resolverQueueItemType: ConnectShyftResolverQueueItemType | null;
};

export const CONNECTSHYFT_REBIND_REVIEW_AFFECTED_OBJECT_TYPES = [
  'contact_point_link',
] as const;

export type ConnectShyftRebindReviewAffectedObjectType =
  typeof CONNECTSHYFT_REBIND_REVIEW_AFFECTED_OBJECT_TYPES[number];

export type ConnectShyftRebindReviewContext = {
  rebindHistoryId: string;
  affectedObjectType: ConnectShyftRebindReviewAffectedObjectType;
  affectedObjectIds: string[];
  sourcePersonId: string;
  targetPersonId: string;
  contactPointIds: string[];
  originatingResolverReviewId: string | null;
  originatingResolutionType: ResolverActionType | null;
};

export type ConnectShyftResolverQueueItemRecord = {
  id: string;
  itemType: ConnectShyftResolverQueueItemType;
  status: ResolverReviewStatus;
  active: boolean;
  terminal: boolean;
  claimState: ConnectShyftResolverQueueClaimState;
  claimantUserId: string | null;
  claimedByCurrentUser: boolean;
  claimable: boolean;
  releasable: boolean;
  actionable: boolean;
  resolverReviewId: string | null;
  orgUnitId: string | null;
  conversationId: string | null;
  contactPointId: string | null;
  threadId: string | null;
  personIds: string[];
  triggerSourceType: string | null;
  triggerSourceId: string | null;
  requestedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
};

export type ConnectShyftResolverQueueListData = {
  items: ConnectShyftResolverQueueItemRecord[];
};

export type ConnectShyftResolverQueueDetailData = {
  item: ConnectShyftResolverQueueItemRecord;
  review: ConnectShyftResolverReviewRecord | null;
  rebindReview: ConnectShyftRebindReviewContext | null;
};

export type ConnectShyftResolverDecisionData = {
  result: ResolverDecisionResult;
};

export const isConnectShyftIdentityAmbiguityStatus = (
  value: unknown,
): value is ConnectShyftIdentityAmbiguityStatus =>
  typeof value === 'string'
  && (CONNECTSHYFT_IDENTITY_AMBIGUITY_STATUSES as readonly string[]).includes(value);

export const isConnectShyftIdentityAmbiguityActiveStatus = (
  value: unknown,
): value is typeof CONNECTSHYFT_IDENTITY_AMBIGUITY_ACTIVE_STATUSES[number] =>
  typeof value === 'string'
  && (CONNECTSHYFT_IDENTITY_AMBIGUITY_ACTIVE_STATUSES as readonly string[]).includes(value);

export const isConnectShyftIdentityAmbiguityTerminalStatus = (
  value: unknown,
): value is ConnectShyftIdentityAmbiguityTerminalStatus =>
  typeof value === 'string'
  && (CONNECTSHYFT_IDENTITY_AMBIGUITY_TERMINAL_STATUSES as readonly string[]).includes(value);

export const isConnectShyftResolverQueueItemType = (
  value: unknown,
): value is ConnectShyftResolverQueueItemType =>
  typeof value === 'string'
  && (CONNECTSHYFT_RESOLVER_QUEUE_ITEM_TYPES as readonly string[]).includes(value);

export const isConnectShyftResolverQueueClaimState = (
  value: unknown,
): value is ConnectShyftResolverQueueClaimState =>
  typeof value === 'string'
  && (CONNECTSHYFT_RESOLVER_QUEUE_CLAIM_STATES as readonly string[]).includes(value);

export const isConnectShyftThreadSubjectImpactType = (
  value: unknown,
): value is ConnectShyftThreadSubjectImpactType =>
  typeof value === 'string'
  && (CONNECTSHYFT_THREAD_SUBJECT_IMPACT_TYPES as readonly string[]).includes(value);

export const isConnectShyftRebindReviewAffectedObjectType = (
  value: unknown,
): value is ConnectShyftRebindReviewAffectedObjectType =>
  typeof value === 'string'
  && (CONNECTSHYFT_REBIND_REVIEW_AFFECTED_OBJECT_TYPES as readonly string[]).includes(value);

export type ConnectShyftIdentityResolutionResponse = {
  confidenceBand: IdentityConfidenceBand;
  contactPointStatus: ContactPointStatus;
  resolvedState?: ConnectShyftIdentityResolutionOutcome | null;
  outcome?: ConnectShyftIdentityResolutionOutcome | null;
  state?: ConnectShyftIdentityResolutionOutcome | ResolverReviewStatus | null;
  resolverReviewId?: string | null;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
};
