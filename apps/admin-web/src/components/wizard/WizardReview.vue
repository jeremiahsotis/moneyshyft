<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="text-center mb-8">
      <div class="text-5xl mb-3">✨</div>
      <div class="flex items-center justify-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          Let's review what we've got!
        </h2>
        <InfoTooltip text="Confirm your inputs before we create your budget." />
      </div>
      <p class="text-gray-600">
        Here's a summary of your budget. We're about to create everything for you.
      </p>
    </div>

    <!-- Income Summary -->
    <div v-if="answers.income_sources && answers.income_sources.length > 0" class="mb-6 p-4 border border-gray-200 rounded-lg">
      <h3 class="font-semibold text-gray-900 mb-3 flex items-center">
        <span class="mr-2">💰</span>
        Monthly Income
      </h3>
      <div class="space-y-2">
        <div
          v-for="(source, index) in answers.income_sources"
          :key="index"
          class="flex justify-between text-sm"
        >
          <span class="text-gray-700">{{ source.name }}</span>
          <span class="font-medium">{{ formatCurrency(source.monthly_amount) }}</span>
        </div>
        <div class="pt-2 border-t border-gray-200 flex justify-between font-semibold">
          <span>Total Income:</span>
          <span class="text-primary-600">{{ formatCurrency(totalIncome) }}</span>
        </div>
      </div>
    </div>

    <!-- Expenses Summary -->
    <div class="mb-6 p-4 border border-gray-200 rounded-lg">
      <h3 class="font-semibold text-gray-900 mb-3">Monthly Expenses</h3>
      <div class="space-y-2 text-sm">
        <div v-if="answers.housing_amount" class="flex justify-between">
          <span class="text-gray-700">
            <span class="mr-2">🏠</span>
            {{ answers.housing_type === 'rent' ? 'Rent' : 'Mortgage' }}
          </span>
          <span class="font-medium">{{ formatCurrency(answers.housing_amount) }}</span>
        </div>
        <div v-if="answers.car_payments && answers.car_payments.length > 0" class="flex justify-between">
          <span class="text-gray-700"><span class="mr-2">🚗</span>Car Payment</span>
          <span class="font-medium">{{ formatCurrency(answers.car_payments.reduce((sum, p) => sum + p.amount, 0)) }}</span>
        </div>
        <div v-if="answers.car_insurance_amount" class="flex justify-between">
          <span class="text-gray-700"><span class="mr-2">🛡️</span>Car Insurance</span>
          <span class="font-medium">{{ formatCurrency(answers.car_insurance_amount) }}</span>
        </div>
        <div v-if="utilitiesTotal > 0" class="space-y-1">
          <div class="flex justify-between">
            <span class="text-gray-700"><span class="mr-2">💡</span>Utilities</span>
            <span class="font-medium">{{ formatCurrency(utilitiesTotal) }}</span>
          </div>
          <div v-if="utilitiesBreakdown.length > 0" class="pl-6 text-xs text-gray-500 space-y-1">
            <div
              v-for="(item, index) in utilitiesBreakdown"
              :key="index"
              class="flex justify-between"
            >
              <span>{{ item.label }}</span>
              <span>{{ formatCurrency(item.amount) }}</span>
            </div>
          </div>
        </div>
        <div v-if="totalDebtPayments > 0" class="flex justify-between">
          <span class="text-gray-700"><span class="mr-2">💳</span>Debt Payments</span>
          <span class="font-medium">{{ formatCurrency(totalDebtPayments) }}</span>
        </div>
        <div v-if="totalVariableExpenses > 0" class="flex justify-between">
          <span class="text-gray-700"><span class="mr-2">🧾</span>Variable Expenses</span>
          <span class="font-medium">{{ formatCurrency(totalVariableExpenses) }}</span>
        </div>
        <div v-if="totalFlexibleSpending > 0" class="flex justify-between">
          <span class="text-gray-700"><span class="mr-2">🛒</span>Flexible Spending</span>
          <span class="font-medium">{{ formatCurrency(totalFlexibleSpending) }}</span>
        </div>

        <div v-if="totalExpenses > 0" class="pt-2 border-t border-gray-200 flex justify-between font-semibold">
          <span>Total Expenses:</span>
          <span>{{ formatCurrency(totalExpenses) }}</span>
        </div>
      </div>
    </div>

    <!-- Budget Summary -->
    <div class="mb-6 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-200 rounded-lg">
      <div class="flex justify-between items-center text-lg font-bold">
        <span class="text-gray-900">Left to allocate:</span>
        <span :class="remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'">
          {{ formatCurrency(Math.abs(remainingAmount)) }}
        </span>
      </div>
      <p v-if="remainingAmount > 0" class="text-sm text-green-700 mt-2">
        💚 Great! You have money left over for savings or other goals.
      </p>
      <p v-else-if="remainingAmount < 0" class="text-sm text-red-700 mt-2">
        ⚠️ You’re planning more than your income. That’s okay—adjust a few categories or add income when it arrives.
      </p>
      <p v-else class="text-sm text-gray-700 mt-2">
        ✓ Your budget is perfectly balanced!
      </p>
    </div>

    <!-- Helper text -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        💡 <strong>Remember:</strong> This is just a starting point! You can adjust any of these amounts later as you track your actual spending.
      </p>
    </div>

    <!-- Navigation buttons -->
    <div class="flex gap-3 justify-between">
      <button
        @click="$emit('back')"
        class="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
      >
        ← Back to edit
      </button>

      <button
        @click="$emit('next')"
        class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
      >
        Create My Budget! →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import { computed } from 'vue';
import type { WizardAnswers } from '@/types';

const props = defineProps<{
  answers: Partial<WizardAnswers>;
}>();

defineEmits<{
  next: [];
  back: [];
}>();

const totalIncome = computed(() => {
  return props.answers.income_sources?.reduce((sum, s) => sum + s.monthly_amount, 0) || 0;
});

const totalDebtPayments = computed(() => {
  const ccPayments = props.answers.credit_card_debts?.reduce((sum: number, p: any) => sum + p.minimum_payment, 0) || 0;
  const otherPayments = props.answers.other_debts?.reduce((sum: number, p: any) => sum + p.minimum_payment, 0) || 0;
  return ccPayments + otherPayments;
});

const totalVariableExpenses = computed(() => {
  return (props.answers.groceries_estimate || 0) +
         (props.answers.gas_transportation_estimate || 0) +
         (props.answers.personal_care_estimate || 0) +
         (props.answers.charitable_giving_estimate || 0) +
         (props.answers.home_improvement_estimate || 0) +
         (props.answers.healthcare_medical_estimate || 0) +
         (props.answers.pet_care_estimate || 0);
});

const totalFlexibleSpending = computed(() => {
  return (props.answers.dining_out_estimate || 0) +
         (props.answers.entertainment_estimate || 0) +
         (props.answers.shopping_estimate || 0) +
         (props.answers.unplanned_expenses_estimate || 0) +
         (props.answers.gifts_estimate || 0) +
         (props.answers.fun_money_estimate || 0) +
         (props.answers.bank_fees_charges_estimate || 0) +
         (props.answers.subscriptions_estimate || 0);
});

const utilitiesBreakdown = computed(() => {
  if (props.answers.utilities_breakdown && props.answers.utilities_breakdown.length > 0) {
    return props.answers.utilities_breakdown;
  }

  const legacyItems = [];
  if (props.answers.utilities_estimate) {
    legacyItems.push({ label: 'Utilities', amount: props.answers.utilities_estimate });
  }
  if (props.answers.internet_phone_estimate) {
    legacyItems.push({ label: 'Internet & Phone', amount: props.answers.internet_phone_estimate });
  }
  return legacyItems;
});

const utilitiesTotal = computed(() => {
  return (props.answers.utilities_estimate || 0) +
         (props.answers.internet_phone_estimate || 0);
});

const totalExpenses = computed(() => {
  const carPayments = props.answers.car_payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const carInsurance = props.answers.car_insurance_payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  return (props.answers.housing_amount || 0) +
         carPayments +
         (carInsurance || props.answers.car_insurance_amount || 0) +
         utilitiesTotal.value +
         totalDebtPayments.value +
         totalVariableExpenses.value +
         totalFlexibleSpending.value;
});

const remainingAmount = computed(() => {
  return totalIncome.value - totalExpenses.value;
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
