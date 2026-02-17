let accountWhereCalls: Record<string, unknown>[] = [];
let transactionWhereCalls: Record<string, unknown>[] = [];

const fakeKnex: any = (tableName: string) => {
  if (tableName === 'accounts') {
    let accumulatedWhere: Record<string, unknown> = {};

    return {
      where(payload: Record<string, unknown>) {
        accumulatedWhere = { ...accumulatedWhere, ...payload };
        accountWhereCalls.push({ ...payload });
        return this;
      },
      first() {
        if (accumulatedWhere.id === 'acct-1' && accumulatedWhere.household_id === 'house-1') {
          return {
            id: 'acct-1',
            household_id: 'house-1',
            name: 'Checking',
            type: 'checking',
            current_balance: 25,
            starting_balance: 0,
            is_on_budget: true,
            is_active: true,
            created_at: new Date('2026-02-01T00:00:00.000Z'),
            updated_at: new Date('2026-02-01T00:00:00.000Z'),
          };
        }

        return null;
      },
      update() {
        return Promise.resolve(1);
      },
    };
  }

  if (tableName === 'transactions') {
    return {
      where(payload: Record<string, unknown>) {
        transactionWhereCalls.push({ ...payload });
        return this;
      },
      sum() {
        return this;
      },
      first() {
        return { total: 25 };
      },
    };
  }

  throw new Error(`Unhandled table mock: ${tableName}`);
};

fakeKnex.fn = {
  now: () => new Date('2026-02-01T00:00:00.000Z'),
};

jest.mock('../../config/knex', () => ({
  __esModule: true,
  default: fakeKnex,
}));

import { AccountService } from '../AccountService';

describe('AccountService tenancy enforcement', () => {
  beforeEach(() => {
    accountWhereCalls = [];
    transactionWhereCalls = [];
    jest.clearAllMocks();
  });

  it('fails cross-tenant account reads deterministically', async () => {
    await expect(
      AccountService.getAccountById('acct-1', 'house-2')
    ).rejects.toThrow('Account not found');

    expect(accountWhereCalls).toContainEqual({ id: 'acct-1' });
    expect(accountWhereCalls).toContainEqual({ household_id: 'house-2' });
  });

  it('applies tenant filters for account and transaction queries during balance recalculation', async () => {
    await AccountService.recalculateBalance('acct-1', 'house-1', fakeKnex);

    expect(accountWhereCalls).toContainEqual({ id: 'acct-1' });
    expect(accountWhereCalls).toContainEqual({ household_id: 'house-1' });
    expect(transactionWhereCalls).toContainEqual({ account_id: 'acct-1', is_split_child: false });
    expect(transactionWhereCalls).toContainEqual({ household_id: 'house-1' });
  });
});
