import type {
  ContactPointStatus,
  IdentityConfidenceBand,
  ResolverActionType,
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
  outcome?: ConnectShyftIdentityResolutionOutcome | null;
  state?: ConnectShyftIdentityResolutionOutcome | ResolverReviewStatus | null;
  resolverReviewId?: string | null;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
};
