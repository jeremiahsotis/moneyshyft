import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as flagsModule from '@/features/connectshyft/flags';
import api from '@/services/api';
import { fetchConnectShyftThreadDetail } from '../readContracts';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@/features/connectshyft/flags', () => ({
  buildConnectShyftTestOverrideHeaders: vi.fn(() => ({
    'x-test-connectshyft-user-id': 'thread-detail-test-user',
  })),
}));

const apiGetMock = vi.mocked(api.get);
const buildHeadersMock = vi.mocked(flagsModule.buildConnectShyftTestOverrideHeaders);

beforeEach(() => {
  vi.clearAllMocks();
  buildHeadersMock.mockReturnValue({
    'x-test-connectshyft-user-id': 'thread-detail-test-user',
  });
});

describe('fetchConnectShyftThreadDetail', () => {
  it('parses backend-authored subject impact for contextual banners', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        ok: true,
        code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
        message: 'ConnectShyft thread detail loaded',
        data: {
          thread: {
            threadId: 'thread-1',
            neighborId: 'neighbor-1',
            neighborDeleted: false,
            neighbor_deleted: false,
            neighborDeletedAtUtc: null,
            neighbor_deleted_at_utc: null,
            orgUnitId: 'org-1',
            tenantId: 'tenant-1',
            state: 'CLAIMED',
            claimedByUserId: 'user-1',
            claimed_by_user_id: 'user-1',
            bucket: 'mine',
            escalationStage: 1,
            isNewUnread: false,
            priorityRank: 2,
            urgencyLabel: 'Needs attention soon',
            lastActivityAtUtc: '2026-03-24T10:00:00.000Z',
            lastInboundCsNumberId: '+12605550191',
            last_inbound_cs_number_id: '+12605550191',
            preferredOutboundCsNumberId: '+12605550191',
            preferred_outbound_cs_number_id: '+12605550191',
            preferredOutboundContext: {
              csNumberId: '+12605550191',
              label: 'Primary Queue',
            },
            preferred_outbound_context: {
              cs_number_id: '+12605550191',
              label: 'Primary Queue',
            },
            voicemailIndicator: false,
            voicemailLabel: null,
            summary: 'Jordan Lee',
            preview: 'Latest update: Jordan Lee',
            display: {
              title: 'Jordan Lee',
              preview: 'Latest update: Jordan Lee',
              urgencyLabel: 'Needs attention soon',
              stateLabel: 'Claimed',
              inboundContext: 'Mapped inbound number configured',
              outboundContext: 'Primary Queue',
              neighborContext: 'Neighbor context: Jordan Lee',
              conferenceContext: 'Conference context: Primary Queue',
              claimContext: 'Claimed by you',
              voicemailLabel: '',
            },
            personId: 'person-1',
            identityState: 'provisional',
            subjectImpact: {
              impactType: 'resolver_required',
              actionable: true,
              resolverQueueItemId: 'review-1',
              resolverQueueItemType: 'identity_review',
            },
            subjectContext: {
              orgUnitId: 'org-1',
              provisionalPersonId: 'person-1',
              threadId: 'thread-1',
              identityState: 'provisional',
            },
            actions: ['Call', 'Text', 'Close'],
            timeline: [],
            lifecycle: {
              reopenedByInbound: false,
            },
          },
        },
      },
    });

    const result = await fetchConnectShyftThreadDetail('thread-1');

    expect(apiGetMock).toHaveBeenCalledWith('/connectshyft/threads/thread-1', {
      headers: {
        'x-test-connectshyft-user-id': 'thread-detail-test-user',
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.thread.subjectImpact).toEqual({
        impactType: 'resolver_required',
        actionable: true,
        resolverQueueItemId: 'review-1',
        resolverQueueItemType: 'identity_review',
      });
      expect(result.thread.subjectContext).toEqual({
        orgUnitId: 'org-1',
        provisionalPersonId: 'person-1',
        threadId: 'thread-1',
        identityState: 'provisional',
      });
    }
  });

  it('normalizes first-class voicemail timeline details for playback and transcript rendering', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        ok: true,
        code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
        message: 'ConnectShyft thread detail loaded',
        data: {
          voicemailArtifacts: [
            {
              artifactId: 'vm-artifact-1001',
              transcription: {
                available: true,
                text: 'Please call me back after lunch.',
              },
            },
          ],
          thread: {
            threadId: 'thread-voicemail-1',
            neighborId: 'neighbor-1',
            neighborDeleted: false,
            neighbor_deleted: false,
            neighborDeletedAtUtc: null,
            neighbor_deleted_at_utc: null,
            orgUnitId: 'org-1',
            tenantId: 'tenant-1',
            state: 'UNCLAIMED',
            claimedByUserId: null,
            claimed_by_user_id: null,
            bucket: 'inbox',
            escalationStage: 0,
            isNewUnread: true,
            priorityRank: 1,
            urgencyLabel: 'Needs attention soon',
            lastActivityAtUtc: '2026-03-24T11:15:00.000Z',
            lastInboundCsNumberId: '+12605550191',
            last_inbound_cs_number_id: '+12605550191',
            preferredOutboundCsNumberId: '+12605550191',
            preferred_outbound_cs_number_id: '+12605550191',
            preferredOutboundContext: {
              csNumberId: '+12605550191',
              label: 'Primary Queue',
            },
            preferred_outbound_context: {
              cs_number_id: '+12605550191',
              label: 'Primary Queue',
            },
            voicemailIndicator: true,
            voicemailLabel: 'Voicemail received',
            summary: 'Jordan Lee',
            preview: 'Jordan left a voicemail.',
            display: {
              title: 'Jordan Lee',
              preview: 'Jordan left a voicemail.',
              urgencyLabel: 'Needs attention soon',
              stateLabel: 'Unclaimed',
              inboundContext: 'Main line',
              outboundContext: 'Primary Queue',
              neighborContext: 'Neighbor context: Jordan Lee',
              conferenceContext: 'Conference context: Primary Queue',
              claimContext: 'Ready to claim',
              voicemailLabel: 'Voicemail received',
            },
            personId: 'person-1',
            identityState: 'confirmed',
            subjectImpact: null,
            subjectContext: {
              orgUnitId: 'org-1',
              personId: 'person-1',
              threadId: 'thread-voicemail-1',
              identityState: 'confirmed',
            },
            actions: ['Call', 'Text', 'Claim'],
            timeline: [
              {
                eventId: 'timeline-voicemail-1',
                eventName: 'connectshyft.voice.voicemail_recorded',
                occurredAtUtc: '2026-03-24T11:15:00.000Z',
                payload: {
                  direction: 'inbound',
                  actor: 'neighbor',
                  channel: 'voicemail',
                  voicemailArtifact: {
                    artifactId: 'vm-artifact-1001',
                    recordingUrl: 'https://connectshyft.test/voicemail-1001.mp3',
                    durationSeconds: 47,
                  },
                },
                summary: 'Jordan left a voicemail.',
              },
            ],
            lifecycle: {
              reopenedByInbound: false,
            },
          },
        },
      },
    });

    const result = await fetchConnectShyftThreadDetail('thread-voicemail-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.thread.timeline[0]).toMatchObject({
        eventId: 'timeline-voicemail-1',
        conversationType: 'voicemail',
        direction: 'inbound',
        channel: 'voicemail',
        occurredAtUtc: '2026-03-24T11:15:00.000Z',
        recordingUrl: 'https://connectshyft.test/voicemail-1001.mp3',
        durationSeconds: 47,
        transcriptionText: 'Please call me back after lunch.',
        transcriptionStatus: 'completed',
        voicemailArtifactId: 'vm-artifact-1001',
      });
    }
  });
});
