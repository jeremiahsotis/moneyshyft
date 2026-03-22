// @ts-nocheck
import request from 'supertest';
import * as canonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import * as OperatorDestinationResolverModule from '../../../../modules/connectshyft/operatorDestinationResolver';
import { resetConnectShyftBridgeSessionStateForTests } from '../../../../modules/connectshyft/bridgeSessions';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import * as providerCorrelationMappingsModule from '../../../../modules/connectshyft/providerCorrelationMappings';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

jest.mock('../../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const loggerModule = jest.requireMock('../../../../utils/logger') as {
  default: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
};

const TEST_TIMESTAMP = '2026-03-18T12:00:00.000Z';
const TEST_PROVIDER_NUMBER_F1 = '+12605550191';
const TEST_PROVIDER_NUMBER_F2 = '+12605550192';
const CONNECTSHYFT_SYSTEM_ACTOR_USER_ID = '00000000-0000-4000-8000-000000000001';

const readString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const sendSmsMock = jest.fn();
const startOutboundCallMock = jest.fn();
const startBridgeSessionMock = jest.fn();
const endCallMock = jest.fn();
const verifyWebhookMock = jest.fn(() => ({ ok: true as const }));
const translateProviderEventMock = jest.fn(({ rawEventType, payload }: {
  rawEventType: string;
  payload: unknown;
}) => {
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};

  return {
    eventType: readString(rawEventType) || 'voice.voicemail',
    payload: source,
    correlation: {
      providerLegId: readString(source.providerLegId, source.provider_leg_id),
      providerMessageId: readString(
        source.providerMessageId,
        source.provider_message_id,
        source.messageId,
        source.message_id,
      ),
      providerEventId: readString(
        source.providerEventId,
        source.provider_event_id,
        source.eventId,
        source.event_id,
      ),
      providerNumber: readString(source.to, source.toNumber, source.to_number),
    },
    providerNeutral: true as const,
    providerSpecificFieldsStripped: true as const,
    providerBranchingInDomain: false as const,
  };
});

jest.mock('../../../../../../../infrastructure/communications', () => ({
  resolveTelephonyProviderAdapter: jest.fn(() => ({
    providerKey: 'telnyx',
    adapterInterfaceVersion: 'v1',
    sendSms: sendSmsMock,
    startOutboundCall: startOutboundCallMock,
    startBridgeSession: startBridgeSessionMock,
    endCall: endCallMock,
    verifyWebhook: verifyWebhookMock,
    translateProviderEvent: translateProviderEventMock,
  })),
}));

const buildVoiceHeaders = (input?: {
  tenantId?: string;
  orgUnitId?: string;
}): Record<string, string> => buildHeaders({
  'x-test-connectshyft-tenant-id': input?.tenantId || 'tenant-connectshyft-f1',
  'x-test-connectshyft-orgunit-id': input?.orgUnitId || 'org-connectshyft-f1-east',
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-voice-characterization',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([
    input?.orgUnitId || 'org-connectshyft-f1-east',
  ]),
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
});

const buildVoiceWebhookBody = (overrides: Record<string, unknown> = {}) => ({
  tenantId: 'tenant-connectshyft-f1',
  orgUnitId: 'org-connectshyft-f1-east',
  threadId: 'thread-f1-unclaimed-1001',
  eventType: 'voice.voicemail',
  sid: 'voice-sid-characterization-1001',
  providerEventId: 'provider-event-voice-voicemail-1001',
  providerLegId: 'provider-leg-voice-voicemail-1001',
  from: '+12605552021',
  to: TEST_PROVIDER_NUMBER_F1,
  recordingUrl: 'https://connectshyft.test/voicemail-characterization-1001.mp3',
  voicemail_duration_seconds: 47,
  ...overrides,
});

describe('connectshyft inbound voice webhook route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  let recordCanonicalEventSpy: jest.SpyInstance;
  let resolveOperatorDestinationSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerModule.default.info.mockReset();
    sendSmsMock.mockClear();
    startOutboundCallMock.mockClear();
    startBridgeSessionMock.mockClear();
    endCallMock.mockClear();
    verifyWebhookMock.mockClear();
    translateProviderEventMock.mockClear();
    resetConnectShyftBridgeSessionStateForTests();
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftProviderCorrelationStateForTests();

    resolveOperatorDestinationSpy = jest.spyOn(
      OperatorDestinationResolverModule,
      'resolveOperatorDestination',
    ).mockResolvedValue({
      phoneNumber: '+12605550155',
      source: 'thread_assignee',
      userId: 'user-connectshyft-f1-other-operator',
      orgUnitId: 'org-connectshyft-f1-east',
    });
    recordCanonicalEventSpy = jest.spyOn(
      canonicalEventsModule,
      'recordConnectShyftCanonicalEvent',
    ).mockImplementation(async (eventInput) => ({
      eventId: `canonical-event-${String(eventInput.aggregateId)}-${String(eventInput.eventType)}`,
      aggregateId: eventInput.aggregateId,
      aggregateType: eventInput.aggregateType,
      eventType: eventInput.eventType,
      payload: eventInput.payload,
      occurredAtUtc: TEST_TIMESTAMP,
    }) as any);
  });

  afterEach(() => {
    resolveOperatorDestinationSpy.mockRestore();
    recordCanonicalEventSpy.mockRestore();
  });

  it('returns the current inbound voice success envelope and voicemail routing shape', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildVoiceHeaders())
      .send(buildVoiceWebhookBody());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      message: 'Inbound webhook accepted for processing',
      data: {
        sid: 'voice-sid-characterization-1001',
        from: '+12605552021',
        to: TEST_PROVIDER_NUMBER_F1,
        eventType: 'voice.voicemail',
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        correlation: {
          source: 'metadata',
          deterministic: true,
          threadId: 'thread-f1-unclaimed-1001',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          neighborId: 'neighbor-connectshyft-f1-1001',
          providerLegId: 'provider-leg-voice-voicemail-1001',
          providerMessageId: null,
          providerEventId: 'provider-event-voice-voicemail-1001',
          providerNumberE164: TEST_PROVIDER_NUMBER_F1,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-voice-voicemail-1001',
        },
        canonicalTranslation: {
          eventType: 'voice.voicemail',
          providerNeutral: true,
          providerSpecificFieldsStripped: true,
          providerBranchingInDomain: false,
        },
        domainHandlers: {
          providerBranchingInDomain: false,
        },
        canonicalEvent: {
          aggregateId: 'thread-f1-unclaimed-1001',
          aggregateType: 'Thread',
          eventType: 'voice.voicemail',
        },
        threadId: 'thread-f1-unclaimed-1001',
        threadState: 'UNCLAIMED',
        thread: {
          threadId: 'thread-f1-unclaimed-1001',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          neighborId: 'neighbor-connectshyft-f1-1001',
          source: 'VOICE',
          state: 'UNCLAIMED',
          lastInboundCsNumberId: TEST_PROVIDER_NUMBER_F1,
          preferredOutboundCsNumberId: TEST_PROVIDER_NUMBER_F1,
          claimedByUserId: null,
          claimedAtUtc: null,
          closedByUserId: null,
          closedAtUtc: null,
          createdAtUtc: expect.any(String),
          updatedAtUtc: expect.any(String),
          escalation: {
            stage: 0,
            nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
          },
        },
        lifecycle: {
          ensuredActiveThread: true,
          reusedThreadId: 'thread-f1-unclaimed-1001',
          reopenedByInbound: false,
          escalationResetApplied: false,
          inactivityResetApplied: false,
          autoClaimedByConnectedEvent: false,
        },
        voicemailArtifact: {
          artifactId: 'vm-thread-f1-unclaimed-1001-provider-event-voice-voicemail-1001',
          channel: 'voice',
          direction: 'inbound',
          providerEventId: 'provider-event-voice-voicemail-1001',
          providerMessageId: null,
          providerLegId: 'provider-leg-voice-voicemail-1001',
          from: '+12605552021',
          to: TEST_PROVIDER_NUMBER_F1,
          recordingUrl: 'https://connectshyft.test/voicemail-characterization-1001.mp3',
          durationSeconds: 47,
        },
        transcription: {
          requestQueued: true,
          queueName: 'connectshyft.voicemail.transcription',
          callbackCorrelation: {
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            threadId: 'thread-f1-unclaimed-1001',
            providerEventId: 'provider-event-voice-voicemail-1001',
            correlationEventId: 'provider-event-voice-voicemail-1001',
            providerLegId: 'provider-leg-voice-voicemail-1001',
            voicemailArtifactId: 'vm-thread-f1-unclaimed-1001-provider-event-voice-voicemail-1001',
          },
        },
        autoClaim: null,
        callPolicy: {
          transport: null,
          autoRetry: false,
          redialPolicy: 'manual_only',
        },
        timeline: {
          eventName: 'connectshyft.inbound.voice_voicemail_recorded',
          routingDecision: 'voicemail_only',
          deterministicOrdering: true,
        },
        timelineOutcome: {
          eventName: 'connectshyft.inbound.voice_voicemail_recorded',
          routingDecision: 'voicemail_only',
        },
        audit: {
          eventName: 'connectshyft.inbound.voice_voicemail_recorded',
          metadata: {
            tenant_id: 'tenant-connectshyft-f1',
            org_unit_id: 'org-connectshyft-f1-east',
            thread_id: 'thread-f1-unclaimed-1001',
            neighbor_id: 'neighbor-connectshyft-f1-1001',
            thread_state: 'UNCLAIMED',
            event_type: 'voice.voicemail',
            routing_decision: 'voicemail_only',
            voicemail_artifact_id: 'vm-thread-f1-unclaimed-1001-provider-event-voice-voicemail-1001',
            transcription_queue: 'connectshyft.voicemail.transcription',
            auto_claim_attempted: false,
            auto_claim_applied: false,
            auto_claim_reason: null,
            call_transport: null,
            reopened_by_inbound: false,
          },
        },
        outbox: {
          eventName: 'connectshyft.inbound.voice_voicemail_recorded',
        },
        transcriptionOutbox: {
          eventName: 'connectshyft.voicemail.transcription_requested',
          queueName: 'connectshyft.voicemail.transcription',
          metadata: {
            tenant_id: 'tenant-connectshyft-f1',
            org_unit_id: 'org-connectshyft-f1-east',
            thread_id: 'thread-f1-unclaimed-1001',
            voicemail_artifact_id: 'vm-thread-f1-unclaimed-1001-provider-event-voice-voicemail-1001',
            provider_event_id: 'provider-event-voice-voicemail-1001',
            provider_leg_id: 'provider-leg-voice-voicemail-1001',
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'autoClaim',
      'callPolicy',
      'canonicalEvent',
      'canonicalTranslation',
      'correlation',
      'domainHandlers',
      'eventType',
      'from',
      'lifecycle',
      'outbox',
      'providerResolution',
      'replaySafe',
      'sid',
      'thread',
      'threadId',
      'threadState',
      'timeline',
      'timelineOutcome',
      'to',
      'transcription',
      'transcriptionOutbox',
      'voicemailArtifact',
    ].sort());
    expect(Object.keys(response.body.data.thread).sort()).toEqual([
      'claimedAtUtc',
      'claimedByUserId',
      'closedAtUtc',
      'closedByUserId',
      'createdAtUtc',
      'escalation',
      'lastInboundCsNumberId',
      'neighborId',
      'orgUnitId',
      'preferredOutboundCsNumberId',
      'source',
      'state',
      'tenantId',
      'threadId',
      'updatedAtUtc',
    ].sort());
    expect(response.body.data.audit).toEqual(response.body.data.outbox);
  });

  it('preserves the current fallback routing shape for inbound voice events', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildVoiceHeaders())
      .send(buildVoiceWebhookBody({
        threadId: 'thread-f1-closed-1003',
        eventType: 'voice.fallback',
        providerEventId: 'provider-event-voice-fallback-1002',
        providerLegId: 'provider-leg-voice-fallback-1002',
        recordingUrl: 'https://connectshyft.test/fallback-characterization-1002.mp3',
        voicemail_duration_seconds: 33,
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      message: 'Inbound webhook accepted for processing',
      data: {
        eventType: 'voice.fallback',
        correlation: {
          threadId: 'thread-f1-closed-1003',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          neighborId: 'neighbor-connectshyft-f1-1003',
          providerLegId: 'provider-leg-voice-fallback-1002',
          providerEventId: 'provider-event-voice-fallback-1002',
          providerNumberE164: TEST_PROVIDER_NUMBER_F1,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-voice-fallback-1002',
        },
        threadId: 'thread-f1-closed-1003',
        threadState: 'CLOSED',
        lifecycle: {
          ensuredActiveThread: false,
          reopenedByInbound: false,
          escalationResetApplied: false,
          inactivityResetApplied: false,
          autoClaimedByConnectedEvent: false,
        },
        autoClaim: null,
        callPolicy: {
          transport: null,
          autoRetry: false,
          redialPolicy: 'manual_only',
        },
        timeline: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
          deterministicOrdering: true,
        },
        timelineOutcome: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
        },
        audit: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          metadata: {
            thread_state: 'CLOSED',
            routing_decision: 'intake_fallback',
            voicemail_artifact_id: null,
            transcription_queue: null,
            auto_claim_attempted: false,
            auto_claim_applied: false,
            auto_claim_reason: null,
            call_transport: null,
            reopened_by_inbound: false,
          },
        },
        outbox: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
        },
      },
    });
    expect(response.body.data).not.toHaveProperty('voicemailArtifact');
    expect(response.body.data).not.toHaveProperty('transcription');
    expect(response.body.data).not.toHaveProperty('transcriptionOutbox');
    expect(response.body.data.audit).toEqual(response.body.data.outbox);
  });

  it('preserves claimed-thread accepted routing when operator destination resolves', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildVoiceHeaders())
      .send(buildVoiceWebhookBody({
        threadId: 'thread-f1-claimed-1002',
        providerEventId: 'provider-event-voice-claimed-1004',
        providerLegId: 'provider-leg-voice-claimed-1004',
        recordingUrl: 'https://connectshyft.test/claimed-characterization-1004.mp3',
        voicemail_duration_seconds: 29,
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        threadId: 'thread-f1-claimed-1002',
        threadState: 'CLAIMED',
        thread: {
          threadId: 'thread-f1-claimed-1002',
          state: 'CLAIMED',
        },
        routingPolicy: {
          claimedMode: 'orgunit_configured_mode',
        },
        timeline: {
          eventName: 'connectshyft.inbound.voice_voicemail_recorded',
          routingDecision: 'accepted',
          deterministicOrdering: true,
        },
        timelineOutcome: {
          eventName: 'connectshyft.inbound.voice_voicemail_recorded',
          routingDecision: 'accepted',
        },
        voicemailArtifact: {
          artifactId: 'vm-thread-f1-claimed-1002-provider-event-voice-claimed-1004',
          providerEventId: 'provider-event-voice-claimed-1004',
          providerLegId: 'provider-leg-voice-claimed-1004',
          recordingUrl: 'https://connectshyft.test/claimed-characterization-1004.mp3',
          durationSeconds: 29,
        },
        transcription: {
          requestQueued: true,
          queueName: 'connectshyft.voicemail.transcription',
          callbackCorrelation: {
            threadId: 'thread-f1-claimed-1002',
            voicemailArtifactId: 'vm-thread-f1-claimed-1002-provider-event-voice-claimed-1004',
          },
        },
      },
    });
    expect(resolveOperatorDestinationSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      claimedByUserId: 'user-connectshyft-f1-other-operator',
    }));
  });

  it('uses the safe fallback path for claimed-thread voice events when operator destination is missing', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: null,
      source: 'none',
      userId: null,
      orgUnitId: 'org-connectshyft-f1-east',
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildVoiceHeaders())
      .send(buildVoiceWebhookBody({
        threadId: 'thread-f1-claimed-1002',
        providerEventId: 'provider-event-voice-claimed-missing-1005',
        providerLegId: 'provider-leg-voice-claimed-missing-1005',
        recordingUrl: 'https://connectshyft.test/claimed-missing-1005.mp3',
        voicemail_duration_seconds: 18,
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        threadId: 'thread-f1-claimed-1002',
        threadState: 'CLAIMED',
        timeline: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
          deterministicOrdering: true,
        },
        timelineOutcome: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
        },
      },
    });
    expect(response.body.data).not.toHaveProperty('voicemailArtifact');
    expect(response.body.data).not.toHaveProperty('transcription');
    expect(loggerModule.default.info).toHaveBeenCalledWith(
      'ConnectShyft telephony runtime outcome',
      expect.objectContaining({
        threadId: 'thread-f1-claimed-1002',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        actorUserId: CONNECTSHYFT_SYSTEM_ACTOR_USER_ID,
        claimedByUserId: 'user-connectshyft-f1-other-operator',
        senderNumber: TEST_PROVIDER_NUMBER_F1,
        operatorDestinationSource: 'none',
        operatorDestinationResolved: false,
        outcome: 'fallback',
      }),
    );
  });

  it('uses the safe fallback path for claimed-thread voice events when operator destination is invalid', async () => {
    resolveOperatorDestinationSpy.mockResolvedValueOnce({
      phoneNumber: null,
      source: 'thread_assignee',
      userId: 'user-connectshyft-f1-other-operator',
      orgUnitId: 'org-connectshyft-f1-east',
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildVoiceHeaders())
      .send(buildVoiceWebhookBody({
        threadId: 'thread-f1-claimed-1002',
        providerEventId: 'provider-event-voice-claimed-invalid-1006',
        providerLegId: 'provider-leg-voice-claimed-invalid-1006',
        recordingUrl: 'https://connectshyft.test/claimed-invalid-1006.mp3',
        voicemail_duration_seconds: 21,
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        threadId: 'thread-f1-claimed-1002',
        threadState: 'CLAIMED',
        timeline: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
          deterministicOrdering: true,
        },
        timelineOutcome: {
          eventName: 'connectshyft.inbound.voice_fallback_recorded',
          routingDecision: 'intake_fallback',
        },
      },
    });
    expect(response.body.data).not.toHaveProperty('voicemailArtifact');
    expect(response.body.data).not.toHaveProperty('transcription');
  });

  it('preserves the current connected-call auto-claim behavior for inbound voice webhooks', async () => {
    const app = buildApp();
    const correlationLookupSpy = jest.spyOn(
      providerCorrelationMappingsModule,
      'resolveConnectShyftProviderCorrelationByIdentifiers',
    ).mockResolvedValue({
      ok: true,
      correlation: {
        tenantId: 'tenant-connectshyft-f2',
        orgUnitId: 'org-connectshyft-f2-east',
        threadId: 'thread-f2-unclaimed-1001',
      },
    } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildVoiceHeaders({
          tenantId: 'tenant-connectshyft-f2',
          orgUnitId: 'org-connectshyft-f2-east',
        }))
        .send(buildVoiceWebhookBody({
          tenantId: 'tenant-connectshyft-f2',
          orgUnitId: 'org-connectshyft-f2-east',
          threadId: 'thread-f2-unclaimed-1001',
          eventType: 'voice.connected',
          sid: 'voice-sid-connected-2003',
          providerEventId: 'provider-event-voice-connected-2003',
          providerLegId: 'provider-leg-voice-connected-2003',
          from: '+12605552023',
          to: TEST_PROVIDER_NUMBER_F2,
          transport: 'bridge',
          recordingUrl: undefined,
          voicemail_duration_seconds: undefined,
        }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        message: 'Inbound webhook accepted for processing',
        data: {
          sid: 'voice-sid-connected-2003',
          from: '+12605552023',
          to: TEST_PROVIDER_NUMBER_F2,
          eventType: 'voice.connected',
          correlation: {
            source: 'metadata',
            deterministic: true,
            threadId: 'thread-f2-unclaimed-1001',
            tenantId: 'tenant-connectshyft-f2',
            orgUnitId: 'org-connectshyft-f2-east',
            neighborId: 'neighbor-connectshyft-f2-1001',
            providerLegId: 'provider-leg-voice-connected-2003',
            providerEventId: 'provider-event-voice-connected-2003',
            providerNumberE164: TEST_PROVIDER_NUMBER_F2,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: 'provider-event:provider-event-voice-connected-2003',
          },
          threadId: 'thread-f2-unclaimed-1001',
          threadState: 'CLAIMED',
          thread: {
            threadId: 'thread-f2-unclaimed-1001',
            tenantId: 'tenant-connectshyft-f2',
            orgUnitId: 'org-connectshyft-f2-east',
            neighborId: 'neighbor-connectshyft-f2-1001',
            source: 'VOICE',
            state: 'CLAIMED',
            lastInboundCsNumberId: TEST_PROVIDER_NUMBER_F2,
            preferredOutboundCsNumberId: TEST_PROVIDER_NUMBER_F2,
            claimedByUserId: CONNECTSHYFT_SYSTEM_ACTOR_USER_ID,
            claimedAtUtc: expect.any(String),
            closedByUserId: null,
            closedAtUtc: null,
            createdAtUtc: expect.any(String),
            updatedAtUtc: expect.any(String),
            escalation: {
              stage: 0,
              nextEvaluationAtUtc: null,
            },
          },
          lifecycle: {
            ensuredActiveThread: true,
            reusedThreadId: 'thread-f2-unclaimed-1001',
            reopenedByInbound: false,
            escalationResetApplied: false,
            inactivityResetApplied: false,
            autoClaimedByConnectedEvent: true,
          },
          autoClaim: {
            attempted: true,
            applied: true,
            reason: null,
            lifecycleEvent: 'connectshyft.thread.claimed',
            sideEffectsPersisted: false,
          },
          callPolicy: {
            transport: 'bridge',
            autoRetry: false,
            redialPolicy: 'manual_only',
          },
          timeline: {
            eventName: 'connectshyft.thread.claimed',
            routingDecision: 'accepted',
            deterministicOrdering: true,
          },
          timelineOutcome: {
            eventName: 'connectshyft.thread.claimed',
            routingDecision: 'accepted',
          },
          audit: {
            eventName: 'connectshyft.thread.claimed',
            metadata: {
              auto_claim_attempted: true,
              auto_claim_applied: true,
              auto_claim_reason: null,
              call_transport: 'bridge',
              reopened_by_inbound: false,
            },
          },
          outbox: {
            eventName: 'connectshyft.thread.claimed',
          },
        },
      });
      expect(response.body.data).not.toHaveProperty('voicemailArtifact');
      expect(response.body.data).not.toHaveProperty('transcription');
      expect(response.body.data).not.toHaveProperty('transcriptionOutbox');
      expect(response.body.data.audit).toEqual(response.body.data.outbox);
    } finally {
      correlationLookupSpy.mockRestore();
    }
  });

  it('returns the current canonical-persistence refusal shape for inbound voice webhooks', async () => {
    recordCanonicalEventSpy.mockRejectedValueOnce(new Error('voice-canonical-down'));
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildVoiceHeaders())
      .send(buildVoiceWebhookBody({
        providerEventId: 'provider-event-voice-error-1004',
        providerLegId: 'provider-leg-voice-error-1004',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_CANONICAL_EVENT_PERSISTENCE_UNAVAILABLE',
      message: 'Inbound voice processing could not persist canonical event side effects.',
      refusalType: 'business',
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        correlation: {
          source: 'metadata',
          deterministic: true,
          threadId: 'thread-f1-unclaimed-1001',
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          neighborId: 'neighbor-connectshyft-f1-1001',
          providerLegId: 'provider-leg-voice-error-1004',
          providerEventId: 'provider-event-voice-error-1004',
          providerNumberE164: TEST_PROVIDER_NUMBER_F1,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-voice-error-1004',
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
        error: 'voice-canonical-down',
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'correlation',
      'error',
      'providerResolution',
      'replaySafe',
      'sideEffects',
      'timelineOutcome',
    ].sort());
  });
});
