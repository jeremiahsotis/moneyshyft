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
      });
    }
  });
});
