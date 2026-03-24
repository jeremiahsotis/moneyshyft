// @ts-nocheck
import request from 'supertest';
import {
  loadConnectShyftBridgeAggregateBySessionId,
  resetConnectShyftBridgeSessionStateForTests,
  startConnectShyftBridgeSession,
} from '../../../../modules/connectshyft/bridgeSessions';
import {
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
} from '../../../../modules/connectshyft/canonicalEvents';
import {
  connectShyftCallServiceAsync,
  resetConnectShyftCallStateForTests,
} from '../../../../modules/connectshyft/calls';
import {
  connectShyftDeliveryAttemptServiceAsync,
  resetConnectShyftDeliveryAttemptStateForTests,
} from '../../../../modules/connectshyft/deliveryAttempts';
import { buildConnectShyftPersonRebindEventSubscriber } from '../../../../modules/connectshyft/events';
import {
  CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
} from '../../../../modules/connectshyft/inboundSms';
import { resetConnectShyftPersonRebindStateForTests } from '../../../../modules/connectshyft/personRebind';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import type { ConnectShyftProviderAdapter } from '../../../../modules/connectshyft/providerRegistry';
import {
  connectShyftThreadService,
  resetConnectShyftThreadStateForTests,
  type ConnectShyftThread,
} from '../../../../modules/connectshyft/threads';
import {
  CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
} from '../../../../modules/connectshyft/threadTimeline';
import {
  connectShyftVoicemailServiceAsync,
  resetConnectShyftVoicemailStateForTests,
} from '../../../../modules/connectshyft/voicemails';
import {
  buildPeopleCoreMergeEventPublisher,
  listPeopleCoreMergeEventsForTests,
  resetPeopleCoreMergeEventsForTests,
} from '../../../../modules/peoplecore/events';
import { postMergePerson } from '../../../../modules/peoplecore/handlers/postMergePerson';
import { peopleCoreServiceAsync } from '../../../../modules/peoplecore/service';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';
const PROVISIONAL_PERSON_ID = '11111111-1111-4111-8111-111111111111';
const CANONICAL_PERSON_ID = '22222222-2222-4222-8222-222222222222';
const MERGE_REASON = 'resolver-confirmed-duplicate';

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

const buildMergeTimelineApp = () => {
  const app = buildApp();
  app.post('/api/v1/peoplecore/persons/merge', postMergePerson);
  return app;
};

const buildThread = (input: {
  threadId: string;
  neighborId: string;
  personId: string;
  source?: string;
}): ConnectShyftThread => {
  const result = connectShyftThreadService.ensureThread({
    actorRoles: ['ORGUNIT_MEMBER'],
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
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
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  firstName: 'Pat',
  lastName: 'Shyft',
  status: input.status,
  mergedIntoPersonId: input.mergedIntoPersonId,
  createdAt: '2026-03-24T08:00:00.000Z',
  updatedAt: '2026-03-24T08:00:00.000Z',
});

const recordTimelineEvent = async (input: {
  threadId: string;
  eventType: string;
  occurredAtUtc: string;
  payload: Record<string, unknown>;
}) => recordConnectShyftCanonicalEvent({
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  aggregateId: input.threadId,
  aggregateType: 'Thread',
  eventType: input.eventType,
  occurredAtUtc: input.occurredAtUtc,
  payload: input.payload,
});

describe('peoplecore merge and connectshyft unified timeline routes', () => {
  registerProviderRegistryRouteIntegrationHooks();

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
    resetConnectShyftCanonicalEventsForTests();
    resetPeopleCoreMergeEventsForTests();
  });

  afterEach(() => {
    resetConnectShyftCanonicalEventsForTests();
    resetPeopleCoreMergeEventsForTests();
  });

  it('merges a person, rebinds thread and telephony artifacts, and returns a unified timeline projection', async () => {
    const mergedThread = buildThread({
      threadId: 'thread-person-merge-1001',
      neighborId: 'neighbor-person-merge-1001',
      personId: PROVISIONAL_PERSON_ID,
    });
    const canonicalThread = buildThread({
      threadId: 'thread-person-merge-1002',
      neighborId: 'neighbor-person-merge-1002',
      personId: CANONICAL_PERSON_ID,
    });
    const call = await connectShyftCallServiceAsync.createCall({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: mergedThread.threadId,
      personId: PROVISIONAL_PERSON_ID,
    });
    await connectShyftVoicemailServiceAsync.createVoicemail({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      callId: call.id,
      threadId: mergedThread.threadId,
      personId: PROVISIONAL_PERSON_ID,
      artifactId: 'artifact-person-merge-1001',
      recordingUrl: 'https://connectshyft.test/person-merge-voicemail-1001.mp3',
      recordingStatus: 'completed',
      occurredAtUtc: '2026-03-24T10:05:00.000Z',
    });
    await connectShyftDeliveryAttemptServiceAsync.createAttempt({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: mergedThread.threadId,
      personId: PROVISIONAL_PERSON_ID,
      callId: call.id,
      channel: 'voice',
      status: 'succeeded',
    });
    const bridgeSession = await startConnectShyftBridgeSession({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: mergedThread.threadId,
      personId: PROVISIONAL_PERSON_ID,
      operatorParticipantId: 'operator-person-merge-1001',
      neighborParticipantId: mergedThread.neighborId,
      operatorContactPointId: '+12605550155',
      neighborContactPointId: '+12605550111',
      selectedOutboundContactPointId: '+12605550191',
      providerKey: 'provider-a',
      providerAdapter,
    });
    await recordTimelineEvent({
      threadId: mergedThread.threadId,
      eventType: 'MessageQueued',
      occurredAtUtc: '2026-03-24T09:59:00.000Z',
      payload: {
        direction: 'outbound',
        channel: 'sms',
        actor: 'user',
        eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
        outboundMessageArtifact: {
          body: 'Merged person timeline item',
        },
      },
    });
    await recordTimelineEvent({
      threadId: canonicalThread.threadId,
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: '2026-03-24T10:00:00.000Z',
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        inboundMessageArtifact: {
          body: 'Canonical person timeline item',
        },
      },
    });

    const mergePersonSpy = jest.spyOn(peopleCoreServiceAsync, 'mergePerson').mockImplementation(
      async (input) => {
        await buildPeopleCoreMergeEventPublisher().publishPersonMerged({
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          provisionalPersonId: input.provisionalPersonId,
          canonicalPersonId: input.canonicalPersonId,
          performedByUserId: input.performedByUserId,
          mergeReason: input.mergeReason,
          autoMergedContactPointLinkIds: ['contact-link-auto-1001'],
          reviewContactPointLinkIds: [],
        });

        return {
          mergedProvisionalPersonId: input.provisionalPersonId,
          canonicalPersonId: input.canonicalPersonId,
          autoMergedContactPointLinkIds: ['contact-link-auto-1001'],
          reviewContactPointLinkIds: [],
          didPersistMerge: true,
        };
      },
    );
    const getPersonSpy = jest.spyOn(peopleCoreServiceAsync, 'getPerson').mockResolvedValue(
      buildPerson({
        id: CANONICAL_PERSON_ID,
        status: 'active_confirmed',
      }) as any,
    );
    const listPersonsSpy = jest.spyOn(peopleCoreServiceAsync, 'listPersons').mockResolvedValue([
      buildPerson({
        id: PROVISIONAL_PERSON_ID,
        status: 'merged',
        mergedIntoPersonId: CANONICAL_PERSON_ID,
      }) as any,
      buildPerson({
        id: CANONICAL_PERSON_ID,
        status: 'active_confirmed',
      }) as any,
    ]);

    try {
      const app = buildMergeTimelineApp();
      const mergeResponse = await request(app)
        .post('/api/v1/peoplecore/persons/merge')
        .set(buildHeaders())
        .send({
          provisionalPersonId: PROVISIONAL_PERSON_ID,
          canonicalPersonId: CANONICAL_PERSON_ID,
          mergeReason: MERGE_REASON,
        });

      expect(mergeResponse.status).toBe(200);
      expect(mergeResponse.body).toMatchObject({
        ok: true,
        code: 'PEOPLECORE_PERSON_MERGED',
        message: 'PeopleCore person merge complete',
        data: {
          mergedProvisionalPersonId: PROVISIONAL_PERSON_ID,
          canonicalPersonId: CANONICAL_PERSON_ID,
          autoMergedContactPointLinkIds: ['contact-link-auto-1001'],
          reviewContactPointLinkIds: [],
        },
      });
      expect(mergeResponse.body.data).not.toHaveProperty('resolverReviewId');

      const [mergeEvent] = listPeopleCoreMergeEventsForTests();
      expect(mergeEvent).toBeDefined();

      await buildConnectShyftPersonRebindEventSubscriber().handlePeopleCorePersonMerged(mergeEvent!);

      expect(
        connectShyftThreadService.findThreadById({
          tenantId: TEST_TENANT_ID,
          threadId: mergedThread.threadId,
        }),
      ).toMatchObject({
        threadId: mergedThread.threadId,
        personId: CANONICAL_PERSON_ID,
        originPersonId: PROVISIONAL_PERSON_ID,
      });

      expect(
        await connectShyftCallServiceAsync.listPersonCalls({
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          personId: PROVISIONAL_PERSON_ID,
        }),
      ).toEqual([]);
      expect(
        await connectShyftCallServiceAsync.listPersonCalls({
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          personId: CANONICAL_PERSON_ID,
        }),
      ).toEqual([
        expect.objectContaining({
          id: call.id,
          threadId: mergedThread.threadId,
          personId: CANONICAL_PERSON_ID,
        }),
      ]);
      expect(
        await connectShyftVoicemailServiceAsync.listCallVoicemails({
          tenantId: TEST_TENANT_ID,
          callId: call.id,
        }),
      ).toEqual([
        expect.objectContaining({
          callId: call.id,
          threadId: mergedThread.threadId,
          personId: CANONICAL_PERSON_ID,
        }),
      ]);
      expect(
        await connectShyftDeliveryAttemptServiceAsync.listPersonAttempts({
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          personId: CANONICAL_PERSON_ID,
        }),
      ).toEqual([
        expect.objectContaining({
          threadId: mergedThread.threadId,
          personId: CANONICAL_PERSON_ID,
          callId: call.id,
        }),
      ]);
      expect(
        await loadConnectShyftBridgeAggregateBySessionId(bridgeSession.aggregate.session.id),
      ).toMatchObject({
        session: expect.objectContaining({
          id: bridgeSession.aggregate.session.id,
          personId: CANONICAL_PERSON_ID,
        }),
      });

      const timelineResponse = await request(app)
        .get(`/api/v1/connectshyft/person/${CANONICAL_PERSON_ID}/unified-timeline`)
        .set(buildHeaders());

      expect(timelineResponse.status).toBe(200);
      expect(timelineResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_UNIFIED_TIMELINE_LOADED',
        data: {
          person_id: CANONICAL_PERSON_ID,
          merged_person_ids: [PROVISIONAL_PERSON_ID],
        },
      });
      expect(timelineResponse.body.data.items.length).toBeGreaterThanOrEqual(2);
      expect(timelineResponse.body.data.items).toEqual(expect.arrayContaining([
        expect.objectContaining({
          thread_id: mergedThread.threadId,
          type: 'message',
          direction: 'outbound',
          channel: 'sms',
          body: 'Merged person timeline item',
          occurred_at_utc: '2026-03-24T09:59:00.000Z',
          actor: 'user',
          person_context: {
            person_id: CANONICAL_PERSON_ID,
            origin_person_id: PROVISIONAL_PERSON_ID,
          },
        }),
        expect.objectContaining({
          thread_id: canonicalThread.threadId,
          type: 'message',
          direction: 'inbound',
          channel: 'sms',
          body: 'Canonical person timeline item',
          occurred_at_utc: '2026-03-24T10:00:00.000Z',
          actor: 'neighbor',
          person_context: {
            person_id: CANONICAL_PERSON_ID,
            origin_person_id: null,
          },
        }),
      ]));
    } finally {
      mergePersonSpy.mockRestore();
      getPersonSpy.mockRestore();
      listPersonsSpy.mockRestore();
    }
  });
});
