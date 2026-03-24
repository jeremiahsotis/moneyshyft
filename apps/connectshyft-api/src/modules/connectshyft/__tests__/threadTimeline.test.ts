import * as canonicalEventsModule from '../canonicalEvents';
import * as callsModule from '../calls';
import { CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME } from '../inboundSms';
import {
  CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
} from '../inboundVoice';
import {
  CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
  CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES,
  getThreadTimeline,
  mapConnectShyftCanonicalEventToTimelineItem,
  sortConnectShyftThreadTimelineItems,
} from '../threadTimeline';
import * as voicemailsModule from '../voicemails';

describe('connectshyft thread timeline projection', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps canonical inbound sms events into first-class inbound timeline items', () => {
    const item = mapConnectShyftCanonicalEventToTimelineItem({
      eventId: 'event-inbound-001',
      aggregateId: 'thread-timeline-1001',
      aggregateType: 'Thread',
      eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
      occurredAtUtc: '2026-03-19T10:00:00.000Z',
      payload: {
        direction: 'inbound',
        channel: 'sms',
        actor: 'neighbor',
        eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        inboundMessageArtifact: {
          body: 'Need help with delivery window',
          from: '+13175550100',
          to: '+13175550101',
        },
      },
    });

    expect(item).toEqual({
      id: 'event-inbound-001',
      threadId: 'thread-timeline-1001',
      type: 'message',
      direction: 'inbound',
      channel: 'sms',
      body: 'Need help with delivery window',
      occurredAtUtc: '2026-03-19T10:00:00.000Z',
      actor: 'neighbor',
      providerMetadata: null,
      deliveryStatus: null,
    });
  });

  it('maps canonical outbound sms events into first-class outbound timeline items', () => {
    const item = mapConnectShyftCanonicalEventToTimelineItem({
      eventId: 'event-outbound-001',
      aggregateId: 'thread-timeline-1001',
      aggregateType: 'Thread',
      eventType: 'MessageQueued',
      occurredAtUtc: '2026-03-19T10:05:00.000Z',
      payload: {
        direction: 'outbound',
        channel: 'sms',
        actor: 'user',
        eventName: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
        outboundMessageArtifact: {
          body: 'On my way now',
          from: '+13175550101',
          to: '+13175550100',
        },
      },
    });

    expect(item).toEqual({
      id: 'event-outbound-001',
      threadId: 'thread-timeline-1001',
      type: 'message',
      direction: 'outbound',
      channel: 'sms',
      body: 'On my way now',
      occurredAtUtc: '2026-03-19T10:05:00.000Z',
      actor: 'user',
      providerMetadata: null,
      deliveryStatus: null,
    });
  });

  it('sorts projected timeline items by occurredAtUtc then canonical event id', () => {
    const sorted = sortConnectShyftThreadTimelineItems([
      {
        id: 'event-b',
        threadId: 'thread-timeline-1001',
        type: 'message',
        direction: 'outbound',
        channel: 'sms',
        body: 'second',
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        actor: 'user',
        providerMetadata: null,
        deliveryStatus: null,
      },
      {
        id: 'event-a',
        threadId: 'thread-timeline-1001',
        type: 'message',
        direction: 'inbound',
        channel: 'sms',
        body: 'first',
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        actor: 'neighbor',
        providerMetadata: null,
        deliveryStatus: null,
      },
      {
        id: 'event-c',
        threadId: 'thread-timeline-1001',
        type: 'message',
        direction: 'outbound',
        channel: 'sms',
        body: 'third',
        occurredAtUtc: '2026-03-19T10:01:00.000Z',
        actor: 'user',
        providerMetadata: null,
        deliveryStatus: null,
      },
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      'event-a',
      'event-b',
      'event-c',
    ]);
  });

  it('returns the most recent bounded timeline window and an empty timeline when no events are eligible', async () => {
    const listSpy = jest.spyOn(canonicalEventsModule, 'listConnectShyftCanonicalEvents')
      .mockResolvedValueOnce([
        {
          eventId: 'event-001',
          aggregateId: 'thread-timeline-1001',
          aggregateType: 'Thread',
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
        },
        {
          eventId: 'event-002',
          aggregateId: 'thread-timeline-1001',
          aggregateType: 'Thread',
          eventType: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
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
        },
        {
          eventId: 'event-003',
          aggregateId: 'thread-timeline-1001',
          aggregateType: 'Thread',
          eventType: CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
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
        },
      ])
      .mockResolvedValueOnce([
        {
          eventId: 'event-ignored-001',
          aggregateId: 'thread-empty-1001',
          aggregateType: 'Thread',
          eventType: 'connectshyft.thread.claimed',
          occurredAtUtc: '2026-03-19T11:00:00.000Z',
          payload: {
            direction: 'outbound',
            channel: 'sms',
            eventName: 'connectshyft.thread.claimed',
          },
        },
      ]);

    const limited = await getThreadTimeline({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-timeline-1001',
      limit: 2,
    });
    const empty = await getThreadTimeline({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-empty-1001',
    });

    expect(listSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      aggregateId: 'thread-timeline-1001',
      aggregateType: 'Thread',
      limit: 200,
      window: 'most_recent',
    }));
    expect(limited.limitApplied).toBe(2);
    expect(limited.items.map((item) => item.id)).toEqual([
      'event-002',
      'event-003',
    ]);
    expect(empty.items).toEqual([]);
  });

  it('maps explicit voice lifecycle and voicemail placeholder events without changing sms ordering semantics', async () => {
    jest.spyOn(canonicalEventsModule, 'listConnectShyftCanonicalEvents').mockResolvedValue([
      {
        eventId: 'event-sms-001',
        aggregateId: 'thread-timeline-voice-1001',
        aggregateType: 'Thread',
        eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'sms',
          actor: 'neighbor',
          eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
          inboundMessageArtifact: {
            body: 'sms first',
          },
        },
      },
      {
        eventId: 'event-voice-001',
        aggregateId: 'thread-timeline-voice-1001',
        aggregateType: 'Thread',
        eventType: CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.started,
        occurredAtUtc: '2026-03-19T10:01:00.000Z',
        payload: {
          direction: 'outbound',
          channel: 'voice',
          actor: 'user',
          eventName: CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.started,
        },
      },
      {
        eventId: 'event-voicemail-001',
        aggregateId: 'thread-timeline-voice-1001',
        aggregateType: 'Thread',
        eventType: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:02:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'voice',
          eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
          voicemailArtifact: {
            artifactId: 'vm-001',
            recordingUrl: 'https://example.test/vm-001.mp3',
            durationSeconds: 42,
          },
        },
      },
      {
        eventId: 'event-voicemail-002',
        aggregateId: 'thread-timeline-voice-1001',
        aggregateType: 'Thread',
        eventType: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T10:03:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'voice',
          eventName: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
          metadata: {
            transcriptText: 'Leave package at the side door',
          },
          voicemailArtifact: {
            artifactId: 'vm-001',
            transcription: {
              available: true,
              text: 'Leave package at the side door',
            },
          },
        },
      },
    ]);

    const timeline = await getThreadTimeline({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-timeline-voice-1001',
    });

    expect(timeline.items.map((item) => item.type)).toEqual([
      'message',
      'voice_event',
      'voicemail',
      'voicemail',
    ]);
    expect(timeline.items[1]).toMatchObject({
      id: 'event-voice-001',
      channel: 'voice',
      type: 'voice_event',
    });
    expect(timeline.items[2]).toMatchObject({
      id: 'event-voicemail-001',
      channel: 'voicemail',
      type: 'voicemail',
      recordingUrl: 'https://example.test/vm-001.mp3',
      durationSeconds: 42,
    });
    expect(timeline.items[3]).toMatchObject({
      id: 'event-voicemail-002',
      channel: 'voicemail',
      type: 'voicemail',
      transcript: 'Leave package at the side door',
    });
  });

  it('projects persisted calls and persisted voicemails alongside canonical events in chronological order', async () => {
    jest.spyOn(canonicalEventsModule, 'listConnectShyftCanonicalEvents').mockResolvedValueOnce([
      {
        eventId: 'event-sms-persisted-1001',
        aggregateId: 'thread-timeline-persisted-1001',
        aggregateType: 'Thread',
        eventType: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
        occurredAtUtc: '2026-03-19T09:59:00.000Z',
        payload: {
          direction: 'inbound',
          channel: 'sms',
          actor: 'neighbor',
          eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
          inboundMessageArtifact: {
            body: 'before the call',
          },
        },
      },
    ]);
    jest.spyOn(callsModule.connectShyftCallServiceAsync, 'listThreadCalls').mockResolvedValueOnce([
      {
        id: 'call-timeline-1001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-timeline-persisted-1001',
        personId: 'person-connectshyft-f1-1001',
        bridgeSessionId: 'bridge-timeline-1001',
        status: 'bridged',
        failureCode: null,
        failureMessage: null,
        startedAtUtc: '2026-03-19T10:00:00.000Z',
        operatorAnsweredAtUtc: '2026-03-19T10:00:30.000Z',
        neighborAnsweredAtUtc: '2026-03-19T10:01:00.000Z',
        bridgedAtUtc: '2026-03-19T10:01:30.000Z',
        endedAtUtc: null,
        createdAtUtc: '2026-03-19T10:00:00.000Z',
        updatedAtUtc: '2026-03-19T10:01:30.000Z',
      },
    ]);
    jest.spyOn(voicemailsModule.connectShyftVoicemailServiceAsync, 'listThreadVoicemails').mockResolvedValueOnce([
      {
        id: 'voicemail-timeline-1001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        callId: 'call-timeline-1001',
        threadId: 'thread-timeline-persisted-1001',
        personId: 'person-connectshyft-f1-1001',
        artifactId: 'artifact-timeline-1001',
        bridgeSessionId: 'bridge-timeline-1001',
        contactPointId: '+13175550100',
        direction: 'inbound',
        recordingUrl: 'https://example.test/timeline-vm.mp3',
        recordingStatus: 'completed',
        providerEventId: 'provider-event-vm-1001',
        providerLegId: 'provider-leg-vm-1001',
        providerRecordingId: 'provider-recording-vm-1001',
        occurredAtUtc: '2026-03-19T10:02:00.000Z',
        createdAtUtc: '2026-03-19T10:02:00.000Z',
        updatedAtUtc: '2026-03-19T10:02:00.000Z',
        transcriptionStatus: 'completed',
        transcriptionText: 'Please call me back after 5.',
        transcriptionProvider: 'telnyx',
        transcriptionRequestedAtUtc: '2026-03-19T10:02:00.000Z',
        transcriptionCompletedAtUtc: '2026-03-19T10:02:20.000Z',
        transcriptionFailedAtUtc: null,
        transcriptionJson: {
          status: 'completed',
          text: 'Please call me back after 5.',
        },
      },
    ]);

    const timeline = await getThreadTimeline({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-timeline-persisted-1001',
    });

    expect(timeline.items).toEqual([
      expect.objectContaining({
        id: 'event-sms-persisted-1001',
        type: 'message',
        body: 'before the call',
      }),
      expect.objectContaining({
        id: 'call-call-timeline-1001',
        type: 'voice_event',
        occurredAtUtc: '2026-03-19T10:00:00.000Z',
        deliveryStatus: 'bridged',
        providerMetadata: expect.objectContaining({
          callId: 'call-timeline-1001',
          status: 'bridged',
          statusEvents: [
            {
              status: 'operator_dialing',
              occurredAtUtc: '2026-03-19T10:00:00.000Z',
            },
            {
              status: 'operator_answered',
              occurredAtUtc: '2026-03-19T10:00:30.000Z',
            },
            {
              status: 'neighbor_dialing',
              occurredAtUtc: '2026-03-19T10:00:30.000Z',
            },
            {
              status: 'neighbor_answered',
              occurredAtUtc: '2026-03-19T10:01:00.000Z',
            },
            {
              status: 'bridged',
              occurredAtUtc: '2026-03-19T10:01:30.000Z',
            },
          ],
        }),
      }),
      expect.objectContaining({
        id: 'voicemail-voicemail-timeline-1001',
        type: 'voicemail',
        direction: 'inbound',
        occurredAtUtc: '2026-03-19T10:02:00.000Z',
        deliveryStatus: 'completed',
        recordingUrl: 'https://example.test/timeline-vm.mp3',
        transcript: 'Please call me back after 5.',
        providerMetadata: {
          callId: 'call-timeline-1001',
          bridgeSessionId: 'bridge-timeline-1001',
          contactPointId: '+13175550100',
          artifactId: 'artifact-timeline-1001',
          direction: 'inbound',
          recordingStatus: 'completed',
          providerEventId: 'provider-event-vm-1001',
          providerLegId: 'provider-leg-vm-1001',
          providerRecordingId: 'provider-recording-vm-1001',
          transcriptionStatus: 'completed',
          transcriptionProvider: 'telnyx',
        },
      }),
    ]);
  });
});
