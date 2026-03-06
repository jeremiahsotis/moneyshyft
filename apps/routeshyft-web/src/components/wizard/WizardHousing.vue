<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          Let's talk about housing 🏠
        </h2>
        <InfoTooltip text="Estimate housing costs so your essentials are covered first." />
      </div>
      <p class="text-gray-600">
        This is usually the biggest monthly expense. Do you rent, own, or have another arrangement?
      </p>
    </div>

    <!-- Housing Type Selection -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-3">
        What's your housing situation?
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          v-for="option in housingOptions"
          :key="option.value"
          @click="housingType = option.value"
          :class="[
            'p-4 border-2 rounded-lg text-left transition',
            housingType === option.value
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          <div class="text-2xl mb-1">{{ option.emoji }}</div>
          <div class="font-medium text-gray-900">{{ option.label }}</div>
          <div class="text-xs text-gray-600 mt-1">{{ option.description }}</div>
        </button>
      </div>
    </div>

    <!-- Amount Input (shown if rent or own) -->
    <div v-if="housingType === 'rent' || housingType === 'own'" class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Monthly {{ housingType === 'rent' ? 'rent' : 'mortgage' }} payment
      </label>
      <div class="relative">
        <span class="absolute left-3 top-3 text-gray-500">$</span>
        <input
          v-model.number="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      <p class="text-xs text-gray-500 mt-2">
        💡 Tip: Check your {{ housingType === 'rent' ? 'lease agreement' : 'mortgage statement' }} for the exact amount
      </p>
      <p v-if="amount >= 500 && amount < 1000" class="text-xs text-green-600 mt-1">
        ✓ Typical range for affordable housing
      </p>
      <p v-else-if="amount >= 1000 && amount < 2500" class="text-xs text-green-600 mt-1">
        ✓ Common range for average housing costs
      </p>
    </div>

    <!-- Helper text for "other" -->
    <div v-if="housingType === 'other'" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        That's great! You can skip this step for now and add any housing-related costs later if needed.
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
        :disabled="!isValid"
        class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
  next: [data: { housing_type: 'rent' | 'own' | 'other'; housing_amount?: number }];
  back: [];
}>();

const wizardStore = useWizardStore();

const housingType = ref<'rent' | 'own' | 'other'>('rent');
const amount = ref(0);

onMounted(() => {
  // Pre-populate from stored answers if they exist
  if (wizardStore.answers.housing_type) {
    housingType.value = wizardStore.answers.housing_type;
  }
  if (wizardStore.answers.housing_amount) {
    amount.value = wizardStore.answers.housing_amount;
  }
});

const housingOptions = [
  {
    value: 'rent' as const,
    emoji: '🏢',
    label: 'I rent',
    description: 'Apartment or house rental'
  },
  {
    value: 'own' as const,
    emoji: '🏡',
    label: 'I own',
    description: 'Mortgage payment'
  },
  {
    value: 'other' as const,
    emoji: '🤝',
    label: 'Other',
    description: 'Living with family, etc.'
  }
];

const isValid = computed(() => {
  if (housingType.value === 'other') return true;
  return amount.value > 0;
});

function handleNext() {
  const data: { housing_type: 'rent' | 'own' | 'other'; housing_amount?: number } = {
    housing_type: housingType.value
  };

  if (housingType.value !== 'other') {
    data.housing_amount = amount.value;
  }

  emit('next', data);
}

function handleSkip() {
  emit('next', { housing_type: 'other' });
}
</script>
