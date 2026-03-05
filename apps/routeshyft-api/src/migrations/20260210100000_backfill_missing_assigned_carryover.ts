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

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function keyForAllocation(categoryId: string | null, sectionId: string | null): string {
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

    let updatedAllocations = 0;

    for (const [householdId, householdMonths] of byHousehold.entries()) {
      const monthByValue = new Map<string, BudgetMonthRow>();
      for (const row of householdMonths) {
        monthByValue.set(new Date(row.month).toISOString().slice(0, 10), row);
      }

      for (const current of householdMonths) {
        const currentMonthDate = new Date(current.month);
        const currentMonthStr = formatMonth(currentMonthDate);
        const prevMonthDate = previousMonth(currentMonthDate);
        const prevMonthKey = prevMonthDate.toISOString().slice(0, 10);
        const prev = monthByValue.get(prevMonthKey);

        if (!prev) continue;

        // Conservative safeguard:
        // backfill only months with no explicit assignment movement logged in that month.
        const [incomeAssignmentsCount, balanceAssignmentsCount, transferCount] = await Promise.all([
          trx('income_assignments').where({ household_id: householdId, month: currentMonthStr }).count('* as count').first(),
          trx('account_balance_assignments').where({ household_id: householdId, month: currentMonthStr }).count('* as count').first(),
          trx('assignment_transfers').where({ household_id: householdId, month: currentMonthStr }).count('* as count').first(),
        ]);

        const hasMonthActivity =
          Number(incomeAssignmentsCount?.count || 0) > 0 ||
          Number(balanceAssignmentsCount?.count || 0) > 0 ||
          Number(transferCount?.count || 0) > 0;

        if (hasMonthActivity) continue;

        const prevAllocations = await trx('budget_allocations')
          .where({ budget_month_id: prev.id }) as AllocationRow[];

        if (prevAllocations.length === 0) continue;

        const currentAllocations = await trx('budget_allocations')
          .where({ budget_month_id: current.id }) as AllocationRow[];

        const currentByKey = new Map<string, AllocationRow>();
        for (const allocation of currentAllocations) {
          currentByKey.set(keyForAllocation(allocation.category_id, allocation.section_id), allocation);
        }

        const { start, end } = monthRange(prevMonthDate);
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

        const categoryToSectionMap = new Map<string, string>();
        for (const category of categories) {
          categoryToSectionMap.set(category.id, category.section_id);
        }

        const sectionSpentMap = new Map<string, number>();
        for (const [categoryId, spent] of categorySpentMap.entries()) {
          const sectionId = categoryToSectionMap.get(categoryId);
          if (!sectionId) continue;
          sectionSpentMap.set(sectionId, (sectionSpentMap.get(sectionId) || 0) + spent);
        }

        for (const prevAllocation of prevAllocations) {
          const allocationKey = keyForAllocation(prevAllocation.category_id, prevAllocation.section_id);
          const currentAllocation = currentByKey.get(allocationKey);
          if (!currentAllocation) continue;

          const prevAssigned = Number(prevAllocation.assigned_amount || 0);
          const prevSpent = prevAllocation.rollup_mode
            ? Number(sectionSpentMap.get(prevAllocation.section_id || '') || 0)
            : Number(categorySpentMap.get(prevAllocation.category_id || '') || 0);
          const expectedCarryover = Math.max(prevAssigned - prevSpent, 0);

          const currentAssigned = Number(currentAllocation.assigned_amount || 0);
          if (expectedCarryover <= currentAssigned) continue;

          await trx('budget_allocations')
            .where({ id: currentAllocation.id })
            .update({
              assigned_amount: expectedCarryover,
              updated_at: trx.fn.now(),
            });

          updatedAllocations += 1;
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Backfilled missing assigned carryover for ${updatedAllocations} allocation(s)`);
  });
}

export async function down(_knex: Knex): Promise<void> {
  // Non-reversible data correction migration.
}
