import { normalizePhone } from '../../../../../domains/communication';
import type { ContactPoint, ContactPointLink } from '@shyft/contracts';
import {
  AsyncPeopleCoreService,
  peopleCoreServiceAsync,
} from '../peoplecore/service';
import {
  AsyncInProcessConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryNeighbor,
  type ConnectShyftIdentityBoundaryRequest,
  type ConnectShyftIdentityBoundaryResult,
} from './identityBoundary';
import { resolveConnectShyftPhoneNormalizationContext } from './phoneIdentityContext';

type PeopleCoreIdentityLookupService = Pick<
  AsyncPeopleCoreService,
  'listContactPointsByNormalizedValue' | 'listCurrentContactPointLinks'
>;

export type ConnectShyftPeopleCoreIdentityCandidateLookup = {
  normalizedContactPointValue: string | null;
  peopleCoreAvailable: boolean;
  peopleCoreContactPoints: ContactPoint[];
  peopleCoreCurrentLinks: ContactPointLink[];
  candidateNeighbors: ConnectShyftIdentityBoundaryNeighbor[];
};

const normalizeContactPointValue = (contactPointValue: string): string | null => {
  const resolved = normalizePhone(
    contactPointValue.trim(),
    resolveConnectShyftPhoneNormalizationContext('user_entered'),
  );

  return resolved.ok ? resolved.phone.normalizedE164 : null;
};

const emptyPeopleCoreLookup = () => ({
  peopleCoreAvailable: false,
  peopleCoreContactPoints: [] as ContactPoint[],
  peopleCoreCurrentLinks: [] as ContactPointLink[],
});

export class AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter
  implements ConnectShyftIdentityBoundaryAdapter {
  private readonly boundaryAdapter: ConnectShyftIdentityBoundaryAdapter;

  constructor(
    private readonly loadNeighborsByTenant: (
      tenantId: string,
    ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
    private readonly loadNeighborsByNormalizedContactPoint?: (
      tenantId: string,
      normalizedContactPointValue: string,
    ) => Promise<ConnectShyftIdentityBoundaryNeighbor[]>,
    private readonly peopleCoreService: PeopleCoreIdentityLookupService = peopleCoreServiceAsync,
  ) {
    this.boundaryAdapter = new AsyncInProcessConnectShyftIdentityBoundaryAdapter(
      async (tenantId) => this.loadNeighborsByTenant(tenantId),
      async (tenantId, normalizedContactPointValue) =>
        (
          await this.evaluateIdentityCandidatesByNormalizedContactPoint({
            tenantId,
            normalizedContactPointValue,
          })
        ).candidateNeighbors,
    );
  }

  private async loadFallbackCandidates(
    tenantId: string,
    normalizedContactPointValue: string,
  ): Promise<ConnectShyftIdentityBoundaryNeighbor[]> {
    if (this.loadNeighborsByNormalizedContactPoint) {
      return this.loadNeighborsByNormalizedContactPoint(tenantId, normalizedContactPointValue);
    }

    return this.loadNeighborsByTenant(tenantId);
  }

  private async loadPeopleCoreLookup(input: {
    tenantId: string;
    normalizedContactPointValue: string;
  }): Promise<{
    peopleCoreAvailable: boolean;
    peopleCoreContactPoints: ContactPoint[];
    peopleCoreCurrentLinks: ContactPointLink[];
  }> {
    try {
      const peopleCoreContactPoints = await this.peopleCoreService.listContactPointsByNormalizedValue({
        tenantId: input.tenantId,
        type: 'phone',
        normalizedValue: input.normalizedContactPointValue,
      });

      const peopleCoreCurrentLinks = (
        await Promise.all(
          peopleCoreContactPoints.map((contactPoint) =>
            this.peopleCoreService.listCurrentContactPointLinks({
              tenantId: input.tenantId,
              contactPointId: contactPoint.id,
            })),
        )
      ).flat();

      return {
        peopleCoreAvailable: true,
        peopleCoreContactPoints,
        peopleCoreCurrentLinks,
      };
    } catch (error) {
      if (error instanceof Error) {
        return emptyPeopleCoreLookup();
      }

      throw error;
    }
  }

  async evaluateIdentityCandidatesForContactPoint(input: {
    tenantId: string;
    contactPointValue: string;
  }): Promise<ConnectShyftPeopleCoreIdentityCandidateLookup> {
    const normalizedContactPointValue = normalizeContactPointValue(input.contactPointValue);

    if (!normalizedContactPointValue) {
      return {
        normalizedContactPointValue: null,
        ...emptyPeopleCoreLookup(),
        candidateNeighbors: [],
      };
    }

    return this.evaluateIdentityCandidatesByNormalizedContactPoint({
      tenantId: input.tenantId,
      normalizedContactPointValue,
    });
  }

  async evaluateIdentityCandidatesByNormalizedContactPoint(input: {
    tenantId: string;
    normalizedContactPointValue: string;
  }): Promise<ConnectShyftPeopleCoreIdentityCandidateLookup> {
    const peopleCoreLookup = await this.loadPeopleCoreLookup(input);
    const candidateNeighbors = await this.loadFallbackCandidates(
      input.tenantId,
      input.normalizedContactPointValue,
    );

    return {
      normalizedContactPointValue: input.normalizedContactPointValue,
      ...peopleCoreLookup,
      candidateNeighbors,
    };
  }

  evaluateMatch(
    input: ConnectShyftIdentityBoundaryRequest,
  ): Promise<ConnectShyftIdentityBoundaryResult> {
    return Promise.resolve(this.boundaryAdapter.evaluateMatch(input));
  }
}
