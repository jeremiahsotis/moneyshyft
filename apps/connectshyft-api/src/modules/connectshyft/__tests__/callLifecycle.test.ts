import {
  buildConnectShyftCallLifecycleService,
  listConnectShyftLifecycleEventsForTests,
  resetConnectShyftCallLifecycleStateForTests,
} from '../callLifecycle';
import {
  connectShyftCallServiceAsync,
  resetConnectShyftCallStateForTests,
} from '../calls';
import {
  loadConnectShyftBridgeAggregateBySessionId,
  loadConnectShyftBridgeAggregateByThreadId,
  resetConnectShyftBridgeSessionStateForTests,
} from '../bridgeSessions';
import { resolveConnectShyftProviderAdapter } from '../providerRegistry';
import { resetConnectShyftProviderCorrelationStateForTests } from '../providerCorrelationMappings';
import {
  connectShyftVoicemailServiceAsync,
  resetConnectShyftVoicemailStateForTests,
} from '../voicemails';

const tenantId = 'tenant-connectshyft-f1';
const orgUnitId = 'org-connectshyft-f1-east';
const threadId = 'thread-f1-call-lifecycle-1001';
const personId = 'person-connectshyft-f1-1001';
const actorUserId = 'user-connectshyft-f1-operator';
const providerRegistryHeaders = {
  'x-test-connectshyft-enabled-providers': '["mock-sandbox"]',
  'x-test-connectshyft-disabled-providers': '[]',
};

const thread = {
  threadId,
  tenantId,
  orgUnitId,
  neighborId: 'neighbor-connectshyft-f1-1001',
  personId,
  activityId: null,
  source: 'VOICE',
  state: 'UNCLAIMED' as const,
  lastInboundCsNumberId: '+12605550199',
  preferredOutboundCsNumberId: '+12605550191',
  claimedByUserId: null,
  claimedAtUtc: null,
  closedByUserId: null,
  closedAtUtc: null,
  createdAtUtc: '2026-03-23T12:00:00.000Z',
  updatedAtUtc: '2026-03-23T12:00:00.000Z',
  escalation: {
    stage: 0,
    nextEvaluationAtUtc: null,
  },
};

describe('connectshyft callLifecycle', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    resetConnectShyftCallStateForTests();
    resetConnectShyftVoicemailStateForTests();
    resetConnectShyftBridgeSessionStateForTests();
    resetConnectShyftProviderCorrelationStateForTests();
    resetConnectShyftCallLifecycleStateForTests();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags;
  });

  const buildService = () => buildConnectShyftCallLifecycleService({
    threadService: {
      findThreadById: jest.fn(async () => thread),
    },
    neighborService: {
      resolveNeighbor: jest.fn(async () => ({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
        httpStatus: 200,
        data: {
          neighbor: {
            neighborId: thread.neighborId,
            phones: [
              {
                phoneId: 'neighbor-phone-1001',
                label: 'Primary',
                value: '+12605550111',
                verificationStatus: 'VERIFIED',
                isPrimary: true,
                isShared: false,
                sortOrder: 0,
                isActive: true,
                createdAtUtc: '2026-03-23T10:00:00.000Z',
                updatedAtUtc: '2026-03-23T10:00:00.000Z',
                provenance: {},
              },
            ],
          },
        },
      })) as any,
    },
    resolveOperatorDestinationFn: jest.fn(async () => ({
      phoneNumber: '+12605550155',
      source: 'actor_user' as const,
      userId: actorUserId,
      orgUnitId,
    })),
    resolveSenderNumberFn: jest.fn(async () => ({
      ok: true,
      providerNumberE164: '+12605550191',
      mappingId: 'mapping-connectshyft-f1-1001',
      routingMetadata: {
        deterministic: true,
        channel: 'voice',
        source: 'thread_alignment',
        mappingLabel: 'Main line',
        threadId,
        tenantId,
        orgUnitId,
        preferredOutboundCsNumberId: '+12605550191',
        lastInboundCsNumberId: '+12605550191',
        alignedFrom: 'preferred_outbound',
        candidateProviderNumberE164: '+12605550191',
      },
    })) as any,
    resolveProviderAdapterFn: (input) => resolveConnectShyftProviderAdapter({
      ...input,
      req: {
        ...input.req,
        header: (name: string) => providerRegistryHeaders[name.toLowerCase() as keyof typeof providerRegistryHeaders],
        headers: providerRegistryHeaders,
      },
    }),
  });

  const baseStartInput = {
    tenantId,
    orgUnitId,
    threadId,
    personId,
    actorRoles: ['ORGUNIT_MEMBER'],
    actorUserId,
    requestedProvider: 'mock-sandbox',
    providerRegistryHeaders,
  };

  it('starts a call, links it to a bridge session, and emits a call started event', async () => {
    const service = buildService();

    const call = await service.startCall(baseStartInput);
    const aggregate = await loadConnectShyftBridgeAggregateByThreadId({
      tenantId,
      threadId,
    });

    expect(call.status).toBe('operator_dialing');
    expect(call.bridgeSessionId).toBeTruthy();
    expect(aggregate?.session.id).toBe(call.bridgeSessionId);

    const persistedCalls = await connectShyftCallServiceAsync.listThreadCalls({
      tenantId,
      orgUnitId,
      threadId,
    });
    expect(persistedCalls).toHaveLength(1);
    expect(persistedCalls[0]?.id).toBe(call.id);

    expect(listConnectShyftLifecycleEventsForTests()).toEqual([
      expect.objectContaining({
        eventName: 'connectshyft.call.started',
        entityId: call.id,
      }),
    ]);
  });

  it('returns the existing call when the same idempotency key is replayed', async () => {
    const service = buildService();

    const initial = await service.startCall({
      ...baseStartInput,
      idempotencyKey: 'idem-call-1001',
    });
    const replay = await service.startCall({
      ...baseStartInput,
      idempotencyKey: 'idem-call-1001',
    });

    expect(replay.id).toBe(initial.id);
  });

  it('advances persisted call status from provider events and records voicemail fallback', async () => {
    const service = buildService();

    const startedCall = await service.startCall(baseStartInput);
    const startedAggregate = await loadConnectShyftBridgeAggregateByThreadId({
      tenantId,
      threadId,
    });
    expect(startedAggregate).not.toBeNull();

    await service.handleProviderEvent({
      tenantId,
      provider: 'mock-sandbox',
      event: {
        type: 'operator_answered',
        bridgeSessionId: startedAggregate!.session.id,
        providerCallId: startedAggregate!.operatorLeg.providerCallId!,
        occurredAt: new Date('2026-03-23T12:01:00.000Z'),
      },
      eventJson: {
        eventType: 'CallAnswered',
      },
      providerCallId: startedAggregate!.operatorLeg.providerCallId!,
      occurredAt: new Date('2026-03-23T12:01:00.000Z'),
    });

    const afterAnswered = await connectShyftCallServiceAsync.getCallById(startedCall.id, tenantId);
    expect(afterAnswered?.status).toBe('operator_answered');
    expect(afterAnswered?.operatorAnsweredAtUtc).toBe('2026-03-23T12:01:00.000Z');

    await connectShyftCallServiceAsync.updateCallStatus({
      callId: startedCall.id,
      tenantId,
      status: 'failed',
      bridgeSessionId: startedCall.bridgeSessionId,
      endedAtUtc: '2026-03-23T12:02:00.000Z',
      failureCode: 'neighbor_failed',
      failureMessage: 'Neighbor did not answer',
    });

    const voicemail = await service.handleVoicemail({
      tenantId,
      orgUnitId,
      callId: startedCall.id,
      threadId,
      personId,
      artifactId: 'artifact-call-lifecycle-1001',
      recordingUrl: 'https://example.test/voicemail-1001.mp3',
      recordingStatus: 'completed',
      occurredAt: new Date('2026-03-23T12:03:00.000Z'),
    });

    const completedCall = await connectShyftCallServiceAsync.getCallById(startedCall.id, tenantId);
    const voicemailBridgeAggregate = await loadConnectShyftBridgeAggregateBySessionId(
      startedCall.bridgeSessionId!,
    );
    const callVoicemails = await connectShyftVoicemailServiceAsync.listCallVoicemails({
      tenantId,
      callId: startedCall.id,
    });

    expect(voicemail.recordingStatus).toBe('completed');
    expect(callVoicemails).toHaveLength(1);
    expect(completedCall?.status).toBe('voicemail');
    expect(voicemailBridgeAggregate?.session.status).toBe('voicemail');
    expect(completedCall?.endedAtUtc).toBe('2026-03-23T12:02:00.000Z');
    expect(listConnectShyftLifecycleEventsForTests()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: 'connectshyft.call.updated',
          entityId: startedCall.id,
        }),
        expect.objectContaining({
          eventName: 'connectshyft.voicemail.recorded',
          entityId: voicemail.id,
          payload: expect.objectContaining({
            direction: 'outbound',
            seenAtUtc: voicemail.createdAtUtc,
            reviewedAtUtc: voicemail.createdAtUtc,
            notificationEligible: false,
          }),
        }),
      ]),
    );
  });

  it('refuses voicemail when the bridge session is already completed', async () => {
    const service = buildService();

    const startedCall = await service.startCall(baseStartInput);
    const startedAggregate = await loadConnectShyftBridgeAggregateByThreadId({
      tenantId,
      threadId,
    });

    await service.handleProviderEvent({
      tenantId,
      provider: 'mock-sandbox',
      event: {
        type: 'operator_answered',
        bridgeSessionId: startedAggregate!.session.id,
        providerCallId: startedAggregate!.operatorLeg.providerCallId!,
        occurredAt: new Date('2026-03-23T12:01:00.000Z'),
      },
      eventJson: {
        eventType: 'CallAnswered',
      },
      providerCallId: startedAggregate!.operatorLeg.providerCallId!,
      occurredAt: new Date('2026-03-23T12:01:00.000Z'),
    });

    const afterOperatorAnswer = await loadConnectShyftBridgeAggregateBySessionId(
      startedAggregate!.session.id,
    );
    await service.handleProviderEvent({
      tenantId,
      provider: 'mock-sandbox',
      event: {
        type: 'neighbor_answered',
        bridgeSessionId: startedAggregate!.session.id,
        providerCallId: afterOperatorAnswer!.neighborLeg.providerCallId!,
        occurredAt: new Date('2026-03-23T12:02:00.000Z'),
      },
      eventJson: {
        eventType: 'CallAnswered',
      },
      providerCallId: afterOperatorAnswer!.neighborLeg.providerCallId!,
      occurredAt: new Date('2026-03-23T12:02:00.000Z'),
    });

    const afterNeighborAnswer = await loadConnectShyftBridgeAggregateBySessionId(
      startedAggregate!.session.id,
    );
    await service.handleProviderEvent({
      tenantId,
      provider: 'mock-sandbox',
      event: {
        type: 'completed',
        bridgeSessionId: startedAggregate!.session.id,
        providerCallId: afterNeighborAnswer!.neighborLeg.providerCallId!,
        occurredAt: new Date('2026-03-23T12:03:00.000Z'),
      },
      eventJson: {
        eventType: 'CallCompleted',
      },
      providerCallId: afterNeighborAnswer!.neighborLeg.providerCallId!,
      occurredAt: new Date('2026-03-23T12:03:00.000Z'),
    });

    await expect(service.handleVoicemail({
      tenantId,
      orgUnitId,
      callId: startedCall.id,
      threadId,
      personId,
      artifactId: 'artifact-call-lifecycle-completed-1002',
      recordingUrl: 'https://example.test/voicemail-1002.mp3',
      recordingStatus: 'completed',
      occurredAt: new Date('2026-03-23T12:04:00.000Z'),
    })).rejects.toMatchObject({
      code: 'CONNECTSHYFT_VOICEMAIL_NOT_ALLOWED',
    });
  });
});
