import * as canonicalEventsModule from '../canonicalEvents';
import {
  loadConnectShyftBridgeAggregateBySessionId,
  resetConnectShyftBridgeSessionStateForTests,
  startConnectShyftBridgeSession,
} from '../bridgeSessions';
import {
  connectShyftCallServiceAsync,
  resetConnectShyftCallStateForTests,
} from '../calls';
import {
  connectShyftDeliveryAttemptServiceAsync,
  resetConnectShyftDeliveryAttemptStateForTests,
} from '../deliveryAttempts';
import {
  listConnectShyftPersonRebindHistoryForTests,
  personRebindServiceAsync,
  resetConnectShyftPersonRebindStateForTests,
} from '../personRebind';
import { resetConnectShyftProviderCorrelationStateForTests } from '../providerCorrelationMappings';
import type { ConnectShyftProviderAdapter } from '../providerRegistry';
import {
  connectShyftThreadService,
  resetConnectShyftThreadStateForTests,
  type ConnectShyftThread,
} from '../threads';
import {
  connectShyftVoicemailServiceAsync,
  resetConnectShyftVoicemailStateForTests,
} from '../voicemails';
import { peopleCoreServiceAsync } from '../../peoplecore/service';

const tenantId = 'tenant-connectshyft-rebind-f1';
const orgUnitId = 'org-connectshyft-rebind-f1-east';
const provisionalPersonId = 'person-connectshyft-rebind-provisional-1001';
const canonicalPersonId = 'person-connectshyft-rebind-canonical-1001';
const performedByUserId = 'user-connectshyft-rebind-operator-1001';

const sendSmsMock = jest.fn();
const startOutboundCallMock = jest.fn();
const startBridgeOutboundCallMock = jest.fn(async (input: { legRole: string; threadId: string }) => ({
  providerKey: 'provider-a',
  channel: 'call' as const,
  providerLegId: `${input.legRole}-provider-leg-${input.threadId}`,
  providerMessageId: null,
  providerRequestId: `req-${input.legRole}-${input.threadId}`,
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-24T12:00:00.000Z',
}));
const startBridgeSessionMock = jest.fn(async (input: { bridgeSessionId: string }) => ({
  providerKey: 'provider-a',
  bridgeSessionId: input.bridgeSessionId,
  bridgeEstablished: true as const,
  providerRequestId: 'req-bridge-session-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-24T12:01:00.000Z',
}));
const verifyWebhookMock = jest.fn(() => ({ ok: true as const }));
const endCallMock = jest.fn(async (input: { providerLegId: string }) => ({
  providerKey: 'provider-a',
  providerLegId: input.providerLegId,
  ended: true as const,
  providerRequestId: 'req-end-call-1001',
  adapterInvoked: true as const,
  providerBranchingInDomain: false as const,
  requestedAt: '2026-03-24T12:02:00.000Z',
}));
const translateProviderEventMock = jest.fn(() => ({
  eventType: 'CallAnswered',
  payload: {},
  correlation: {
    providerLegId: null,
    providerMessageId: null,
    providerEventId: null,
    providerNumber: null,
  },
  providerNeutral: true as const,
  providerSpecificFieldsStripped: true as const,
  providerBranchingInDomain: false as const,
}));

const providerAdapter: ConnectShyftProviderAdapter = {
  providerKey: 'provider-a',
  adapterInterfaceVersion: 'v1',
  sendSms: sendSmsMock,
  startOutboundCall: startOutboundCallMock,
  startBridgeOutboundCall: startBridgeOutboundCallMock,
  verifyWebhook: verifyWebhookMock,
  translateProviderEvent: translateProviderEventMock,
  startBridgeSession: startBridgeSessionMock,
  endCall: endCallMock,
};

const buildThread = (input: {
  threadId: string;
  neighborId: string;
  personId: string;
  source?: string;
}): ConnectShyftThread => {
  const result = connectShyftThreadService.ensureThread({
    actorRoles: ['ORGUNIT_MEMBER'],
    tenantId,
    orgUnitId,
    neighborId: input.neighborId,
    personId: input.personId,
    source: input.source ?? 'VOICE',
    threadId: input.threadId,
    lastInboundCsNumberId: `${input.threadId}-inbound-number`,
    preferredOutboundCsNumberId: `${input.threadId}-outbound-number`,
  });

  if (!result.ok) {
    throw new Error(`Expected ensureThread to succeed for ${input.threadId}.`);
  }

  return result.data.thread;
};

const buildPerson = (input: {
  id: string;
  status: 'active_confirmed' | 'active_provisional' | 'merged';
  mergedIntoPersonId?: string;
}) => ({
  id: input.id,
  tenantId,
  orgUnitId,
  firstName: 'Pat',
  lastName: 'Shyft',
  status: input.status,
  mergedIntoPersonId: input.mergedIntoPersonId,
  createdAt: '2026-03-24T08:00:00.000Z',
  updatedAt: '2026-03-24T08:00:00.000Z',
});

describe('connectshyft person rebinding', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    sendSmsMock.mockReset();
    startOutboundCallMock.mockReset();
    startBridgeOutboundCallMock.mockClear();
    startBridgeSessionMock.mockClear();
    verifyWebhookMock.mockClear();
    endCallMock.mockClear();
    translateProviderEventMock.mockClear();
    resetConnectShyftThreadStateForTests();
    resetConnectShyftCallStateForTests();
    resetConnectShyftVoicemailStateForTests();
    resetConnectShyftDeliveryAttemptStateForTests();
    resetConnectShyftBridgeSessionStateForTests();
    resetConnectShyftProviderCorrelationStateForTests();
    resetConnectShyftPersonRebindStateForTests();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags;
  });

  it('updates thread personId, sets originPersonId, and leaves the remaining thread fields untouched', async () => {
    const initialThread = buildThread({
      threadId: 'thread-rebind-1001',
      neighborId: 'neighbor-rebind-1001',
      personId: provisionalPersonId,
    });

    await personRebindServiceAsync.rebindPersonThreads({
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
    });

    const reboundThread = connectShyftThreadService.findThreadById({
      tenantId,
      threadId: initialThread.threadId,
    });

    expect(reboundThread).toMatchObject({
      threadId: initialThread.threadId,
      tenantId: initialThread.tenantId,
      orgUnitId: initialThread.orgUnitId,
      neighborId: initialThread.neighborId,
      personId: canonicalPersonId,
      originPersonId: provisionalPersonId,
      activityId: initialThread.activityId,
      source: initialThread.source,
      state: initialThread.state,
      lastInboundCsNumberId: initialThread.lastInboundCsNumberId,
      preferredOutboundCsNumberId: initialThread.preferredOutboundCsNumberId,
      claimedByUserId: initialThread.claimedByUserId,
      claimedAtUtc: initialThread.claimedAtUtc,
      closedByUserId: initialThread.closedByUserId,
      closedAtUtc: initialThread.closedAtUtc,
      createdAtUtc: initialThread.createdAtUtc,
      updatedAtUtc: initialThread.updatedAtUtc,
      escalation: initialThread.escalation,
    });
  });

  it('updates person_id on calls, voicemails, delivery attempts, and bridge sessions', async () => {
    const thread = buildThread({
      threadId: 'thread-rebind-telephony-1001',
      neighborId: 'neighbor-rebind-telephony-1001',
      personId: provisionalPersonId,
    });
    const call = await connectShyftCallServiceAsync.createCall({
      tenantId,
      orgUnitId,
      threadId: thread.threadId,
      personId: provisionalPersonId,
    });
    await connectShyftVoicemailServiceAsync.createVoicemail({
      tenantId,
      orgUnitId,
      callId: call.id,
      threadId: thread.threadId,
      personId: provisionalPersonId,
      artifactId: 'artifact-telephony-1001',
      recordingUrl: 'https://example.test/recording.mp3',
      recordingStatus: 'completed',
      occurredAtUtc: '2026-03-24T11:00:00.000Z',
    });
    await connectShyftDeliveryAttemptServiceAsync.createAttempt({
      tenantId,
      orgUnitId,
      threadId: thread.threadId,
      personId: provisionalPersonId,
      callId: call.id,
      channel: 'voice',
      status: 'succeeded',
    });
    const bridgeSession = await startConnectShyftBridgeSession({
      tenantId,
      orgUnitId,
      threadId: thread.threadId,
      personId: provisionalPersonId,
      operatorParticipantId: 'operator-rebind-1001',
      neighborParticipantId: thread.neighborId,
      operatorContactPointId: '+12605550155',
      neighborContactPointId: '+12605550111',
      selectedOutboundContactPointId: '+12605550191',
      providerKey: 'provider-a',
      providerAdapter,
    });

    await personRebindServiceAsync.rebindPersonThreads({
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
    });

    const reboundCall = await connectShyftCallServiceAsync.getCallById(call.id, tenantId);
    const reboundVoicemail = await connectShyftVoicemailServiceAsync.listCallVoicemails({
      tenantId,
      callId: call.id,
    });
    const canonicalAttempts = await connectShyftDeliveryAttemptServiceAsync.listPersonAttempts({
      tenantId,
      orgUnitId,
      personId: canonicalPersonId,
    });
    const provisionalAttempts = await connectShyftDeliveryAttemptServiceAsync.listPersonAttempts({
      tenantId,
      orgUnitId,
      personId: provisionalPersonId,
    });
    const reboundBridgeAggregate = await loadConnectShyftBridgeAggregateBySessionId(
      bridgeSession.aggregate.session.id,
    );

    expect(reboundCall?.personId).toBe(canonicalPersonId);
    expect(reboundVoicemail[0]?.personId).toBe(canonicalPersonId);
    expect(canonicalAttempts).toHaveLength(1);
    expect(canonicalAttempts[0]?.personId).toBe(canonicalPersonId);
    expect(provisionalAttempts).toEqual([]);
    expect(
      (reboundBridgeAggregate?.session as { personId?: string | null } | undefined)?.personId,
    ).toBe(canonicalPersonId);
  });

  it('is idempotent when the same provisional and canonical pair is rebound twice', async () => {
    const thread = buildThread({
      threadId: 'thread-rebind-idempotent-1001',
      neighborId: 'neighbor-rebind-idempotent-1001',
      personId: provisionalPersonId,
    });
    const call = await connectShyftCallServiceAsync.createCall({
      tenantId,
      orgUnitId,
      threadId: thread.threadId,
      personId: provisionalPersonId,
    });

    const input = {
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
    };

    await personRebindServiceAsync.rebindPersonThreads(input);

    const firstThreadState = connectShyftThreadService.findThreadById({
      tenantId,
      threadId: thread.threadId,
    });
    const firstCallState = await connectShyftCallServiceAsync.getCallById(call.id, tenantId);

    await personRebindServiceAsync.rebindPersonThreads(input);

    const secondThreadState = connectShyftThreadService.findThreadById({
      tenantId,
      threadId: thread.threadId,
    });
    const secondCallState = await connectShyftCallServiceAsync.getCallById(call.id, tenantId);

    expect(secondThreadState).toEqual(firstThreadState);
    expect(secondCallState).toEqual(firstCallState);
  });

  it('deduplicates review-class rebind history and preserves merged review context', async () => {
    const first = await personRebindServiceAsync.enqueueRebindReview({
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
      affectedObjectType: 'contact_point_link',
      affectedObjectIds: ['link-review-1'],
      contactPointIds: ['contact-point-1'],
      originatingResolverReviewId: 'resolver-review-1',
      originatingResolutionType: 'merge_people',
    });
    const second = await personRebindServiceAsync.enqueueRebindReview({
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
      affectedObjectType: 'contact_point_link',
      affectedObjectIds: ['link-review-1', 'link-review-2'],
      contactPointIds: ['contact-point-1', 'contact-point-2'],
      originatingResolverReviewId: 'resolver-review-1',
      originatingResolutionType: 'merge_people',
    });

    const history = listConnectShyftPersonRebindHistoryForTests();

    expect(first.id).toBe(second.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      rebindClass: 'review',
      provisionalPersonId,
      canonicalPersonId,
      reviewContext: {
        rebindHistoryId: first.id,
        affectedObjectType: 'contact_point_link',
        affectedObjectIds: ['link-review-1', 'link-review-2'],
        contactPointIds: ['contact-point-1', 'contact-point-2'],
        sourcePersonId: provisionalPersonId,
        targetPersonId: canonicalPersonId,
        originatingResolverReviewId: 'resolver-review-1',
        originatingResolutionType: 'merge_people',
      },
    });
  });

  it('loads structured review context for persisted review-class rebind history', async () => {
    const history = await personRebindServiceAsync.enqueueRebindReview({
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
      affectedObjectType: 'contact_point_link',
      affectedObjectIds: ['link-review-detail-1'],
      contactPointIds: ['contact-point-detail-1'],
      originatingResolverReviewId: 'resolver-review-detail-1',
      originatingResolutionType: 'merge_people',
    });

    const reviewContext = await personRebindServiceAsync.getRebindReviewContext({
      tenantId,
      rebindHistoryId: history.id,
    });

    expect(reviewContext).toEqual({
      rebindHistoryId: history.id,
      affectedObjectType: 'contact_point_link',
      affectedObjectIds: ['link-review-detail-1'],
      sourcePersonId: provisionalPersonId,
      targetPersonId: canonicalPersonId,
      contactPointIds: ['contact-point-detail-1'],
      originatingResolverReviewId: 'resolver-review-detail-1',
      originatingResolutionType: 'merge_people',
    });
  });

  it('returns a unified, ordered timeline spanning canonical and merged person history with origin context', async () => {
    const canonicalThread = buildThread({
      threadId: 'thread-unified-canonical-1001',
      neighborId: 'neighbor-unified-canonical-1001',
      personId: canonicalPersonId,
      source: 'SMS',
    });
    const mergedThread = buildThread({
      threadId: 'thread-unified-merged-1001',
      neighborId: 'neighbor-unified-merged-1001',
      personId: provisionalPersonId,
      source: 'SMS',
    });

    await personRebindServiceAsync.rebindPersonThreads({
      tenantId,
      orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId,
    });

    jest.spyOn(peopleCoreServiceAsync, 'getPerson').mockResolvedValue(
      buildPerson({
        id: canonicalPersonId,
        status: 'active_confirmed',
      }),
    );
    jest.spyOn(peopleCoreServiceAsync, 'listPersons').mockResolvedValue([
      buildPerson({
        id: canonicalPersonId,
        status: 'active_confirmed',
      }),
      buildPerson({
        id: provisionalPersonId,
        status: 'merged',
        mergedIntoPersonId: canonicalPersonId,
      }),
    ]);
    jest.spyOn(canonicalEventsModule, 'listConnectShyftCanonicalEvents').mockImplementation(
      async (input) => {
        if (input.aggregateId === mergedThread.threadId) {
          return [
            {
              eventId: 'event-merged-1001',
              aggregateId: mergedThread.threadId,
              aggregateType: 'Thread',
              eventType: 'connectshyft.thread.outbound_message_dispatched',
              occurredAtUtc: '2026-03-24T09:59:00.000Z',
              payload: {
                direction: 'outbound',
                channel: 'sms',
                actor: 'user',
                eventName: 'connectshyft.thread.outbound_message_dispatched',
                outboundMessageArtifact: {
                  body: 'Merged person timeline item',
                },
              },
            },
          ];
        }

        if (input.aggregateId === canonicalThread.threadId) {
          return [
            {
              eventId: 'event-canonical-1001',
              aggregateId: canonicalThread.threadId,
              aggregateType: 'Thread',
              eventType: 'connectshyft.inbound.sms_appended',
              occurredAtUtc: '2026-03-24T10:00:00.000Z',
              payload: {
                direction: 'inbound',
                channel: 'sms',
                actor: 'neighbor',
                eventName: 'connectshyft.inbound.sms_appended',
                inboundMessageArtifact: {
                  body: 'Canonical person timeline item',
                },
              },
            },
          ];
        }

        return [];
      },
    );

    const timeline = await personRebindServiceAsync.projectUnifiedTimeline({
      tenantId,
      personId: canonicalPersonId,
    });

    expect(timeline.personId).toBe(canonicalPersonId);
    expect(timeline.mergedPersonIds).toEqual([provisionalPersonId]);
    expect(timeline.items.map((item) => item.id)).toEqual([
      'event-merged-1001',
      'event-canonical-1001',
    ]);
    expect(timeline.items[0]).toMatchObject({
      threadId: mergedThread.threadId,
      personContext: {
        personId: canonicalPersonId,
        originPersonId: provisionalPersonId,
      },
    });
    expect(timeline.items[1]).toMatchObject({
      threadId: canonicalThread.threadId,
      personContext: {
        personId: canonicalPersonId,
        originPersonId: null,
      },
    });
  });
});
