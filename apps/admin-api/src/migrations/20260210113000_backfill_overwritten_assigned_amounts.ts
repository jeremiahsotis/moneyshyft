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

function targetKey(categoryId: string | null, sectionId: string | null): string {
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
      const monthByDate = new Map<string, BudgetMonthRow>();
      for (const m of householdMonths) {
        monthByDate.set(new Date(m.month).toISOString().slice(0, 10), m);
      }

      for (const currentMonth of householdMonths) {
        const currentDate = new Date(currentMonth.month);
        const prevDate = previousMonth(currentDate);
        const prevKey = prevDate.toISOString().slice(0, 10);
        const prevMonth = monthByDate.get(prevKey);
        if (!prevMonth) continue;

        const currentMonthStr = monthString(currentDate);

        const prevAllocations = await trx('budget_allocations')
          .where({ budget_month_id: prevMonth.id }) as AllocationRow[];

        if (prevAllocations.length === 0) continue;

        const currentAllocations = await trx('budget_allocations')
          .where({ budget_month_id: currentMonth.id }) as AllocationRow[];

        const currentByKey = new Map<string, AllocationRow>();
        for (const allocation of currentAllocations) {
          currentByKey.set(targetKey(allocation.category_id, allocation.section_id), allocation);
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

        for (const prevAllocation of prevAllocations) {
          const key = targetKey(prevAllocation.category_id, prevAllocation.section_id);
          const currentAllocation = currentByKey.get(key);
          if (!currentAllocation) continue;

          const prevAssigned = Number(prevAllocation.assigned_amount || 0);
          const prevSpent = prevAllocation.rollup_mode
            ? Number(sectionSpentMap.get(prevAllocation.section_id || '') || 0)
            : Number(categorySpentMap.get(prevAllocation.category_id || '') || 0);
          const expectedCarryoverFloor = Math.max(prevAssigned - prevSpent, 0);

          const currentAssigned = Number(currentAllocation.assigned_amount || 0);
          if (expectedCarryoverFloor <= currentAssigned + 0.01) continue;

          // Safeguard 1: skip targets with assignment transfers in current month.
          const transferCount = await trx('assignment_transfers')
            .where({ household_id: householdId, month: currentMonthStr })
            .where((qb) => {
              if (currentAllocation.category_id) {
                qb.where({ from_category_id: currentAllocation.category_id })
                  .orWhere({ to_category_id: currentAllocation.category_id });
              } else {
                qb.where({ from_section_id: currentAllocation.section_id })
                  .orWhere({ to_section_id: currentAllocation.section_id });
              }
            })
            .count('* as count')
            .first();

          if (Number(transferCount?.count || 0) > 0) continue;

          // Safeguard 2: only repair when current assigned looks like it was overwritten by month logs.
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

          const monthLoggedAssigned = Number(incomeAssigned?.total || 0) + Number(balanceAssigned?.total || 0);
          if (Math.abs(monthLoggedAssigned - currentAssigned) > 0.01) continue;

          await trx('budget_allocations')
            .where({ id: currentAllocation.id })
            .update({
              assigned_amount: expectedCarryoverFloor,
              updated_at: trx.fn.now(),
            });

          repaired += 1;
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Repaired overwritten assigned amounts for ${repaired} allocation(s)`);
  });
}

export async function down(_knex: Knex): Promise<void> {
  // Non-reversible data correction migration.
}
