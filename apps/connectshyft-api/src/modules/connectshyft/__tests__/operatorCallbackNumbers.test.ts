import {
  AsyncConnectShyftOperatorCallbackNumberService,
  ConnectShyftOperatorCallbackNumberPersistenceUnavailableError,
  InMemoryConnectShyftOperatorCallbackNumberStore,
  KnexConnectShyftOperatorCallbackNumberStore,
} from '../operatorCallbackNumbers';

describe('connectshyft operator callback numbers', () => {
  let store: InMemoryConnectShyftOperatorCallbackNumberStore;
  let service: AsyncConnectShyftOperatorCallbackNumberService;

  beforeEach(() => {
    store = new InMemoryConnectShyftOperatorCallbackNumberStore();
    service = new AsyncConnectShyftOperatorCallbackNumberService(store);
  });

  it('returns null when the operator has no callback number on file', async () => {
    await expect(service.getCurrentCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
    })).resolves.toBeNull();
  });

  it('normalizes and reads back the saved callback number deterministically', async () => {
    const saved = await service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '260-555-0123',
    });

    expect(saved).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED',
      data: {
        callbackNumber: {
          tenantId: 'tenant-connectshyft-alpha',
          userId: 'user-connectshyft-alpha-operator',
          callbackNumberE164: '+12605550123',
          callbackNumberRawInput: '(260) 555-0123',
        },
      },
    });

    const current = await service.getCurrentCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
    });

    expect(current).toMatchObject({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumberE164: '+12605550123',
      callbackNumberRawInput: '(260) 555-0123',
    });
  });

  it('replaces the current callback number for the same operator', async () => {
    const firstSave = await service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '260-555-0123',
    });
    const secondSave = await service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '+12605550999',
    });

    expect(firstSave.ok).toBe(true);
    expect(secondSave).toMatchObject({
      ok: true,
      data: {
        callbackNumber: {
          callbackNumberE164: '+12605550999',
          callbackNumberRawInput: '(260) 555-0999',
        },
      },
    });

    const current = await service.getCurrentCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
    });

    expect(current).toMatchObject({
      callbackNumberE164: '+12605550999',
      callbackNumberRawInput: '(260) 555-0999',
    });
  });

  it('keeps callback numbers scoped to tenant and operator', async () => {
    await service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '2605550123',
    });
    await service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-beta',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '2605550456',
    });

    await expect(service.getCurrentCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
    })).resolves.toMatchObject({
      callbackNumberE164: '+12605550123',
    });
    await expect(service.getCurrentCallbackNumber({
      tenantId: 'tenant-connectshyft-beta',
      userId: 'user-connectshyft-alpha-operator',
    })).resolves.toMatchObject({
      callbackNumberE164: '+12605550456',
    });
  });

  it('refuses blank callback number updates deterministically', async () => {
    await expect(service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '   ',
    })).resolves.toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_REQUIRED',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'callbackNumber',
            reason: 'REQUIRED',
          }),
        ]),
      },
    });
  });

  it('refuses invalid callback number updates deterministically', async () => {
    await expect(service.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: 'abc',
    })).resolves.toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'callbackNumber',
          }),
        ]),
      },
    });
  });

  it('surfaces persistence-unavailable errors instead of silently hiding missing storage', async () => {
    const missingTableError = Object.assign(
      new Error('relation "connectshyft.cs_operator_callback_numbers" does not exist'),
      { code: '42P01' },
    );
    const unavailableStore = {
      getCallbackNumber: jest.fn(async () => {
        throw missingTableError;
      }),
      saveCallbackNumber: jest.fn(async () => {
        throw missingTableError;
      }),
    };
    const unavailableService = new AsyncConnectShyftOperatorCallbackNumberService(
      unavailableStore,
    );

    await expect(unavailableService.getCurrentCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
    })).rejects.toBeInstanceOf(ConnectShyftOperatorCallbackNumberPersistenceUnavailableError);

    await expect(unavailableService.setCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumber: '2605550123',
    })).rejects.toBeInstanceOf(ConnectShyftOperatorCallbackNumberPersistenceUnavailableError);
  });
});

function buildUsersKnexMock(input: {
  firstResult?: Record<string, unknown> | null;
  updatedRows?: Array<Record<string, unknown>>;
} = {}) {
  const first = jest.fn(async () => input.firstResult ?? null);
  const update = jest.fn(async () => input.updatedRows ?? []);
  const where = jest.fn(() => ({
    first,
    update,
  }));
  const table = jest.fn(() => ({
    where,
  }));

  const knex: any = {
    table,
    fn: {
      now: jest.fn(() => 'NOW_TOKEN'),
    },
  };

  return {
    knex,
    table,
    where,
    first,
    update,
  };
}

describe('KnexConnectShyftOperatorCallbackNumberStore', () => {
  it('reads the canonical callback number from users.phone_e164', async () => {
    const { knex, table, where, first } = buildUsersKnexMock({
      firstResult: {
        id: 'user-connectshyft-alpha-operator',
        household_id: 'tenant-connectshyft-alpha',
        phone_e164: '+12605550123',
        created_at: '2026-03-22T12:00:00.000Z',
        updated_at: '2026-03-22T13:00:00.000Z',
      },
    });
    const store = new KnexConnectShyftOperatorCallbackNumberStore(knex);

    await expect(store.getCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
    })).resolves.toEqual({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumberE164: '+12605550123',
      callbackNumberRawInput: '(260) 555-0123',
      createdAtUtc: '2026-03-22T12:00:00.000Z',
      updatedAtUtc: '2026-03-22T13:00:00.000Z',
    });

    expect(table).toHaveBeenCalledWith('users');
    expect(where).toHaveBeenCalledWith({
      id: 'user-connectshyft-alpha-operator',
      household_id: 'tenant-connectshyft-alpha',
    });
    expect(first).toHaveBeenCalledWith([
      'id',
      'household_id',
      'phone_e164',
      'created_at',
      'updated_at',
    ]);
  });

  it('writes the canonical callback number to users.phone_e164', async () => {
    const { knex, where, update } = buildUsersKnexMock({
      updatedRows: [
        {
          id: 'user-connectshyft-alpha-operator',
          household_id: 'tenant-connectshyft-alpha',
          phone_e164: '+12605550123',
          created_at: '2026-03-22T12:00:00.000Z',
          updated_at: '2026-03-22T13:00:00.000Z',
        },
      ],
    });
    const store = new KnexConnectShyftOperatorCallbackNumberStore(knex);

    await expect(store.saveCallbackNumber({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumberE164: '+12605550123',
      callbackNumberRawInput: '260-555-0123',
    })).resolves.toEqual({
      tenantId: 'tenant-connectshyft-alpha',
      userId: 'user-connectshyft-alpha-operator',
      callbackNumberE164: '+12605550123',
      callbackNumberRawInput: '(260) 555-0123',
      createdAtUtc: '2026-03-22T12:00:00.000Z',
      updatedAtUtc: '2026-03-22T13:00:00.000Z',
    });

    expect(where).toHaveBeenCalledWith({
      id: 'user-connectshyft-alpha-operator',
      household_id: 'tenant-connectshyft-alpha',
    });
    expect(update).toHaveBeenCalledWith({
      phone_e164: '+12605550123',
      updated_at: 'NOW_TOKEN',
    }, [
      'id',
      'household_id',
      'phone_e164',
      'created_at',
      'updated_at',
    ]);
  });
});
