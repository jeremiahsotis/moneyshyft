import type {
  ContactPointStatus,
  IdentityConfidenceBand,
} from './people';

export type ConnectShyftIdentityResolutionCandidate = {
  personId: string;
  score: number;
  reasons: string[];
  contactPointStatus: ContactPointStatus;
};

export type ConnectShyftIdentityResolutionResponse = {
  confidenceBand: IdentityConfidenceBand;
  contactPointStatus: ContactPointStatus;
  outcome?: string | null;
  state?: string | null;
  resolverReviewId?: string | null;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
};
