const tables: Record<string, Array<Record<string, any>>> = {
  recurring_transaction_instances: [],
  recurring_transactions: [],
};

function resetTables() {
  tables.recurring_transaction_instances = [];
  tables.recurring_transactions = [];
}

function matches(row: Record<string, any>, filters: Record<string, any>[]) {
  return filters.every((filter) =>
    Object.entries(filter).every(([key, value]) => row[key] === value)
  );
}

const fakeKnex: any = (tableName: string) => {
  let filters: Record<string, any>[] = [];
  return {
    where(criteria: Record<string, any>) {
      filters.push(criteria);
      return this;
    },
    first() {
      return tables[tableName].find((row) => matches(row, filters));
    },
    update(updateData: Record<string, any>) {
      const rows = tables[tableName].filter((row) => matches(row, filters));
      rows.forEach((row) => Object.assign(row, updateData));
      return {
        returning: () => rows,
      };
    },
  };
};

fakeKnex.fn = {
  now: () => new Date('2026-01-01T00:00:00Z'),
};

fakeKnex.transaction = async (cb: (trx: any) => any) => cb(fakeKnex);

jest.mock('../../config/knex', () => ({
  __esModule: true,
  default: fakeKnex,
}));

import { RecurringTransactionService } from '../RecurringTransactionService';
import { TransactionService } from '../TransactionService';

describe('RecurringTransactionService approve/post flows', () => {
  beforeEach(() => {
    resetTables();
    jest.clearAllMocks();
  });

  it('approves a pending instance without auto-post', async () => {
    tables.recurring_transaction_instances.push({
      id: 'inst-1',
      household_id: 'house-1',
      recurring_transaction_id: 'rec-1',
      status: 'pending',
    });
    tables.recurring_transactions.push({
      id: 'rec-1',
      household_id: 'house-1',
      auto_post: false,
    });

    const createSpy = jest
      .spyOn(TransactionService, 'createTransaction')
      .mockResolvedValue({ id: 'txn-1' } as any);

    const result = await RecurringTransactionService.approveInstance(
      'inst-1',
      'house-1',
      'user-1'
    );

    expect(result.status).toBe('approved');
    expect(result.approved_by_user_id).toBe('user-1');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('approves and auto-posts a pending instance when auto_post is enabled', async () => {
    tables.recurring_transaction_instances.push({
      id: 'inst-2',
      household_id: 'house-1',
      recurring_transaction_id: 'rec-2',
      status: 'pending',
      account_id: 'acct-1',
      category_id: null,
      payee: 'Rent',
      amount: -1200,
      due_date: '2026-01-05',
      notes: null,
    });
    tables.recurring_transactions.push({
      id: 'rec-2',
      household_id: 'house-1',
      auto_post: true,
    });

    const createSpy = jest
      .spyOn(TransactionService, 'createTransaction')
      .mockResolvedValue({ id: 'txn-2' } as any);

    const result = await RecurringTransactionService.approveInstance(
      'inst-2',
      'house-1',
      'user-1'
    );

    expect(result.status).toBe('posted');
    expect(result.transaction_id).toBe('txn-2');
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects posting a skipped instance', async () => {
    tables.recurring_transaction_instances.push({
      id: 'inst-3',
      household_id: 'house-1',
      recurring_transaction_id: 'rec-3',
      status: 'skipped',
      account_id: 'acct-1',
      category_id: null,
      payee: 'Rent',
      amount: -1200,
      due_date: '2026-01-05',
      notes: null,
    });

    await expect(
      RecurringTransactionService.postInstance('inst-3', 'house-1', 'user-1')
    ).rejects.toThrow('Cannot post a skipped instance');
  });
});
