import {
  ConnectShyftOperatorDestinationResolverService,
  ConnectShyftTelephonyOperatorPhoneResolverService,
  InMemoryConnectShyftOperatorDestinationStore,
} from '../operatorDestinationResolver';

describe('connectshyft operatorDestinationResolver', () => {
  let store: InMemoryConnectShyftOperatorDestinationStore;
  let service: ConnectShyftOperatorDestinationResolverService;

  beforeEach(() => {
    store = new InMemoryConnectShyftOperatorDestinationStore();
    service = new ConnectShyftOperatorDestinationResolverService(store);
  });

  it('resolves the claimed thread operator first', async () => {
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-claimed',
      phoneNumber: '+12605550111',
    });
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-actor',
      phoneNumber: '+12605550222',
    });
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: '+12605550333',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-actor',
      claimedByUserId: 'user-connectshyft-claimed',
    })).resolves.toEqual({
      phoneNumber: '+12605550111',
      source: 'thread_assignee',
      userId: 'user-connectshyft-claimed',
      orgUnitId: 'org-connectshyft-f1-east',
    });
  });

  it('falls back to the actor user when the claimed operator has no stored phone', async () => {
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-claimed',
      phoneNumber: '   ',
    });
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-actor',
      phoneNumber: '+12605550222',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-actor',
      claimedByUserId: 'user-connectshyft-claimed',
    })).resolves.toEqual({
      phoneNumber: '+12605550222',
      source: 'actor_user',
      userId: 'user-connectshyft-actor',
      orgUnitId: 'org-connectshyft-f1-east',
    });
  });

  it('falls back to the org-unit default when no user phone resolves', async () => {
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-claimed',
      phoneNumber: null,
    });
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: '+12605550333',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-actor',
      claimedByUserId: 'user-connectshyft-claimed',
    })).resolves.toEqual({
      phoneNumber: '+12605550333',
      source: 'org_unit_default',
      userId: null,
      orgUnitId: 'org-connectshyft-f1-east',
    });
  });

  it('returns none when every candidate is unresolved', async () => {
    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-actor',
      claimedByUserId: 'user-connectshyft-claimed',
    })).resolves.toEqual({
      phoneNumber: null,
      source: 'none',
      userId: null,
      orgUnitId: 'org-connectshyft-f1-east',
    });
  });

  it('rejects invalid candidate values deterministically without falling through to lower-priority sources', async () => {
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-claimed',
      phoneNumber: 'invalid-phone',
    });
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-actor',
      phoneNumber: '+12605550222',
    });
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: '+12605550333',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-actor',
      claimedByUserId: 'user-connectshyft-claimed',
    })).resolves.toEqual({
      phoneNumber: null,
      source: 'thread_assignee',
      userId: 'user-connectshyft-claimed',
      orgUnitId: 'org-connectshyft-f1-east',
    });
  });

  it('normalizes valid candidate values to canonical E.164', async () => {
    store.seedUserPhone({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-actor',
      phoneNumber: '260-555-0123',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      actorUserId: 'user-connectshyft-actor',
    })).resolves.toEqual({
      phoneNumber: '+12605550123',
      source: 'actor_user',
      userId: 'user-connectshyft-actor',
      orgUnitId: 'org-connectshyft-f1-east',
    });
  });
});

describe('connectshyft telephony operator phone resolver', () => {
  let store: InMemoryConnectShyftOperatorDestinationStore;
  let service: ConnectShyftTelephonyOperatorPhoneResolverService;

  beforeEach(() => {
    store = new InMemoryConnectShyftOperatorDestinationStore();
    service = new ConnectShyftTelephonyOperatorPhoneResolverService(store);
  });

  it('prefers the operator callback number when it is valid', async () => {
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: '+12605550333',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      callbackNumberE164: '+12605550111',
    })).resolves.toEqual({
      value: '+12605550111',
      source: 'callback_number',
      normalized: true,
      callbackNumberStatus: 'valid',
      orgUnitDefaultStatus: 'valid',
    });
  });

  it('falls back to the orgUnit default when the callback number is missing', async () => {
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: '+12605550333',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      callbackNumberE164: null,
    })).resolves.toEqual({
      value: '+12605550333',
      source: 'orgunit_default',
      normalized: true,
      callbackNumberStatus: 'missing',
      orgUnitDefaultStatus: 'valid',
    });
  });

  it('falls back to the orgUnit default when the callback number is invalid', async () => {
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: '+12605550333',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      callbackNumberE164: 'invalid-phone',
    })).resolves.toEqual({
      value: '+12605550333',
      source: 'orgunit_default',
      normalized: true,
      callbackNumberStatus: 'invalid',
      orgUnitDefaultStatus: 'valid',
    });
  });

  it('surfaces an invalid orgUnit fallback when no valid callback number exists', async () => {
    store.seedOrgUnitDefaultPhone({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      phoneNumber: 'invalid-phone',
    });

    await expect(service.resolve({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      callbackNumberE164: null,
    })).resolves.toEqual({
      value: null,
      source: 'orgunit_default',
      normalized: false,
      callbackNumberStatus: 'missing',
      orgUnitDefaultStatus: 'invalid',
    });
  });
});
