// @ts-nocheck
import request from 'supertest';
import * as BridgeSessionsModule from '../../../../modules/connectshyft/bridgeSessions';
import {
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
} from '../../../../modules/connectshyft/canonicalEvents';
import { CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME } from '../../../../modules/connectshyft/inboundSms';
import { CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME } from '../../../../modules/connectshyft/inboundVoice';
import * as ReadContractsModule from '../../../../modules/connectshyft/readContracts';
import { CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME } from '../../../../modules/connectshyft/threadTimeline';
import {
  connectShyftVoicemailServiceAsync,
  resetConnectShyftVoicemailStateForTests,
} from '../../../../modules/connectshyft/voicemails';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';

const buildThreadDetailRecord = (overrides: Record<string, unknown> = {}) => ({
  threadId: 'thread-timeline-characterization-1001',
  neighborId: 'neighbor-timeline-characterization-1001',
  neighborDeleted: false,
  neighbor_deleted: false,
  neighborDeletedAtUtc: null,
  neighbor_deleted_at_utc: null,
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  state: 'CLAIMED',
  claimedByUserId: 'user-connectshyft-f1-operator',
  claimed_by_user_id: 'user-connectshyft-f1-operator',
  bucket: 'mine',
  escalationStage: 1,
  isNewUnread: false,
  priorityRank: 3,
  urgencyLabel: 'Needs attention soon',
  lastActivityAtUtc: '2026-03-19T10:05:00.000Z',
  lastInboundCsNumberId: 'cs-number-1001',
  last_inbound_cs_number_id: 'cs-number-1001',
  preferredOutboundCsNumberId: 'cs-number-2001',
  preferred_outbound_cs_number_id: 'cs-number-2001',
  preferredOutboundContext: {
    csNumberId: 'cs-number-2001',
    label: 'Primary Queue',
  },
  preferred_outbound_context: {
    cs_number_id: 'cs-number-2001',
    label: 'Primary Queue',
  },
  voicemailIndicator: false,
  voicemailLabel: null,
  summary: 'Thread timeline characterization baseline',
  actions: ['Call', 'Text', 'Close'],
  lifecycle: {
    reopenedByInbound: false,
  },
  ...overrides,
});

const buildBridgeSessionAggregate = (overrides: Record<string, unknown> = {}) => ({
  session: {
    id: 'bridge-session-timeline-1001',
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    threadId: 'thread-timeline-characterization-1001',
    operatorParticipantId: 'user-connectshyft-f1-operator',
    neighborParticipantId: 'neighbor-timeline-characterization-1001',
    operatorContactPointId: '+12605550155',
    neighborContactPointId: '+12605550111',
    selectedOutboundContactPointId: '+12605550191',
    status: 'neighbor_dialing',
    failureCode: null,
    failureMessage: null,
    endedBy: null,
    idempotencyKey: null,
    auditCorrelationId: null,
    createdAt: new Date('2026-03-19T10:00:00.000Z'),
    updatedAt: new Date('2026-03-19T10:03:00.000Z'),
    completedAt: null,
    voicemailArtifactId: 'vm-thread-timeline-characterization-1001-provider-event-outbound-voicemail-1001',
    voicemailRecordingUrl: 'https://connectshyft.test/outbound-voicemail-timeline-1001.mp3',
    voicemailRecordingStatus: 'completed',
    ...overrides,
  },
  operatorLeg: {
    id: 'bridge-leg-operator-timeline-1001',
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bridgeSessionId: 'bridge-session-timeline-1001',
    legRole: 'operator',
    contactPointId: '+12605550155',
    providerCallId: 'provider-leg-operator-timeline-1001',
    providerCallControlId: 'provider-leg-operator-timeline-1001',
    status: 'answered',
    startedAt: new Date('2026-03-19T10:00:00.000Z'),
    answeredAt: new Date('2026-03-19T10:00:05.000Z'),
    endedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-03-19T10:00:00.000Z'),
    updatedAt: new Date('2026-03-19T10:03:00.000Z'),
  },
  neighborLeg: {
    id: 'bridge-leg-neighbor-timeline-1001',
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bridgeSessionId: 'bridge-session-timeline-1001',
    legRole: 'neighbor',
    contactPointId: '+12605550111',
    providerCallId: 'provider-leg-neighbor-timeline-1001',
    providerCallControlId: 'provider-leg-neighbor-timeline-1001',
    status: 'ringing',
    startedAt: new Date('2026-03-19T10:00:10.000Z'),
    answeredAt: null,
    endedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-03-19T10:00:10.000Z'),
    updatedAt: new Date('2026-03-19T10:03:00.000Z'),
  },
} as any);

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

describe('connectshyft thread timeline route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  beforeEach(() => {
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftVoicemailStateForTests();
  });

  afterEach(() => {
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftVoicemailStateForTests();
    jest.restoreAllMocks();
  });

  it('returns the current timeline response shape in chronological order for sms and voicemail items', async () => {
    const threadId = 'thread-timeline-characterization-1001';
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId,
      neighborId: 'neighbor-timeline-characterization-1001',
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    await recordTimelineEvent({
      threadId,
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: '2026-03-19T10:00:00.000Z',
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        inboundMessageArtifact: {
          body: 'Inbound first',
        },
      },
    });
    await recordTimelineEvent({
      threadId,
      eventType: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      occurredAtUtc: '2026-03-19T10:01:00.000Z',
      payload: {
        direction: 'inbound',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
        voicemailArtifact: {
          recordingUrl: 'https://connectshyft.test/voicemail-characterization-1001.mp3',
          durationSeconds: 47,
          transcription: {
            text: 'Please call me back.',
          },
        },
      },
    });
    await recordTimelineEvent({
      threadId,
      eventType: 'MessageQueued',
      occurredAtUtc: '2026-03-19T10:02:00.000Z',
      payload: {
        direction: 'outbound',
        channel: 'sms',
        actor: 'user',
        eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
        outboundMessageArtifact: {
          body: 'Outbound second',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}/timeline`)
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
      data: {
        thread_id: threadId,
        neighbor_deleted: false,
        neighbor_deleted_at_utc: null,
        deterministic: true,
        limit_applied: 200,
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'deterministic',
      'items',
      'limit_applied',
      'neighbor_deleted',
      'neighbor_deleted_at_utc',
      'thread_id',
    ].sort());
    expect(Object.keys(response.body.data.items[0]).sort()).toEqual([
      'actor',
      'body',
      'channel',
      'delivery_status',
      'direction',
      'id',
      'occurred_at_utc',
      'provider_metadata',
      'thread_id',
      'type',
    ].sort());
    expect(Object.keys(response.body.data.items[1]).sort()).toEqual([
      'actor',
      'body',
      'channel',
      'delivery_status',
      'direction',
      'duration_seconds',
      'id',
      'occurred_at_utc',
      'provider_metadata',
      'recording_url',
      'recording_status',
      'reviewed_at_utc',
      'seen_at_utc',
      'thread_id',
      'transcript',
      'transcription_status',
      'transcription_text',
      'type',
    ].sort());
    expect(response.body.data.items).toEqual([
      expect.objectContaining({
        thread_id: threadId,
        type: 'message',
        direction: 'inbound',
        channel: 'sms',
        body: 'Inbound first',
        occurred_at_utc: '2026-03-19T10:00:00.000Z',
        actor: 'neighbor',
      }),
      expect.objectContaining({
        thread_id: threadId,
        type: 'voicemail',
        direction: 'inbound',
        channel: 'voicemail',
        body: null,
        occurred_at_utc: '2026-03-19T10:01:00.000Z',
        actor: 'neighbor',
        recording_url: 'https://connectshyft.test/voicemail-characterization-1001.mp3',
        recording_status: 'completed',
        duration_seconds: 47,
        transcript: 'Please call me back.',
        transcription_text: 'Please call me back.',
        transcription_status: 'completed',
        seen_at_utc: null,
        reviewed_at_utc: null,
      }),
      expect.objectContaining({
        thread_id: threadId,
        type: 'message',
        direction: 'outbound',
        channel: 'sms',
        body: 'Outbound second',
        occurred_at_utc: '2026-03-19T10:02:00.000Z',
        actor: 'user',
      }),
    ]);
    expect(response.body.data.items.map((item) => item.type)).toEqual([
      'message',
      'voicemail',
      'message',
    ]);
  });

  it('projects outbound voicemail bridge-session recordings as first-class voicemail timeline items', async () => {
    const threadId = 'thread-timeline-outbound-voicemail-1002';
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId,
      neighborId: 'neighbor-timeline-outbound-voicemail-1002',
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(buildBridgeSessionAggregate({
      id: 'bridge-session-timeline-outbound-1002',
      threadId,
      neighborParticipantId: 'neighbor-timeline-outbound-voicemail-1002',
      voicemailArtifactId: 'vm-thread-timeline-outbound-voicemail-1002-provider-event-outbound-voicemail-1002',
      voicemailRecordingUrl: 'https://connectshyft.test/outbound-voicemail-timeline-1002.mp3',
      voicemailRecordingStatus: 'completed',
      updatedAt: new Date('2026-03-19T10:06:00.000Z'),
    }) as any);

    const app = buildApp();
    const response = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}/timeline`)
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
      data: {
        thread_id: threadId,
        items: [
          expect.objectContaining({
            thread_id: threadId,
            type: 'voicemail',
            direction: 'outbound',
            channel: 'voicemail',
            body: null,
            occurred_at_utc: '2026-03-19T10:06:00.000Z',
            actor: 'system',
            recording_url: 'https://connectshyft.test/outbound-voicemail-timeline-1002.mp3',
            recording_status: 'completed',
            reviewed_at_utc: '2026-03-19T10:06:00.000Z',
            seen_at_utc: '2026-03-19T10:06:00.000Z',
            duration_seconds: null,
            transcript: null,
            transcription_text: null,
            transcription_status: null,
          }),
        ],
      },
    });
  });

  it('applies the current deterministic most-recent limit window', async () => {
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockImplementation(async ({ threadId }) => buildThreadDetailRecord({ threadId }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    await recordTimelineEvent({
      threadId: 'thread-timeline-limit-1001',
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: '2026-03-19T10:00:00.000Z',
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        inboundMessageArtifact: {
          body: 'oldest',
        },
      },
    });
    await recordTimelineEvent({
      threadId: 'thread-timeline-limit-1001',
      eventType: 'MessageQueued',
      occurredAtUtc: '2026-03-19T10:01:00.000Z',
      payload: {
        direction: 'outbound',
        channel: 'sms',
        actor: 'user',
        eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
        outboundMessageArtifact: {
          body: 'middle',
        },
      },
    });
    await recordTimelineEvent({
      threadId: 'thread-timeline-limit-1001',
      eventType: 'MessageQueued',
      occurredAtUtc: '2026-03-19T10:02:00.000Z',
      payload: {
        direction: 'outbound',
        channel: 'sms',
        actor: 'user',
        eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
        outboundMessageArtifact: {
          body: 'newest',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-timeline-limit-1001/timeline')
      .query({
        limit: '2',
      })
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
      data: {
        thread_id: 'thread-timeline-limit-1001',
        deterministic: true,
        limit_applied: 2,
      },
    });
    expect(response.body.data.items.map((item) => item.body)).toEqual([
      'middle',
      'newest',
    ]);
  });

  it('marks inbound persisted voicemails seen on thread open without changing the first seen timestamp on repeat loads', async () => {
    const threadId = 'thread-timeline-seen-1001';
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId,
      neighborId: 'neighbor-timeline-seen-1001',
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId,
      personId: 'person-timeline-seen-1001',
      artifactId: 'artifact-timeline-seen-1001',
      direction: 'inbound',
      recordingUrl: 'https://connectshyft.test/timeline-seen-1001.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-timeline-seen-1001',
      occurredAtUtc: '2026-03-19T10:04:00.000Z',
    });

    const app = buildApp();
    const firstResponse = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}/timeline`)
      .set(buildHeaders());
    const firstSeenAtUtc = firstResponse.body.data.items[0].seen_at_utc;
    const secondResponse = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}/timeline`)
      .set(buildHeaders());

    expect(firstResponse.status).toBe(200);
    expect(firstSeenAtUtc).toEqual(expect.any(String));
    expect(firstResponse.body.data.items).toEqual([
      expect.objectContaining({
        type: 'voicemail',
        direction: 'inbound',
        seen_at_utc: firstSeenAtUtc,
        reviewed_at_utc: null,
      }),
    ]);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.data.items[0].seen_at_utc).toBe(firstSeenAtUtc);
    expect(secondResponse.body.data.items[0].reviewed_at_utc).toBeNull();
  });

  it('returns deleted-neighbor timeline metadata only through includeDeleted=true', async () => {
    const resolveThreadSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockImplementation(async ({ threadId, includeDeleted }) => {
      if (threadId !== 'thread-soft-delete-timeline-1001') {
        return null;
      }

      if (includeDeleted !== true) {
        return null;
      }

      return buildThreadDetailRecord({
        threadId,
        neighborId: 'neighbor-soft-delete-timeline-1001',
        neighborDeleted: true,
        neighbor_deleted: true,
        neighborDeletedAtUtc: '2026-03-19T10:00:00.000Z',
        neighbor_deleted_at_utc: '2026-03-19T10:00:00.000Z',
      }) as any;
    });
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    await recordTimelineEvent({
      threadId: 'thread-soft-delete-timeline-1001',
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: '2026-03-19T10:01:00.000Z',
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        inboundMessageArtifact: {
          body: 'Deleted neighbor history',
        },
      },
    });

    const app = buildApp();
    const hiddenResponse = await request(app)
      .get('/api/v1/connectshyft/threads/thread-soft-delete-timeline-1001/timeline')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));
    const visibleResponse = await request(app)
      .get('/api/v1/connectshyft/threads/thread-soft-delete-timeline-1001/timeline')
      .query({
        includeDeleted: 'true',
      })
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(hiddenResponse.status).toBe(200);
    expect(hiddenResponse.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
    });

    expect(visibleResponse.status).toBe(200);
    expect(visibleResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
      data: {
        thread_id: 'thread-soft-delete-timeline-1001',
        neighbor_deleted: true,
        neighbor_deleted_at_utc: '2026-03-19T10:00:00.000Z',
        items: [
          expect.objectContaining({
            body: 'Deleted neighbor history',
          }),
        ],
      },
    });
    expect(resolveThreadSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: 'thread-soft-delete-timeline-1001',
      includeDeleted: true,
    }));
  });
});
