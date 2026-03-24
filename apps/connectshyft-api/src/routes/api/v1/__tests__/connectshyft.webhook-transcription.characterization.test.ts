// @ts-nocheck
import request from 'supertest';
import * as canonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import { resetConnectShyftCanonicalEventsForTests } from '../../../../modules/connectshyft/canonicalEvents';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import {
  connectShyftVoicemailServiceAsync,
  resetConnectShyftVoicemailStateForTests,
} from '../../../../modules/connectshyft/voicemails';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from './connectshyft.provider-registry.test.shared';

const TEST_TIMESTAMP = '2026-03-18T12:00:00.000Z';
const TEST_TENANT_ID = 'tenant-connectshyft-f1';
const TEST_ORG_UNIT_ID = 'org-connectshyft-f1-east';
const TEST_THREAD_ID = 'thread-f1-claimed-1002';
const TEST_PROVIDER_NUMBER = '+12605550191';
const TEST_CALLBACK_PROVIDER_EVENT_ID = 'provider-event-voice-seed-1001';
const TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID = 'vm-thread-f1-claimed-1002-provider-event-voice-seed-1001';
const TEST_PERSON_ID = 'person-connectshyft-transcription-1001';

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
    eventType: readString(rawEventType) || 'voice.transcription.completed',
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

const buildTranscriptionHeaders = (): Record<string, string> => buildHeaders({
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-transcription-characterization',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([TEST_ORG_UNIT_ID]),
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
});

const buildTranscriptionWebhookBody = (overrides: Record<string, unknown> = {}) => ({
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  threadId: TEST_THREAD_ID,
  eventType: 'voice.transcription.completed',
  providerEventId: 'provider-event-transcription-callback-1001',
  providerLegId: 'provider-leg-transcription-1001',
  to: TEST_PROVIDER_NUMBER,
  callbackCorrelation: {
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    threadId: TEST_THREAD_ID,
    providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
    providerLegId: 'provider-leg-transcription-1001',
    voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
  },
  transcript: {
    text: 'Neighbor confirmed transport coordination.',
  },
  ...overrides,
});

describe('connectshyft inbound transcription callback webhook route characterization', () => {
  registerProviderRegistryRouteIntegrationHooks();

  let recordCanonicalEventSpy: jest.SpyInstance;

  beforeEach(async () => {
    sendSmsMock.mockClear();
    startOutboundCallMock.mockClear();
    startBridgeSessionMock.mockClear();
    endCallMock.mockClear();
    verifyWebhookMock.mockClear();
    translateProviderEventMock.mockClear();
    resetConnectShyftCanonicalEventsForTests();
    resetConnectShyftProviderCorrelationStateForTests();
    resetConnectShyftVoicemailStateForTests();

    recordCanonicalEventSpy = jest.spyOn(
      canonicalEventsModule,
      'recordConnectShyftCanonicalEvent',
    ).mockImplementation(async (eventInput) => ({
      eventId: 'canonical-event-transcription-1001',
      aggregateId: eventInput.aggregateId,
      aggregateType: eventInput.aggregateType,
      eventType: eventInput.eventType,
      payload: eventInput.payload,
      occurredAtUtc: TEST_TIMESTAMP,
    }) as any);

    await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: TEST_THREAD_ID,
      personId: TEST_PERSON_ID,
      artifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
      direction: 'inbound',
      contactPointId: '+12605552021',
      recordingUrl: 'https://connectshyft.test/transcription-seed-1001.mp3',
      recordingStatus: 'completed',
      providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
      providerLegId: 'provider-leg-transcription-1001',
      occurredAtUtc: TEST_TIMESTAMP,
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: TEST_TIMESTAMP,
    });
  });

  afterEach(() => {
    recordCanonicalEventSpy.mockRestore();
  });

  it('returns the current transcription callback success envelope and attachment payload shape', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildTranscriptionHeaders())
      .send(buildTranscriptionWebhookBody());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
      message: 'Transcription callback attached to voicemail artifact',
      data: {
        eventType: 'voice.transcription.completed',
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        correlation: {
          source: 'metadata',
          deterministic: true,
          threadId: TEST_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
          voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-transcription-callback-1001',
        },
        transcriptionAttachment: {
          applied: true,
          transcriptText: 'Neighbor confirmed transport coordination.',
          voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
        },
        timeline: {
          eventName: 'connectshyft.voicemail.transcription_attached',
          routingDecision: 'accepted',
        },
        sideEffects: {
          transcriptMutationApplied: true,
          timelineMutationApplied: true,
        },
        canonicalEvent: {
          eventId: 'canonical-event-transcription-1001',
          aggregateId: TEST_THREAD_ID,
          aggregateType: 'Thread',
          eventType: 'voice.transcription.completed',
          payload: {
            eventName: 'connectshyft.voicemail.transcription_attached',
            routingDecision: 'accepted',
            voicemailArtifact: {
              artifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
              transcription: {
                available: true,
                text: 'Neighbor confirmed transport coordination.',
              },
            },
            transcription: {
              available: true,
              text: 'Neighbor confirmed transport coordination.',
            },
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'canonicalEvent',
      'correlation',
      'eventType',
      'providerResolution',
      'replaySafe',
      'sideEffects',
      'timeline',
      'transcriptionAttachment',
    ].sort());
    expect(recordCanonicalEventSpy).toHaveBeenCalledTimes(1);
    const persistedArtifact = await connectShyftVoicemailServiceAsync.findVoicemailArtifact({
      tenantId: TEST_TENANT_ID,
      artifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
      providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
    });
    expect(persistedArtifact?.transcriptionStatus).toBe('completed');
    expect(persistedArtifact?.transcriptionText).toBe('Neighbor confirmed transport coordination.');
  });

  it('records failed transcription callbacks on the voicemail artifact without creating a timeline attachment event', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildTranscriptionHeaders())
      .send(buildTranscriptionWebhookBody({
        eventType: 'voice.transcription.failed',
        providerEventId: 'provider-event-transcription-failed-1005',
        transcript: undefined,
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_RECORDED',
      message: 'Transcription callback recorded on voicemail artifact',
      data: {
        eventType: 'voice.transcription.failed',
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        correlation: {
          source: 'metadata',
          deterministic: true,
          threadId: TEST_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
          voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-transcription-failed-1005',
        },
        transcriptionAttachment: {
          applied: false,
          transcriptText: null,
          voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
          transcriptionStatus: 'failed',
        },
        sideEffects: {
          transcriptMutationApplied: true,
          timelineMutationApplied: false,
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'correlation',
      'eventType',
      'providerResolution',
      'replaySafe',
      'sideEffects',
      'transcriptionAttachment',
    ].sort());
    expect(recordCanonicalEventSpy).not.toHaveBeenCalled();
    const persistedArtifact = await connectShyftVoicemailServiceAsync.findVoicemailArtifact({
      tenantId: TEST_TENANT_ID,
      artifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
      providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
    });
    expect(persistedArtifact?.recordingUrl).toBe('https://connectshyft.test/transcription-seed-1001.mp3');
    expect(persistedArtifact?.transcriptionStatus).toBe('failed');
    expect(persistedArtifact?.transcriptionText).toBe(null);
  });

  it('preserves the current duplicate suppression surface for transcription callbacks', async () => {
    const app = buildApp();
    const body = buildTranscriptionWebhookBody({
      providerEventId: 'provider-event-transcription-duplicate-1002',
    });

    const firstResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildTranscriptionHeaders())
      .send(body);
    const duplicateResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildTranscriptionHeaders())
      .send(body);

    expect(firstResponse.status).toBe(200);
    expect(duplicateResponse.status).toBe(200);
    expect(duplicateResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_DUPLICATE_SUPPRESSED',
      message: 'Transcription callback duplicate suppressed',
      data: {
        eventType: 'voice.transcription.completed',
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInvoked: true,
        },
        correlation: {
          source: 'metadata',
          deterministic: true,
          threadId: TEST_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          providerLegId: 'provider-leg-transcription-1001',
          providerMessageId: null,
          providerEventId: 'provider-event-transcription-duplicate-1002',
          providerNumberE164: TEST_PROVIDER_NUMBER,
        },
        replaySafe: {
          duplicate: true,
          suppressedDomainWrites: true,
          dedupeKey: 'provider-event:provider-event-transcription-duplicate-1002',
        },
        sideEffects: {
          transcriptMutationApplied: false,
          timelineMutationApplied: false,
        },
      },
    });
    expect(Object.keys(duplicateResponse.body.data).sort()).toEqual([
      'correlation',
      'eventType',
      'providerResolution',
      'replaySafe',
      'sideEffects',
    ].sort());
    expect(recordCanonicalEventSpy).toHaveBeenCalledTimes(1);
  });

  it('returns the current invalid-correlation refusal shape for transcription callbacks', async () => {
    resetConnectShyftVoicemailStateForTests();
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildTranscriptionHeaders())
      .send(buildTranscriptionWebhookBody({
        providerEventId: 'provider-event-transcription-invalid-1003',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_TRANSCRIPTION_CORRELATION_INVALID',
      message: 'Transcription callback correlation is invalid or unresolved for voicemail attachment.',
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
          threadId: TEST_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
          voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-transcription-invalid-1003',
        },
        sideEffects: {
          transcriptMutationApplied: false,
          orphanTranscriptPrevented: true,
        },
        audit: {
          eventName: 'connectshyft.voicemail.transcription_refused',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            thread_id: TEST_THREAD_ID,
            provider_event_id: TEST_CALLBACK_PROVIDER_EVENT_ID,
            voicemail_artifact_id: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
            reason: 'callback_correlation_unresolved',
          },
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'correlation',
      'providerResolution',
      'replaySafe',
      'sideEffects',
    ].sort());
    expect(recordCanonicalEventSpy).not.toHaveBeenCalled();
  });

  it('returns the current callback-persistence failure mapping when transcription attachment persistence fails', async () => {
    recordCanonicalEventSpy.mockRejectedValueOnce(new Error('transcription-canonical-down'));
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(buildTranscriptionHeaders())
      .send(buildTranscriptionWebhookBody({
        providerEventId: 'provider-event-transcription-error-1004',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_TRANSCRIPTION_ATTACHMENT_UNAVAILABLE',
      message: 'Transcription callback could not persist attachment side effects.',
      refusalType: 'business',
      data: {
        correlation: {
          source: 'metadata',
          deterministic: true,
          threadId: TEST_THREAD_ID,
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          providerEventId: TEST_CALLBACK_PROVIDER_EVENT_ID,
          voicemailArtifactId: TEST_CALLBACK_VOICEMAIL_ARTIFACT_ID,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: 'provider-event:provider-event-transcription-error-1004',
        },
        sideEffects: {
          transcriptMutationApplied: false,
          orphanTranscriptPrevented: true,
        },
        error: 'transcription-canonical-down',
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'correlation',
      'error',
      'replaySafe',
      'sideEffects',
    ].sort());
  });
});
