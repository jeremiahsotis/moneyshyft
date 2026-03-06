import { Knex } from 'knex';

type CategoryRow = {
  id: string;
  household_id: string;
  section_id: string | null;
  name: string;
  parent_category_id: string | null;
  sort_order: number;
  is_system: boolean;
  color: string | null;
  icon: string | null;
};

const VARIABLE_CATEGORY_NAMES = [
  'Groceries',
  'Gas & Transportation',
  'Personal Care',
  'Charitable Giving',
  'Home Improvement / Maintenance',
  'Healthcare / Medical Expenses',
  'Pet Care'
];

export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const households = await trx('households').select('id');

    const hasIncomeAssignments = await trx.schema.hasTable('income_assignments');
    const hasAccountBalanceAssignments = await trx.schema.hasTable('account_balance_assignments');
    const hasExtraMoneyAssignments = await trx.schema.hasTable('extra_money_assignments');
    const hasRecurringTransactions = await trx.schema.hasTable('recurring_transactions');
    const hasRecurringInstances = await trx.schema.hasTable('recurring_transaction_instances');
    const hasGoals = await trx.schema.hasTable('goals');
    const hasDebts = await trx.schema.hasTable('debts');
    const hasScenarioItems = await trx.schema.hasTable('scenario_items');
    const hasAssignmentTransfers = await trx.schema.hasTable('assignment_transfers');
    const hasExtraMoneyPreferences = await trx.schema.hasTable('extra_money_preferences');

    for (const household of households) {
      const householdId = household.id as string;

      const flexibleSection = await trx('category_sections')
        .where({ household_id: householdId, name: 'Flexible Spending', type: 'flexible' })
        .first();

      let variableSection = await trx('category_sections')
        .where({ household_id: householdId, name: 'Variable Expenses', type: 'flexible' })
        .first();

      if (!variableSection) {
        const sortOrder = flexibleSection ? Math.max((flexibleSection.sort_order || 0) - 1, 0) : 0;
        const [createdSection] = await trx('category_sections')
          .insert({
            household_id: householdId,
            name: 'Variable Expenses',
            type: 'flexible',
            sort_order: sortOrder,
            is_system: false
          })
          .returning('*');

        variableSection = createdSection;
      }

      const replacementMap: Record<string, string> = {};

      const reassignCategory = async (fromCategoryId: string, toCategoryId: string): Promise<void> => {
        if (fromCategoryId === toCategoryId) return;

        await trx('transactions')
          .where({ category_id: fromCategoryId })
          .update({ category_id: toCategoryId });

        await trx('budget_allocations')
          .where({ category_id: fromCategoryId })
          .update({ category_id: toCategoryId });

        if (hasIncomeAssignments) {
          await trx('income_assignments')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasAccountBalanceAssignments) {
          await trx('account_balance_assignments')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasExtraMoneyAssignments) {
          await trx('extra_money_assignments')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasRecurringTransactions) {
          await trx('recurring_transactions')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasRecurringInstances) {
          await trx('recurring_transaction_instances')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasGoals) {
          await trx('goals')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasDebts) {
          await trx('debts')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasScenarioItems) {
          await trx('scenario_items')
            .where({ category_id: fromCategoryId })
            .update({ category_id: toCategoryId });
        }

        if (hasAssignmentTransfers) {
          await trx('assignment_transfers')
            .where({ from_category_id: fromCategoryId })
            .update({ from_category_id: toCategoryId });

          await trx('assignment_transfers')
            .where({ to_category_id: fromCategoryId })
            .update({ to_category_id: toCategoryId });
        }

        await trx('categories')
          .where({ parent_category_id: fromCategoryId })
          .update({ parent_category_id: toCategoryId });
      };

      for (const name of VARIABLE_CATEGORY_NAMES) {
        const allCategories: CategoryRow[] = await trx('categories')
          .where({ household_id: householdId, name })
          .whereNull('parent_category_id')
          .select('*');

        const variableCategories = allCategories.filter(cat => cat.section_id === variableSection.id);
        const flexibleCategories = flexibleSection
          ? allCategories.filter(cat => cat.section_id === flexibleSection.id)
          : [];

        let canonical = variableCategories[0] || flexibleCategories[0];

        if (!canonical) {
          const [createdCategory] = await trx('categories')
            .insert({
              household_id: householdId,
              section_id: variableSection.id,
              name,
              parent_category_id: null,
              color: null,
              icon: null,
              sort_order: 0,
              is_system: false
            })
            .returning('*');
          canonical = createdCategory;
        } else if (canonical.section_id !== variableSection.id) {
          await trx('categories')
            .where({ id: canonical.id })
            .update({ section_id: variableSection.id });
        }

        const duplicates = [...variableCategories, ...flexibleCategories].filter(cat => cat.id !== canonical.id);
        for (const dup of duplicates) {
          replacementMap[dup.id] = canonical.id;
          await reassignCategory(dup.id, canonical.id);
          await trx('categories').where({ id: dup.id }).del();
        }
      }

      if (hasExtraMoneyPreferences && Object.keys(replacementMap).length > 0) {
        const preferences = await trx('extra_money_preferences')
          .where({ household_id: householdId })
          .select('id', 'category_percentages', 'default_categories');

        for (const pref of preferences) {
          const categoryPercentages = (pref.category_percentages || {}) as Record<string, number>;
          const defaultCategories = (pref.default_categories || {}) as Record<string, string>;

          let changed = false;
          const updatedPercentages: Record<string, number> = {};

          for (const [categoryId, percentage] of Object.entries(categoryPercentages)) {
            const newCategoryId = replacementMap[categoryId] || categoryId;
            updatedPercentages[newCategoryId] = (updatedPercentages[newCategoryId] || 0) + percentage;
            if (newCategoryId !== categoryId) changed = true;
          }

          for (const [key, value] of Object.entries(defaultCategories)) {
            const newValue = replacementMap[value] || value;
            if (newValue !== value) {
              defaultCategories[key] = newValue;
              changed = true;
            }
          }

          if (changed) {
            await trx('extra_money_preferences')
              .where({ id: pref.id })
              .update({
                category_percentages: updatedPercentages,
                default_categories: defaultCategories
              });
          }
        }
      }
    }
  });
}

export async function down(_knex: Knex): Promise<void> {
  // Data migration is not reversible.
}
