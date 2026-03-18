import {
  AsyncInProcessConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryAdapter,
} from './identityBoundary';
import { KnexConnectShyftNeighborStore } from './neighbors';

const SYSTEM_RESOLVER_ACTOR_ROLES = ['SYSTEM_ADMIN'];

export type ResolveSubjectByContactPointInput = {
  tenantId: string;
  orgUnitId: string;
  contactPoint: string;
};

export type ResolveSubjectByContactPointResult =
  | {
    type: 'single_match';
    neighborId: string;
    normalizedContactPoint: string;
  }
  | {
    type: 'no_match';
    normalizedContactPoint: string;
  }
  | {
    type: 'multiple_matches';
    candidateNeighborIds: string[];
    normalizedContactPoint: string;
  };

export interface ConnectShyftSubjectResolverBoundary {
  resolveSubjectByContactPoint(
    input: ResolveSubjectByContactPointInput,
  ): Promise<ResolveSubjectByContactPointResult>;
}

export class ConnectShyftSubjectResolver implements ConnectShyftSubjectResolverBoundary {
  constructor(
    private readonly identityBoundary: ConnectShyftIdentityBoundaryAdapter,
  ) {}

  async resolveSubjectByContactPoint(
    input: ResolveSubjectByContactPointInput,
  ): Promise<ResolveSubjectByContactPointResult> {
    const result = await this.identityBoundary.evaluateMatch({
      actorRoles: SYSTEM_RESOLVER_ACTOR_ROLES,
      tenantId: input.tenantId,
      idempotencyKey: `inbound-subject:${input.tenantId}:${input.orgUnitId}:${input.contactPoint}`,
      contactPoint: {
        label: 'mobile',
        value: input.contactPoint,
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    const normalizedContactPoint = result.ok
      ? result.data.identityMatch.contactPoint.value
      : result.data?.identityMatch?.contactPoint.value
        || input.contactPoint;

    if (!result.ok) {
      if (result.code === 'IDENTITY_MATCH_AMBIGUOUS') {
        return {
          type: 'multiple_matches',
          candidateNeighborIds: [
            ...(result.data?.identityMatch?.candidateNeighborIds
              || result.data?.manualResolution?.candidateNeighborIds
              || []),
          ].sort(),
          normalizedContactPoint,
        };
      }

      throw new Error(`Identity resolver failed with ${result.code}`);
    }

    const matchedNeighborId = result.data.identityMatch.matchedNeighborId;
    if (matchedNeighborId) {
      return {
        type: 'single_match',
        neighborId: matchedNeighborId,
        normalizedContactPoint,
      };
    }

    return {
      type: 'no_match',
      normalizedContactPoint,
    };
  }
}

const defaultNeighborStore = new KnexConnectShyftNeighborStore();

const defaultIdentityBoundary = new AsyncInProcessConnectShyftIdentityBoundaryAdapter(
  async (tenantId) => defaultNeighborStore.listActiveIdentityBoundaryNeighborsByTenant(tenantId),
  async (tenantId, normalizedContactPointValue) =>
    defaultNeighborStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
      tenantId,
      normalizedContactPointValue,
    ),
);

const defaultSubjectResolver = new ConnectShyftSubjectResolver(defaultIdentityBoundary);

export const resolveSubjectByContactPoint = (
  input: ResolveSubjectByContactPointInput,
): Promise<ResolveSubjectByContactPointResult> =>
  defaultSubjectResolver.resolveSubjectByContactPoint(input);
