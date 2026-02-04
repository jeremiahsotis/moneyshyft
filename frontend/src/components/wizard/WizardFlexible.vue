<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          Everyday expenses 🧾
        </h2>
        <InfoTooltip text="Variable expenses are essentials that change month-to-month. Flexible spending is discretionary." />
      </div>
      <p class="text-gray-600">
        Add estimates for essentials and discretionary spending. You'll track real spending later.
      </p>
    </div>

    <!-- Variable Expenses -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Variable Expenses (needs)</h3>

      <!-- Groceries -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Groceries & household items
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="groceriesEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-xs text-gray-500 mt-2">
          💡 Tip: Think about weekly shopping trips - multiply by 4 for the month
        </p>
      </div>

      <!-- Gas & Transportation -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Gas & transportation
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="gasTransportationEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-xs text-gray-500 mt-2">
          💡 Tip: Fuel, transit passes, rideshare, parking
        </p>
      </div>

      <!-- Personal Care -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Personal care
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="personalCareEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-xs text-gray-500 mt-2">
          💡 Tip: Haircuts, toiletries, self-care essentials
        </p>
      </div>

      <!-- Charitable Giving -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Charitable giving
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="charitableGivingEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Home Improvement / Maintenance -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Home improvement / maintenance
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="homeImprovementEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Healthcare / Medical Expenses -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Healthcare / medical expenses
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="healthcareMedicalEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Pet Care -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Pet care
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="petCareEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Variable Total -->
      <div v-if="totalVariable > 0" class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Total variable expenses:</span>
          <span class="text-2xl font-bold text-primary-600">
            {{ formatCurrency(totalVariable) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Flexible Spending -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Flexible Spending (wants)</h3>

      <!-- Dining Out -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Dining out & takeout
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="diningOutEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p class="text-xs text-gray-500 mt-2">
          💡 Tip: Restaurants, coffee shops, delivery
        </p>
      </div>

      <!-- Entertainment & Recreation -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Entertainment & recreation
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="entertainmentEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Shopping -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Shopping
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="shoppingEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Unplanned Expenses -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Unplanned expenses
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="unplannedExpensesEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Gifts -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Gifts
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="giftsEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Fun Money -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Fun money
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="funMoneyEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Bank Fees / Charges -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Bank fees / charges
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="bankFeesChargesEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Subscriptions -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Subscriptions
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-gray-500">$</span>
          <input
            v-model.number="subscriptionsEstimate"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <!-- Flexible Total -->
      <div v-if="totalFlexible > 0" class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Total flexible spending:</span>
          <span class="text-2xl font-bold text-primary-600">
            {{ formatCurrency(totalFlexible) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Combined Total -->
    <div v-if="totalCombined > 0" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Total variable + flexible:</span>
        <span class="text-2xl font-bold text-blue-700">
          {{ formatCurrency(totalCombined) }}
        </span>
      </div>
    </div>

    <!-- Helper text -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        💡 <strong>Not sure?</strong> Look at your last month's bank or credit card statements to see what you actually spent. These are estimates - you'll track real spending as you go!
      </p>
    </div>

    <!-- Navigation buttons -->
    <div class="flex gap-3 justify-between">
      <button
        @click="$emit('back')"
        class="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
      >
        ← Back
      </button>

      <button
        @click="handleNext"
        class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
      >
        Continue →
      </button>
    </div>

    <!-- Skip option -->
    <div class="mt-4 text-center">
      <button
        @click="handleSkip"
        class="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Not now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import { ref, computed, onMounted } from 'vue';
import { useWizardStore } from '@/stores/wizard';

const emit = defineEmits<{
  next: [data: {
    groceries_estimate?: number;
    gas_transportation_estimate?: number;
    personal_care_estimate?: number;
    charitable_giving_estimate?: number;
    home_improvement_estimate?: number;
    healthcare_medical_estimate?: number;
    pet_care_estimate?: number;
    dining_out_estimate?: number;
    entertainment_estimate?: number;
    shopping_estimate?: number;
    unplanned_expenses_estimate?: number;
    gifts_estimate?: number;
    fun_money_estimate?: number;
    bank_fees_charges_estimate?: number;
    subscriptions_estimate?: number;
  }];
  back: [];
}>();

const wizardStore = useWizardStore();

const groceriesEstimate = ref(0);
const gasTransportationEstimate = ref(0);
const personalCareEstimate = ref(0);
const charitableGivingEstimate = ref(0);
const homeImprovementEstimate = ref(0);
const healthcareMedicalEstimate = ref(0);
const petCareEstimate = ref(0);

const diningOutEstimate = ref(0);
const entertainmentEstimate = ref(0);
const shoppingEstimate = ref(0);
const unplannedExpensesEstimate = ref(0);
const giftsEstimate = ref(0);
const funMoneyEstimate = ref(0);
const bankFeesChargesEstimate = ref(0);
const subscriptionsEstimate = ref(0);

onMounted(() => {
  // Pre-populate from stored answers if they exist
  if (wizardStore.answers.groceries_estimate) {
    groceriesEstimate.value = wizardStore.answers.groceries_estimate;
  }
  if (wizardStore.answers.gas_transportation_estimate) {
    gasTransportationEstimate.value = wizardStore.answers.gas_transportation_estimate;
  }
  if (wizardStore.answers.personal_care_estimate) {
    personalCareEstimate.value = wizardStore.answers.personal_care_estimate;
  }
  if (wizardStore.answers.charitable_giving_estimate) {
    charitableGivingEstimate.value = wizardStore.answers.charitable_giving_estimate;
  }
  if (wizardStore.answers.home_improvement_estimate) {
    homeImprovementEstimate.value = wizardStore.answers.home_improvement_estimate;
  }
  if (wizardStore.answers.healthcare_medical_estimate) {
    healthcareMedicalEstimate.value = wizardStore.answers.healthcare_medical_estimate;
  }
  if (wizardStore.answers.pet_care_estimate) {
    petCareEstimate.value = wizardStore.answers.pet_care_estimate;
  }
  if (wizardStore.answers.dining_out_estimate) {
    diningOutEstimate.value = wizardStore.answers.dining_out_estimate;
  }
  if (wizardStore.answers.entertainment_estimate) {
    entertainmentEstimate.value = wizardStore.answers.entertainment_estimate;
  }
  if (wizardStore.answers.shopping_estimate) {
    shoppingEstimate.value = wizardStore.answers.shopping_estimate;
  }
  if (wizardStore.answers.unplanned_expenses_estimate) {
    unplannedExpensesEstimate.value = wizardStore.answers.unplanned_expenses_estimate;
  }
  if (wizardStore.answers.gifts_estimate) {
    giftsEstimate.value = wizardStore.answers.gifts_estimate;
  }
  if (wizardStore.answers.fun_money_estimate) {
    funMoneyEstimate.value = wizardStore.answers.fun_money_estimate;
  }
  if (wizardStore.answers.bank_fees_charges_estimate) {
    bankFeesChargesEstimate.value = wizardStore.answers.bank_fees_charges_estimate;
  }
  if (wizardStore.answers.subscriptions_estimate) {
    subscriptionsEstimate.value = wizardStore.answers.subscriptions_estimate;
  }
});

const totalVariable = computed(() => {
  return (groceriesEstimate.value || 0) +
         (gasTransportationEstimate.value || 0) +
         (personalCareEstimate.value || 0) +
         (charitableGivingEstimate.value || 0) +
         (homeImprovementEstimate.value || 0) +
         (healthcareMedicalEstimate.value || 0) +
         (petCareEstimate.value || 0);
});

const totalFlexible = computed(() => {
  return (diningOutEstimate.value || 0) +
         (entertainmentEstimate.value || 0) +
         (shoppingEstimate.value || 0) +
         (unplannedExpensesEstimate.value || 0) +
         (giftsEstimate.value || 0) +
         (funMoneyEstimate.value || 0) +
         (bankFeesChargesEstimate.value || 0) +
         (subscriptionsEstimate.value || 0);
});

const totalCombined = computed(() => totalVariable.value + totalFlexible.value);

function handleNext() {
  emit('next', {
    groceries_estimate: groceriesEstimate.value || undefined,
    gas_transportation_estimate: gasTransportationEstimate.value || undefined,
    personal_care_estimate: personalCareEstimate.value || undefined,
    charitable_giving_estimate: charitableGivingEstimate.value || undefined,
    home_improvement_estimate: homeImprovementEstimate.value || undefined,
    healthcare_medical_estimate: healthcareMedicalEstimate.value || undefined,
    pet_care_estimate: petCareEstimate.value || undefined,
    dining_out_estimate: diningOutEstimate.value || undefined,
    entertainment_estimate: entertainmentEstimate.value || undefined,
    shopping_estimate: shoppingEstimate.value || undefined,
    unplanned_expenses_estimate: unplannedExpensesEstimate.value || undefined,
    gifts_estimate: giftsEstimate.value || undefined,
    fun_money_estimate: funMoneyEstimate.value || undefined,
    bank_fees_charges_estimate: bankFeesChargesEstimate.value || undefined,
    subscriptions_estimate: subscriptionsEstimate.value || undefined,
  });
}

function handleSkip() {
  emit('next', {});
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
