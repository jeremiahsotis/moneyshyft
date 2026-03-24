import {
  recordConnectShyftCanonicalEvent,
  resetConnectShyftCanonicalEventsForTests,
} from '../../../apps/connectshyft-api/src/modules/connectshyft/canonicalEvents';
import {
  buildConnectShyftCallLifecycleService,
} from '../../../apps/connectshyft-api/src/modules/connectshyft/callLifecycle';
import {
  connectShyftCallServiceAsync,
  resetConnectShyftCallStateForTests,
} from '../../../apps/connectshyft-api/src/modules/connectshyft/calls';
import {
  listConnectShyftLifecycleEventsForTests,
  resetConnectShyftLifecycleEventsForTests,
} from '../../../apps/connectshyft-api/src/modules/connectshyft/events';
import {
  loadConnectShyftBridgeAggregateByThreadId,
  resetConnectShyftBridgeSessionStateForTests,
} from '../../../apps/connectshyft-api/src/modules/connectshyft/bridgeSessions';
import { CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME } from '../../../apps/connectshyft-api/src/modules/connectshyft/inboundSms';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../apps/connectshyft-api/src/modules/connectshyft/providerCorrelationMappings';
import { resolveConnectShyftProviderAdapter } from '../../../apps/connectshyft-api/src/modules/connectshyft/providerRegistry';
import { getThreadTimeline } from '../../../apps/connectshyft-api/src/modules/connectshyft/threadTimeline';
import { resetConnectShyftVoicemailStateForTests } from '../../../apps/connectshyft-api/src/modules/connectshyft/voicemails';

const tenantId = 'tenant-connectshyft-f1';
const orgUnitId = 'org-connectshyft-f1-east';
const threadId = 'thread-f1-call-timeline-1001';
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
  createdAtUtc: '2026-03-24T12:00:00.000Z',
  updatedAtUtc: '2026-03-24T12:00:00.000Z',
  escalation: {
    stage: 0,
    nextEvaluationAtUtc: null,
  },
};

describe('connectshyft call timeline integration', () => {
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
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftLifecycleEventsForTests();
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
                createdAtUtc: '2026-03-24T10:00:00.000Z',
                updatedAtUtc: '2026-03-24T10:00:00.000Z',
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

  it('returns sms, call, and voicemail timeline items in order and records lifecycle events', async () => {
    const service = buildService();

    const call = await service.startCall({
      tenantId,
      orgUnitId,
      threadId,
      personId,
      actorRoles: ['ORGUNIT_MEMBER'],
      actorUserId,
      requestedProvider: 'mock-sandbox',
      providerRegistryHeaders,
    });
    const startedAtMs = new Date(call.startedAtUtc).getTime();
    const smsOccurredAtUtc = new Date(startedAtMs - 60_000).toISOString();
    const operatorAnsweredAt = new Date(startedAtMs + 30_000);
    const failedAtUtc = new Date(startedAtMs + 60_000).toISOString();
    const voicemailOccurredAt = new Date(startedAtMs + 90_000);

    await recordConnectShyftCanonicalEvent({
      tenantId,
      orgUnitId,
      aggregateId: threadId,
      aggregateType: 'Thread',
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: smsOccurredAtUtc,
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        inboundMessageArtifact: {
          body: 'Need help before the call',
        },
      },
    });

    const aggregate = await loadConnectShyftBridgeAggregateByThreadId({
      tenantId,
      threadId,
    });
    expect(aggregate).not.toBeNull();

    await service.handleProviderEvent({
      tenantId,
      provider: 'mock-sandbox',
      event: {
        type: 'operator_answered',
        bridgeSessionId: aggregate!.session.id,
        providerCallId: aggregate!.operatorLeg.providerCallId!,
        occurredAt: operatorAnsweredAt,
      },
      eventJson: {
        eventType: 'CallAnswered',
      },
      providerCallId: aggregate!.operatorLeg.providerCallId!,
      occurredAt: operatorAnsweredAt,
    });

    await connectShyftCallServiceAsync.updateCallStatus({
      callId: call.id,
      tenantId,
      status: 'failed',
      bridgeSessionId: call.bridgeSessionId,
      endedAtUtc: failedAtUtc,
      failureCode: 'neighbor_unavailable',
      failureMessage: 'Neighbor did not answer.',
    });

    await service.handleVoicemail({
      tenantId,
      orgUnitId,
      callId: call.id,
      threadId,
      personId,
      artifactId: 'artifact-call-timeline-1001',
      recordingUrl: 'https://example.test/call-timeline-vm.mp3',
      recordingStatus: 'completed',
      occurredAt: voicemailOccurredAt,
      transcriptionJson: {
        text: 'Please call me back',
      },
    });

    const timeline = await getThreadTimeline({
      tenantId,
      orgUnitId,
      threadId,
    });

    expect(timeline.items.map((item) => item.type)).toEqual([
      'message',
      'voice_event',
      'voicemail',
    ]);
    expect(timeline.items[0]).toMatchObject({
      channel: 'sms',
      body: 'Need help before the call',
      occurredAtUtc: smsOccurredAtUtc,
    });
    expect(timeline.items[1]).toMatchObject({
      id: `call-${call.id}`,
      channel: 'voice',
      deliveryStatus: 'voicemail',
      providerMetadata: expect.objectContaining({
        callId: call.id,
        status: 'voicemail',
        statusEvents: expect.arrayContaining([
          expect.objectContaining({ status: 'operator_dialing' }),
          expect.objectContaining({ status: 'operator_answered' }),
          expect.objectContaining({ status: 'voicemail' }),
        ]),
      }),
    });
    expect(timeline.items[2]).toMatchObject({
      channel: 'voicemail',
      recordingUrl: 'https://example.test/call-timeline-vm.mp3',
      deliveryStatus: 'completed',
    });

    expect(listConnectShyftLifecycleEventsForTests().map((event) => event.eventName)).toEqual(
      expect.arrayContaining([
        'connectshyft.call.started',
        'connectshyft.call.updated',
        'connectshyft.voicemail.recorded',
      ]),
    );
  });
});
