// @ts-nocheck
import request from 'supertest';
import * as BridgeSessionsModule from '../../../../modules/connectshyft/bridgeSessions';
import {
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
} from '../../../../modules/connectshyft/canonicalEvents';
import { CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME } from '../../../../modules/connectshyft/inboundSms';
import * as ReadContractsModule from '../../../../modules/connectshyft/readContracts';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';

const buildThreadDetailRecord = (overrides: Record<string, unknown> = {}) => ({
  threadId: 'thread-detail-characterization-1001',
  neighborId: 'neighbor-detail-characterization-1001',
  personId: 'person-detail-characterization-1001',
  identityState: 'confirmed',
  subjectContext: {
    orgUnitId: TEST_ORG_UNIT_ID,
    personId: 'person-detail-characterization-1001',
  },
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
  summary: 'Thread detail characterization baseline',
  actions: ['Call', 'Text', 'Close'],
  lifecycle: {
    reopenedByInbound: false,
  },
  ...overrides,
});

const buildBridgeSessionAggregate = (overrides: Record<string, unknown> = {}) => ({
  session: {
    id: 'bridge-session-detail-1001',
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    threadId: 'thread-detail-characterization-1001',
    operatorParticipantId: 'user-connectshyft-f1-operator',
    neighborParticipantId: 'neighbor-detail-characterization-1001',
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
    voicemailArtifactId: 'vm-thread-detail-characterization-1001-provider-event-outbound-voicemail-1001',
    voicemailRecordingUrl: 'https://connectshyft.test/outbound-voicemail-detail-1001.mp3',
    voicemailRecordingStatus: 'completed',
    ...overrides,
  },
  operatorLeg: {
    id: 'bridge-leg-operator-detail-1001',
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bridgeSessionId: 'bridge-session-detail-1001',
    legRole: 'operator',
    contactPointId: '+12605550155',
    providerCallId: 'provider-leg-operator-detail-1001',
    providerCallControlId: 'provider-leg-operator-detail-1001',
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
    id: 'bridge-leg-neighbor-detail-1001',
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bridgeSessionId: 'bridge-session-detail-1001',
    legRole: 'neighbor',
    contactPointId: '+12605550111',
    providerCallId: 'provider-leg-neighbor-detail-1001',
    providerCallControlId: 'provider-leg-neighbor-detail-1001',
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

const recordCanonicalThreadEvent = async (input: {
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

describe('connectshyft thread detail route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  beforeEach(() => {
    resetConnectShyftCanonicalEventsForTests();
  });

  afterEach(() => {
    resetConnectShyftCanonicalEventsForTests();
    jest.restoreAllMocks();
  });

  it('returns the current thread detail response shape with canonical timeline data and mirrored actions', async () => {
    const threadId = 'thread-detail-characterization-1001';
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId,
      neighborId: 'neighbor-detail-characterization-1001',
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    await recordCanonicalThreadEvent({
      threadId,
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: '2026-03-19T10:00:00.000Z',
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        metadata: {
          source: 'detail-characterization',
        },
        inboundMessageArtifact: {
          body: 'Need a follow-up call',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}`)
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        bridgeSession: null,
        voicemailArtifacts: [],
        actions: ['Call', 'Text', 'Close'],
        actionMatrix: {
          lockedByState: true,
        },
        outboundPolicy: {
          hiddenPolicyPaths: [],
          explicitActionSurface: true,
        },
        latencyBudgetsMs: {
          p95: expect.any(Number),
          p99: expect.any(Number),
        },
        thread: {
          threadId,
          neighborId: 'neighbor-detail-characterization-1001',
          personId: 'person-detail-characterization-1001',
          identityState: 'confirmed',
          subjectContext: {
            orgUnitId: TEST_ORG_UNIT_ID,
            personId: 'person-detail-characterization-1001',
          },
          neighborDeleted: false,
          neighbor_deleted: false,
          providerNeutral: true,
          statusDerivedFromCanonicalEvents: true,
          actions: ['Call', 'Text', 'Close'],
          timeline: [
            expect.objectContaining({
              eventId: expect.any(String),
              aggregateId: threadId,
              aggregateType: 'Thread',
              eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
              eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
              occurredAtUtc: '2026-03-19T10:00:00.000Z',
              conversationType: 'message',
              renderMode: 'inline',
              firstClass: true,
              metadata: {
                source: 'detail-characterization',
              },
              payload: expect.objectContaining({
                eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
                inboundMessageArtifact: {
                  body: 'Need a follow-up call',
                },
              }),
            }),
          ],
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'actionMatrix',
      'actions',
      'bridgeSession',
      'context',
      'latencyBudgetsMs',
      'outboundPolicy',
      'thread',
      'voicemailArtifacts',
    ].sort());
    expect(Object.keys(response.body.data.thread).sort()).toEqual([
      'actions',
      'bucket',
      'claimedByUserId',
      'claimed_by_user_id',
      'escalationStage',
      'isNewUnread',
      'identityState',
      'lastActivityAtUtc',
      'lastInboundCsNumberId',
      'last_inbound_cs_number_id',
      'lifecycle',
      'neighborDeleted',
      'neighborDeletedAtUtc',
      'neighborId',
      'neighbor_deleted',
      'neighbor_deleted_at_utc',
      'orgUnitId',
      'personId',
      'preferredOutboundContext',
      'preferredOutboundCsNumberId',
      'preferred_outbound_context',
      'preferred_outbound_cs_number_id',
      'priorityRank',
      'providerNeutral',
      'state',
      'statusDerivedFromCanonicalEvents',
      'subjectContext',
      'summary',
      'tenantId',
      'threadId',
      'timeline',
      'urgencyLabel',
      'voicemailIndicator',
      'voicemailLabel',
    ].sort());
    expect(response.body.data.actions).toEqual(response.body.data.thread.actions);
  });

  it('returns provisional person context with exactly one identity field in thread detail', async () => {
    const threadId = 'thread-detail-provisional-1003';
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId,
      neighborId: 'neighbor-detail-provisional-1003',
      personId: 'person-detail-provisional-1003',
      identityState: 'provisional',
      subjectContext: {
        orgUnitId: TEST_ORG_UNIT_ID,
        provisionalPersonId: 'person-detail-provisional-1003',
      },
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    const app = buildApp();
    const response = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}`)
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        thread: {
          threadId,
          personId: 'person-detail-provisional-1003',
          identityState: 'provisional',
          subjectContext: {
            orgUnitId: TEST_ORG_UNIT_ID,
            provisionalPersonId: 'person-detail-provisional-1003',
          },
        },
      },
    });
    expect(response.body.data.thread.subjectContext).not.toHaveProperty('personId');
  });

  it('returns deleted-neighbor detail only through includeDeleted=true and clears operational actions', async () => {
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId: 'thread-soft-delete-detail-1005',
      neighborId: 'neighbor-soft-delete-detail-1005',
      neighborDeleted: true,
      neighbor_deleted: true,
      neighborDeletedAtUtc: '2026-03-18T12:10:00.000Z',
      neighbor_deleted_at_utc: '2026-03-18T12:10:00.000Z',
      summary: 'Deleted neighbor thread detail',
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(null as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-soft-delete-detail-1005')
      .query({
        includeDeleted: 'true',
      })
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        bridgeSession: null,
        voicemailArtifacts: [],
        actions: [],
        thread: {
          threadId: 'thread-soft-delete-detail-1005',
          neighborDeleted: true,
          neighbor_deleted: true,
          neighborDeletedAtUtc: '2026-03-18T12:10:00.000Z',
          neighbor_deleted_at_utc: '2026-03-18T12:10:00.000Z',
          actions: [],
          timeline: [],
        },
      },
    });
  });

  it('projects outbound voicemail artifacts from the active bridge session without changing the detail envelope', async () => {
    const threadId = 'thread-detail-outbound-voicemail-1002';
    jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(buildThreadDetailRecord({
      threadId,
      neighborId: 'neighbor-detail-outbound-voicemail-1002',
      summary: 'Timed-out outbound call thread',
    }) as any);
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateByThreadId',
    ).mockResolvedValue(buildBridgeSessionAggregate({
      id: 'bridge-session-detail-outbound-1002',
      threadId,
      neighborParticipantId: 'neighbor-detail-outbound-voicemail-1002',
      voicemailArtifactId: 'vm-thread-detail-outbound-voicemail-1002-provider-event-outbound-voicemail-1002',
      voicemailRecordingUrl: 'https://connectshyft.test/outbound-voicemail-detail-1002.mp3',
      voicemailRecordingStatus: 'completed',
    }) as any);

    const app = buildApp();
    const response = await request(app)
      .get(`/api/v1/connectshyft/threads/${threadId}`)
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        bridgeSession: {
          bridgeSessionId: 'bridge-session-detail-outbound-1002',
          status: 'neighbor_dialing',
          operatorLegState: 'answered',
          neighborLegState: 'ringing',
        },
        voicemailArtifacts: [
          {
            artifactId: 'vm-thread-detail-outbound-voicemail-1002-provider-event-outbound-voicemail-1002',
            transcription: {
              available: false,
              text: null,
            },
          },
        ],
      },
    });
    expect(response.body.data.actions).toEqual(response.body.data.thread.actions);
  });

  it('returns the current not-found refusal when thread detail is unavailable for the orgUnit context', async () => {
    const resolveSpy = jest.spyOn(
      ReadContractsModule,
      'resolveConnectShyftThreadDetailContractAsync',
    ).mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-cross-tenant-hidden-1001')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      refusalType: 'business',
      data: {
        context: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
      },
    });
    expect(resolveSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: 'thread-cross-tenant-hidden-1001',
      includeDeleted: false,
    }));
  });
});
