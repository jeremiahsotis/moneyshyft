<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          Let's talk about debt payments 💳
        </h2>
        <InfoTooltip text="Optional: add debts so payments are part of your plan." />
      </div>
      <p class="text-gray-600">
        Many people have debt - it's nothing to feel bad about. Tracking it helps you make progress on paying it off.
      </p>
    </div>

    <!-- Credit Card Debt -->
    <div class="mb-6 p-4 border border-gray-200 rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-900">
          Do you have credit card debt you're paying off?
        </label>
        <button
          @click="hasCreditCardDebt = !hasCreditCardDebt"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            hasCreditCardDebt ? 'bg-primary-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition',
              hasCreditCardDebt ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <div v-if="hasCreditCardDebt" class="mt-4 space-y-4">
        <div
          v-for="(debt, index) in creditCardDebts"
          :key="index"
          class="p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div class="flex justify-between items-center mb-3">
            <span class="text-sm font-medium text-gray-700">Card {{ index + 1 }}</span>
            <button
              v-if="creditCardDebts.length > 1"
              @click="removeCreditCardDebt(index)"
              class="text-red-600 hover:bg-red-50 rounded p-1 text-sm"
            >
              🗑️ Remove
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Card Name -->
            <div class="col-span-2">
              <input
                v-model="debt.name"
                type="text"
                placeholder="Card name (e.g., Chase Visa)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <!-- Current Balance -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">Current Balance</label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  v-model.number="debt.current_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <!-- Interest Rate -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">APR %</label>
              <div class="relative">
                <input
                  v-model.number="debt.interest_rate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span class="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>

            <!-- Minimum Payment -->
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">Minimum Monthly Payment</label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  v-model.number="debt.minimum_payment"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          @click="addCreditCardDebt"
          class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition text-sm font-medium"
        >
          + Add another card
        </button>
      </div>
    </div>

    <!-- Other Debt -->
    <div class="mb-6 p-4 border border-gray-200 rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-900">
          Do you have other debt? (student loans, personal loans, etc.)
        </label>
        <button
          @click="hasOtherDebt = !hasOtherDebt"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            hasOtherDebt ? 'bg-primary-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition',
              hasOtherDebt ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <div v-if="hasOtherDebt" class="mt-4 space-y-4">
        <div
          v-for="(debt, index) in otherDebts"
          :key="index"
          class="p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div class="flex justify-between items-center mb-3">
            <span class="text-sm font-medium text-gray-700">Debt {{ index + 1 }}</span>
            <button
              v-if="otherDebts.length > 1"
              @click="removeOtherDebt(index)"
              class="text-red-600 hover:bg-red-50 rounded p-1 text-sm"
            >
              🗑️ Remove
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Debt Name -->
            <div class="col-span-2">
              <input
                v-model="debt.name"
                type="text"
                placeholder="Debt name (e.g., Student Loan, Car Loan)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <!-- Debt Type -->
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">Debt Type</label>
              <select
                v-model="debt.debt_type"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="student_loan">🎓 Student Loan</option>
                <option value="auto_loan">🚗 Auto Loan</option>
                <option value="personal_loan">💼 Personal Loan</option>
                <option value="mortgage">🏠 Mortgage</option>
                <option value="medical">🏥 Medical Debt</option>
                <option value="other">💰 Other</option>
              </select>
            </div>

            <!-- Current Balance -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">Current Balance</label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  v-model.number="debt.current_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <!-- Interest Rate -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">APR %</label>
              <div class="relative">
                <input
                  v-model.number="debt.interest_rate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span class="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>

            <!-- Minimum Payment -->
            <div class="col-span-2">
              <label class="block text-xs text-gray-600 mb-1">Minimum Monthly Payment</label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  v-model.number="debt.minimum_payment"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          @click="addOtherDebt"
          class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition text-sm font-medium"
        >
          + Add another debt
        </button>
      </div>
    </div>

    <!-- Helper text -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        💡 <strong>Remember:</strong> Tracking your debt payments helps you see progress over time. Every payment is progress.
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
import { ref, onMounted } from 'vue';
import { useWizardStore } from '@/stores/wizard';

interface DebtData {
  name: string;
  debt_type: string;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
}

const emit = defineEmits<{
  next: [data: {
    has_credit_card_debt: boolean;
    credit_card_debts?: DebtData[];
    has_other_debt: boolean;
    other_debts?: DebtData[];
  }];
  back: [];
}>();

const wizardStore = useWizardStore();

const hasCreditCardDebt = ref(false);
const creditCardDebts = ref<DebtData[]>([{
  name: '',
  debt_type: 'credit_card',
  current_balance: 0,
  interest_rate: 0,
  minimum_payment: 0,
}]);

const hasOtherDebt = ref(false);
const otherDebts = ref<DebtData[]>([{
  name: '',
  debt_type: 'student_loan',
  current_balance: 0,
  interest_rate: 0,
  minimum_payment: 0,
}]);

onMounted(() => {
  // Pre-populate from stored answers if they exist
  if (wizardStore.answers.has_credit_card_debt !== undefined) {
    hasCreditCardDebt.value = wizardStore.answers.has_credit_card_debt;
  }
  if (wizardStore.answers.credit_card_debts && wizardStore.answers.credit_card_debts.length > 0) {
    creditCardDebts.value = wizardStore.answers.credit_card_debts.map(d => ({ ...d }));
  }
  if (wizardStore.answers.has_other_debt !== undefined) {
    hasOtherDebt.value = wizardStore.answers.has_other_debt;
  }
  if (wizardStore.answers.other_debts && wizardStore.answers.other_debts.length > 0) {
    otherDebts.value = wizardStore.answers.other_debts.map(d => ({ ...d }));
  }
});

function addCreditCardDebt() {
  creditCardDebts.value.push({
    name: '',
    debt_type: 'credit_card',
    current_balance: 0,
    interest_rate: 0,
    minimum_payment: 0,
  });
}

function removeCreditCardDebt(index: number) {
  creditCardDebts.value.splice(index, 1);
}

function addOtherDebt() {
  otherDebts.value.push({
    name: '',
    debt_type: 'student_loan',
    current_balance: 0,
    interest_rate: 0,
    minimum_payment: 0,
  });
}

function removeOtherDebt(index: number) {
  otherDebts.value.splice(index, 1);
}

function handleNext() {
  const validCreditCardDebts = hasCreditCardDebt.value
    ? creditCardDebts.value.filter(d =>
        d.name.trim() &&
        d.current_balance > 0 &&
        d.interest_rate >= 0 &&
        d.minimum_payment > 0
      )
    : undefined;

  const validOtherDebts = hasOtherDebt.value
    ? otherDebts.value.filter(d =>
        d.name.trim() &&
        d.current_balance > 0 &&
        d.interest_rate >= 0 &&
        d.minimum_payment > 0
      )
    : undefined;

  emit('next', {
    has_credit_card_debt: hasCreditCardDebt.value,
    credit_card_debts: validCreditCardDebts,
    has_other_debt: hasOtherDebt.value,
    other_debts: validOtherDebts,
  });
}

function handleSkip() {
  emit('next', {
    has_credit_card_debt: false,
    has_other_debt: false,
  });
}
</script>
