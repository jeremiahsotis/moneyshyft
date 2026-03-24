import type { ConnectShyftResolverQueueItemRecord } from '../src/connectshyft';
import {
  isConnectShyftResolverQueueItemType,
  isConnectShyftResolverQueueClaimState,
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
      resolverReviewId: null,
      threadId: 'thread-1',
    };

    expect(identityItem.itemType).toBe('identity_review');
    expect(rebindItem.itemType).toBe('rebind_review');
    expect(isConnectShyftResolverQueueItemType(identityItem.itemType)).toBe(true);
    expect(isConnectShyftResolverQueueItemType(rebindItem.itemType)).toBe(true);
    expect(isConnectShyftResolverQueueClaimState(identityItem.claimState)).toBe(true);
  });
});
