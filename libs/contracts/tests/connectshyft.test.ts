import { describe, expect, it } from 'vitest';
import type {
  ConnectShyftRebindReviewContext,
  ConnectShyftResolverQueueDetailData,
  ConnectShyftResolverQueueItemRecord,
  ConnectShyftThreadSubjectImpact,
} from '../src/connectshyft';
import {
  isConnectShyftRebindReviewAffectedObjectType,
  isConnectShyftResolverQueueItemType,
  isConnectShyftResolverQueueClaimState,
  isConnectShyftThreadSubjectImpactType,
} from '../src/connectshyft';

describe('connectshyft contracts', () => {
  it('supports resolver queue items for identity and rebind review work', () => {
    const identityItem: ConnectShyftResolverQueueItemRecord = {
      id: 'review-1',
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
      resolverReviewId: 'review-1',
      orgUnitId: 'org-1',
      conversationId: 'conversation-1',
      contactPointId: 'contact-point-1',
      threadId: null,
      personIds: ['person-1', 'person-2'],
      triggerSourceType: 'connectshyft_identity_match',
      triggerSourceId: 'identity-match:1',
      requestedAt: new Date().toISOString(),
      startedAt: null,
      resolvedAt: null,
    };

    const rebindItem: ConnectShyftResolverQueueItemRecord = {
      ...identityItem,
      id: 'rebind-1',
      itemType: 'rebind_review',
      resolverReviewId: 'review-rebind-1',
    };

    const rebindReview: ConnectShyftRebindReviewContext = {
      rebindHistoryId: 'rebind-history-1',
      affectedObjectType: 'contact_point_link',
      affectedObjectIds: ['link-review-1'],
      sourcePersonId: 'person-1',
      targetPersonId: 'person-2',
      contactPointIds: ['contact-point-1'],
      originatingResolverReviewId: 'review-1',
      originatingResolutionType: 'merge_people',
    };

    const detail: ConnectShyftResolverQueueDetailData = {
      item: rebindItem,
      review: null,
      rebindReview,
    };

    expect(identityItem.itemType).toBe('identity_review');
    expect(rebindItem.itemType).toBe('rebind_review');
    expect(detail.rebindReview?.rebindHistoryId).toBe('rebind-history-1');
    expect(isConnectShyftResolverQueueItemType(identityItem.itemType)).toBe(true);
    expect(isConnectShyftResolverQueueItemType(rebindItem.itemType)).toBe(true);
    expect(isConnectShyftResolverQueueClaimState(identityItem.claimState)).toBe(true);
    expect(isConnectShyftRebindReviewAffectedObjectType(rebindReview.affectedObjectType)).toBe(true);
  });

  it('supports contract-backed thread subject impact states for contextual banners', () => {
    const impact: ConnectShyftThreadSubjectImpact = {
      impactType: 'resolver_required',
      actionable: true,
      resolverQueueItemId: 'review-1',
      resolverQueueItemType: 'identity_review',
    };

    expect(isConnectShyftThreadSubjectImpactType(impact.impactType)).toBe(true);
    expect(isConnectShyftResolverQueueItemType(impact.resolverQueueItemType)).toBe(true);
    expect(impact.actionable).toBe(true);
  });
});
