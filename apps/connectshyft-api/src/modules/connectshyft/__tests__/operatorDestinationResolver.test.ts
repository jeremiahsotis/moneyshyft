import {
  AsyncConnectShyftOperatorDestinationResolver,
  ConnectShyftOperatorDestinationInvalidPhoneError,
  InMemoryConnectShyftOperatorDestinationStore,
} from '../operatorDestinationResolver';

describe('connectshyft operatorDestinationResolver', () => {
  let store: InMemoryConnectShyftOperatorDestinationStore;
  let resolver: AsyncConnectShyftOperatorDestinationResolver;

  beforeEach(() => {
    store = new InMemoryConnectShyftOperatorDestinationStore();
    resolver = new AsyncConnectShyftOperatorDestinationResolver(store);
  });

  it('resolves claimed thread operator phone first', async () => {
    store.setUserPhone('user-claimed', '(260) 555-0101');
    store.setUserPhone('user-actor', '+12605550102');
    store.setOrgUnitDefaultOperatorPhone(
      'tenant-connectshyft-s18',
      'org-connectshyft-s18-east',
      '+12605550103',
    );

    await expect(resolver.resolveOperatorDestination({
      tenantId: 'tenant-connectshyft-s18',
      orgUnitId: 'org-connectshyft-s18-east',
      claimedByUserId: 'user-claimed',
      actorUserId: 'user-actor',
    })).resolves.toEqual({
      phoneNumber: '+12605550101',
      source: 'thread_assignee',
      userId: 'user-claimed',
      orgUnitId: 'org-connectshyft-s18-east',
    });
  });

  it('falls back to actor user phone when the thread is unassigned', async () => {
    store.setUserPhone('user-actor', '2605550102');

    await expect(resolver.resolveOperatorDestination({
      tenantId: 'tenant-connectshyft-s18',
      orgUnitId: 'org-connectshyft-s18-east',
      claimedByUserId: null,
      actorUserId: 'user-actor',
    })).resolves.toEqual({
      phoneNumber: '+12605550102',
      source: 'actor_user',
      userId: 'user-actor',
      orgUnitId: 'org-connectshyft-s18-east',
    });
  });

  it('falls back to the orgUnit default operator phone when users have no configured phone', async () => {
    store.setOrgUnitDefaultOperatorPhone(
      'tenant-connectshyft-s18',
      'org-connectshyft-s18-east',
      '1 (260) 555-0103',
    );

    await expect(resolver.resolveOperatorDestination({
      tenantId: 'tenant-connectshyft-s18',
      orgUnitId: 'org-connectshyft-s18-east',
      claimedByUserId: 'user-claimed',
      actorUserId: 'user-actor',
    })).resolves.toEqual({
      phoneNumber: '+12605550103',
      source: 'org_unit_default',
      userId: null,
      orgUnitId: 'org-connectshyft-s18-east',
    });
  });

  it('returns none when no operator destination can be resolved', async () => {
    await expect(resolver.resolveOperatorDestination({
      tenantId: 'tenant-connectshyft-s18',
      orgUnitId: 'org-connectshyft-s18-east',
      claimedByUserId: null,
      actorUserId: null,
    })).resolves.toEqual({
      phoneNumber: null,
      source: 'none',
      userId: null,
      orgUnitId: 'org-connectshyft-s18-east',
    });
  });

  it('rejects invalid phone values deterministically without skipping to a lower-priority fallback', async () => {
    store.setUserPhone('user-claimed', 'not-a-phone-number');
    store.setUserPhone('user-actor', '+12605550102');
    store.setOrgUnitDefaultOperatorPhone(
      'tenant-connectshyft-s18',
      'org-connectshyft-s18-east',
      '+12605550103',
    );

    await expect(resolver.resolveOperatorDestination({
      tenantId: 'tenant-connectshyft-s18',
      orgUnitId: 'org-connectshyft-s18-east',
      claimedByUserId: 'user-claimed',
      actorUserId: 'user-actor',
    })).rejects.toMatchObject({
      name: 'ConnectShyftOperatorDestinationInvalidPhoneError',
      code: 'CONNECTSHYFT_OPERATOR_INVALID_PHONE',
      source: 'thread_assignee',
      userId: 'user-claimed',
      orgUnitId: 'org-connectshyft-s18-east',
    } satisfies Partial<ConnectShyftOperatorDestinationInvalidPhoneError>);
  });

  it('normalizes valid local input to E.164', async () => {
    store.setUserPhone('user-actor', '260.555.0104');

    const resolution = await resolver.resolveOperatorDestination({
      tenantId: 'tenant-connectshyft-s18',
      orgUnitId: 'org-connectshyft-s18-east',
      claimedByUserId: null,
      actorUserId: 'user-actor',
    });

    expect(resolution.phoneNumber).toBe('+12605550104');
  });
});
