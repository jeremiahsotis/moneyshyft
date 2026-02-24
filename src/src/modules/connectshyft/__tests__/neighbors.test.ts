import {
  AsyncConnectShyftNeighborService,
  ConnectShyftNeighborService,
  InMemoryConnectShyftNeighborStore,
} from '../neighbors';

describe('connectshyft neighbor service', () => {
  let store: InMemoryConnectShyftNeighborStore;
  let service: ConnectShyftNeighborService;

  beforeEach(() => {
    store = new InMemoryConnectShyftNeighborStore();
    service = new ConnectShyftNeighborService(store);
  });

  it('creates tenant-scoped neighbors with normalized phone values', () => {
    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+1 (260) 555-0199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      data: {
        neighbor: {
          tenantId: 'tenant-connectshyft-alpha',
          orgUnitId: 'org-connectshyft-alpha-east',
          firstName: 'Mina',
          lastName: 'Lopez',
          phones: [
            expect.objectContaining({
              label: 'mobile',
              value: '+12605550199',
              sortOrder: 0,
              isPrimary: true,
            }),
          ],
        },
      },
    });

    if (!result.ok) {
      throw new Error('Expected neighbor create to succeed');
    }

    const scopedNeighbors = store.listByOrgUnit(
      'tenant-connectshyft-alpha',
      'org-connectshyft-alpha-east',
    );
    expect(scopedNeighbors).toHaveLength(1);
    expect(scopedNeighbors[0].neighborId).toBe(result.data.neighbor.neighborId);
  });

  it('refuses create requests that omit phone entries', () => {
    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Noah',
      lastName: 'Harper',
      phones: [],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      data: {
        fieldErrors: [
          expect.objectContaining({
            field: 'phones',
            reason: 'REQUIRED',
          }),
        ],
      },
    });
  });

  it('refuses create requests with invalid phone formats', () => {
    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Ari',
      lastName: 'Quinn',
      phones: [
        {
          label: 'mobile',
          value: '260-ABC-0199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      data: {
        fieldErrors: [
          expect.objectContaining({
            field: 'phones',
            reason: 'INVALID_FORMAT',
          }),
        ],
      },
    });
  });

  it('refuses callers without neighbor-create capability', () => {
    const result = service.createNeighbor({
      actorRoles: ['TENANT_VIEWER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Ari',
      lastName: 'Quinn',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
    });
  });

  it('rejects neighbor id conflicts at persistence layer', () => {
    const first = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      neighborId: 'neighbor-b1-conflict',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });

    const second = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-bravo',
      orgUnitId: 'org-connectshyft-bravo-north',
      neighborId: 'neighbor-b1-conflict',
      firstName: 'Jules',
      lastName: 'North',
      phones: [
        {
          label: 'mobile',
          value: '+12605550200',
        },
      ],
    });

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT',
    });
  });
});

describe('connectshyft async neighbor service', () => {
  it('refuses create requests when persistence storage is unavailable', async () => {
    const unavailableStore = {
      createNeighbor: jest.fn(async () => {
        const error = new Error('relation does not exist') as Error & { code: string };
        error.code = '42P01';
        throw error;
      }),
    };

    const service = new AsyncConnectShyftNeighborService(unavailableStore as any);

    const result = await service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE',
    });
  });

  it('rethrows unexpected persistence errors', async () => {
    const unavailableStore = {
      createNeighbor: jest.fn(async () => {
        const error = new Error('db connection aborted') as Error & { code: string };
        error.code = 'XX000';
        throw error;
      }),
    };

    const service = new AsyncConnectShyftNeighborService(unavailableStore as any);

    await expect(
      service.createNeighbor({
        actorRoles: ['ORGUNIT_MEMBER'],
        tenantId: 'tenant-connectshyft-alpha',
        orgUnitId: 'org-connectshyft-alpha-east',
        firstName: 'Mina',
        lastName: 'Lopez',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
          },
        ],
      }),
    ).rejects.toThrow('db connection aborted');
  });
});
