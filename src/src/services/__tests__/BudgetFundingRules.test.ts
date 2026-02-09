type Row = Record<string, any>;

let nextTransactionLookup: Row | null = null;
let insertedIncomeAssignment: Row | null = null;
let accountInsertPayload: Row | null = null;
let transactionInsertPayload: Row | null = null;

const fakeKnex: any = (tableName: string) => {
  if (tableName === 'transactions as t') {
    return {
      join() { return this; },
      leftJoin() { return this; },
      where() { return this; },
      select() { return this; },
      first() { return nextTransactionLookup; },
    };
  }

  if (tableName === 'categories') {
    return {
      join() { return this; },
      where() { return this; },
      first() { return { id: 'cat-1' }; },
    };
  }

  if (tableName === 'income_assignments') {
    return {
      where() { return this; },
      select() { return []; },
      insert(payload: Row) {
        insertedIncomeAssignment = payload;
        return {
          returning: () => [{
            id: 'assign-1',
            ...payload,
            created_at: new Date('2026-02-01T00:00:00.000Z'),
          }],
        };
      },
    };
  }

  if (tableName === 'accounts') {
    return {
      insert(payload: Row) {
        accountInsertPayload = payload;
        return {
          returning: () => [{
            id: 'acct-1',
            ...payload,
            created_at: new Date('2026-02-01T00:00:00.000Z'),
            updated_at: new Date('2026-02-01T00:00:00.000Z'),
          }],
        };
      },
    };
  }

  if (tableName === 'transactions') {
    return {
      insert(payload: Row) {
        transactionInsertPayload = payload;
        return Promise.resolve([{ id: 'tx-opening-1', ...payload }]);
      },
      where() {
        return {
          sum() {
            return {
              first() {
                return { total: 0 };
              },
            };
          },
        };
      },
    };
  }

  throw new Error(`Unhandled table mock: ${tableName}`);
};

fakeKnex.fn = {
  now: () => new Date('2026-02-01T00:00:00.000Z'),
};

fakeKnex.raw = (sql: string) => sql;

fakeKnex.transaction = async (cb: (trx: any) => any) => cb(fakeKnex);

jest.mock('../../config/knex', () => ({
  __esModule: true,
  default: fakeKnex,
}));

import { AssignmentService } from '../AssignmentService';
import { AccountService } from '../AccountService';

describe('Budget funding rules', () => {
  beforeEach(() => {
    nextTransactionLookup = null;
    insertedIncomeAssignment = null;
    accountInsertPayload = null;
    transactionInsertPayload = null;
    jest.clearAllMocks();
  });

  it('rejects manual assignment from on-budget to on-budget transfer inflow', async () => {
    nextTransactionLookup = {
      id: 'tx-1',
      household_id: 'house-1',
      transaction_date: '2026-02-01',
      amount: 100,
      payee: 'Transfer from Account',
      transfer_transaction_id: 'tx-2',
      account_is_on_budget: true,
      counterpart_is_on_budget: true,
      setup_wizard_completed_at: '2026-01-15T00:00:00.000Z',
    };

    await expect(
      AssignmentService.createAssignment('house-1', 'user-1', {
        income_transaction_id: 'tx-1',
        category_id: 'cat-1',
        amount: 50,
      })
    ).rejects.toThrow('Transaction is not eligible as assignable income');
  });

  it('rejects initial funding transactions after setup completion', async () => {
    nextTransactionLookup = {
      id: 'tx-3',
      household_id: 'house-1',
      transaction_date: '2026-02-01',
      amount: 500,
      payee: 'Initial Funding',
      transfer_transaction_id: null,
      account_is_on_budget: true,
      counterpart_is_on_budget: null,
      setup_wizard_completed_at: '2026-01-15T00:00:00.000Z',
    };

    await expect(
      AssignmentService.createAssignment('house-1', 'user-1', {
        income_transaction_id: 'tx-3',
        category_id: 'cat-1',
        amount: 100,
      })
    ).rejects.toThrow('Transaction is not eligible as assignable income');
  });

  it('creates opening-balance transaction when a new account has a starting balance', async () => {
    const recalcSpy = jest
      .spyOn(AccountService, 'recalculateBalance')
      .mockResolvedValue(undefined);

    const account = await AccountService.createAccount('house-1', {
      name: 'Checking',
      type: 'checking',
      starting_balance: 250,
      is_on_budget: true,
    });

    expect(account.id).toBe('acct-1');
    expect(accountInsertPayload?.starting_balance).toBe(0);
    expect(accountInsertPayload?.is_on_budget).toBe(true);
    expect(transactionInsertPayload?.payee).toBe('Initial Funding');
    expect(transactionInsertPayload?.amount).toBe(250);
    expect(transactionInsertPayload?.notes).toBe('Created from account opening balance');
    expect(recalcSpy).toHaveBeenCalledWith('acct-1', 'house-1', fakeKnex);
  });
});
