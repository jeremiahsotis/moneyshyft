const budgetMonths = [
  {
    id: 'bm-prev',
    household_id: 'house-1',
    month: new Date('2026-01-01T00:00:00.000Z'),
    notes: null,
  },
] as Array<Record<string, any>>;

const previousAllocations = [
  {
    id: 'alloc-1',
    budget_month_id: 'bm-prev',
    category_id: 'cat-1',
    section_id: null,
    allocated_amount: 1000,
    assigned_amount: 500,
    rollup_mode: false,
    notes: null,
  },
];

const insertedNewAllocations: Array<Record<string, any>> = [];

const fakeKnex: any = (tableName: string) => {
  if (tableName === 'budget_months') {
    let whereCriteria: Record<string, any> = {};
    return {
      where(criteria: Record<string, any>) {
        whereCriteria = criteria;
        return this;
      },
      first() {
        return budgetMonths.find((m) =>
          m.household_id === whereCriteria.household_id &&
          new Date(m.month).toISOString().slice(0, 10) === new Date(whereCriteria.month).toISOString().slice(0, 10)
        ) || null;
      },
      insert(payload: Record<string, any>) {
        const newMonth = {
          id: 'bm-new',
          ...payload,
          notes: null,
        };
        budgetMonths.push(newMonth);
        return {
          returning: () => [newMonth],
        };
      },
    };
  }

  if (tableName === 'budget_allocations') {
    let whereCriteria: Record<string, any> = {};
    return {
      where(criteria: Record<string, any>) {
        whereCriteria = criteria;
        return this;
      },
      first() { return null; },
      insert(payload: Array<Record<string, any>>) {
        insertedNewAllocations.push(...payload);
        return Promise.resolve(payload);
      },
      then(resolve: (value: any) => any) {
        const rows = previousAllocations.filter((r) => r.budget_month_id === whereCriteria.budget_month_id);
        return Promise.resolve(rows).then(resolve);
      },
    };
  }

  if (tableName === 'transactions') {
    return {
      where() { return this; },
      whereBetween() { return this; },
      whereNotNull() { return this; },
      select() { return this; },
      sum() { return this; },
      groupBy() {
        return Promise.resolve([
          { category_id: 'cat-1', total_spent: -200 },
        ]);
      },
    };
  }

  if (tableName === 'categories') {
    return {
      where() { return this; },
      select() {
        return Promise.resolve([
          { id: 'cat-1', section_id: 'sec-1' },
        ]);
      },
    };
  }

  throw new Error(`Unhandled table mock: ${tableName}`);
};

fakeKnex.fn = { now: () => new Date('2026-02-01T00:00:00.000Z') };
fakeKnex.raw = (sql: string) => sql;
fakeKnex.transaction = async (cb: (trx: any) => any) => cb(fakeKnex);

jest.mock('../../config/knex', () => ({
  __esModule: true,
  default: fakeKnex,
}));

jest.mock('../AnalyticsService', () => ({
  AnalyticsService: {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

import { BudgetService } from '../BudgetService';

describe('Budget month carryover', () => {
  beforeEach(() => {
    insertedNewAllocations.length = 0;
  });

  it('carries unspent assigned amounts into the next month allocation', async () => {
    const month = new Date(2026, 1, 1);
    const budgetMonth = await BudgetService.getOrCreateBudgetMonth('house-1', month, fakeKnex);

    expect(budgetMonth.id).toBe('bm-new');
    expect(insertedNewAllocations.length).toBe(1);
    expect(insertedNewAllocations[0].category_id).toBe('cat-1');
    expect(insertedNewAllocations[0].allocated_amount).toBe(1000);
    expect(insertedNewAllocations[0].assigned_amount).toBe(300);
  });
});
