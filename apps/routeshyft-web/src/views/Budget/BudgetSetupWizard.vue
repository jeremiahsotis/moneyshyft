<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
    <div class="max-w-2xl mx-auto">
      <div class="flex justify-end mb-3">
        <button
          @click="handleLogout"
          class="text-sm text-gray-600 hover:text-gray-900 underline"
          type="button"
        >
          Log out
        </button>
      </div>
      <!-- Progress Bar -->
      <div class="mb-8 bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600">Step {{ wizardStore.currentStep + 1 }} of 12</span>
          <div class="flex items-center gap-3">
            <button
              v-if="wizardStore.currentStep > 0 && wizardStore.currentStep < 11"
              @click="handlePause"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              Pause & Save
            </button>
            <button
              v-if="wizardStore.currentStep > 0 && wizardStore.currentStep < 11"
              @click="skipWizard"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              Not now
            </button>
          </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-primary-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Wizard Steps -->
      <transition name="fade" mode="out-in">
        <WizardWelcome
          v-if="wizardStore.currentStep === 0"
          @next="wizardStore.nextStep"
          @skip="skipWizard"
          @pause="handlePause"
          @first-wins="handleFirstWins"
        />
        <WizardIncome
          v-else-if="wizardStore.currentStep === 1"
          @next="handleIncomeNext"
          @back="wizardStore.prevStep"
        />
        <WizardAccounts
          v-else-if="wizardStore.currentStep === 2"
          :answers="wizardStore.answers"
          @update:answers="wizardStore.updateAnswers"
          @next="wizardStore.nextStep"
          @back="wizardStore.prevStep"
        />
        <WizardHousing
          v-else-if="wizardStore.currentStep === 3"
          @next="handleHousingNext"
          @back="wizardStore.prevStep"
        />
        <WizardTransportation
          v-else-if="wizardStore.currentStep === 4"
          @next="handleTransportationNext"
          @back="wizardStore.prevStep"
        />
        <WizardUtilities
          v-else-if="wizardStore.currentStep === 5"
          @next="handleUtilitiesNext"
          @back="wizardStore.prevStep"
        />
        <WizardDebt
          v-else-if="wizardStore.currentStep === 6"
          @next="handleDebtNext"
          @back="wizardStore.prevStep"
        />
        <WizardFlexible
          v-else-if="wizardStore.currentStep === 7"
          @next="handleFlexibleNext"
          @back="wizardStore.prevStep"
        />
        <WizardExtraMoney
          v-else-if="wizardStore.currentStep === 8"
          @next="handleExtraMoneyNext"
          @back="wizardStore.prevStep"
        />
        <WizardReview
          v-else-if="wizardStore.currentStep === 9"
          :answers="wizardStore.answers"
          @next="handleReviewNext"
          @back="wizardStore.prevStep"
        />
        <WizardAssignBalances
          v-else-if="wizardStore.currentStep === 10"
          :answers="wizardStore.answers"
          @update:assignments="handleAssignmentsUpdate"
          @next="handleAssignBalancesNext"
          @back="wizardStore.prevStep"
        />
        <WizardComplete
          v-else-if="wizardStore.currentStep === 11"
          @done="completeWizard"
        />
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useWizardStore } from '@/stores/wizard';
import { useIncomeStore } from '@/stores/income';
import { useAccountsStore } from '@/stores/accounts';
import { useCategoriesStore } from '@/stores/categories';
import { useBudgetsStore } from '@/stores/budgets';
import { useDebtsStore } from '@/stores/debts';
import { useCelebrationStore } from '@/stores/celebration';
import api from '@/services/api';

// Import wizard step components
import WizardWelcome from '@/components/wizard/WizardWelcome.vue';
import WizardIncome from '@/components/wizard/WizardIncome.vue';
import WizardAccounts from '@/components/wizard/WizardAccounts.vue';
import WizardHousing from '@/components/wizard/WizardHousing.vue';
import WizardTransportation from '@/components/wizard/WizardTransportation.vue';
import WizardUtilities from '@/components/wizard/WizardUtilities.vue';
import WizardDebt from '@/components/wizard/WizardDebt.vue';
import WizardFlexible from '@/components/wizard/WizardFlexible.vue';
import WizardExtraMoney from '@/components/wizard/WizardExtraMoney.vue';
import WizardReview from '@/components/wizard/WizardReview.vue';
import WizardAssignBalances from '@/components/wizard/WizardAssignBalances.vue';
import WizardComplete from '@/components/wizard/WizardComplete.vue';

const router = useRouter();
const authStore = useAuthStore();
const wizardStore = useWizardStore();
const incomeStore = useIncomeStore();
const accountsStore = useAccountsStore();  // NEW
const categoriesStore = useCategoriesStore();
const budgetsStore = useBudgetsStore();
const debtsStore = useDebtsStore();
const celebrationStore = useCelebrationStore();
const wizardCompletionSynced = ref(false);

const progressPercent = computed(() => {
  return ((wizardStore.currentStep + 1) / 12) * 100;
});

function skipWizard() {
  if (confirm('Are you sure you want to skip setup? You can always set up your budget manually later.')) {
    router.push('/budget');
  }
}

function handlePause() {
  wizardStore.saveProgress();
  router.push('/dashboard');
}

function handleFirstWins() {
  wizardStore.updateAnswers({
    first_wins: true,
    income_sources: [],
    housing_type: 'other',
    has_car_payment: false,
    has_car_insurance: false,
    has_credit_card_debt: false,
    has_other_debt: false,
  });
  wizardStore.setStep(9);
}

async function handleIncomeNext(data: any) {
  wizardStore.updateAnswers({ income_sources: data.sources });
  wizardStore.nextStep();
}

async function handleHousingNext(data: any) {
  wizardStore.updateAnswers(data);
  wizardStore.nextStep();
}

async function handleTransportationNext(data: any) {
  wizardStore.updateAnswers(data);
  wizardStore.nextStep();
}

async function handleUtilitiesNext(data: any) {
  wizardStore.updateAnswers(data);
  wizardStore.nextStep();
}

async function handleDebtNext(data: any) {
  wizardStore.updateAnswers(data);
  wizardStore.nextStep();
}

async function handleFlexibleNext(data: any) {
  wizardStore.updateAnswers(data);
  wizardStore.nextStep();
}

async function handleExtraMoneyNext(data: any) {
  wizardStore.updateAnswers({ extra_money_percentages: data });
  wizardStore.nextStep();
}

async function handleReviewNext() {
  // Create budget, categories, accounts, etc.
  await createBudgetFromWizard();

  // Now move to balance assignment step
  wizardStore.nextStep();
}

function handleAssignmentsUpdate(assignments: Record<string, number>) {
  wizardStore.updateAnswers({ balance_assignments: assignments });
}

async function handleAssignBalancesNext() {
  // Apply balance assignments to categories
  await applyBalanceAssignments();

  // Move to completion step
  wizardStore.nextStep();
}

async function createBudgetFromWizard() {
  const answers = wizardStore.answers;
  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    await categoriesStore.fetchCategories();

    const findSection = (name: string, type: 'fixed' | 'flexible' | 'debt') => {
      return categoriesStore.sections.find(section => section.name === name && section.type === type);
    };

    const ensureSection = async (name: string, type: 'fixed' | 'flexible' | 'debt') => {
      const existing = findSection(name, type);
      return existing || await categoriesStore.createSection({ name, type });
    };

    const findCategory = (sectionId: string, name: string) => {
      const section = categoriesStore.sections.find(s => s.id === sectionId);
      return section?.categories?.find(cat => cat.name === name);
    };

    const ensureCategory = async (sectionId: string, name: string) => {
      const existing = findCategory(sectionId, name);
      return existing || await categoriesStore.createCategory({ section_id: sectionId, name });
    };

    // 1. Create income sources
    if (answers.income_sources && answers.income_sources.length > 0) {
      for (const source of answers.income_sources) {
        await incomeStore.createIncomeSource({
          name: source.name,
          monthly_amount: source.monthly_amount,
          frequency: source.frequency,
          expected_day_of_month: source.expected_day_of_month,
          hours_per_week: source.hours_per_week,
          last_payment_date: source.last_payment_date
        });
      }
    }

    // 1.5. Create accounts from wizard (NEW)
    if (answers.accounts && answers.accounts.length > 0) {
      for (const accountData of answers.accounts) {
        await accountsStore.createAccount({
          name: accountData.name,
          type: accountData.type,
          starting_balance: accountData.current_balance,
          current_balance: accountData.current_balance,
        });
      }
    }

    // 2. Create Fixed Expenses section and categories
    const fixedSection = await ensureSection('Fixed Expenses', 'fixed');

    // Housing
    if (answers.housing_type === 'rent' && answers.housing_amount) {
      const rentCat = await ensureCategory(fixedSection.id, 'Rent/Mortgage');
      await budgetsStore.setAllocation(currentMonth, {
        category_id: rentCat.id,
        allocated_amount: answers.housing_amount,
        rollup_mode: false,
      });
    } else if (answers.housing_type === 'own' && answers.housing_amount) {
      const mortgageCat = await ensureCategory(fixedSection.id, 'Rent/Mortgage');
      await budgetsStore.setAllocation(currentMonth, {
        category_id: mortgageCat.id,
        allocated_amount: answers.housing_amount,
        rollup_mode: false,
      });
    }

    // Car payments (sum into base category)
    if (answers.has_car_payment && answers.car_payments && answers.car_payments.length > 0) {
      const totalCarPayments = answers.car_payments.reduce((sum, payment) => sum + payment.amount, 0);
      const carCat = await ensureCategory(fixedSection.id, 'Car Payment');
      await budgetsStore.setAllocation(currentMonth, {
        category_id: carCat.id,
        allocated_amount: totalCarPayments,
        rollup_mode: false,
      });
    }

    // Car insurance (sum into base category)
    if (answers.has_car_insurance && answers.car_insurance_payments && answers.car_insurance_payments.length > 0) {
      const totalInsurance = answers.car_insurance_payments.reduce((sum, payment) => sum + payment.amount, 0);
      const insuranceCat = await ensureCategory(fixedSection.id, 'Insurance');
      await budgetsStore.setAllocation(currentMonth, {
        category_id: insuranceCat.id,
        allocated_amount: totalInsurance,
        rollup_mode: false,
      });
    }

    // Utilities
    if (answers.utilities_estimate) {
      const utilitiesCat = await ensureCategory(fixedSection.id, 'Utilities');
      await budgetsStore.setAllocation(currentMonth, {
        category_id: utilitiesCat.id,
        allocated_amount: answers.utilities_estimate,
        rollup_mode: false,
      });
    }

    // 3. Create Debt Records using Debt Tracker
    // Credit card debts
    if (answers.has_credit_card_debt && answers.credit_card_debts && answers.credit_card_debts.length > 0) {
      for (const debt of answers.credit_card_debts) {
        await debtsStore.createDebt({
          name: debt.name,
          debt_type: debt.debt_type as 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan' | 'medical' | 'other',
          current_balance: debt.current_balance,
          original_balance: debt.current_balance, // Set original to current for new debts
          interest_rate: debt.interest_rate,
          minimum_payment: debt.minimum_payment,
        });
      }
    }

    // Other debts
    if (answers.has_other_debt && answers.other_debts && answers.other_debts.length > 0) {
      for (const debt of answers.other_debts) {
        await debtsStore.createDebt({
          name: debt.name,
          debt_type: debt.debt_type as 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan' | 'medical' | 'other',
          current_balance: debt.current_balance,
          original_balance: debt.current_balance, // Set original to current for new debts
          interest_rate: debt.interest_rate,
          minimum_payment: debt.minimum_payment,
        });
      }
    }

    // OPTIONALLY: Create a budget section for debt payments tracking
    // Calculate total minimum payments from all debts
    const totalDebtPayments = [
      ...(answers.credit_card_debts || []),
      ...(answers.other_debts || [])
    ].reduce((sum, debt) => sum + debt.minimum_payment, 0);

    if (totalDebtPayments > 0) {
      const debtSection = await ensureSection('Debt Payments', 'debt');

      const existingDebtCategories = debtSection.categories || [];
      for (const category of existingDebtCategories) {
        if (category.name !== 'Minimum Debt Payments') {
          await categoriesStore.deleteCategory(category.id);
        }
      }

      const debtCat = await ensureCategory(debtSection.id, 'Minimum Debt Payments');

      await budgetsStore.setAllocation(currentMonth, {
        category_id: debtCat.id,
        allocated_amount: totalDebtPayments,
        rollup_mode: false,
      });
    }

    // 4. Create Variable Expenses section
    const variableSection = await ensureSection('Variable Expenses', 'flexible');
    const variableCategories = [
      'Groceries',
      'Gas & Transportation',
      'Personal Care',
      'Charitable Giving',
      'Home Improvement / Maintenance',
      'Healthcare / Medical Expenses',
      'Pet Care'
    ];

    for (const name of variableCategories) {
      await ensureCategory(variableSection.id, name);
    }

    // 5. Create Flexible Spending section
    const flexSection = await ensureSection('Flexible Spending', 'flexible');
    const flexibleCategories = [
      'Dining Out',
      'Entertainment & Recreation',
      'Shopping',
      'Unplanned Expenses',
      'Gifts',
      'Fun Money',
      'Bank Fees / Charges',
      'Subscriptions'
    ];

    for (const name of flexibleCategories) {
      await ensureCategory(flexSection.id, name);
    }

    const variableAllocations = [
      { name: 'Groceries', amount: answers.groceries_estimate || 0 },
      { name: 'Gas & Transportation', amount: answers.gas_transportation_estimate || 0 },
      { name: 'Personal Care', amount: answers.personal_care_estimate || 0 },
      { name: 'Charitable Giving', amount: answers.charitable_giving_estimate || 0 },
      { name: 'Home Improvement / Maintenance', amount: answers.home_improvement_estimate || 0 },
      { name: 'Healthcare / Medical Expenses', amount: answers.healthcare_medical_estimate || 0 },
      { name: 'Pet Care', amount: answers.pet_care_estimate || 0 }
    ];

    const flexibleAllocations = [
      { name: 'Dining Out', amount: answers.dining_out_estimate || 0 },
      { name: 'Entertainment & Recreation', amount: answers.entertainment_estimate || 0 },
      { name: 'Shopping', amount: answers.shopping_estimate || 0 },
      { name: 'Unplanned Expenses', amount: answers.unplanned_expenses_estimate || 0 },
      { name: 'Gifts', amount: answers.gifts_estimate || 0 },
      { name: 'Fun Money', amount: answers.fun_money_estimate || 0 },
      { name: 'Bank Fees / Charges', amount: answers.bank_fees_charges_estimate || 0 },
      { name: 'Subscriptions', amount: answers.subscriptions_estimate || 0 }
    ];

    if (answers.first_wins) {
      await ensureCategory(fixedSection.id, 'Rent/Mortgage');
      await ensureCategory(fixedSection.id, 'Utilities');
      await ensureCategory(fixedSection.id, 'Transportation');
      await ensureCategory(variableSection.id, 'Groceries');
    }

    const variableTotal = variableAllocations.reduce((sum, item) => sum + item.amount, 0);
    if (variableTotal > 0) {
      await budgetsStore.setAllocation(currentMonth, {
        section_id: variableSection.id,
        allocated_amount: variableTotal,
        rollup_mode: true,
      });
    }

    const flexibleTotal = flexibleAllocations.reduce((sum, item) => sum + item.amount, 0);
    if (flexibleTotal > 0) {
      await budgetsStore.setAllocation(currentMonth, {
        section_id: flexSection.id,
        allocated_amount: flexibleTotal,
        rollup_mode: true,
      });
    }

    // 6. Save Extra Money preferences (if provided)
    if (answers.extra_money_percentages) {
      try {
        await api.post('/extra-money/preferences', answers.extra_money_percentages);
      } catch (error) {
        console.error('Error saving extra money preferences:', error);
        // Don't fail the wizard if this fails - preferences can be set later
      }
    }

    // Refresh budget to show everything
    await budgetsStore.fetchBudgetSummary(currentMonth);
  } catch (error) {
    console.error('Error creating budget from wizard:', error);
    alert('There was an error creating your budget. Please try again.');
  }
}

async function applyBalanceAssignments() {
  const assignments = wizardStore.answers.balance_assignments;

  if (!assignments || Object.keys(assignments).length === 0) {
    // No assignments to apply - user skipped this step
    return;
  }

  try {
    // Send each assignment to the backend API
    for (const [categoryId, amount] of Object.entries(assignments)) {
      if (amount > 0) {
        await api.post('/budgets/assign-account-balance', {
          category_id: categoryId,
          amount: amount,
        });
      }
    }

    // Refresh budget to show updated assignments
    const currentMonth = new Date().toISOString().slice(0, 7);
    await budgetsStore.fetchBudgetSummary(currentMonth);
  } catch (error) {
    console.error('Error applying balance assignments:', error);
    alert('There was an error assigning your account balances. Please try again.');
    throw error;
  }
}

async function markWizardComplete() {
  if (wizardCompletionSynced.value || authStore.user?.setupWizardCompleted) {
    return;
  }

  try {
    await api.patch('/households/setup-wizard');
    if (authStore.user) {
      authStore.user.setupWizardCompleted = true;
    }
    wizardCompletionSynced.value = true;
  } catch (error) {
    console.error('Failed to mark setup wizard complete:', error);
  }
}

async function completeWizard() {
  try {
    await markWizardComplete();
  } finally {
    wizardStore.markComplete();
    if (!localStorage.getItem('msyft_first_budget_complete')) {
      localStorage.setItem('msyft_first_budget_complete', 'true');
      celebrationStore.show('First budget created!', '🎉');
    }
    router.push('/budget');
  }
}

async function handleLogout() {
  await authStore.logout();
  wizardStore.reset();
  router.push('/login');
}

onMounted(() => {
  wizardStore.loadProgress();
});

watch(
  () => wizardStore.currentStep,
  async (step) => {
    if (step === 11) {
      await markWizardComplete();
    }
  }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
