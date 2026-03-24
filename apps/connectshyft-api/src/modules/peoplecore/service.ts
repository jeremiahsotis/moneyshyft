import type {
  CreateActivityInput,
  GetActivityInput,
  ListActivitiesInput,
} from './activity';
import {
  buildPeopleCoreMergeEventPublisher,
  type PeopleCoreMergeEventPublisher,
} from './events';
import {
  KnexPeopleCoreStore,
  type AppendContactPointEventInput,
  type CreateContactPointInput,
  type CreateContactPointLinkInput,
  type CreateHouseholdInput,
  type CreateHouseholdMembershipInput,
  type CreatePersonInput,
  type CreateResolverReviewInput,
  type GetContactPointInput,
  type GetHouseholdInput,
  type MergePersonInput,
  type PeopleCoreMergeResult,
  type PersonMergeStatus,
  type GetPersonInput,
  type ListContactPointLinksInput,
  type GetResolverReviewInput,
  type ListContactPointEventsInput,
  type ListContactPointsByNormalizedValueInput,
  type ListCurrentContactPointLinksInput,
  type ListHouseholdMembershipsInput,
  type ListPersonsInput,
  type ListResolverReviewsInput,
  type PeopleCoreStore,
  PeopleCoreScopeViolationError,
} from './store';
import {
  InvalidContactPointStatusError,
  computeContactPointStatus,
} from './lifecycle';

const CONTACT_POINT_LIFECYCLE_EVENT_LIMIT = 200;

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

export class PeopleCorePersistenceUnavailableError extends Error {
  readonly code = 'PEOPLECORE_PERSISTENCE_UNAVAILABLE';

  constructor(cause?: unknown) {
    super('PeopleCore persistence is unavailable.');
    this.name = 'PeopleCorePersistenceUnavailableError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class ContactPointLifecycleComputationError extends Error {
  readonly code = 'CONTACT_POINT_LIFECYCLE_COMPUTATION_ERROR';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ContactPointLifecycleComputationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class AsyncPeopleCoreService {
  constructor(
    private readonly store: PeopleCoreStore = new KnexPeopleCoreStore(),
    private readonly mergeEventPublisher: PeopleCoreMergeEventPublisher =
      buildPeopleCoreMergeEventPublisher(),
  ) {}

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isMissingPersistenceError(error)) {
        throw new PeopleCorePersistenceUnavailableError(error);
      }

      throw error;
    }
  }

  private async recomputeContactPointLifecycle(
    input: {
      tenantId: string;
      contactPointId: string;
    },
  ): Promise<void> {
    try {
      const [contactPoint, events, links] = await Promise.all([
        this.store.getContactPoint({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
        }),
        this.store.listContactPointEvents({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
          limit: CONTACT_POINT_LIFECYCLE_EVENT_LIMIT,
        }),
        this.store.listCurrentContactPointLinks({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
        }),
      ]);

      if (!contactPoint) {
        throw new PeopleCoreScopeViolationError(
          `ContactPoint ${input.contactPointId} is not available in tenant ${input.tenantId}.`,
        );
      }

      const computedStatus = computeContactPointStatus(events, links);
      if (computedStatus !== contactPoint.status) {
        await this.store.updateContactPointStatus({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
          newStatus: computedStatus,
        });
      }
    } catch (error) {
      if (
        error instanceof InvalidContactPointStatusError
        || error instanceof PeopleCoreScopeViolationError
        || isMissingPersistenceError(error)
      ) {
        throw error;
      }

      throw new ContactPointLifecycleComputationError(
        `Failed to compute ContactPoint lifecycle for ${input.contactPointId}.`,
        error,
      );
    }
  }

  createPerson(input: CreatePersonInput) {
    return this.execute(() => this.store.createPerson(input));
  }

  createActivity(input: CreateActivityInput) {
    return this.execute(() => this.store.createActivity(input));
  }

  getPerson(input: GetPersonInput) {
    return this.execute(() => this.store.getPerson(input));
  }

  getActivity(input: GetActivityInput) {
    return this.execute(() => this.store.getActivity(input));
  }

  listPersons(input: ListPersonsInput) {
    return this.execute(() => this.store.listPersons(input));
  }

  async mergePerson(input: MergePersonInput): Promise<PeopleCoreMergeResult> {
    const result = await this.execute(() => this.store.mergePerson(input));

    if (result.didPersistMerge) {
      await this.mergeEventPublisher.publishPersonMerged({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        provisionalPersonId: result.mergedProvisionalPersonId,
        canonicalPersonId: result.canonicalPersonId,
        performedByUserId: input.performedByUserId,
        mergeReason: input.mergeReason,
        autoMergedContactPointLinkIds: result.autoMergedContactPointLinkIds,
        reviewContactPointLinkIds: result.reviewContactPointLinkIds,
        resolverReviewId: result.resolverReviewId,
      });
    }

    return result;
  }

  getPersonMergeStatus(input: GetPersonInput): Promise<PersonMergeStatus> {
    return this.execute(() => this.store.getPersonMergeStatus(input));
  }

  listActivities(input: ListActivitiesInput) {
    return this.execute(() => this.store.listActivities(input));
  }

  createHousehold(input: CreateHouseholdInput) {
    return this.execute(() => this.store.createHousehold(input));
  }

  getHousehold(input: GetHouseholdInput) {
    return this.execute(() => this.store.getHousehold(input));
  }

  createHouseholdMembership(input: CreateHouseholdMembershipInput) {
    return this.execute(() => this.store.createHouseholdMembership(input));
  }

  listHouseholdMemberships(input: ListHouseholdMembershipsInput) {
    return this.execute(() => this.store.listHouseholdMemberships(input));
  }

  createContactPoint(input: CreateContactPointInput) {
    return this.execute(() => this.store.createContactPoint(input));
  }

  getContactPoint(input: GetContactPointInput) {
    return this.execute(() => this.store.getContactPoint(input));
  }

  listContactPointsByNormalizedValue(input: ListContactPointsByNormalizedValueInput) {
    return this.execute(() => this.store.listContactPointsByNormalizedValue(input));
  }

  createContactPointLink(input: CreateContactPointLinkInput) {
    return this.execute(async () => {
      const link = await this.store.createContactPointLink(input);
      await this.recomputeContactPointLifecycle({
        tenantId: input.tenantId,
        contactPointId: input.contactPointId,
      });
      return link;
    });
  }

  listContactPointLinks(input: ListContactPointLinksInput) {
    return this.execute(() => this.store.listContactPointLinks(input));
  }

  listCurrentContactPointLinks(input: ListCurrentContactPointLinksInput) {
    return this.execute(() => this.store.listCurrentContactPointLinks(input));
  }

  appendContactPointEvent(input: AppendContactPointEventInput) {
    return this.execute(async () => {
      const event = await this.store.appendContactPointEvent(input);
      if (input.eventType !== 'lifecycle_changed') {
        await this.recomputeContactPointLifecycle({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
        });
      }
      return event;
    });
  }

  listContactPointEvents(input: ListContactPointEventsInput) {
    return this.execute(() => this.store.listContactPointEvents(input));
  }

  createResolverReview(input: CreateResolverReviewInput) {
    return this.execute(() => this.store.createResolverReview(input));
  }

  getResolverReview(input: GetResolverReviewInput) {
    return this.execute(() => this.store.getResolverReview(input));
  }

  listResolverReviews(input: ListResolverReviewsInput) {
    return this.execute(() => this.store.listResolverReviews(input));
  }
}

export const peopleCoreServiceAsync = new AsyncPeopleCoreService();
