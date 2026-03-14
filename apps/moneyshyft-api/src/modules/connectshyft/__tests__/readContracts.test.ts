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

    expect(items[0]?.threadId).toBe('2686f12a-b7dc-4ab2-8de2-70b05684198b');

    const stageTwoThreadIds = items
      .filter((item) => item.priorityRank === 2)
      .map((item) => item.threadId);
    expect(stageTwoThreadIds).toEqual([
      '90ca1c73-be82-48c6-8ba0-504e872ad211',
      '05a64891-ba69-4385-8bb9-140f01e0d243',
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

    expect(operatorInbox.some((item) => item.threadId === '7ce62a91-60dd-4869-8816-d782f26b85d1')).toBe(false);
    expect(operatorMine.map((item) => item.threadId)).toEqual(['7ce62a91-60dd-4869-8816-d782f26b85d1']);

    expect(otherOperatorInbox.some((item) => item.threadId === '7ce62a91-60dd-4869-8816-d782f26b85d1')).toBe(true);
    expect(otherOperatorMine.map((item) => item.threadId)).toEqual(['2686f12a-b7dc-4ab2-8de2-70b05684198b']);
  });

  it('keeps ux-r3 voicemail threads in deterministic mine/inbox buckets with explicit labels', () => {
    const mine = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-ux-r3',
      orgUnitId: 'org-connectshyft-ux-r3-east',
      bucket: 'mine',
      actorUserId: 'user-connectshyft-ux-r3-operator',
    });
    const inbox = resolveConnectShyftInboxContract({
      tenantId: 'tenant-connectshyft-ux-r3',
      orgUnitId: 'org-connectshyft-ux-r3-east',
      bucket: 'inbox',
      actorUserId: 'user-connectshyft-ux-r3-operator',
    });

    const mineVoicemail = mine.find((item) => item.threadId === 'b58069cc-1ab6-4ada-8a95-c468780a45a3');
    const inboxVoicemail = inbox.find((item) => item.threadId === 'c5d1de83-5a0e-45e0-8f25-eba1bd21a985');

    expect(mineVoicemail).toMatchObject({
      state: 'CLAIMED',
      bucket: 'mine',
      voicemailIndicator: true,
      voicemailLabel: 'Voicemail',
    });
    expect(inboxVoicemail).toMatchObject({
      state: 'UNCLAIMED',
      bucket: 'inbox',
      voicemailIndicator: true,
      voicemailLabel: 'Voicemail received',
    });
    expect(inbox.some((item) => item.threadId === 'b58069cc-1ab6-4ada-8a95-c468780a45a3')).toBe(false);
  });

  it('returns thread-detail bucket from actor perspective for claimed threads', () => {
    const claimedOwner = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: '7ce62a91-60dd-4869-8816-d782f26b85d1',
      actorUserId: 'user-connectshyft-c3-operator',
    });
    const differentActor = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: '7ce62a91-60dd-4869-8816-d782f26b85d1',
      actorUserId: 'user-connectshyft-c3-other-operator',
    });

    expect(claimedOwner?.bucket).toBe('mine');
    expect(differentActor?.bucket).toBe('inbox');
    expect(claimedOwner?.source).toBe('VOICE');
    expect(differentActor?.source).toBe('VOICE');
  });

  it('resolves canonical thread-detail action sets by lifecycle state', () => {
    const unclaimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: '90ca1c73-be82-48c6-8ba0-504e872ad211',
    });
    const claimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: '2686f12a-b7dc-4ab2-8de2-70b05684198b',
    });
    const closed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: '47e2e20d-f3bc-4c0d-87a6-d3f0b0cbe69e',
    });

    expect(unclaimed?.actions).toEqual(['Call', 'Text', 'Claim']);
    expect(claimed?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(closed?.actions).toEqual(['Call', 'Send Message']);
  });

  it('resolves d-4 seeded thread-detail action matrix without hidden fallback actions', () => {
    const unclaimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: '4332bb8e-940f-4927-8320-a8d3f3093d72',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const claimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: '0b3060e8-d0e1-4366-8655-8c7ec44cf0ee',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const closed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: '20ab942f-27c6-4ae5-8af2-06b727c36b2a',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const closedPrefersNo = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: '06a77807-6575-4c63-8824-38a89f9dae12',
      requestedRole: 'ORGUNIT_MEMBER',
    });

    expect(unclaimed?.actions).toEqual(['Call', 'Text', 'Claim']);
    expect(claimed?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(closed?.actions).toEqual(['Call', 'Send Message']);
    expect(closedPrefersNo?.actions).toEqual(['Call', 'Send Message']);
  });

  it('resolves ux-r4 seeded thread-detail action matrix with explicit closed-thread outbound controls', () => {
    const unclaimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-ux-r4',
      orgUnitId: 'org-connectshyft-ux-r4-east',
      threadId: '1641c3dd-4d4c-4997-8b72-ae4876649b37',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const claimed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-ux-r4',
      orgUnitId: 'org-connectshyft-ux-r4-east',
      threadId: '69c239d2-8f02-4202-8cec-a7f0de61cbf7',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const closed = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-ux-r4',
      orgUnitId: 'org-connectshyft-ux-r4-east',
      threadId: 'aedcda71-42b7-4857-8a0a-70013e01d4cd',
      requestedRole: 'ORGUNIT_MEMBER',
    });
    const closedPrefersNo = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-ux-r4',
      orgUnitId: 'org-connectshyft-ux-r4-east',
      threadId: 'e37b00e0-228f-43c0-8c70-b3d0a5bfad40',
      requestedRole: 'ORGUNIT_MEMBER',
    });

    expect(unclaimed?.actions).toEqual(['Call', 'Text', 'Claim']);
    expect(claimed?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(closed?.actions).toEqual(['Call', 'Send Message']);
    expect(closedPrefersNo?.actions).toEqual(['Call', 'Send Message']);
  });

  it('keeps claimed action set canonical in read-contract output regardless of role hint', () => {
    const claimedAdmin = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: '6fb01cbc-069d-485a-86f7-ee72359543b9',
      requestedRole: 'ORGUNIT_ADMIN',
    });
    const claimedMember = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: '6fb01cbc-069d-485a-86f7-ee72359543b9',
      requestedRole: 'ORGUNIT_MEMBER',
    });

    expect(claimedAdmin?.actions).toEqual(['Call', 'Text', 'Close']);
    expect(claimedMember?.actions).toEqual(['Call', 'Text', 'Close']);
  });
});
