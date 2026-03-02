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

  it('derives inbox and mine buckets from actor ownership for claimed threads', () => {
    const operatorInbox = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      bucket: 'inbox',
      actorUserId: 'user-connectshyft-c3-operator',
    });
    const operatorMine = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      bucket: 'mine',
      actorUserId: 'user-connectshyft-c3-operator',
    });
    const otherOperatorInbox = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      bucket: 'inbox',
      actorUserId: 'user-connectshyft-c3-other-operator',
    });
    const otherOperatorMine = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      bucket: 'mine',
      actorUserId: 'user-connectshyft-c3-other-operator',
    });

    expect(operatorInbox.some((item) => item.threadId === 'thread-c3-claimed-voicemail-1004')).toBe(false);
    expect(operatorMine.map((item) => item.threadId)).toEqual(['thread-c3-claimed-voicemail-1004']);

    expect(otherOperatorInbox.some((item) => item.threadId === 'thread-c3-claimed-voicemail-1004')).toBe(true);
    expect(otherOperatorMine.map((item) => item.threadId)).toEqual(['thread-c3-claimed-1002']);
  });

  it('returns thread-detail bucket from actor perspective for claimed threads', () => {
    const claimedOwner = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: 'thread-c3-claimed-voicemail-1004',
      actorUserId: 'user-connectshyft-c3-operator',
    });
    const differentActor = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: 'thread-c3-claimed-voicemail-1004',
      actorUserId: 'user-connectshyft-c3-other-operator',
    });

    expect(claimedOwner?.bucket).toBe('mine');
    expect(differentActor?.bucket).toBe('inbox');
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

  it('resolves d-4 seeded thread-detail action matrix without hidden fallback actions', () => {
    const unclaimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: 'thread-d4-unclaimed-1001',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const claimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: 'thread-d4-claimed-1002',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const closed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: 'thread-d4-closed-1003',
      requestedRole: 'ORGUNIT_MEMBER',
    });

    expect(unclaimed?.actions).toEqual(['Call', 'Text', 'Claim']);
    expect(claimed?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(closed?.actions).toEqual(['Call', 'Send Message']);
  });

  it('keeps claimed action set canonical in read-contract output regardless of role hint', () => {
    const claimedAdmin = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'thread-c4-claimed-1002',
      requestedRole: 'ORGUNIT_ADMIN',
    });
    const claimedMember = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'thread-c4-claimed-1002',
      requestedRole: 'ORGUNIT_MEMBER',
    });

    expect(claimedAdmin?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(claimedMember?.actions).toEqual(['Call', 'Text', 'Close']);
  });
});
