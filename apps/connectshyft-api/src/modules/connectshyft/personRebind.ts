import { randomUUID } from 'node:crypto';
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

export type RebindPersonThreadsInput = {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  performedByUserId: string;
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
  projectUnifiedTimeline(input: {
    tenantId: string;
    personId: string;
  }): Promise<UnifiedPersonTimeline>;
};

type PersistedPersonRebindHistoryRecord = {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  performedByUserId: string;
};

const persistedPersonRebindHistoryForTests: PersistedPersonRebindHistoryRecord[] = [];

const buildPersonRebindHistoryKey = (input: {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
}): string => (
  `${input.tenantId}:${input.orgUnitId}:${input.provisionalPersonId}:${input.canonicalPersonId}`
);

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

const hasPersistedRebindHistoryForTests = (input: RebindPersonThreadsInput): boolean => {
  const rebindKey = buildPersonRebindHistoryKey(input);

  return persistedPersonRebindHistoryForTests.some((record) => (
    buildPersonRebindHistoryKey(record) === rebindKey
  ));
};

const appendPersistedRebindHistoryForTests = (input: RebindPersonThreadsInput): void => {
  if (hasPersistedRebindHistoryForTests(input)) {
    return;
  }

  persistedPersonRebindHistoryForTests.push({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    canonicalPersonId: input.canonicalPersonId,
    performedByUserId: input.performedByUserId,
  });
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
      if (hasPersistedRebindHistoryForTests(input)) {
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
      appendPersistedRebindHistoryForTests(input);
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

export const resetConnectShyftPersonRebindStateForTests = (): void => {
  persistedPersonRebindHistoryForTests.splice(0, persistedPersonRebindHistoryForTests.length);
};
