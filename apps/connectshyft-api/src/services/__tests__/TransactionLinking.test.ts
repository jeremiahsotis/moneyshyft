let goalLookupResult: Record<string, any> | null = null;

const fakeKnex: any = (tableName: string) => {
  if (tableName === 'goals') {
    return {
      where() { return this; },
      first() { return goalLookupResult; },
    };
  }

  throw new Error(`Unhandled table mock: ${tableName}`);
};

fakeKnex.transaction = async (cb: (trx: any) => any) => cb(fakeKnex);
fakeKnex.fn = { now: () => new Date('2026-02-10T00:00:00.000Z') };
fakeKnex.raw = (sql: string) => sql;

jest.mock('../../config/knex', () => ({
  __esModule: true,
  default: fakeKnex,
}));

jest.mock('../AnalyticsService', () => ({
  AnalyticsService: {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../ExtraMoneyService', () => ({
  ExtraMoneyService: {
    detectExtraMoney: jest.fn().mockResolvedValue({ shouldFlag: false, reason: null }),
    createExtraMoneyEntry: jest.fn().mockResolvedValue(null),
  },
}));

import { TransactionService } from '../TransactionService';
import { BudgetService } from '../BudgetService';
import { AccountService } from '../AccountService';

describe('Transaction linking behavior', () => {
  beforeEach(() => {
    goalLookupResult = null;
    jest.clearAllMocks();
  });

  it('consumes assigned goal cash first, then records RTA fallback', async () => {
    const getOrCreateSpy = jest
      .spyOn(BudgetService, 'getOrCreateBudgetMonth')
      .mockResolvedValue({ id: 'bm-1' } as any);

    const budgetAllocation = {
      id: 'alloc-1',
      assigned_amount: 30,
    };

    const allocationUpdate: any = {};
    const balanceAssignments: any[] = [];

    const trx: any = (tableName: string) => {
      if (tableName === 'budget_allocations') {
        let wherePayload: any = null;
        return {
          where(payload: any) {
            wherePayload = payload;
            return this;
          },
          first() {
            if (wherePayload?.budget_month_id === 'bm-1' && wherePayload?.category_id === 'cat-goal') {
              return budgetAllocation;
            }
            return null;
          },
          update(payload: any) {
            Object.assign(allocationUpdate, payload);
            return Promise.resolve(1);
          },
        };
      }

      if (tableName === 'account_balance_assignments') {
        return {
          insert(payload: any) {
            balanceAssignments.push(payload);
            return Promise.resolve([payload]);
          },
        };
      }

      throw new Error(`Unhandled trx table: ${tableName}`);
    };

    trx.fn = { now: () => new Date('2026-02-10T00:00:00.000Z') };

    await (TransactionService as any).applyGoalBudgetConsumption(
      'house-1',
      'user-1',
      { category_id: 'cat-goal' },
      50,
      '2026-02-15',
      trx
    );

    expect(getOrCreateSpy).toHaveBeenCalled();
    expect(allocationUpdate.assigned_amount).toBe(0);
    expect(balanceAssignments).toHaveLength(1);
    expect(balanceAssignments[0].amount).toBe(20);
    expect(balanceAssignments[0].month).toBe('2026-02');
  });

  it('rejects goal-linked transfer when source account is off-budget', async () => {
    goalLookupResult = { id: 'goal-1', household_id: 'house-1' };

    const accountSpy = jest
      .spyOn(AccountService, 'getAccountById')
      .mockResolvedValueOnce({ id: 'acct-from', is_on_budget: false } as any)
      .mockResolvedValueOnce({ id: 'acct-to', is_on_budget: true } as any);

    await expect(
      TransactionService.createTransfer('house-1', 'user-1', {
        from_account_id: 'acct-from',
        to_account_id: 'acct-to',
        amount: 100,
        transaction_date: '2026-02-15',
        goal_id: 'goal-1',
      })
    ).rejects.toThrow('Goal-linked transfers must use an on-budget source account');

    expect(accountSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects transactions linked to both debt and goal', async () => {
    jest
      .spyOn(AccountService, 'getAccountById')
      .mockResolvedValue({ id: 'acct-1', is_on_budget: true } as any);

    await expect(
      TransactionService.createTransaction('house-1', 'user-1', {
        account_id: 'acct-1',
        payee: 'Mixed Link',
        amount: -10,
        transaction_date: '2026-02-15',
        debt_id: 'debt-1',
        goal_id: 'goal-1',
      } as any)
    ).rejects.toThrow('A transaction cannot be linked to both a debt and a goal');
  });
});
