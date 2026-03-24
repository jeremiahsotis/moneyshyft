import { createHash, randomUUID } from 'node:crypto';
import type {
  ConnectShyftRebindReviewAffectedObjectType,
  ConnectShyftRebindReviewContext,
  ResolverActionType,
} from '@shyft/contracts';
import { isConnectShyftRebindReviewAffectedObjectType } from '@shyft/contracts';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { peopleCoreServiceAsync } from '../peoplecore/service';
import {
  connectShyftCallServiceAsync,
  KnexConnectShyftCallStore,
  type RebindCallPersonInput,
} from './calls';
import {
  rebindConnectShyftBridgeSessionPersonsAsync,
  type RebindConnectShyftBridgeSessionPersonInput,
} from './bridgeSessions';
import {
  connectShyftDeliveryAttemptServiceAsync,
  KnexConnectShyftDeliveryAttemptStore,
  type RebindDeliveryAttemptPersonInput,
} from './deliveryAttempts';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import {
  getThreadTimeline,
  type ConnectShyftThreadTimelineItem,
} from './threadTimeline';
import {
  connectShyftThreadService,
  connectShyftThreadServiceAsync,
  KnexConnectShyftThreadStore,
  type ConnectShyftRebindThreadPersonInput,
  type ConnectShyftThread,
} from './threads';
import {
  connectShyftVoicemailServiceAsync,
  KnexConnectShyftVoicemailStore,
  type RebindVoicemailPersonInput,
} from './voicemails';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const PERSON_REBIND_HISTORY_TABLE = 'person_rebind_history';
const PERSON_REBIND_HISTORY_UNIQUE_INDEX = [
  'tenant_id',
  'org_unit_id',
  'provisional_person_id',
  'canonical_person_id',
  'rebind_class',
];
const PERSON_REBIND_REVIEW_HISTORY_NAMESPACE = 'a275e6c3-bc1c-56c4-b5bd-01ef8217164c';

export type RebindPersonThreadsInput = {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  performedByUserId: string;
};

export type EnqueueRebindReviewInput = {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  performedByUserId: string;
  affectedObjectType: ConnectShyftRebindReviewAffectedObjectType;
  affectedObjectIds: string[];
  contactPointIds?: string[];
  originatingResolverReviewId?: string | null;
  originatingResolutionType?: ResolverActionType | null;
};

export type PersonRebindHistoryRecord = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  rebindClass: 'auto' | 'review';
  performedByUserId: string;
  createdAtUtc: string;
  reviewContext: ConnectShyftRebindReviewContext | null;
};

export type UnifiedPersonTimelineItem = ConnectShyftThreadTimelineItem & {
  personContext: {
    personId: string;
    originPersonId: string | null;
  };
};

export type UnifiedPersonTimeline = {
  tenantId: string;
  personId: string;
  mergedPersonIds: string[];
  items: UnifiedPersonTimelineItem[];
};

export type PersonRebindService = {
  rebindPersonThreads(input: RebindPersonThreadsInput): Promise<void>;
  enqueueRebindReview(input: EnqueueRebindReviewInput): Promise<PersonRebindHistoryRecord>;
  getRebindReviewContext(input: {
    tenantId: string;
    rebindHistoryId: string;
  }): Promise<ConnectShyftRebindReviewContext | null>;
  projectUnifiedTimeline(input: {
    tenantId: string;
    personId: string;
  }): Promise<UnifiedPersonTimeline>;
};

type PersistedPersonRebindHistoryRecord = PersonRebindHistoryRecord;

type PersonRebindReviewNotes = {
  affectedObjectType: ConnectShyftRebindReviewAffectedObjectType;
  affectedObjectIds: string[];
  contactPointIds: string[];
  originatingResolverReviewId: string | null;
  originatingResolutionType: ResolverActionType | null;
};

type DbPersonRebindHistoryRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  provisional_person_id: string;
  canonical_person_id: string;
  rebind_class: 'auto' | 'review';
  performed_by_user_id: string;
  created_at_utc: string | Date;
  notes: string | null;
};

const persistedPersonRebindHistoryForTests: PersistedPersonRebindHistoryRecord[] = [];

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const uniqueSortedStrings = (values: Iterable<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      Array.from(values)
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));

const toIsoUtc = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return new Date().toISOString();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const cloneRebindReviewContext = (
  reviewContext: ConnectShyftRebindReviewContext,
): ConnectShyftRebindReviewContext => ({
  ...reviewContext,
  affectedObjectIds: [...reviewContext.affectedObjectIds],
  contactPointIds: [...reviewContext.contactPointIds],
});

const clonePersonRebindHistoryRecord = (
  record: PersonRebindHistoryRecord,
): PersonRebindHistoryRecord => ({
  ...record,
  reviewContext: record.reviewContext
    ? cloneRebindReviewContext(record.reviewContext)
    : null,
});

const buildPersonRebindHistoryKey = (input: {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  rebindClass: 'auto' | 'review';
}): string => (
  [
    input.tenantId,
    input.orgUnitId,
    input.provisionalPersonId,
    input.canonicalPersonId,
    input.rebindClass,
  ].join(':')
);

const buildPersonRebindReviewHistoryId = (input: {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
}): string => (
  buildDeterministicUuid(
    PERSON_REBIND_REVIEW_HISTORY_NAMESPACE,
    buildPersonRebindHistoryKey({
      ...input,
      rebindClass: 'review',
    }),
  )
);

const buildDeterministicUuid = (namespace: string, value: string): string => {
  const digest = createHash('sha1')
    .update(`${namespace}:${value}`)
    .digest('hex')
    .slice(0, 32)
    .split('');

  digest[12] = '5';
  digest[16] = ((parseInt(digest[16] || '0', 16) & 0x3) | 0x8).toString(16);

  return [
    digest.slice(0, 8).join(''),
    digest.slice(8, 12).join(''),
    digest.slice(12, 16).join(''),
    digest.slice(16, 20).join(''),
    digest.slice(20, 32).join(''),
  ].join('-');
};

const compareUnifiedTimelineItems = (
  left: UnifiedPersonTimelineItem,
  right: UnifiedPersonTimelineItem,
): number => {
  const occurredAtDelta = (
    new Date(left.occurredAtUtc).getTime()
    - new Date(right.occurredAtUtc).getTime()
  );
  if (occurredAtDelta !== 0) {
    return occurredAtDelta;
  }

  return left.id.localeCompare(right.id);
};

const mapThreadTimelineToUnifiedItems = (
  thread: ConnectShyftThread,
  items: readonly ConnectShyftThreadTimelineItem[],
): UnifiedPersonTimelineItem[] => (
  items.map((item) => ({
    ...item,
    personContext: {
      personId: thread.personId,
      originPersonId: thread.originPersonId ?? null,
    },
  }))
);

const buildRebindInputs = (
  input: RebindPersonThreadsInput,
): {
  threads: ConnectShyftRebindThreadPersonInput;
  calls: RebindCallPersonInput;
  voicemails: RebindVoicemailPersonInput;
  deliveryAttempts: RebindDeliveryAttemptPersonInput;
  bridgeSessions: RebindConnectShyftBridgeSessionPersonInput;
} => ({
  threads: {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
  },
  calls: {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
  },
  voicemails: {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
  },
  deliveryAttempts: {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
  },
  bridgeSessions: {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
  },
});

const parseRebindReviewNotes = (value: unknown): PersonRebindReviewNotes | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>;
    if (!isConnectShyftRebindReviewAffectedObjectType(parsed.affectedObjectType)) {
      return null;
    }

    const originatingResolutionType = normalizeOptionalString(parsed.originatingResolutionType);

    return {
      affectedObjectType: parsed.affectedObjectType,
      affectedObjectIds: uniqueSortedStrings(
        Array.isArray(parsed.affectedObjectIds) ? parsed.affectedObjectIds : [],
      ),
      contactPointIds: uniqueSortedStrings(
        Array.isArray(parsed.contactPointIds) ? parsed.contactPointIds : [],
      ),
      originatingResolverReviewId: normalizeOptionalString(parsed.originatingResolverReviewId) ?? null,
      originatingResolutionType: (originatingResolutionType as ResolverActionType | undefined) ?? null,
    };
  } catch (_error) {
    return null;
  }
};

const serializeRebindReviewNotes = (notes: PersonRebindReviewNotes): string => JSON.stringify({
  affectedObjectType: notes.affectedObjectType,
  affectedObjectIds: notes.affectedObjectIds,
  contactPointIds: notes.contactPointIds,
  originatingResolverReviewId: notes.originatingResolverReviewId,
  originatingResolutionType: notes.originatingResolutionType,
});

const mergeRebindReviewNotes = (
  existingNotes: PersonRebindReviewNotes | null,
  input: EnqueueRebindReviewInput,
): PersonRebindReviewNotes => ({
  affectedObjectType: existingNotes?.affectedObjectType ?? input.affectedObjectType,
  affectedObjectIds: uniqueSortedStrings([
    ...(existingNotes?.affectedObjectIds ?? []),
    ...input.affectedObjectIds,
  ]),
  contactPointIds: uniqueSortedStrings([
    ...(existingNotes?.contactPointIds ?? []),
    ...(input.contactPointIds ?? []),
  ]),
  originatingResolverReviewId: existingNotes?.originatingResolverReviewId
    ?? normalizeOptionalString(input.originatingResolverReviewId)
    ?? null,
  originatingResolutionType: existingNotes?.originatingResolutionType
    ?? input.originatingResolutionType
    ?? null,
});

const buildRebindReviewContext = (
  row: Pick<
    PersonRebindHistoryRecord,
    'id' | 'provisionalPersonId' | 'canonicalPersonId' | 'rebindClass'
  >,
  notes: PersonRebindReviewNotes | null,
): ConnectShyftRebindReviewContext | null => {
  if (row.rebindClass !== 'review' || !notes) {
    return null;
  }

  return {
    rebindHistoryId: row.id,
    affectedObjectType: notes.affectedObjectType,
    affectedObjectIds: [...notes.affectedObjectIds],
    sourcePersonId: row.provisionalPersonId,
    targetPersonId: row.canonicalPersonId,
    contactPointIds: [...notes.contactPointIds],
    originatingResolverReviewId: notes.originatingResolverReviewId,
    originatingResolutionType: notes.originatingResolutionType,
  };
};

const mapPersonRebindHistoryRow = (
  row: DbPersonRebindHistoryRow,
): PersonRebindHistoryRecord => {
  const baseRecord: PersonRebindHistoryRecord = {
    id: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    provisionalPersonId: row.provisional_person_id,
    canonicalPersonId: row.canonical_person_id,
    rebindClass: row.rebind_class,
    performedByUserId: row.performed_by_user_id,
    createdAtUtc: toIsoUtc(row.created_at_utc),
    reviewContext: null,
  };

  return {
    ...baseRecord,
    reviewContext: buildRebindReviewContext(baseRecord, parseRebindReviewNotes(row.notes)),
  };
};

const findPersistedRebindHistoryForTests = (input: {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  rebindClass: 'auto' | 'review';
}): PersistedPersonRebindHistoryRecord | undefined => {
  const rebindKey = buildPersonRebindHistoryKey(input);

  return persistedPersonRebindHistoryForTests.find((record) => (
    buildPersonRebindHistoryKey(record) === rebindKey
  ));
};

const hasPersistedAutoRebindHistoryForTests = (input: RebindPersonThreadsInput): boolean => (
  Boolean(findPersistedRebindHistoryForTests({
    ...input,
    rebindClass: 'auto',
  }))
);

const appendPersistedAutoRebindHistoryForTests = (input: RebindPersonThreadsInput): void => {
  if (hasPersistedAutoRebindHistoryForTests(input)) {
    return;
  }

  persistedPersonRebindHistoryForTests.push({
    id: randomUUID(),
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
    rebindClass: 'auto',
    performedByUserId: input.performedByUserId,
    createdAtUtc: new Date().toISOString(),
    reviewContext: null,
  });
};

const upsertPersistedReviewRebindHistoryForTests = (
  input: EnqueueRebindReviewInput,
): PersonRebindHistoryRecord => {
  const existingRecord = findPersistedRebindHistoryForTests({
    ...input,
    rebindClass: 'review',
  });
  const mergedNotes = mergeRebindReviewNotes(existingRecord?.reviewContext
    ? {
      affectedObjectType: existingRecord.reviewContext.affectedObjectType,
      affectedObjectIds: existingRecord.reviewContext.affectedObjectIds,
      contactPointIds: existingRecord.reviewContext.contactPointIds,
      originatingResolverReviewId: existingRecord.reviewContext.originatingResolverReviewId,
      originatingResolutionType: existingRecord.reviewContext.originatingResolutionType,
    }
    : null, input);

  if (existingRecord) {
    existingRecord.performedByUserId = input.performedByUserId;
    existingRecord.reviewContext = buildRebindReviewContext(existingRecord, mergedNotes);
    return clonePersonRebindHistoryRecord(existingRecord);
  }

  const record: PersistedPersonRebindHistoryRecord = {
    id: buildPersonRebindReviewHistoryId(input),
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
    rebindClass: 'review',
    performedByUserId: input.performedByUserId,
    createdAtUtc: new Date().toISOString(),
    reviewContext: buildRebindReviewContext({
      id: buildPersonRebindReviewHistoryId(input),
      provisionalPersonId: input.provisionalPersonId,
      canonicalPersonId: input.canonicalPersonId,
      rebindClass: 'review',
    }, mergedNotes),
  };
  persistedPersonRebindHistoryForTests.push(record);
  return clonePersonRebindHistoryRecord(record);
};

const findPersistedRebindReviewContextForTests = (input: {
  tenantId: string;
  rebindHistoryId: string;
}): ConnectShyftRebindReviewContext | null => {
  const record = persistedPersonRebindHistoryForTests.find((candidate) => (
    candidate.tenantId === input.tenantId
    && candidate.id === input.rebindHistoryId
    && candidate.rebindClass === 'review'
  ));

  return record?.reviewContext
    ? cloneRebindReviewContext(record.reviewContext)
    : null;
};

const resolveUnifiedTimelinePersonIds = async (input: {
  tenantId: string;
  personId: string;
}): Promise<{
  personId: string;
  mergedPersonIds: string[];
  relevantPersonIds: string[];
}> => {
  const person = await peopleCoreServiceAsync.getPerson({
    tenantId: input.tenantId,
    personId: input.personId,
  });
  const canonicalPersonId = person?.mergedIntoPersonId || input.personId;
  const persons = await peopleCoreServiceAsync.listPersons({
    tenantId: input.tenantId,
    ...(person?.orgUnitId ? { orgUnitId: person.orgUnitId } : {}),
  });

  const mergedPersonIds = persons
    .filter((candidate) => candidate.mergedIntoPersonId === canonicalPersonId)
    .map((candidate) => candidate.id);

  return {
    personId: canonicalPersonId,
    mergedPersonIds,
    relevantPersonIds: Array.from(new Set([canonicalPersonId, ...mergedPersonIds])),
  };
};

const buildPersonRebindService = (
  knexClient: Knex = db,
): PersonRebindService => ({
  async rebindPersonThreads(input) {
    if (isConnectShyftTestOverrideEnabled()) {
      if (hasPersistedAutoRebindHistoryForTests(input)) {
        return;
      }

      const rebindInputs = buildRebindInputs(input);
      connectShyftThreadService.rebindPersonThreads(rebindInputs.threads);
      await connectShyftCallServiceAsync.rebindPersonCalls(rebindInputs.calls);
      await connectShyftVoicemailServiceAsync.rebindPersonVoicemails(rebindInputs.voicemails);
      await connectShyftDeliveryAttemptServiceAsync.rebindPersonAttempts(
        rebindInputs.deliveryAttempts,
      );
      await rebindConnectShyftBridgeSessionPersonsAsync(rebindInputs.bridgeSessions);
      appendPersistedAutoRebindHistoryForTests(input);
      return;
    }

    const rebindInputs = buildRebindInputs(input);

    await knexClient.transaction(async (trx) => {
      const threadStore = new KnexConnectShyftThreadStore(trx);
      const callStore = new KnexConnectShyftCallStore(trx);
      const voicemailStore = new KnexConnectShyftVoicemailStore(trx);
      const deliveryAttemptStore = new KnexConnectShyftDeliveryAttemptStore(trx);

      await threadStore.rebindPersonThreads(rebindInputs.threads);
      await callStore.rebindPersonCalls(rebindInputs.calls);
      await voicemailStore.rebindPersonVoicemails(rebindInputs.voicemails);
      await deliveryAttemptStore.rebindPersonAttempts(rebindInputs.deliveryAttempts);
      await rebindConnectShyftBridgeSessionPersonsAsync(rebindInputs.bridgeSessions, trx);

      await trx
        .withSchema(CONNECTSHYFT_SCHEMA)
        .table(PERSON_REBIND_HISTORY_TABLE)
        .insert({
          id: randomUUID(),
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
          provisional_person_id: input.provisionalPersonId,
          canonical_person_id: input.canonicalPersonId,
          rebind_class: 'auto',
          performed_by_user_id: input.performedByUserId,
          notes: null,
        })
        .onConflict(PERSON_REBIND_HISTORY_UNIQUE_INDEX)
        .ignore();
    });
  },

  async enqueueRebindReview(input) {
    const normalizedInput: EnqueueRebindReviewInput = {
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      provisionalPersonId: input.provisionalPersonId,
      canonicalPersonId: input.canonicalPersonId,
      performedByUserId: input.performedByUserId,
      affectedObjectType: input.affectedObjectType,
      affectedObjectIds: uniqueSortedStrings(input.affectedObjectIds),
      contactPointIds: uniqueSortedStrings(input.contactPointIds ?? []),
      originatingResolverReviewId: normalizeOptionalString(input.originatingResolverReviewId) ?? null,
      originatingResolutionType: input.originatingResolutionType ?? null,
    };

    if (normalizedInput.affectedObjectIds.length === 0) {
      throw new Error('Review-class rebind work requires at least one affected object.');
    }

    if (isConnectShyftTestOverrideEnabled()) {
      return upsertPersistedReviewRebindHistoryForTests(normalizedInput);
    }

    return knexClient.transaction(async (trx) => {
      const scope = {
        tenant_id: normalizedInput.tenantId,
        org_unit_id: normalizedInput.orgUnitId,
        provisional_person_id: normalizedInput.provisionalPersonId,
        canonical_person_id: normalizedInput.canonicalPersonId,
        rebind_class: 'review' as const,
      };
      const proposedNotes = mergeRebindReviewNotes(null, normalizedInput);

      await trx
        .withSchema(CONNECTSHYFT_SCHEMA)
        .table(PERSON_REBIND_HISTORY_TABLE)
        .insert({
          id: buildPersonRebindReviewHistoryId(normalizedInput),
          ...scope,
          performed_by_user_id: normalizedInput.performedByUserId,
          notes: serializeRebindReviewNotes(proposedNotes),
        })
        .onConflict(PERSON_REBIND_HISTORY_UNIQUE_INDEX)
        .ignore();

      const existingRow = await trx
        .withSchema(CONNECTSHYFT_SCHEMA)
        .table(PERSON_REBIND_HISTORY_TABLE)
        .where(scope)
        .first<DbPersonRebindHistoryRow>([
          'id',
          'tenant_id',
          'org_unit_id',
          'provisional_person_id',
          'canonical_person_id',
          'rebind_class',
          'performed_by_user_id',
          'created_at_utc',
          'notes',
        ]);

      if (!existingRow) {
        throw new Error('Unable to load persisted review-class rebind history.');
      }

      const mergedNotes = mergeRebindReviewNotes(
        parseRebindReviewNotes(existingRow.notes),
        normalizedInput,
      );
      const serializedMergedNotes = serializeRebindReviewNotes(mergedNotes);

      if (existingRow.notes !== serializedMergedNotes) {
        const [updatedRow] = await trx
          .withSchema(CONNECTSHYFT_SCHEMA)
          .table(PERSON_REBIND_HISTORY_TABLE)
          .where({ id: existingRow.id })
          .update({
            performed_by_user_id: normalizedInput.performedByUserId,
            notes: serializedMergedNotes,
          })
          .returning<DbPersonRebindHistoryRow[]>([
            'id',
            'tenant_id',
            'org_unit_id',
            'provisional_person_id',
            'canonical_person_id',
            'rebind_class',
            'performed_by_user_id',
            'created_at_utc',
            'notes',
          ]);

        return mapPersonRebindHistoryRow(updatedRow);
      }

      return mapPersonRebindHistoryRow(existingRow);
    });
  },

  async getRebindReviewContext(input) {
    const tenantId = normalizeOptionalString(input.tenantId);
    const rebindHistoryId = normalizeOptionalString(input.rebindHistoryId);
    if (!tenantId || !rebindHistoryId) {
      return null;
    }

    if (isConnectShyftTestOverrideEnabled()) {
      return findPersistedRebindReviewContextForTests({
        tenantId,
        rebindHistoryId,
      });
    }

    const row = await knexClient
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table(PERSON_REBIND_HISTORY_TABLE)
      .where({
        tenant_id: tenantId,
        id: rebindHistoryId,
        rebind_class: 'review',
      })
      .first<DbPersonRebindHistoryRow>([
        'id',
        'tenant_id',
        'org_unit_id',
        'provisional_person_id',
        'canonical_person_id',
        'rebind_class',
        'performed_by_user_id',
        'created_at_utc',
        'notes',
      ]);

    return row ? mapPersonRebindHistoryRow(row).reviewContext : null;
  },

  async projectUnifiedTimeline(input) {
    const resolved = await resolveUnifiedTimelinePersonIds(input);
    const threads = isConnectShyftTestOverrideEnabled()
      ? connectShyftThreadService.listThreadsByPersonIds({
        tenantId: input.tenantId,
        personIds: resolved.relevantPersonIds,
      })
      : await connectShyftThreadServiceAsync.listThreadsByPersonIds({
        tenantId: input.tenantId,
        personIds: resolved.relevantPersonIds,
      });
    const uniqueThreads = Array.from(
      threads.reduce((accumulator, thread) => accumulator.set(thread.threadId, thread), new Map<string, ConnectShyftThread>()).values(),
    );

    const timelines = await Promise.all(
      uniqueThreads.map(async (thread) => {
        const timeline = await getThreadTimeline({
          tenantId: input.tenantId,
          orgUnitId: thread.orgUnitId,
          threadId: thread.threadId,
        });

        return mapThreadTimelineToUnifiedItems(thread, timeline.items);
      }),
    );

    return {
      tenantId: input.tenantId,
      personId: resolved.personId,
      mergedPersonIds: resolved.mergedPersonIds,
      items: timelines.flat().sort(compareUnifiedTimelineItems),
    };
  },
});

export const personRebindServiceAsync = buildPersonRebindService();

export const listConnectShyftPersonRebindHistoryForTests = (): PersonRebindHistoryRecord[] =>
  persistedPersonRebindHistoryForTests.map(clonePersonRebindHistoryRecord);

export const resetConnectShyftPersonRebindStateForTests = (): void => {
  persistedPersonRebindHistoryForTests.splice(0, persistedPersonRebindHistoryForTests.length);
};
