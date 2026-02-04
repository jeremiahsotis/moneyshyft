<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          How do you get around? 🚗
        </h2>
        <InfoTooltip text="Add transportation costs so you can plan for them." />
      </div>
      <p class="text-gray-600">
        Let's add any transportation costs you have each month.
      </p>
    </div>

    <!-- Car Payments -->
    <div class="mb-6 p-4 border border-gray-200 rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-900">
          Do you have car payment(s)?
        </label>
        <button
          @click="hasCarPayment = !hasCarPayment"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            hasCarPayment ? 'bg-primary-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition',
              hasCarPayment ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <div v-if="hasCarPayment" class="mt-4 space-y-3">
        <div
          v-for="(payment, index) in carPayments"
          :key="index"
          class="flex gap-3 items-start"
        >
          <div class="flex-1">
            <input
              v-model="payment.name"
              type="text"
              placeholder="Car name (e.g., Honda Civic)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div class="flex-1">
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="payment.amount"
                type="number"
                step="0.01"
                placeholder="Monthly payment"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <button
            v-if="carPayments.length > 1"
            @click="removeCarPayment(index)"
            class="mt-1 p-2 text-red-600 hover:bg-red-50 rounded"
          >
            🗑️
          </button>
        </div>

        <button
          @click="addCarPayment"
          class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition text-sm"
        >
          + Add another car
        </button>
        <p class="text-xs text-gray-500 mt-1">
          💡 Tip: Check your auto loan statement for the exact amount
        </p>
      </div>
    </div>

    <!-- Car Insurance -->
    <div class="mb-6 p-4 border border-gray-200 rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-900">
          Do you pay car insurance?
        </label>
        <button
          @click="hasCarInsurance = !hasCarInsurance"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            hasCarInsurance ? 'bg-primary-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition',
              hasCarInsurance ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <div v-if="hasCarInsurance" class="mt-4 space-y-3">
        <div
          v-for="(insurance, index) in carInsurancePayments"
          :key="index"
          class="flex gap-3 items-start"
        >
          <div class="flex-1">
            <input
              v-model="insurance.name"
              type="text"
              placeholder="Insurance for (e.g., Honda Civic)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div class="flex-1">
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="insurance.amount"
                type="number"
                step="0.01"
                placeholder="Monthly cost"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <button
            v-if="carInsurancePayments.length > 1"
            @click="removeCarInsurance(index)"
            class="mt-1 p-2 text-red-600 hover:bg-red-50 rounded"
          >
            🗑️
          </button>
        </div>

        <button
          @click="addCarInsurance"
          class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition text-sm"
        >
          + Add another vehicle's insurance
        </button>
        <p class="text-xs text-gray-500 mt-1">
          💡 Tip: If you pay every 6 months, divide by 6 to get the monthly amount
        </p>
      </div>
    </div>

    <!-- Helper text -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        💡 <strong>No car?</strong> That's fine! You can add costs for public transit, gas, or ride-sharing in the variable expenses section later.
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

const emit = defineEmits<{
  next: [data: {
    has_car_payment: boolean;
    car_payments?: Array<{ name: string; amount: number }>;
    has_car_insurance: boolean;
    car_insurance_payments?: Array<{ name: string; amount: number }>;
  }];
  back: [];
}>();

const wizardStore = useWizardStore();

const hasCarPayment = ref(false);
const carPayments = ref([{ name: '', amount: 0 }]);
const hasCarInsurance = ref(false);
const carInsurancePayments = ref([{ name: '', amount: 0 }]);

onMounted(() => {
  // Pre-populate from stored answers if they exist
  if (wizardStore.answers.has_car_payment !== undefined) {
    hasCarPayment.value = wizardStore.answers.has_car_payment;
  }
  if (wizardStore.answers.car_payments && wizardStore.answers.car_payments.length > 0) {
    carPayments.value = wizardStore.answers.car_payments.map(p => ({ ...p }));
  }
  if (wizardStore.answers.has_car_insurance !== undefined) {
    hasCarInsurance.value = wizardStore.answers.has_car_insurance;
  }
  if (wizardStore.answers.car_insurance_payments && wizardStore.answers.car_insurance_payments.length > 0) {
    carInsurancePayments.value = wizardStore.answers.car_insurance_payments.map(p => ({ ...p }));
  }
});

function addCarPayment() {
  carPayments.value.push({ name: '', amount: 0 });
}

function removeCarPayment(index: number) {
  carPayments.value.splice(index, 1);
}

function addCarInsurance() {
  carInsurancePayments.value.push({ name: '', amount: 0 });
}

function removeCarInsurance(index: number) {
  carInsurancePayments.value.splice(index, 1);
}

function handleNext() {
  const validCarPayments = hasCarPayment.value
    ? carPayments.value.filter(p => p.name.trim() && p.amount > 0)
    : undefined;

  const validInsurancePayments = hasCarInsurance.value
    ? carInsurancePayments.value.filter(p => p.name.trim() && p.amount > 0)
    : undefined;

  emit('next', {
    has_car_payment: hasCarPayment.value,
    car_payments: validCarPayments,
    has_car_insurance: hasCarInsurance.value,
    car_insurance_payments: validInsurancePayments,
  });
}

function handleSkip() {
  emit('next', {
    has_car_payment: false,
    has_car_insurance: false,
  });
}
</script>
