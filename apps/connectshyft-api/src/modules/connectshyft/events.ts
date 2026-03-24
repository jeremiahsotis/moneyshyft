import type { Knex } from 'knex';
import db from '../../config/knex';
import { executePlatformMutation } from '../../platform/mutations/executePlatformMutation';
import {
  PEOPLECORE_PERSON_MERGED_EVENT_NAME,
  type PeopleCorePersonMergedEvent,
} from '../peoplecore/events';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import { personRebindServiceAsync, type PersonRebindService } from './personRebind';
import type { Call, CallStatus } from './calls';
import type { Voicemail } from './voicemails';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CONNECTSHYFT_CALL_STARTED_EVENT_NAME = 'connectshyft.call.started' as const;
export const CONNECTSHYFT_CALL_UPDATED_EVENT_NAME = 'connectshyft.call.updated' as const;
export const CONNECTSHYFT_VOICEMAIL_RECORDED_EVENT_NAME = 'connectshyft.voicemail.recorded' as const;

export type ConnectShyftPersistedLifecycleEvent = {
  id: string;
  eventName: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
};

export type ConnectShyftCallLifecycleEventPublisher = {
  publishCallStarted(input: {
    tenantId: string;
    call: Call;
    actorUserId?: string | null;
  }): Promise<void>;
  publishCallUpdated(input: {
    tenantId: string;
    call: Call;
    actorUserId?: string | null;
  }): Promise<void>;
  publishVoicemailRecorded(input: {
    tenantId: string;
    voicemail: Voicemail;
    actorUserId?: string | null;
  }): Promise<void>;
};

export type ConnectShyftPersonRebindEventSubscriber = {
  handlePeopleCorePersonMerged(event: PeopleCorePersonMergedEvent): Promise<void>;
};

const persistedLifecycleEventsForTests: ConnectShyftPersistedLifecycleEvent[] = [];

const isUuid = (value: string | null | undefined): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value.trim());

const resolveCallStatusEvents = (call: Call): Array<{ status: CallStatus; occurredAtUtc: string }> => {
  const events: Array<{ status: CallStatus; occurredAtUtc: string }> = [
    {
      status: 'operator_dialing',
      occurredAtUtc: call.startedAtUtc,
    },
  ];

  if (call.operatorAnsweredAtUtc) {
    events.push({
      status: 'operator_answered',
      occurredAtUtc: call.operatorAnsweredAtUtc,
    });
    events.push({
      status: 'neighbor_dialing',
      occurredAtUtc: call.operatorAnsweredAtUtc,
    });
  }

  if (call.neighborAnsweredAtUtc) {
    events.push({
      status: 'neighbor_answered',
      occurredAtUtc: call.neighborAnsweredAtUtc,
    });
  }

  if (call.bridgedAtUtc) {
    events.push({
      status: 'bridged',
      occurredAtUtc: call.bridgedAtUtc,
    });
  }

  if (
    call.status === 'voicemail'
    || call.status === 'completed'
    || call.status === 'failed'
    || call.status === 'canceled'
    || call.status === 'expired'
  ) {
    events.push({
      status: call.status,
      occurredAtUtc: call.endedAtUtc || call.updatedAtUtc,
    });
  }

  return events;
};

const buildCallLifecycleEventPayload = (call: Call): Record<string, unknown> => ({
  callId: call.id,
  threadId: call.threadId,
  personId: call.personId,
  bridgeSessionId: call.bridgeSessionId,
  status: call.status,
  startedAtUtc: call.startedAtUtc,
  operatorAnsweredAtUtc: call.operatorAnsweredAtUtc,
  neighborAnsweredAtUtc: call.neighborAnsweredAtUtc,
  bridgedAtUtc: call.bridgedAtUtc,
  endedAtUtc: call.endedAtUtc,
  failureCode: call.failureCode,
  failureMessage: call.failureMessage,
  statusEvents: resolveCallStatusEvents(call),
});

const buildVoicemailLifecycleEventPayload = (
  voicemail: Voicemail,
): Record<string, unknown> => ({
  voicemailId: voicemail.id,
  callId: voicemail.callId,
  threadId: voicemail.threadId,
  personId: voicemail.personId,
  recordingUrl: voicemail.recordingUrl,
  recordingStatus: voicemail.recordingStatus,
  occurredAtUtc: voicemail.occurredAtUtc,
});

const publishBestEffortLifecycleEvent = async (input: {
  tenantId: string;
  actorUserId?: string | null;
  eventName: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  knexClient: Knex;
}): Promise<void> => {
  if (
    isConnectShyftTestOverrideEnabled()
    || !isUuid(input.tenantId)
    || !isUuid(input.entityId)
    || (input.actorUserId != null && !isUuid(input.actorUserId))
  ) {
    persistedLifecycleEventsForTests.push({
      id: `${input.eventName}:${input.entityId}:${persistedLifecycleEventsForTests.length + 1}`,
      eventName: input.eventName,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
    });
    return;
  }

  try {
    await executePlatformMutation({
      mutation: async () => null,
      event: {
        tenantId: input.tenantId,
        actorId: input.actorUserId ?? null,
        eventName: input.eventName,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload,
        occurredAtUtc: new Date(),
      },
    }, input.knexClient);
  } catch (_error) {
    // Event emission remains best-effort so lifecycle persistence keeps its existing behavior.
  }
};

export const buildConnectShyftLifecycleEventPublisher = (
  knexClient: Knex = db,
): ConnectShyftCallLifecycleEventPublisher => ({
  publishCallStarted(input) {
    return publishBestEffortLifecycleEvent({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventName: CONNECTSHYFT_CALL_STARTED_EVENT_NAME,
      entityType: 'connectshyft.call',
      entityId: input.call.id,
      payload: buildCallLifecycleEventPayload(input.call),
      knexClient,
    });
  },
  publishCallUpdated(input) {
    return publishBestEffortLifecycleEvent({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventName: CONNECTSHYFT_CALL_UPDATED_EVENT_NAME,
      entityType: 'connectshyft.call',
      entityId: input.call.id,
      payload: buildCallLifecycleEventPayload(input.call),
      knexClient,
    });
  },
  publishVoicemailRecorded(input) {
    return publishBestEffortLifecycleEvent({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventName: CONNECTSHYFT_VOICEMAIL_RECORDED_EVENT_NAME,
      entityType: 'connectshyft.voicemail',
      entityId: input.voicemail.id,
      payload: buildVoicemailLifecycleEventPayload(input.voicemail),
      knexClient,
    });
  },
});

export const buildConnectShyftPersonRebindEventSubscriber = (
  personRebindService: Pick<PersonRebindService, 'rebindPersonThreads'> = personRebindServiceAsync,
): ConnectShyftPersonRebindEventSubscriber => ({
  async handlePeopleCorePersonMerged(event) {
    if (event.type !== PEOPLECORE_PERSON_MERGED_EVENT_NAME) {
      return;
    }

    if (event.payload.reviewContactPointLinkIds.length > 0) {
      return;
    }

    await personRebindService.rebindPersonThreads({
      tenantId: event.tenantId,
      orgUnitId: event.orgUnitId,
      provisionalPersonId: event.payload.provisionalPersonId,
      canonicalPersonId: event.payload.canonicalPersonId,
      performedByUserId: event.payload.performedByUserId,
    });
  },
});

export const resetConnectShyftLifecycleEventsForTests = (): void => {
  persistedLifecycleEventsForTests.splice(0, persistedLifecycleEventsForTests.length);
};

export const listConnectShyftLifecycleEventsForTests = (): ConnectShyftPersistedLifecycleEvent[] =>
  [...persistedLifecycleEventsForTests];
