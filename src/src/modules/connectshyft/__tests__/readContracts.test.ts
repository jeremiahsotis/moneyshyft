import {
  parseConnectShyftInboxBucket,
  resolveConnectShyftInboxContract,
  resolveConnectShyftPriorityRank,
  resolveConnectShyftThreadDetailContract,
  resolveConnectShyftUrgencyLabel,
} from '../readContracts';

describe('connectshyft read contracts', () => {
  it('parses inbox and mine bucket values deterministically', () => {
    expect(parseConnectShyftInboxBucket('inbox')).toBe('inbox');
    expect(parseConnectShyftInboxBucket('mine')).toBe('mine');
    expect(parseConnectShyftInboxBucket('  MINE  ')).toBe('mine');
    expect(parseConnectShyftInboxBucket(['inbox', 'mine'])).toBe('inbox');
    expect(parseConnectShyftInboxBucket('other')).toBeNull();
  });

  it('maps priority rank using hardened stage and unread ordering rules', () => {
    expect(resolveConnectShyftPriorityRank({ escalationStage: 4, isNewUnread: false })).toBe(1);
    expect(resolveConnectShyftPriorityRank({ escalationStage: 2, isNewUnread: false })).toBe(2);
    expect(resolveConnectShyftPriorityRank({ escalationStage: 1, isNewUnread: false })).toBe(3);
    expect(resolveConnectShyftPriorityRank({ escalationStage: 0, isNewUnread: true })).toBe(4);
    expect(resolveConnectShyftPriorityRank({ escalationStage: 0, isNewUnread: false })).toBe(5);
  });

  it('maps urgency labels to operator-safe language', () => {
    expect(resolveConnectShyftUrgencyLabel(0)).toBe('');
    expect(resolveConnectShyftUrgencyLabel(1)).toBe('Needs attention soon');
    expect(resolveConnectShyftUrgencyLabel(2)).toBe('Needs urgent attention');
    expect(resolveConnectShyftUrgencyLabel(3)).toBe('Needs urgent attention');
  });

  it('sorts inbox by priority rank, last activity desc, then thread id asc', () => {
    const items = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      bucket: 'inbox',
    });

    expect(items[0]?.threadId).toBe('thread-c3-claimed-1002');

    const stageTwoThreadIds = items
      .filter((item) => item.priorityRank === 2)
      .map((item) => item.threadId);
    expect(stageTwoThreadIds).toEqual([
      'thread-c3-unclaimed-1001',
      'thread-c3-unclaimed-1006',
    ]);
  });

  it('resolves canonical thread-detail action sets by lifecycle state', () => {
    const unclaimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: 'thread-c3-unclaimed-1001',
    });
    const claimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: 'thread-c3-claimed-1002',
    });
    const closed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: 'thread-c3-closed-1003',
    });

    expect(unclaimed?.actions).toEqual(['Call', 'Text', 'Claim']);
    expect(claimed?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(closed?.actions).toEqual(['Call', 'Send Message']);
  });
});
