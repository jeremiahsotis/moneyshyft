import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as flagsModule from '@/features/connectshyft/flags';
import api from '@/services/api';
import {
  claimConnectShyftResolverQueueItem,
  fetchConnectShyftResolverQueue,
  fetchConnectShyftResolverQueueDetail,
  releaseConnectShyftResolverQueueItem,
} from '../resolverQueue';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/features/connectshyft/flags', () => ({
  buildConnectShyftTestOverrideHeaders: vi.fn(() => ({
    'x-test-connectshyft-user-id': 'resolver-test-user',
  })),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const buildHeadersMock = vi.mocked(flagsModule.buildConnectShyftTestOverrideHeaders);

beforeEach(() => {
  vi.clearAllMocks();
  buildHeadersMock.mockReturnValue({
    'x-test-connectshyft-user-id': 'resolver-test-user',
  });
});

describe('resolverQueue client', () => {
  it('loads typed resolver queue items from the backend contract', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        ok: true,
        code: 'CONNECTSHYFT_RESOLVER_QUEUE_LISTED',
        message: 'ConnectShyft resolver queue listed',
        data: {
          items: [
            {
              id: 'identity-item',
              itemType: 'identity_review',
              status: 'queued',
              active: true,
              terminal: false,
              claimState: 'unclaimed',
              claimantUserId: null,
              claimedByCurrentUser: false,
              claimable: true,
              releasable: false,
              actionable: false,
              resolverReviewId: 'identity-item',
              orgUnitId: 'org-1',
              conversationId: 'conversation-1',
              contactPointId: 'contact-point-1',
              threadId: null,
              personIds: ['person-1'],
              triggerSourceType: 'connectshyft_identity_seam',
              triggerSourceId: 'trigger-1',
              requestedAt: '2026-03-24T10:00:00.000Z',
              startedAt: null,
              resolvedAt: null,
            },
            {
              id: 'rebind-item',
              itemType: 'rebind_review',
              status: 'in_review',
              active: true,
              terminal: false,
              claimState: 'claimed_by_current_user',
              claimantUserId: 'resolver-1',
              claimedByCurrentUser: true,
              claimable: false,
              releasable: true,
              actionable: true,
              resolverReviewId: 'rebind-item',
              orgUnitId: 'org-1',
              conversationId: null,
              contactPointId: 'contact-point-2',
              threadId: null,
              personIds: ['person-2', 'person-3'],
              triggerSourceType: 'connectshyft_person_rebind_review',
              triggerSourceId: 'rebind-history-1',
              requestedAt: '2026-03-24T10:05:00.000Z',
              startedAt: '2026-03-24T10:06:00.000Z',
              resolvedAt: null,
            },
          ],
        },
      },
    });

    const result = await fetchConnectShyftResolverQueue();

    expect(apiGetMock).toHaveBeenCalledWith('/connectshyft/resolver-queue', {
      headers: {
        'x-test-connectshyft-user-id': 'resolver-test-user',
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(2);
      expect(result.items[0].itemType).toBe('identity_review');
      expect(result.items[1].itemType).toBe('rebind_review');
      expect(result.items[1].claimState).toBe('claimed_by_current_user');
    }
  });

  it('loads resolver detail with rebind review context', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        ok: true,
        code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_RETRIEVED',
        message: 'ConnectShyft resolver queue item retrieved',
        data: {
          item: {
            id: 'rebind-item',
            itemType: 'rebind_review',
            status: 'in_review',
            active: true,
            terminal: false,
            claimState: 'claimed_by_other',
            claimantUserId: 'resolver-2',
            claimedByCurrentUser: false,
            claimable: false,
            releasable: false,
            actionable: false,
            resolverReviewId: 'rebind-item',
            orgUnitId: 'org-1',
            conversationId: null,
            contactPointId: 'contact-point-2',
            threadId: null,
            personIds: ['person-2', 'person-3'],
            triggerSourceType: 'connectshyft_person_rebind_review',
            triggerSourceId: 'rebind-history-1',
            requestedAt: '2026-03-24T10:05:00.000Z',
            startedAt: '2026-03-24T10:06:00.000Z',
            resolvedAt: null,
          },
          review: {
            id: 'rebind-item',
            tenantId: 'tenant-1',
            orgUnitId: 'org-1',
            reviewType: 'subject_reassignment_review',
            reviewStatus: 'in_review',
            priority: 'normal',
            triggerSourceType: 'connectshyft_person_rebind_review',
            triggerSourceId: 'rebind-history-1',
            candidatePersonIds: ['person-2', 'person-3'],
            confidenceBand: 'medium',
            confidenceReasons: [],
            riskFlags: [],
            requestedByUserId: 'requested-by-user',
            requestedAt: '2026-03-24T10:05:00.000Z',
            actionable: true,
            terminal: false,
            decisionStatus: null,
          },
          rebindReview: {
            rebindHistoryId: 'rebind-history-1',
            affectedObjectType: 'contact_point_link',
            affectedObjectIds: ['link-1', 'link-2'],
            sourcePersonId: 'person-old',
            targetPersonId: 'person-new',
            contactPointIds: ['contact-point-2'],
            originatingResolverReviewId: 'origin-review-1',
            originatingResolutionType: 'reassign_contact_point',
          },
        },
      },
    });

    const result = await fetchConnectShyftResolverQueueDetail('rebind_review', 'rebind-item');

    expect(apiGetMock).toHaveBeenCalledWith(
      '/connectshyft/resolver-queue/rebind_review/rebind-item',
      {
        headers: {
          'x-test-connectshyft-user-id': 'resolver-test-user',
        },
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detail.item.claimState).toBe('claimed_by_other');
      expect(result.detail.rebindReview?.affectedObjectType).toBe('contact_point_link');
      expect(result.detail.rebindReview?.originatingResolutionType).toBe('reassign_contact_point');
    }
  });

  it('uses backend-backed claim and release routes without inventing local semantics', async () => {
    apiPostMock
      .mockResolvedValueOnce({
        data: {
          ok: true,
          code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_CLAIMED',
          message: 'ConnectShyft resolver queue item claimed',
          data: {
            item: {
              id: 'identity-item',
              itemType: 'identity_review',
              status: 'in_review',
              active: true,
              terminal: false,
              claimState: 'claimed_by_current_user',
              claimantUserId: 'resolver-1',
              claimedByCurrentUser: true,
              claimable: false,
              releasable: true,
              actionable: true,
              resolverReviewId: 'identity-item',
              orgUnitId: 'org-1',
              conversationId: null,
              contactPointId: 'contact-point-1',
              threadId: null,
              personIds: ['person-1'],
              triggerSourceType: 'connectshyft_identity_seam',
              triggerSourceId: 'trigger-1',
              requestedAt: '2026-03-24T10:00:00.000Z',
              startedAt: '2026-03-24T10:02:00.000Z',
              resolvedAt: null,
            },
            review: {
              id: 'identity-item',
              tenantId: 'tenant-1',
              orgUnitId: 'org-1',
              reviewType: 'shared_contact_ambiguity',
              reviewStatus: 'in_review',
              priority: 'normal',
              triggerSourceType: 'connectshyft_identity_seam',
              triggerSourceId: 'trigger-1',
              candidatePersonIds: ['person-1'],
              confidenceBand: 'medium',
              confidenceReasons: [],
              riskFlags: ['shared_contact_possible'],
              requestedByUserId: 'requested-by-user',
              requestedAt: '2026-03-24T10:00:00.000Z',
              actionable: true,
              terminal: false,
              decisionStatus: null,
            },
            rebindReview: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_RELEASED',
          message: 'ConnectShyft resolver queue item released',
          data: {
            item: {
              id: 'identity-item',
              itemType: 'identity_review',
              status: 'queued',
              active: true,
              terminal: false,
              claimState: 'unclaimed',
              claimantUserId: null,
              claimedByCurrentUser: false,
              claimable: true,
              releasable: false,
              actionable: false,
              resolverReviewId: 'identity-item',
              orgUnitId: 'org-1',
              conversationId: null,
              contactPointId: 'contact-point-1',
              threadId: null,
              personIds: ['person-1'],
              triggerSourceType: 'connectshyft_identity_seam',
              triggerSourceId: 'trigger-1',
              requestedAt: '2026-03-24T10:00:00.000Z',
              startedAt: null,
              resolvedAt: null,
            },
            review: {
              id: 'identity-item',
              tenantId: 'tenant-1',
              orgUnitId: 'org-1',
              reviewType: 'shared_contact_ambiguity',
              reviewStatus: 'queued',
              priority: 'normal',
              triggerSourceType: 'connectshyft_identity_seam',
              triggerSourceId: 'trigger-1',
              candidatePersonIds: ['person-1'],
              confidenceBand: 'medium',
              confidenceReasons: [],
              riskFlags: ['shared_contact_possible'],
              requestedByUserId: 'requested-by-user',
              requestedAt: '2026-03-24T10:00:00.000Z',
              actionable: true,
              terminal: false,
              decisionStatus: null,
            },
            rebindReview: null,
          },
        },
      });

    const claimResult = await claimConnectShyftResolverQueueItem('identity_review', 'identity-item');
    const releaseResult = await releaseConnectShyftResolverQueueItem('identity_review', 'identity-item');

    expect(apiPostMock).toHaveBeenNthCalledWith(
      1,
      '/connectshyft/resolver-queue/identity_review/identity-item/claim',
      undefined,
      {
        headers: {
          'x-test-connectshyft-user-id': 'resolver-test-user',
        },
      },
    );
    expect(apiPostMock).toHaveBeenNthCalledWith(
      2,
      '/connectshyft/resolver-queue/identity_review/identity-item/release',
      undefined,
      {
        headers: {
          'x-test-connectshyft-user-id': 'resolver-test-user',
        },
      },
    );
    expect(claimResult.ok).toBe(true);
    expect(releaseResult.ok).toBe(true);
    if (claimResult.ok && releaseResult.ok) {
      expect(claimResult.detail.item.claimState).toBe('claimed_by_current_user');
      expect(releaseResult.detail.item.claimState).toBe('unclaimed');
    }
  });
});
