import type { ContactPoint, ContactPointLink } from '@shyft/contracts';
import {
  AsyncPeopleCoreService,
  peopleCoreServiceAsync,
} from '../peoplecore/service';
import type {
  ConnectShyftIdentityBoundaryNeighbor,
  ConnectShyftIdentityBoundaryRequest,
  ConnectShyftIdentityBoundaryResult,
  ConnectShyftPeopleCoreIdentityHookContext,
} from './identityBoundary';

type PeopleCoreIdentityHookService = Pick<
  AsyncPeopleCoreService,
  | 'createContactPoint'
  | 'createContactPointLink'
  | 'createPerson'
  | 'createResolverReview'
  | 'listContactPointsByNormalizedValue'
  | 'listCurrentContactPointLinks'
  | 'listResolverReviews'
>;

export type ConnectShyftPeopleCoreIdentityLookupSnapshot = {
  normalizedContactPointValue: string | null;
  peopleCoreAvailable: boolean;
  peopleCoreContactPoints: ContactPoint[];
  peopleCoreCurrentLinks: ContactPointLink[];
  candidateNeighbors: ConnectShyftIdentityBoundaryNeighbor[];
};

export type ConnectShyftProvisionalIdentityHookInput = {
  tenantId: string;
  orgUnitId: string;
  normalizedContactPointValue: string;
  rawContactPointValue?: string;
  hookContext?: ConnectShyftPeopleCoreIdentityHookContext;
  lookup?: ConnectShyftPeopleCoreIdentityLookupSnapshot;
};

export type ConnectShyftResolverReviewHookInput = {
  tenantId: string;
  orgUnitId: string;
  normalizedContactPointValue: string;
  hookContext?: ConnectShyftPeopleCoreIdentityHookContext;
  lookup?: ConnectShyftPeopleCoreIdentityLookupSnapshot;
};

export type ConnectShyftProvisionalIdentityHookResult =
  | {
    created: true;
    personId: string;
    contactPointId: string;
    linkId: string;
  }
  | {
    created: false;
    reason:
      | 'peoplecore_unavailable'
      | 'contact_point_already_linked'
      | 'missing_org_unit';
    contactPointId?: string;
  };

export type ConnectShyftResolverReviewHookResult =
  | {
    created: true;
    reviewId: string;
    contactPointId?: string;
  }
  | {
    created: false;
    reason:
      | 'peoplecore_unavailable'
      | 'duplicate_trigger'
      | 'missing_org_unit';
    contactPointId?: string;
  };

const DEFAULT_HOOK_REQUESTED_BY = 'system-connectshyft-identity-seam';
const DEFAULT_PROVISIONAL_FIRST_NAME = 'Unknown';
const DEFAULT_PROVISIONAL_LAST_NAME = 'Contact';
const UNIQUE_VIOLATION_CODE = '23505';

const buildHookTimestamp = (): string => new Date().toISOString();

const uniqueSortedStrings = (values: string[]): string[] =>
  Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((left, right) =>
    left.localeCompare(right));

const isUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: string }).code === UNIQUE_VIOLATION_CODE;
};

export class ConnectShyftPeopleCoreIdentityHooks {
  constructor(
    private readonly peopleCoreService: PeopleCoreIdentityHookService = peopleCoreServiceAsync,
  ) {}

  private async loadLookup(
    tenantId: string,
    normalizedContactPointValue: string,
  ): Promise<ConnectShyftPeopleCoreIdentityLookupSnapshot> {
    const peopleCoreContactPoints = await this.peopleCoreService.listContactPointsByNormalizedValue({
      tenantId,
      type: 'phone',
      normalizedValue: normalizedContactPointValue,
    });

    const peopleCoreCurrentLinks = (
      await Promise.all(
        peopleCoreContactPoints.map((contactPoint) =>
          this.peopleCoreService.listCurrentContactPointLinks({
            tenantId,
            contactPointId: contactPoint.id,
          })),
      )
    ).flat();

    return {
      normalizedContactPointValue,
      peopleCoreAvailable: true,
      peopleCoreContactPoints,
      peopleCoreCurrentLinks,
      candidateNeighbors: [],
    };
  }

  async createProvisionalPersonHook(
    input: ConnectShyftProvisionalIdentityHookInput,
  ): Promise<ConnectShyftProvisionalIdentityHookResult> {
    if (!input.orgUnitId.trim()) {
      return {
        created: false,
        reason: 'missing_org_unit',
      };
    }

    const lookup = input.lookup
      || await this.loadLookup(input.tenantId, input.normalizedContactPointValue);

    if (!lookup.peopleCoreAvailable) {
      return {
        created: false,
        reason: 'peoplecore_unavailable',
      };
    }

    let contactPoint = lookup.peopleCoreContactPoints[0];
    if (!contactPoint) {
      try {
        const now = buildHookTimestamp();
        contactPoint = await this.peopleCoreService.createContactPoint({
          tenantId: input.tenantId,
          type: 'phone',
          normalizedValue: input.normalizedContactPointValue,
          rawValue: input.rawContactPointValue,
          status: 'active_personal',
          firstSeenAt: now,
          lastSeenAt: now,
          suspectedShared: false,
          confirmedShared: false,
          reassignmentSuspected: false,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }

        const reloaded = await this.loadLookup(input.tenantId, input.normalizedContactPointValue);
        contactPoint = reloaded.peopleCoreContactPoints[0];
      }
    }

    if (!contactPoint) {
      return {
        created: false,
        reason: 'peoplecore_unavailable',
      };
    }

    const currentLinks = await this.peopleCoreService.listCurrentContactPointLinks({
      tenantId: input.tenantId,
      contactPointId: contactPoint.id,
    });

    if (currentLinks.some((link) => link.subjectType === 'person')) {
      return {
        created: false,
        reason: 'contact_point_already_linked',
        contactPointId: contactPoint.id,
      };
    }

    const person = await this.peopleCoreService.createPerson({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      firstName: DEFAULT_PROVISIONAL_FIRST_NAME,
      lastName: DEFAULT_PROVISIONAL_LAST_NAME,
      status: 'active_provisional',
    });

    const firstLinkedAt = buildHookTimestamp();
    const link = await this.peopleCoreService.createContactPointLink({
      tenantId: input.tenantId,
      contactPointId: contactPoint.id,
      subjectType: 'person',
      subjectId: person.id,
      linkType: 'unknown',
      confidenceBand: 'low',
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: false,
      firstLinkedAt,
      linkedBy: 'system',
    });

    return {
      created: true,
      personId: person.id,
      contactPointId: contactPoint.id,
      linkId: link.id,
    };
  }

  async createResolverReviewHook(
    input: ConnectShyftResolverReviewHookInput,
  ): Promise<ConnectShyftResolverReviewHookResult> {
    if (!input.orgUnitId.trim()) {
      return {
        created: false,
        reason: 'missing_org_unit',
      };
    }

    const lookup = input.lookup
      || await this.loadLookup(input.tenantId, input.normalizedContactPointValue);

    if (!lookup.peopleCoreAvailable) {
      return {
        created: false,
        reason: 'peoplecore_unavailable',
      };
    }

    const triggerSourceType = input.hookContext?.triggerSourceType || 'connectshyft_identity_seam';
    const triggerSourceId = input.hookContext?.triggerSourceId
      || `${triggerSourceType}:${input.tenantId}:${input.orgUnitId}:${input.normalizedContactPointValue}`;
    const existingReviews = await this.peopleCoreService.listResolverReviews({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
    });

    if (existingReviews.some((review) =>
      review.triggerSourceType === triggerSourceType
      && review.triggerSourceId === triggerSourceId)) {
      return {
        created: false,
        reason: 'duplicate_trigger',
        contactPointId: lookup.peopleCoreContactPoints[0]?.id,
      };
    }

    const candidatePersonIds = uniqueSortedStrings(
      lookup.peopleCoreCurrentLinks
        .filter((link) => link.subjectType === 'person')
        .map((link) => link.subjectId),
    );

    const review = await this.peopleCoreService.createResolverReview({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      reviewType: 'shared_contact_ambiguity',
      reviewStatus: 'pending',
      priority: 'high',
      triggerSourceType,
      triggerSourceId,
      conversationId: input.hookContext?.conversationId,
      candidatePersonIds,
      contactPointId: lookup.peopleCoreContactPoints[0]?.id,
      confidenceBand: 'high',
      confidenceReasons: [
        'Multiple exact contact-point matches require resolver review.',
      ],
      riskFlags: ['shared_contact_possible'],
      requestedByUserId: input.hookContext?.requestedByUserId || DEFAULT_HOOK_REQUESTED_BY,
      requestedAt: buildHookTimestamp(),
    });

    return {
      created: true,
      reviewId: review.id,
      contactPointId: review.contactPointId,
    };
  }

  async applyIdentityHooks(
    input: ConnectShyftIdentityBoundaryRequest,
    result: ConnectShyftIdentityBoundaryResult,
    lookup: ConnectShyftPeopleCoreIdentityLookupSnapshot | null,
  ): Promise<void> {
    if (!input.orgUnitId?.trim() || !lookup?.normalizedContactPointValue) {
      return;
    }

    if (
      result.ok
      && result.code === 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH'
      && input.hookContext?.createProvisionalOnNoMatch
    ) {
      await this.createProvisionalPersonHook({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        normalizedContactPointValue: lookup.normalizedContactPointValue,
        rawContactPointValue: input.contactPoint.value,
        hookContext: {
          ...input.hookContext,
          triggerSourceId: input.hookContext.triggerSourceId || result.data.idempotency.key,
        },
        lookup,
      });
      return;
    }

    if (
      !result.ok
      && result.code === 'IDENTITY_MATCH_AMBIGUOUS'
      && input.hookContext?.createResolverReviewOnAmbiguous
    ) {
      await this.createResolverReviewHook({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        normalizedContactPointValue: lookup.normalizedContactPointValue,
        hookContext: {
          ...input.hookContext,
          triggerSourceId: input.hookContext.triggerSourceId
            || result.data?.idempotency.key
            || `${input.tenantId}:${input.orgUnitId}:${lookup.normalizedContactPointValue}`,
        },
        lookup,
      });
    }
  }
}
