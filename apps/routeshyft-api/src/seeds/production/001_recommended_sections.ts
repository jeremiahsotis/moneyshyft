import { Knex } from 'knex';

/**
 * Seed: Recommended starter sections and categories
 *
 * Creates recommended section structure for new households:
 * - Fixed Expenses: Essential bills that stay consistent
 * - Variable Expenses: Essential spending that varies month-to-month
 * - Flexible Spending: Discretionary spending that can be adjusted
 * - Debt Payments: Track debt payment progress
 *
 * Note: These are NOT system records (is_system = false),
 * so users can delete or modify them freely.
 */
export async function seed(knex: Knex): Promise<void> {
  // This seed should only run when creating a new household
  // For production use, this would be called from a signup/onboarding flow
  // rather than run automatically

  // For now, we'll create a utility function that can be called
  // when a new household is created
}

/**
 * Utility function to create recommended sections for a new household
 * Call this from your household creation/signup flow
 */
export async function createRecommendedSections(
  knex: Knex,
  householdId: string
): Promise<void> {
  // 1. Fixed Expenses Section
  const [fixedSection] = await knex('category_sections')
    .insert({
      household_id: householdId,
      name: 'Fixed Expenses',
      type: 'fixed',
      sort_order: 1,
      is_system: false
    })
    .returning('*');

  const fixedCategories = [
    { name: 'Rent/Mortgage', sort_order: 1 },
    { name: 'Utilities', sort_order: 2 },
    { name: 'Internet & Phone', sort_order: 3 },
    { name: 'Insurance', sort_order: 4 },
    { name: 'Car Payment', sort_order: 5 }
  ];

  await knex('categories').insert(
    fixedCategories.map(cat => ({
      household_id: householdId,
      section_id: fixedSection.id,
      name: cat.name,
      sort_order: cat.sort_order,
      is_system: false,
      parent_category_id: null,
      color: null,
      icon: null
    }))
  );

  // 2. Variable Expenses Section
  const [variableSection] = await knex('category_sections')
    .insert({
      household_id: householdId,
      name: 'Variable Expenses',
      type: 'flexible',
      sort_order: 2,
      is_system: false
    })
    .returning('*');

  const variableCategories = [
    { name: 'Groceries', sort_order: 1 },
    { name: 'Gas & Transportation', sort_order: 2 },
    { name: 'Personal Care', sort_order: 3 },
    { name: 'Charitable Giving', sort_order: 4 },
    { name: 'Home Improvement / Maintenance', sort_order: 5 },
    { name: 'Healthcare / Medical Expenses', sort_order: 6 },
    { name: 'Pet Care', sort_order: 7 }
  ];

  await knex('categories').insert(
    variableCategories.map(cat => ({
      household_id: householdId,
      section_id: variableSection.id,
      name: cat.name,
      sort_order: cat.sort_order,
      is_system: false,
      parent_category_id: null,
      color: null,
      icon: null
    }))
  );

  // 3. Flexible Spending Section
  const [flexibleSection] = await knex('category_sections')
    .insert({
      household_id: householdId,
      name: 'Flexible Spending',
      type: 'flexible',
      sort_order: 3,
      is_system: false
    })
    .returning('*');

  const flexibleCategories = [
    { name: 'Dining Out', sort_order: 1 },
    { name: 'Entertainment & Recreation', sort_order: 2 },
    { name: 'Shopping', sort_order: 3 },
    { name: 'Unplanned Expenses', sort_order: 4 },
    { name: 'Gifts', sort_order: 5 },
    { name: 'Fun Money', sort_order: 6 },
    { name: 'Bank Fees / Charges', sort_order: 7 },
    { name: 'Subscriptions', sort_order: 8 }
  ];

  await knex('categories').insert(
    flexibleCategories.map(cat => ({
      household_id: householdId,
      section_id: flexibleSection.id,
      name: cat.name,
      sort_order: cat.sort_order,
      is_system: false,
      parent_category_id: null,
      color: null,
      icon: null
    }))
  );

  // 4. Debt Payments Section
  const [debtSection] = await knex('category_sections')
    .insert({
      household_id: householdId,
      name: 'Debt Payments',
      type: 'debt',
      sort_order: 4,
      is_system: false
    })
    .returning('*');

  const debtCategories = [
    { name: 'Credit Card Payment', sort_order: 1 },
    { name: 'Personal Loan', sort_order: 2 },
    { name: 'Student Loan', sort_order: 3 }
  ];

  await knex('categories').insert(
    debtCategories.map(cat => ({
      household_id: householdId,
      section_id: debtSection.id,
      name: cat.name,
      sort_order: cat.sort_order,
      is_system: false,
      parent_category_id: null,
      color: null,
      icon: null
    }))
  );

  console.log(`✅ Recommended sections created for household ${householdId}`);
  console.log(`   - Fixed Expenses (${fixedCategories.length} categories)`);
  console.log(`   - Variable Expenses (${variableCategories.length} categories)`);
  console.log(`   - Flexible Spending (${flexibleCategories.length} categories)`);
  console.log(`   - Debt Payments (${debtCategories.length} categories)`);
}
