<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <h2 class="text-3xl font-bold text-gray-900">
          Let's estimate your utilities 💡
        </h2>
        <InfoTooltip text="Add core bills so they are covered in your budget." />
      </div>
      <p class="text-gray-600">
        These are bills that keep your home running. Don't worry about being exact - estimates are fine!
      </p>
    </div>

    <!-- Utilities breakdown -->
    <div class="mb-6 space-y-4">
      <p class="text-sm text-gray-700">
        Pick the utilities you pay for, then add the monthly amount. We’ll roll them into one Utilities category.
      </p>

      <div class="space-y-3">
        <div
          v-for="utility in presetUtilities"
          :key="utility.key"
          class="flex items-center gap-3"
        >
          <input
            v-model="utility.enabled"
            type="checkbox"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span class="min-w-[140px] text-sm text-gray-700">{{ utility.label }}</span>
          <div class="relative flex-1">
            <span class="absolute left-3 top-3 text-gray-500">$</span>
            <input
              v-model.number="utility.amount"
              :disabled="!utility.enabled"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">Other utilities</span>
          <button
            type="button"
            @click="addCustomUtility"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add a utility
          </button>
        </div>

        <div v-if="customUtilities.length > 0" class="space-y-2">
          <div
            v-for="utility in customUtilities"
            :key="utility.id"
            class="flex items-center gap-3"
          >
            <input
              v-model="utility.label"
              type="text"
              placeholder="Utility name"
              class="w-full max-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div class="relative flex-1">
              <span class="absolute left-3 top-3 text-gray-500">$</span>
              <input
                v-model.number="utility.amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              type="button"
              @click="removeCustomUtility(utility.id)"
              class="text-sm text-gray-400 hover:text-gray-600"
            >
              Remove
            </button>
          </div>
        </div>

        <p v-else class="text-xs text-gray-500">
          Add anything like HOA utilities, propane, or bundled services.
        </p>
      </div>
    </div>

    <!-- Total display -->
    <div v-if="totalUtilities > 0" class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Total monthly utilities:</span>
        <span class="text-2xl font-bold text-primary-600">
          {{ formatCurrency(totalUtilities) }}
        </span>
      </div>
    </div>

    <!-- Helper text -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        💡 <strong>Utilities included in rent?</strong> Just put $0 for those! If you're not sure about amounts, make your best guess - you can always adjust later.
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
  next: [data: { utilities_estimate?: number; utilities_breakdown?: Array<{ label: string; amount: number }> }];
  back: [];
}>();

const wizardStore = useWizardStore();

const presetUtilities = ref([
  { key: 'electric', label: 'Electric', enabled: false, amount: 0 },
  { key: 'gas', label: 'Gas', enabled: false, amount: 0 },
  { key: 'water', label: 'Water/Sewer', enabled: false, amount: 0 },
  { key: 'trash', label: 'Trash', enabled: false, amount: 0 },
  { key: 'internet', label: 'Internet', enabled: false, amount: 0 },
  { key: 'phone', label: 'Phone', enabled: false, amount: 0 },
  { key: 'streaming', label: 'Streaming', enabled: false, amount: 0 },
]);
const customUtilities = ref<Array<{ id: string; label: string; amount: number }>>([]);

onMounted(() => {
  // Pre-populate from stored answers if they exist
  if (wizardStore.answers.utilities_breakdown && wizardStore.answers.utilities_breakdown.length > 0) {
    const presetByLabel = new Map(presetUtilities.value.map((item) => [item.label.toLowerCase(), item]));
    wizardStore.answers.utilities_breakdown.forEach((item) => {
      const preset = presetByLabel.get(item.label.toLowerCase());
      if (preset) {
        preset.enabled = true;
        preset.amount = item.amount;
      } else {
        customUtilities.value.push({
          id: crypto.randomUUID(),
          label: item.label,
          amount: item.amount,
        });
      }
    });
  } else {
    if (wizardStore.answers.utilities_estimate) {
      customUtilities.value.push({
        id: crypto.randomUUID(),
        label: 'Utilities (combined)',
        amount: wizardStore.answers.utilities_estimate,
      });
    }
    if (wizardStore.answers.internet_phone_estimate) {
      customUtilities.value.push({
        id: crypto.randomUUID(),
        label: 'Internet & Phone',
        amount: wizardStore.answers.internet_phone_estimate,
      });
    }
  }
});

const totalUtilities = computed(() => {
  const presetTotal = presetUtilities.value.reduce((sum, item) => {
    return sum + (item.enabled ? (item.amount || 0) : 0);
  }, 0);
  const customTotal = customUtilities.value.reduce((sum, item) => sum + (item.amount || 0), 0);
  return presetTotal + customTotal;
});

function handleNext() {
  const breakdown = [
    ...presetUtilities.value
      .filter((item) => item.enabled && item.amount)
      .map((item) => ({ label: item.label, amount: item.amount })),
    ...customUtilities.value
      .filter((item) => item.label && item.amount)
      .map((item) => ({ label: item.label, amount: item.amount })),
  ];

  emit('next', {
    utilities_estimate: totalUtilities.value || undefined,
    utilities_breakdown: breakdown.length > 0 ? breakdown : undefined,
  });
}

function handleSkip() {
  emit('next', {});
}

function addCustomUtility(): void {
  customUtilities.value.push({
    id: crypto.randomUUID(),
    label: '',
    amount: 0,
  });
}

function removeCustomUtility(id: string): void {
  customUtilities.value = customUtilities.value.filter((item) => item.id !== id);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
