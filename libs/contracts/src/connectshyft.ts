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

export type ConnectShyftIdentityResolutionResponse = {
  confidenceBand: IdentityConfidenceBand;
  contactPointStatus: ContactPointStatus;
  resolvedState?: ConnectShyftIdentityResolutionOutcome | null;
  outcome?: ConnectShyftIdentityResolutionOutcome | null;
  state?: ConnectShyftIdentityResolutionOutcome | ResolverReviewStatus | null;
  resolverReviewId?: string | null;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
};
