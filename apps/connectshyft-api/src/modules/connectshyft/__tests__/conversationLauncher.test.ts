import { prepareConnectShyftConversationLaunch } from '../conversationLauncher';

describe('connectshyft conversation launcher preparation', () => {
  it('uses an existing contact and thread context when the target already belongs to a known neighbor', async () => {
    const resolveNeighbor = jest.fn().mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
      httpStatus: 200,
      data: {
        neighbor: {
          neighborId: 'neighbor-known-1001',
          phones: [
            {
              value: '(317) 555-0100',
            },
          ],
        },
      },
    });
    const ensureThread = jest.fn().mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_ENSURED',
      httpStatus: 201,
      data: {
        thread: {
          threadId: 'thread-known-1001',
          tenantId: 'tenant-connectshyft-ui',
          orgUnitId: 'org-connectshyft-ui-east',
          neighborId: 'neighbor-known-1001',
          personId: 'person-known-1001',
        },
        lifecycle: {
          ensuredActiveThread: true,
          createdNewThread: false,
          reusedThreadId: 'thread-known-1001',
        },
      },
    });

    const result = await prepareConnectShyftConversationLaunch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
      actorUserId: 'user-connectshyft-ui-1001',
      neighborId: 'neighbor-known-1001',
      targetPhone: '(317) 555-0100',
      lastInboundCsNumberId: 'cs-inbound-1001',
      preferredOutboundCsNumberId: 'cs-outbound-1001',
    }, {
      neighborService: {
        resolveNeighbor,
        createNeighborFromInbound: jest.fn(),
      },
      neighborStore: {
        listActiveIdentityBoundaryNeighborsByPhoneValue: jest.fn(),
      },
      resolveIdentity: jest.fn().mockResolvedValue({
        outcome: 'canonical',
        personId: 'person-known-1001',
        provisionalPersonId: null,
        resolverReviewId: null,
      }),
      threadService: {
        ensureThread,
      },
    });

    expect(result.ok).toBe(true);
    expect(resolveNeighbor).toHaveBeenCalledWith({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-ui',
      neighborId: 'neighbor-known-1001',
    });
    expect(ensureThread).toHaveBeenCalledWith(expect.objectContaining({
      neighborId: 'neighbor-known-1001',
      personId: 'person-known-1001',
    }));
  });

  it('creates a provisional path for an unknown number only after launch preparation begins', async () => {
    const createNeighborFromInbound = jest.fn().mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: {
          neighborId: 'neighbor-new-1001',
        },
      },
    });
    const ensureThread = jest.fn().mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_ENSURED',
      httpStatus: 201,
      data: {
        thread: {
          threadId: 'thread-new-1001',
          tenantId: 'tenant-connectshyft-ui',
          orgUnitId: 'org-connectshyft-ui-east',
          neighborId: 'neighbor-new-1001',
          personId: 'person-provisional-1001',
        },
        lifecycle: {
          ensuredActiveThread: true,
          createdNewThread: true,
        },
      },
    });

    const result = await prepareConnectShyftConversationLaunch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
      actorUserId: 'user-connectshyft-ui-1001',
      targetPhone: '3175550102',
      lastInboundCsNumberId: 'cs-inbound-1001',
      preferredOutboundCsNumberId: 'cs-outbound-1001',
    }, {
      neighborService: {
        resolveNeighbor: jest.fn(),
        createNeighborFromInbound,
      },
      neighborStore: {
        listActiveIdentityBoundaryNeighborsByPhoneValue: jest.fn().mockResolvedValue([]),
      },
      resolveIdentity: jest.fn().mockResolvedValue({
        outcome: 'provisional',
        personId: 'person-provisional-1001',
        provisionalPersonId: 'person-provisional-1001',
        resolverReviewId: null,
      }),
      threadService: {
        ensureThread,
      },
    });

    expect(result.ok).toBe(true);
    expect(createNeighborFromInbound).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
      phone: '+13175550102',
    });
    expect(ensureThread).toHaveBeenCalledWith(expect.objectContaining({
      neighborId: 'neighbor-new-1001',
      personId: 'person-provisional-1001',
    }));
  });

  it('refuses ambiguous matches instead of guessing across multiple contacts', async () => {
    const result = await prepareConnectShyftConversationLaunch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
      actorUserId: 'user-connectshyft-ui-1001',
      targetPhone: '3175550103',
      lastInboundCsNumberId: 'cs-inbound-1001',
      preferredOutboundCsNumberId: 'cs-outbound-1001',
    }, {
      neighborService: {
        resolveNeighbor: jest.fn(),
        createNeighborFromInbound: jest.fn(),
      },
      neighborStore: {
        listActiveIdentityBoundaryNeighborsByPhoneValue: jest.fn().mockResolvedValue([
          { neighborId: 'neighbor-1001', phones: [] },
          { neighborId: 'neighbor-1002', phones: [] },
        ]),
      },
      resolveIdentity: jest.fn(),
      threadService: {
        ensureThread: jest.fn(),
      },
    });

    expect(result).toEqual({
      ok: false,
      code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_TARGET_AMBIGUOUS',
      message: 'More than one contact uses that number. Pick the contact first, then try again.',
    });
  });
});
