import {
  CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
  CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME,
  buildConnectShyftVoicemailTranscriptionAttachedCanonicalPayload,
  buildConnectShyftInboundVoiceCanonicalPayload,
  buildConnectShyftVoicemailTranscriptionRequest,
  extractConnectShyftVoicemailTranscriptionCallbackPayload,
  extractConnectShyftInboundVoiceNeighborId,
  isConnectShyftVoicemailTranscriptionCallbackEventType,
  mapConnectShyftInboundVoiceWebhookToDomainEvent,
  resolveConnectShyftInboundVoiceRouting,
} from '../inboundVoice';

describe('connectshyft inbound voice domain mapping', () => {
  it('[E3-UNIT-001][P0] maps voicemail webhook payload fields into a canonical inbound voice domain event @P0', () => {
    const domainEvent = mapConnectShyftInboundVoiceWebhookToDomainEvent({
      webhookBody: {
        providerPayload: {
          from: '+12605550172',
          to: '+12605550171',
          recording_url: 'https://example.invalid/recordings/voice-001.mp3',
          voicemail_duration_seconds: 47,
        },
      },
      canonicalEventType: 'VoiceVoicemail',
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'voicemail_only',
      providerEventId: 'provider-event-e3-001',
      providerMessageId: null,
      providerLegId: 'provider-leg-e3-001',
    });

    expect(domainEvent).toMatchObject({
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'voicemail_only',
      deterministicOrdering: true,
      canonicalEventType: 'VoiceVoicemail',
      inboundVoiceArtifact: {
        channel: 'voice',
        direction: 'inbound',
        providerEventId: 'provider-event-e3-001',
        providerMessageId: null,
        providerLegId: 'provider-leg-e3-001',
        from: '+12605550172',
        to: '+12605550171',
        recordingUrl: 'https://example.invalid/recordings/voice-001.mp3',
        durationSeconds: 47,
      },
    });
  });

  it('[E3-UNIT-002][P0] resolves voice routing matrix across no-thread, unclaimed, claimed, and closed states @P0', () => {
    expect(resolveConnectShyftInboundVoiceRouting({
      normalizedEventType: 'voice.voicemail',
      threadState: null,
    })).toMatchObject({
      eventName: CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
      routingDecision: 'intake_fallback',
      deterministicOrdering: true,
    });

    expect(resolveConnectShyftInboundVoiceRouting({
      normalizedEventType: 'voice.voicemail',
      threadState: 'UNCLAIMED',
    })).toMatchObject({
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'voicemail_only',
      deterministicOrdering: true,
    });

    expect(resolveConnectShyftInboundVoiceRouting({
      normalizedEventType: 'voice.voicemail',
      threadState: 'CLAIMED',
    })).toMatchObject({
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'accepted',
      deterministicOrdering: true,
      routingPolicy: {
        claimedMode: 'orgunit_configured_mode',
      },
    });

    expect(resolveConnectShyftInboundVoiceRouting({
      normalizedEventType: 'voice.voicemail',
      threadState: 'CLOSED',
    })).toMatchObject({
      eventName: CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
      routingDecision: 'intake_fallback',
      deterministicOrdering: true,
    });
  });

  it('[E3-UNIT-003][P1] builds canonical payload and transcription callback correlation for voicemail artifacts @P1', () => {
    const domainEvent = mapConnectShyftInboundVoiceWebhookToDomainEvent({
      webhookBody: {
        providerPayload: {
          from: '+12605550172',
          to: '+12605550171',
          recording_url: 'https://example.invalid/recordings/voice-002.mp3',
          voicemail_duration_seconds: '63',
        },
      },
      canonicalEventType: '',
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'voicemail_only',
      providerEventId: 'provider-event-e3-002',
      providerMessageId: null,
      providerLegId: 'provider-leg-e3-002',
    });

    const transcription = buildConnectShyftVoicemailTranscriptionRequest({
      tenantId: 'tenant-connectshyft-e3',
      orgUnitId: 'org-connectshyft-e3-east',
      threadId: 'thread-connectshyft-e3-001',
      providerEventId: 'provider-event-e3-002',
      providerLegId: 'provider-leg-e3-002',
      voicemailArtifactId: 'vm-thread-connectshyft-e3-001-provider-event-e3-002',
    });

    const payload = buildConnectShyftInboundVoiceCanonicalPayload({
      domainEvent,
      threadState: 'UNCLAIMED',
      autoClaimApplied: false,
      voicemailArtifactId: transcription.callbackCorrelation.voicemailArtifactId,
      transcription,
    });

    expect(transcription).toEqual({
      requestQueued: true,
      queueName: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME,
      callbackCorrelation: {
        tenantId: 'tenant-connectshyft-e3',
        orgUnitId: 'org-connectshyft-e3-east',
        threadId: 'thread-connectshyft-e3-001',
        providerEventId: 'provider-event-e3-002',
        providerLegId: 'provider-leg-e3-002',
        voicemailArtifactId: 'vm-thread-connectshyft-e3-001-provider-event-e3-002',
      },
    });

    expect(payload).toMatchObject({
      direction: 'inbound',
      channel: 'voice',
      eventType: 'VoiceVoicemail',
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'voicemail_only',
      deterministicOrdering: true,
      threadState: 'UNCLAIMED',
      autoClaimApplied: false,
      voicemailArtifact: {
        artifactId: 'vm-thread-connectshyft-e3-001-provider-event-e3-002',
        recordingUrl: 'https://example.invalid/recordings/voice-002.mp3',
        durationSeconds: 63,
      },
      transcription,
    });
  });

  it('[E3-UNIT-004][P1] extracts neighbor id from voice webhook envelope aliases @P1', () => {
    expect(extractConnectShyftInboundVoiceNeighborId({
      neighborId: 'neighbor-connectshyft-e3-unclaimed-1002',
    })).toBe('neighbor-connectshyft-e3-unclaimed-1002');

    expect(extractConnectShyftInboundVoiceNeighborId({
      providerPayload: {
        neighbor_id: 'neighbor-connectshyft-e3-claimed-1003',
      },
    })).toBe('neighbor-connectshyft-e3-claimed-1003');
  });

  it('[E4-UNIT-001][P0] detects canonical transcription callback event families deterministically @P0', () => {
    expect(isConnectShyftVoicemailTranscriptionCallbackEventType('VoiceTranscriptionCompleted')).toBe(true);
    expect(isConnectShyftVoicemailTranscriptionCallbackEventType('voice.transcription.completed')).toBe(true);
    expect(isConnectShyftVoicemailTranscriptionCallbackEventType('VoiceVoicemail')).toBe(false);
    expect(isConnectShyftVoicemailTranscriptionCallbackEventType('CallConnected')).toBe(false);
  });

  it('[E4-UNIT-002][P0] extracts callback correlation and transcript text from provider payload aliases @P0', () => {
    const extracted = extractConnectShyftVoicemailTranscriptionCallbackPayload({
      callbackCorrelation: {
        tenantId: 'tenant-connectshyft-e4',
        orgUnitId: 'org-connectshyft-e4-east',
        threadId: 'thread-connectshyft-e4-001',
        providerEventId: 'provider-event-e4-seed',
        providerLegId: 'provider-leg-e4-seed',
        voicemailArtifactId: 'vm-thread-connectshyft-e4-001-provider-event-e4-seed',
      },
      transcript: {
        text: 'Follow-up requested after noon.',
      },
      providerPayload: {
        transcription_text: 'Follow-up requested after noon.',
      },
    });

    expect(extracted).toEqual({
      correlation: {
        tenantId: 'tenant-connectshyft-e4',
        orgUnitId: 'org-connectshyft-e4-east',
        threadId: 'thread-connectshyft-e4-001',
        providerEventId: 'provider-event-e4-seed',
        providerLegId: 'provider-leg-e4-seed',
        voicemailArtifactId: 'vm-thread-connectshyft-e4-001-provider-event-e4-seed',
      },
      transcriptText: 'Follow-up requested after noon.',
    });
  });

  it('[E4-UNIT-003][P1] builds canonical transcription-attached payload with deterministic metadata @P1', () => {
    const payload = buildConnectShyftVoicemailTranscriptionAttachedCanonicalPayload({
      eventType: 'VoiceTranscriptionCompleted',
      voicemailArtifactId: 'vm-thread-connectshyft-e4-001-provider-event-e4-seed',
      transcriptText: 'Neighbor confirmed transport coordination.',
      callbackCorrelation: {
        tenantId: 'tenant-connectshyft-e4',
        orgUnitId: 'org-connectshyft-e4-east',
        threadId: 'thread-connectshyft-e4-001',
      },
    });

    expect(payload).toMatchObject({
      direction: 'inbound',
      channel: 'voice',
      eventType: 'VoiceTranscriptionCompleted',
      eventName: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
      routingDecision: 'accepted',
      deterministicOrdering: true,
      metadata: {
        voicemailArtifactId: 'vm-thread-connectshyft-e4-001-provider-event-e4-seed',
        transcriptAvailable: true,
        transcriptText: 'Neighbor confirmed transport coordination.',
        callbackCorrelation: {
          tenantId: 'tenant-connectshyft-e4',
          orgUnitId: 'org-connectshyft-e4-east',
          threadId: 'thread-connectshyft-e4-001',
        },
      },
      voicemailArtifact: {
        artifactId: 'vm-thread-connectshyft-e4-001-provider-event-e4-seed',
        transcription: {
          available: true,
          text: 'Neighbor confirmed transport coordination.',
        },
      },
      transcription: {
        available: true,
        text: 'Neighbor confirmed transport coordination.',
      },
    });
  });
});
