import {
  connectShyftVoicemailServiceAsync,
  handleVoicemailTranscriptionCallback,
  resetConnectShyftVoicemailStateForTests,
} from '../voicemails';

describe('connectshyft voicemail artifact persistence', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableFlags = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  beforeEach(() => {
    resetConnectShyftVoicemailStateForTests();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousEnableFlags;
  });

  it('creates a voicemail artifact when no prior correlation exists', async () => {
    const voicemail = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1001',
      orgUnitId: 'org-voicemail-1001',
      threadId: 'thread-voicemail-1001',
      personId: 'person-voicemail-1001',
      artifactId: 'artifact-voicemail-1001',
      direction: 'inbound',
      contactPointId: '+12605550111',
      recordingUrl: 'https://example.test/voicemail-1001.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1001',
      providerLegId: 'provider-leg-voicemail-1001',
      providerRecordingId: 'provider-recording-voicemail-1001',
      occurredAtUtc: '2026-03-24T11:00:00.000Z',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:00:00.000Z',
    });

    expect(voicemail).toMatchObject({
      artifactId: 'artifact-voicemail-1001',
      direction: 'inbound',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1001',
      providerLegId: 'provider-leg-voicemail-1001',
      providerRecordingId: 'provider-recording-voicemail-1001',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:00:00.000Z',
    });
  });

  it('updates an existing artifact instead of creating a second row for the same provider event', async () => {
    const initial = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1002',
      orgUnitId: 'org-voicemail-1002',
      threadId: 'thread-voicemail-1002',
      personId: 'person-voicemail-1002',
      artifactId: 'artifact-voicemail-1002',
      direction: 'outbound',
      bridgeSessionId: 'bridge-voicemail-1002',
      contactPointId: '+12605550112',
      recordingStatus: 'pending',
      providerEventId: 'provider-event-voicemail-1002',
      providerLegId: 'provider-leg-voicemail-1002',
      occurredAtUtc: '2026-03-24T11:05:00.000Z',
    });

    const replay = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1002',
      orgUnitId: 'org-voicemail-1002',
      threadId: 'thread-voicemail-1002',
      personId: 'person-voicemail-1002',
      artifactId: 'artifact-voicemail-1002-replay',
      direction: 'outbound',
      bridgeSessionId: 'bridge-voicemail-1002',
      contactPointId: '+12605550112',
      recordingUrl: 'https://example.test/voicemail-1002.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1002',
      providerLegId: 'provider-leg-voicemail-1002',
      occurredAtUtc: '2026-03-24T11:06:00.000Z',
    });

    const threadVoicemails = await connectShyftVoicemailServiceAsync.listThreadVoicemails({
      tenantId: 'tenant-voicemail-1002',
      orgUnitId: 'org-voicemail-1002',
      threadId: 'thread-voicemail-1002',
    });

    expect(replay.id).toBe(initial.id);
    expect(replay.artifactId).toBe('artifact-voicemail-1002');
    expect(replay.recordingUrl).toBe('https://example.test/voicemail-1002.mp3');
    expect(replay.recordingStatus).toBe('completed');
    expect(threadVoicemails).toHaveLength(1);
  });

  it('prefers stronger provider correlation keys over recording-url fallback keys', async () => {
    const seeded = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1003',
      orgUnitId: 'org-voicemail-1003',
      threadId: 'thread-voicemail-1003',
      personId: 'person-voicemail-1003',
      artifactId: 'artifact-voicemail-1003',
      direction: 'inbound',
      contactPointId: '+12605550113',
      recordingUrl: 'https://example.test/shared-recording.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1003',
      providerRecordingId: 'provider-recording-voicemail-1003',
      occurredAtUtc: '2026-03-24T11:10:00.000Z',
    });

    const updated = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1003',
      orgUnitId: 'org-voicemail-1003',
      threadId: 'thread-voicemail-1003',
      personId: 'person-voicemail-1003',
      artifactId: 'artifact-voicemail-1003-weaker-fallback',
      direction: 'inbound',
      contactPointId: '+12605550113',
      recordingUrl: 'https://example.test/shared-recording.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1003',
      providerRecordingId: 'provider-recording-voicemail-1003',
      transcriptionStatus: 'pending',
      occurredAtUtc: '2026-03-24T11:11:00.000Z',
    });

    expect(updated.id).toBe(seeded.id);
    expect(updated.artifactId).toBe('artifact-voicemail-1003');
    expect(updated.providerRecordingId).toBe('provider-recording-voicemail-1003');
  });

  it('persists transcription updates on the existing artifact and keeps playback metadata intact', async () => {
    const seeded = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1004',
      orgUnitId: 'org-voicemail-1004',
      threadId: 'thread-voicemail-1004',
      personId: 'person-voicemail-1004',
      artifactId: 'artifact-voicemail-1004',
      direction: 'inbound',
      contactPointId: '+12605550114',
      recordingUrl: 'https://example.test/voicemail-1004.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1004',
      providerLegId: 'provider-leg-voicemail-1004',
      occurredAtUtc: '2026-03-24T11:15:00.000Z',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:15:00.000Z',
    });

    const transcribed = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1004',
      orgUnitId: 'org-voicemail-1004',
      artifactId: 'artifact-voicemail-1004',
      providerEventId: 'provider-event-voicemail-1004',
      providerLegId: 'provider-leg-voicemail-1004',
      occurredAtUtc: '2026-03-24T11:16:00.000Z',
      transcriptionStatus: 'completed',
      transcriptionText: 'Please stop by after lunch.',
      transcriptionProvider: 'telnyx',
      transcriptionCompletedAtUtc: '2026-03-24T11:16:00.000Z',
    });

    expect(transcribed.id).toBe(seeded.id);
    expect(transcribed.recordingUrl).toBe('https://example.test/voicemail-1004.mp3');
    expect(transcribed.recordingStatus).toBe('completed');
    expect(transcribed.transcriptionStatus).toBe('completed');
    expect(transcribed.transcriptionText).toBe('Please stop by after lunch.');
    expect(transcribed.transcriptionProvider).toBe('telnyx');
  });

  it('marks transcription failure without invalidating the playable voicemail artifact', async () => {
    const seeded = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1005',
      orgUnitId: 'org-voicemail-1005',
      threadId: 'thread-voicemail-1005',
      personId: 'person-voicemail-1005',
      artifactId: 'artifact-voicemail-1005',
      direction: 'outbound',
      bridgeSessionId: 'bridge-voicemail-1005',
      contactPointId: '+12605550115',
      recordingUrl: 'https://example.test/voicemail-1005.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1005',
      occurredAtUtc: '2026-03-24T11:20:00.000Z',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:20:00.000Z',
    });

    const failed = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1005',
      orgUnitId: 'org-voicemail-1005',
      artifactId: 'artifact-voicemail-1005',
      providerEventId: 'provider-event-voicemail-1005',
      occurredAtUtc: '2026-03-24T11:21:00.000Z',
      transcriptionStatus: 'failed',
      transcriptionFailedAtUtc: '2026-03-24T11:21:00.000Z',
    });

    expect(failed.id).toBe(seeded.id);
    expect(failed.recordingStatus).toBe('completed');
    expect(failed.recordingUrl).toBe('https://example.test/voicemail-1005.mp3');
    expect(failed.transcriptionStatus).toBe('failed');
    expect(failed.transcriptionFailedAtUtc).toBe('2026-03-24T11:21:00.000Z');
  });

  it('preserves one artifact when transcription arrives before a replayed recording callback', async () => {
    const seeded = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1006',
      orgUnitId: 'org-voicemail-1006',
      threadId: 'thread-voicemail-1006',
      personId: 'person-voicemail-1006',
      artifactId: 'artifact-voicemail-1006',
      direction: 'inbound',
      contactPointId: '+12605550116',
      recordingUrl: 'https://example.test/voicemail-1006.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1006',
      providerLegId: 'provider-leg-voicemail-1006',
      occurredAtUtc: '2026-03-24T11:25:00.000Z',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:25:00.000Z',
    });

    const transcribed = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1006',
      orgUnitId: 'org-voicemail-1006',
      artifactId: 'artifact-voicemail-1006',
      providerEventId: 'provider-event-voicemail-1006',
      occurredAtUtc: '2026-03-24T11:25:30.000Z',
      transcriptionStatus: 'completed',
      transcriptionText: 'Call me when you are nearby.',
    });

    const replayedRecording = await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1006',
      orgUnitId: 'org-voicemail-1006',
      artifactId: 'artifact-voicemail-1006-replay',
      providerEventId: 'provider-event-voicemail-1006',
      providerLegId: 'provider-leg-voicemail-1006',
      recordingUrl: 'https://example.test/voicemail-1006.mp3',
      recordingStatus: 'completed',
      occurredAtUtc: '2026-03-24T11:26:00.000Z',
    });

    const threadVoicemails = await connectShyftVoicemailServiceAsync.listThreadVoicemails({
      tenantId: 'tenant-voicemail-1006',
      orgUnitId: 'org-voicemail-1006',
      threadId: 'thread-voicemail-1006',
    });

    expect(transcribed.id).toBe(seeded.id);
    expect(replayedRecording.id).toBe(seeded.id);
    expect(replayedRecording.transcriptionText).toBe('Call me when you are nearby.');
    expect(threadVoicemails).toHaveLength(1);
  });

  it('handles transcription callbacks through the artifact path and keeps playback metadata intact', async () => {
    await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1007',
      orgUnitId: 'org-voicemail-1007',
      threadId: 'thread-voicemail-1007',
      personId: 'person-voicemail-1007',
      artifactId: 'artifact-voicemail-1007',
      direction: 'inbound',
      contactPointId: '+12605550117',
      recordingUrl: 'https://example.test/voicemail-1007.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1007',
      providerLegId: 'provider-leg-voicemail-1007',
      occurredAtUtc: '2026-03-24T11:30:00.000Z',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:30:00.000Z',
    });

    const result = await handleVoicemailTranscriptionCallback({
      tenantId: 'tenant-voicemail-1007',
      orgUnitId: 'org-voicemail-1007',
      threadId: 'thread-voicemail-1007',
      voicemailArtifactId: 'artifact-voicemail-1007',
      correlationProviderEventId: 'provider-event-voicemail-1007',
      callbackProviderLegId: 'provider-leg-voicemail-1007',
      occurredAtUtc: '2026-03-24T11:31:00.000Z',
      transcriptionStatus: 'completed',
      transcriptionText: 'Please ring the side doorbell.',
      transcriptionProvider: 'telnyx',
    });

    expect(result).toMatchObject({
      ok: true,
      callbackStatus: 'completed',
      malformed: false,
      voicemail: {
        artifactId: 'artifact-voicemail-1007',
        recordingUrl: 'https://example.test/voicemail-1007.mp3',
        recordingStatus: 'completed',
        transcriptionStatus: 'completed',
        transcriptionText: 'Please ring the side doorbell.',
        transcriptionProvider: 'telnyx',
      },
    });
  });

  it('marks malformed transcription callbacks as failed without invalidating playback', async () => {
    await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1008',
      orgUnitId: 'org-voicemail-1008',
      threadId: 'thread-voicemail-1008',
      personId: 'person-voicemail-1008',
      artifactId: 'artifact-voicemail-1008',
      direction: 'outbound',
      bridgeSessionId: 'bridge-voicemail-1008',
      contactPointId: '+12605550118',
      recordingUrl: 'https://example.test/voicemail-1008.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1008',
      providerLegId: 'provider-leg-voicemail-1008',
      occurredAtUtc: '2026-03-24T11:35:00.000Z',
      transcriptionStatus: 'pending',
      transcriptionRequestedAtUtc: '2026-03-24T11:35:00.000Z',
    });

    const result = await handleVoicemailTranscriptionCallback({
      tenantId: 'tenant-voicemail-1008',
      orgUnitId: 'org-voicemail-1008',
      threadId: 'thread-voicemail-1008',
      voicemailArtifactId: 'artifact-voicemail-1008',
      correlationProviderEventId: 'provider-event-voicemail-1008',
      callbackProviderLegId: 'provider-leg-voicemail-1008',
      occurredAtUtc: '2026-03-24T11:36:00.000Z',
      transcriptionStatus: 'completed',
      transcriptionText: null,
      transcriptionProvider: 'telnyx',
    });

    expect(result).toMatchObject({
      ok: true,
      callbackStatus: 'failed',
      malformed: true,
      voicemail: {
        artifactId: 'artifact-voicemail-1008',
        recordingUrl: 'https://example.test/voicemail-1008.mp3',
        recordingStatus: 'completed',
        transcriptionStatus: 'failed',
      },
    });
  });

  it('does not let a failed transcription callback overwrite a completed transcript', async () => {
    await connectShyftVoicemailServiceAsync.upsertVoicemailArtifact({
      tenantId: 'tenant-voicemail-1009',
      orgUnitId: 'org-voicemail-1009',
      threadId: 'thread-voicemail-1009',
      personId: 'person-voicemail-1009',
      artifactId: 'artifact-voicemail-1009',
      direction: 'inbound',
      contactPointId: '+12605550119',
      recordingUrl: 'https://example.test/voicemail-1009.mp3',
      recordingStatus: 'completed',
      providerEventId: 'provider-event-voicemail-1009',
      providerLegId: 'provider-leg-voicemail-1009',
      occurredAtUtc: '2026-03-24T11:40:00.000Z',
      transcriptionStatus: 'completed',
      transcriptionText: 'Completed transcript should win.',
      transcriptionProvider: 'telnyx',
      transcriptionRequestedAtUtc: '2026-03-24T11:40:00.000Z',
      transcriptionCompletedAtUtc: '2026-03-24T11:41:00.000Z',
    });

    const result = await handleVoicemailTranscriptionCallback({
      tenantId: 'tenant-voicemail-1009',
      orgUnitId: 'org-voicemail-1009',
      threadId: 'thread-voicemail-1009',
      voicemailArtifactId: 'artifact-voicemail-1009',
      correlationProviderEventId: 'provider-event-voicemail-1009',
      callbackProviderLegId: 'provider-leg-voicemail-1009',
      occurredAtUtc: '2026-03-24T11:42:00.000Z',
      transcriptionStatus: 'failed',
      transcriptionText: null,
      transcriptionProvider: 'telnyx',
    });

    expect(result).toMatchObject({
      ok: true,
      callbackStatus: 'failed',
      voicemail: {
        artifactId: 'artifact-voicemail-1009',
        transcriptionStatus: 'completed',
        transcriptionText: 'Completed transcript should win.',
      },
    });
  });
});
