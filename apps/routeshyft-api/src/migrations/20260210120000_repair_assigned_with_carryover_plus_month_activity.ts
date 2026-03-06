import { Knex } from 'knex';

type BudgetMonthRow = {
  id: string;
  household_id: string;
  month: Date;
};

type AllocationRow = {
  id: string;
  budget_month_id: string;
  category_id: string | null;
  section_id: string | null;
  assigned_amount: number | string | null;
  rollup_mode: boolean;
};

function previousMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function monthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function keyFor(categoryId: string | null, sectionId: string | null): string {
  if (categoryId) return `cat:${categoryId}`;
  if (sectionId) return `sec:${sectionId}`;
  return 'invalid';
}

export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const months = await trx('budget_months')
      .select('id', 'household_id', 'month')
      .orderBy('household_id', 'asc')
      .orderBy('month', 'asc') as BudgetMonthRow[];

    const byHousehold = new Map<string, BudgetMonthRow[]>();
    for (const month of months) {
      const list = byHousehold.get(month.household_id) || [];
      list.push(month);
      byHousehold.set(month.household_id, list);
    }

    let repaired = 0;

    for (const [householdId, householdMonths] of byHousehold.entries()) {
      const byDate = new Map<string, BudgetMonthRow>();
      for (const m of householdMonths) {
        byDate.set(new Date(m.month).toISOString().slice(0, 10), m);
      }

      for (const currentMonth of householdMonths) {
        const currentDate = new Date(currentMonth.month);
        const prevDate = previousMonth(currentDate);
        const prevMonth = byDate.get(prevDate.toISOString().slice(0, 10));
        if (!prevMonth) continue;

        const currentMonthStr = monthString(currentDate);
        const prevAllocations = await trx('budget_allocations')
          .where({ budget_month_id: prevMonth.id }) as AllocationRow[];
        if (prevAllocations.length === 0) continue;

        const currentAllocations = await trx('budget_allocations')
          .where({ budget_month_id: currentMonth.id }) as AllocationRow[];
        if (currentAllocations.length === 0) continue;

        const currentByKey = new Map<string, AllocationRow>();
        for (const allocation of currentAllocations) {
          currentByKey.set(keyFor(allocation.category_id, allocation.section_id), allocation);
        }

        const { start, end } = monthRange(prevDate);
        const categorySpendingRows = await trx('transactions')
          .where({ household_id: householdId })
          .whereBetween('transaction_date', [start, end])
          .whereNotNull('category_id')
          .select('category_id')
          .sum('amount as total_spent')
          .groupBy('category_id') as Array<{ category_id: string; total_spent: number | string | null }>;

        const categorySpentMap = new Map<string, number>();
        for (const row of categorySpendingRows) {
          categorySpentMap.set(row.category_id, Math.max(Math.abs(Number(row.total_spent || 0)), 0));
        }

        const categories = await trx('categories')
          .where({ household_id: householdId })
          .select('id', 'section_id') as Array<{ id: string; section_id: string }>;

        const categoryToSection = new Map<string, string>();
        for (const category of categories) {
          categoryToSection.set(category.id, category.section_id);
        }

        const sectionSpentMap = new Map<string, number>();
        for (const [categoryId, spent] of categorySpentMap.entries()) {
          const sectionId = categoryToSection.get(categoryId);
          if (!sectionId) continue;
          sectionSpentMap.set(sectionId, (sectionSpentMap.get(sectionId) || 0) + spent);
        }

        const transferRows = await trx('assignment_transfers')
          .where({ household_id: householdId, month: currentMonthStr })
          .select(
            'from_category_id',
            'from_section_id',
            'to_category_id',
            'to_section_id',
            'amount'
          ) as Array<{
            from_category_id: string | null;
            from_section_id: string | null;
            to_category_id: string | null;
            to_section_id: string | null;
            amount: number | string;
          }>;

        const transferNetMap = new Map<string, number>();
        for (const row of transferRows) {
          const amount = Number(row.amount || 0);
          const fromKey = keyFor(row.from_category_id, row.from_section_id);
          const toKey = keyFor(row.to_category_id, row.to_section_id);
          if (fromKey !== 'invalid') {
            transferNetMap.set(fromKey, (transferNetMap.get(fromKey) || 0) - amount);
          }
          if (toKey !== 'invalid') {
            transferNetMap.set(toKey, (transferNetMap.get(toKey) || 0) + amount);
          }
        }

        for (const prevAllocation of prevAllocations) {
          const target = keyFor(prevAllocation.category_id, prevAllocation.section_id);
          const currentAllocation = currentByKey.get(target);
          if (!currentAllocation) continue;

          const prevAssigned = Number(prevAllocation.assigned_amount || 0);
          const prevSpent = prevAllocation.rollup_mode
            ? Number(sectionSpentMap.get(prevAllocation.section_id || '') || 0)
            : Number(categorySpentMap.get(prevAllocation.category_id || '') || 0);
          const carryover = Math.max(prevAssigned - prevSpent, 0);

          const incomeAssigned = await trx('income_assignments')
            .where({ household_id: householdId, month: currentMonthStr })
            .modify((qb) => {
              if (currentAllocation.category_id) {
                qb.where({ category_id: currentAllocation.category_id });
              } else {
                qb.where({ section_id: currentAllocation.section_id });
              }
            })
            .sum('amount as total')
            .first();

          const balanceAssigned = await trx('account_balance_assignments')
            .where({ household_id: householdId, month: currentMonthStr })
            .modify((qb) => {
              if (currentAllocation.category_id) {
                qb.where({ category_id: currentAllocation.category_id });
              } else {
                qb.where({ section_id: currentAllocation.section_id });
              }
            })
            .sum('amount as total')
            .first();

          const monthLogged = Number(incomeAssigned?.total || 0) + Number(balanceAssigned?.total || 0);
          const netTransfer = Number(transferNetMap.get(target) || 0);
          const expected = Math.max(carryover + monthLogged + netTransfer, 0);
          const currentAssigned = Number(currentAllocation.assigned_amount || 0);

          // Only repair under-assigned rows to avoid clobbering intentional increases.
          if (expected - currentAssigned <= 0.01) continue;

          await trx('budget_allocations')
            .where({ id: currentAllocation.id })
            .update({
              assigned_amount: expected,
              updated_at: trx.fn.now(),
            });

          repaired += 1;
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Repaired assigned amounts with carryover+activity for ${repaired} allocation(s)`);
  });
}

export async function down(_knex: Knex): Promise<void> {
  // Non-reversible data correction migration.
}
