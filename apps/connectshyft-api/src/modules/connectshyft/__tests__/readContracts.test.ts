import {
  parseConnectShyftInboxBucket,
  resolveConnectShyftInboxContract,
  resolveConnectShyftInboxContractAsync,
  resolveConnectShyftPriorityRank,
  resolveConnectShyftThreadDetailContract,
  resolveConnectShyftThreadDetailContractAsync,
  resolveConnectShyftThreadTimelineMetadata,
  resolveConnectShyftUrgencyLabel,
} from '../readContracts';

const buildReadContractsDbMock = (input: {
  threadRows: Array<Record<string, unknown>>;
  neighborRows: Array<Record<string, unknown>>;
}) => {
  const datasets: Record<string, Array<Record<string, unknown>>> = {
    cs_threads: input.threadRows,
    cs_neighbors: input.neighborRows,
  };
  const threadColumnInfo = {
    thread_id: {},
    tenant_id: {},
    org_unit_id: {},
    state: {},
    last_activity_at_utc: {},
    neighbor_id: {},
    claimed_by_user_id: {},
    escalation_stage: {},
    is_new_unread: {},
    last_inbound_cs_number_id: {},
    preferred_outbound_cs_number_id: {},
    preferred_outbound_label: {},
    summary: {},
  };

  const createBuilder = (tableName: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];

    const builder: any = {
      withSchema: () => builder,
      table: (nextTableName: string) => createBuilder(nextTableName),
      columnInfo: async () => (tableName === 'cs_threads' ? threadColumnInfo : {}),
      where: (columnOrConditions: string | Record<string, unknown>, value?: unknown) => {
        if (typeof columnOrConditions === 'string') {
          filters.push((row) => row[columnOrConditions] === value);
          return builder;
        }

        Object.entries(columnOrConditions).forEach(([key, expected]) => {
          filters.push((row) => row[key] === expected);
        });
        return builder;
      },
      andWhere: (columnOrConditions: string | Record<string, unknown>, value?: unknown) =>
        builder.where(columnOrConditions, value),
      whereIn: (column: string, values: readonly string[]) => {
        filters.push((row) => values.includes(String(row[column] ?? '')));
        return builder;
      },
      select: async () => (datasets[tableName] || []).filter((row) => filters.every((filter) => filter(row))),
    };

    return builder;
  };

  return {
    withSchema: (_schema: string) => ({
      table: (tableName: string) => createBuilder(tableName),
    }),
  } as any;
};

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

  it('normalizes seeded sender-alignment tokens into provider-number outputs', () => {
    const detail = resolveConnectShyftThreadDetailContract({
      tenantId: 'tenant-connectshyft-c3',
      orgUnitId: 'org-connectshyft-c3-east',
      threadId: '2686f12a-b7dc-4ab2-8de2-70b05684198b',
    });

    expect(detail).toMatchObject({
      lastInboundCsNumberId: '+12605550101',
      preferredOutboundCsNumberId: '+12605550201',
      preferredOutboundContext: {
        csNumberId: '+12605550201',
      },
    });
    expect(detail?.display).toMatchObject({
      inboundContext: 'Mapped inbound number configured',
      outboundContext: 'Primary East Dispatch',
    });
  });

  it('relabels db-backed synthetic sender tokens into mapped inbound and outbound number context', async () => {
    const db = buildReadContractsDbMock({
      threadRows: [
        {
          thread_id: 'thread-read-contracts-1001',
          neighbor_id: 'neighbor-read-contracts-1001',
          tenant_id: 'tenant-read-contracts',
          org_unit_id: 'org-read-contracts-east',
          state: 'UNCLAIMED',
          escalation_stage: 0,
          is_new_unread: false,
          last_activity_at_utc: '2026-03-18T12:12:00.000Z',
          last_inbound_cs_number_id: 'cs-number-1005',
          preferred_outbound_cs_number_id: 'cs-number-2005',
          preferred_outbound_label: '',
          summary: 'Synthetic seed replacement',
        },
      ],
      neighborRows: [
        {
          id: 'neighbor-read-contracts-1001',
          tenant_id: 'tenant-read-contracts',
          is_deleted: false,
          deleted_at_utc: null,
        },
      ],
    });

    const detail = await resolveConnectShyftThreadDetailContractAsync({
      tenantId: 'tenant-read-contracts',
      orgUnitId: 'org-read-contracts-east',
      threadId: 'thread-read-contracts-1001',
      db,
    });

    expect(detail).toMatchObject({
      lastInboundCsNumberId: '+12605551005',
      preferredOutboundCsNumberId: '+12605552005',
      display: {
        inboundContext: 'Mapped inbound number configured',
        outboundContext: 'Mapped outbound number configured',
      },
    });
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

  it('exposes deleted-neighbor metadata for timeline reads and hides deleted threads by default', async () => {
    const db = buildReadContractsDbMock({
      threadRows: [
        {
          thread_id: 'thread-soft-delete-timeline-1001',
          neighbor_id: 'neighbor-soft-delete-timeline-1001',
          tenant_id: 'tenant-connectshyft-soft-delete',
          org_unit_id: 'org-connectshyft-soft-delete-east',
          state: 'CLAIMED',
          claimed_by_user_id: 'user-connectshyft-soft-delete',
          escalation_stage: 1,
          is_new_unread: false,
          last_activity_at_utc: '2026-03-18T12:12:00.000Z',
          last_inbound_cs_number_id: 'cs-number-1005',
          preferred_outbound_cs_number_id: 'cs-number-2005',
          preferred_outbound_label: 'Deleted Neighbor Queue',
          summary: 'Deleted neighbor thread detail',
        },
      ],
      neighborRows: [
        {
          id: 'neighbor-soft-delete-timeline-1001',
          tenant_id: 'tenant-connectshyft-soft-delete',
          is_deleted: true,
          deleted_at_utc: '2026-03-18T12:10:00.000Z',
        },
      ],
    });

    const hidden = await resolveConnectShyftThreadDetailContractAsync({
      tenantId: 'tenant-connectshyft-soft-delete',
      orgUnitId: 'org-connectshyft-soft-delete-east',
      threadId: 'thread-soft-delete-timeline-1001',
      includeDeleted: false,
      db,
    });
    const visible = await resolveConnectShyftThreadDetailContractAsync({
      tenantId: 'tenant-connectshyft-soft-delete',
      orgUnitId: 'org-connectshyft-soft-delete-east',
      threadId: 'thread-soft-delete-timeline-1001',
      includeDeleted: true,
      db,
    });

    expect(hidden).toBeNull();
    expect(resolveConnectShyftThreadTimelineMetadata(visible!)).toEqual({
      threadId: 'thread-soft-delete-timeline-1001',
      neighborDeleted: true,
      neighborDeletedAtUtc: '2026-03-18T12:10:00.000Z',
    });
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

  it('excludes deleted-neighbor threads from standard inbox contract reads', async () => {
    const db = buildReadContractsDbMock({
      threadRows: [
        {
          thread_id: 'thread-active-1001',
          neighbor_id: 'neighbor-active-1001',
          tenant_id: 'tenant-connectshyft-soft-delete',
          org_unit_id: 'org-connectshyft-soft-delete',
          state: 'UNCLAIMED',
          escalation_stage: 0,
          is_new_unread: false,
          last_activity_at_utc: '2026-03-18T12:00:00.000Z',
          last_inbound_cs_number_id: 'cs-number-1001',
          preferred_outbound_cs_number_id: 'cs-number-2001',
          preferred_outbound_label: 'Primary Queue',
          summary: 'Active neighbor thread',
        },
        {
          thread_id: 'thread-deleted-1002',
          neighbor_id: 'neighbor-deleted-1002',
          tenant_id: 'tenant-connectshyft-soft-delete',
          org_unit_id: 'org-connectshyft-soft-delete',
          state: 'UNCLAIMED',
          escalation_stage: 1,
          is_new_unread: false,
          last_activity_at_utc: '2026-03-18T11:00:00.000Z',
          last_inbound_cs_number_id: 'cs-number-1002',
          preferred_outbound_cs_number_id: 'cs-number-2002',
          preferred_outbound_label: 'Secondary Queue',
          summary: 'Deleted neighbor thread',
        },
      ],
      neighborRows: [
        {
          id: 'neighbor-active-1001',
          tenant_id: 'tenant-connectshyft-soft-delete',
          is_deleted: false,
          deleted_at_utc: null,
        },
        {
          id: 'neighbor-deleted-1002',
          tenant_id: 'tenant-connectshyft-soft-delete',
          is_deleted: true,
          deleted_at_utc: '2026-03-18T10:30:00.000Z',
        },
      ],
    });

    const inbox = await resolveConnectShyftInboxContractAsync({
      tenantId: 'tenant-connectshyft-soft-delete',
      orgUnitId: 'org-connectshyft-soft-delete',
      bucket: 'inbox',
      db,
    });

    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      threadId: 'thread-active-1001',
      neighborDeleted: false,
      neighbor_deleted: false,
      neighborDeletedAtUtc: null,
      neighbor_deleted_at_utc: null,
    });
  });

  it('hides deleted-neighbor thread detail from standard reads and exposes deletion flags for includeDeleted=true', async () => {
    const db = buildReadContractsDbMock({
      threadRows: [
        {
          thread_id: 'thread-deleted-2001',
          neighbor_id: 'neighbor-deleted-2001',
          tenant_id: 'tenant-connectshyft-soft-delete',
          org_unit_id: 'org-connectshyft-soft-delete',
          state: 'CLAIMED',
          claimed_by_user_id: 'user-connectshyft-soft-delete',
          escalation_stage: 1,
          is_new_unread: false,
          last_activity_at_utc: '2026-03-18T12:05:00.000Z',
          last_inbound_cs_number_id: 'cs-number-3001',
          preferred_outbound_cs_number_id: 'cs-number-4001',
          preferred_outbound_label: 'Deleted Detail Queue',
          summary: 'Deleted neighbor detail thread',
        },
      ],
      neighborRows: [
        {
          id: 'neighbor-deleted-2001',
          tenant_id: 'tenant-connectshyft-soft-delete',
          is_deleted: true,
          deleted_at_utc: '2026-03-18T11:45:00.000Z',
        },
      ],
    });

    const hidden = await resolveConnectShyftThreadDetailContractAsync({
      tenantId: 'tenant-connectshyft-soft-delete',
      orgUnitId: 'org-connectshyft-soft-delete',
      threadId: 'thread-deleted-2001',
      actorUserId: 'user-connectshyft-soft-delete',
      requestedRole: 'TENANT_ADMIN',
      db,
    });
    expect(hidden).toBeNull();

    const included = await resolveConnectShyftThreadDetailContractAsync({
      tenantId: 'tenant-connectshyft-soft-delete',
      orgUnitId: 'org-connectshyft-soft-delete',
      threadId: 'thread-deleted-2001',
      actorUserId: 'user-connectshyft-soft-delete',
      requestedRole: 'TENANT_ADMIN',
      includeDeleted: true,
      db,
    });

    expect(included).toMatchObject({
      threadId: 'thread-deleted-2001',
      neighborDeleted: true,
      neighbor_deleted: true,
      neighborDeletedAtUtc: '2026-03-18T11:45:00.000Z',
      neighbor_deleted_at_utc: '2026-03-18T11:45:00.000Z',
      actions: ['Call', 'Text', 'Close'],
    });
  });
});
