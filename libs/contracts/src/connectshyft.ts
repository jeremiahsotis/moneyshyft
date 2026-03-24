import type {
  ContactPointStatus,
  IdentityConfidenceBand,
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

export type ConnectShyftIdentityResolutionResponse = {
  confidenceBand: IdentityConfidenceBand;
  contactPointStatus: ContactPointStatus;
  outcome?: ConnectShyftIdentityResolutionOutcome | null;
  state?: ConnectShyftIdentityResolutionOutcome | ResolverReviewStatus | null;
  resolverReviewId?: string | null;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
};
