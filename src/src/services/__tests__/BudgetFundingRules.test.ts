type Row = Record<string, any>;

let nextTransactionLookup: Row | null = null;
let insertedIncomeAssignment: Row | null = null;
let accountInsertPayload: Row | null = null;
let transactionInsertPayload: Row | null = null;
let incomeAssignmentsTotal = 0;
let accountBalanceAssignmentsTotal = 0;
let savingsReserveTotal = 0;
let incomeAssignmentsAndWhereArgs: Array<[string, string, string]> = [];
let accountBalanceAssignmentsWhereArgs: Array<[string, string, string]> = [];
let extraMoneyReceivedDateWhere: Array<[string, string, string]> = [];

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
    let andWhereArgs: Array<[string, string, string]> = [];
    return {
      where() { return this; },
      andWhere(field: string, op: string, value: string) {
        andWhereArgs.push([field, op, value]);
        incomeAssignmentsAndWhereArgs = andWhereArgs;
        return this;
      },
      sum() { return this; },
      first() { return { total: incomeAssignmentsTotal }; },
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

  if (tableName === 'account_balance_assignments') {
    return {
      where(arg?: any) {
        if (typeof arg === 'function') {
          arg(this);
        }
        return this;
      },
      whereNull() { return this; },
      orWhere(field: string, op: string, value: string) {
        accountBalanceAssignmentsWhereArgs.push([field, op, value]);
        return this;
      },
      sum() { return this; },
      first() { return { total: accountBalanceAssignmentsTotal }; },
    };
  }

  if (tableName === 'extra_money_entries') {
    return {
      where(fieldOrObj: any, op?: string, value?: string) {
        if (typeof fieldOrObj === 'string' && op && value) {
          extraMoneyReceivedDateWhere.push([fieldOrObj, op, value]);
        }
        return this;
      },
      sum() { return this; },
      first() { return { total: savingsReserveTotal }; },
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
    incomeAssignmentsTotal = 0;
    accountBalanceAssignmentsTotal = 0;
    savingsReserveTotal = 0;
    incomeAssignmentsAndWhereArgs = [];
    accountBalanceAssignmentsWhereArgs = [];
    extraMoneyReceivedDateWhere = [];
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

  it('carries Ready to Assign forward month-to-month using cumulative math', async () => {
    const grossSpy = jest
      .spyOn(AssignmentService as any, 'getGrossIncome')
      .mockResolvedValue(1383.92);

    const outflowSpy = jest
      .spyOn(AssignmentService as any, 'getOnBudgetToOffBudgetOutflow')
      .mockResolvedValue(0);

    incomeAssignmentsTotal = 905.0;
    accountBalanceAssignmentsTotal = 0;
    savingsReserveTotal = 0;

    const toBeAssigned = await AssignmentService.getToBeAssigned('house-1', '2026-02');

    expect(toBeAssigned).toBeCloseTo(478.92, 2);
    expect(grossSpy).toHaveBeenCalled();
    expect(outflowSpy).toHaveBeenCalled();
    expect(incomeAssignmentsAndWhereArgs).toContainEqual(['month', '<=', '2026-02']);
    expect(accountBalanceAssignmentsWhereArgs).toContainEqual(['month', '<=', '2026-02']);
    expect(extraMoneyReceivedDateWhere).toContainEqual(['received_date', '<=', '2026-02-28']);
  });
});
