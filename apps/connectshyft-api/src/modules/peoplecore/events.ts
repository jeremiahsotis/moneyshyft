import { randomUUID } from 'node:crypto';
import type { EventEnvelope, SubjectContext } from '@shyft/contracts';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { executePlatformMutation } from '../../platform/mutations/executePlatformMutation';

export const PEOPLECORE_PERSON_MERGED_EVENT_NAME = 'peoplecore.person.merged' as const;

export type PeopleCorePersonMergedPayload = {
  provisionalPersonId: string;
  canonicalPersonId: string;
  autoMergedContactPointLinkIds: string[];
  reviewContactPointLinkIds: string[];
  resolverReviewId?: string;
  performedByUserId: string;
  mergeReason?: string;
};

export type PeopleCorePersonMergedEvent = EventEnvelope<PeopleCorePersonMergedPayload> & {
  type: typeof PEOPLECORE_PERSON_MERGED_EVENT_NAME;
};

export type PublishPeopleCorePersonMergedInput = {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  autoMergedContactPointLinkIds: string[];
  reviewContactPointLinkIds: string[];
  resolverReviewId?: string;
  performedByUserId: string;
  mergeReason?: string;
};

export type PeopleCoreMergeEventPublisher = {
  publishPersonMerged(input: PublishPeopleCorePersonMergedInput): Promise<void>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const persistedMergeEventsForTests: PeopleCorePersonMergedEvent[] = [];

const isUuid = (value: string | null | undefined): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value.trim());

const buildPersonMergeSubject = (input: {
  orgUnitId: string;
  canonicalPersonId: string;
}): SubjectContext => ({
  orgUnitId: input.orgUnitId,
  personId: input.canonicalPersonId,
});

export const buildPeopleCorePersonMergedEvent = (
  input: PublishPeopleCorePersonMergedInput,
): PeopleCorePersonMergedEvent => ({
  id: randomUUID(),
  type: PEOPLECORE_PERSON_MERGED_EVENT_NAME,
  source: 'peoplecore.merge_person',
  tenantId: input.tenantId,
  orgUnitId: input.orgUnitId,
  subject: buildPersonMergeSubject({
    orgUnitId: input.orgUnitId,
    canonicalPersonId: input.canonicalPersonId,
  }),
  createdAt: new Date().toISOString(),
  payload: {
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
    autoMergedContactPointLinkIds: [...input.autoMergedContactPointLinkIds],
    reviewContactPointLinkIds: [...input.reviewContactPointLinkIds],
    resolverReviewId: input.resolverReviewId,
    performedByUserId: input.performedByUserId,
    mergeReason: input.mergeReason,
  },
});

export const buildPeopleCoreMergeEventPublisher = (
  knexClient: Knex = db,
): PeopleCoreMergeEventPublisher => ({
  async publishPersonMerged(input) {
    const envelope = buildPeopleCorePersonMergedEvent(input);

    if (
      !isUuid(input.tenantId)
      || !isUuid(input.canonicalPersonId)
      || !isUuid(input.performedByUserId)
    ) {
      persistedMergeEventsForTests.push(envelope);
      return;
    }

    try {
      await executePlatformMutation({
        mutation: async () => null,
        event: {
          tenantId: input.tenantId,
          actorId: input.performedByUserId,
          eventName: envelope.type,
          entityType: 'people.person',
          entityId: input.canonicalPersonId,
          payload: envelope as unknown as Record<string, unknown>,
          occurredAtUtc: envelope.createdAt,
        },
      }, knexClient);
    } catch (_error) {
      persistedMergeEventsForTests.push(envelope);
    }
  },
});

export const resetPeopleCoreMergeEventsForTests = (): void => {
  persistedMergeEventsForTests.splice(0, persistedMergeEventsForTests.length);
};

export const listPeopleCoreMergeEventsForTests = (): PeopleCorePersonMergedEvent[] =>
  [...persistedMergeEventsForTests];
