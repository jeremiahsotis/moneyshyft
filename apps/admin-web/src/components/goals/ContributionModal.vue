<template>
  <div
    v-if="modelValue && goal"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
    @click.self="close"
    data-testid="goal-contribution-modal"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <span class="mr-2">💵</span>
            Add Contribution
          </h2>
          <p class="text-gray-600 text-sm mt-1">
            Add money to: <strong>{{ goal.name }}</strong>
          </p>
        </div>

        <!-- Goal Progress -->
        <div class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-700">Current Progress</span>
            <span class="font-semibold text-primary-700">
              {{ formatCurrency(goal.current_amount) }} / {{ formatCurrency(goal.target_amount) }}
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-primary-600 h-2 rounded-full transition-all"
              :style="{ width: Math.min((goal.current_amount / goal.target_amount) * 100, 100) + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-xs mt-1">
            <span class="text-primary-600 font-medium">
              {{ ((goal.current_amount / goal.target_amount) * 100).toFixed(1) }}%
            </span>
            <span class="text-gray-500">
              {{ formatCurrency(goal.target_amount - goal.current_amount) }} remaining
            </span>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Amount -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Contribution Amount <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="formData.amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                data-testid="goal-contribution-amount"
              />
            </div>
            <p v-if="newProgress" class="text-xs text-green-600 mt-1">
              💡 This will bring you to {{ formatCurrency(newTotal) }} ({{ newProgress.toFixed(1) }}%)
            </p>
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              v-model="formData.notes"
              rows="2"
              placeholder="e.g., Tax refund, Birthday money, etc."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="goal-contribution-notes"
            ></textarea>
          </div>

          <!-- Preview -->
          <div v-if="formData.amount > 0" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-900">
              <strong>Adding:</strong> {{ formatCurrency(formData.amount) }}
            </p>
            <p class="text-sm text-green-700 mt-1">
              <strong>New Total:</strong> {{ formatCurrency(newTotal) }} / {{ formatCurrency(goal.target_amount) }}
            </p>
            <p v-if="newTotal >= goal.target_amount" class="text-sm text-green-800 mt-2 font-semibold">
              🎉 This will complete your goal!
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              @click="close"
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="goal-contribution-submit"
            >
              {{ isSubmitting ? 'Adding...' : 'Add Contribution' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGoalsStore } from '@/stores/goals';
import type { Goal } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  goal: Goal | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  contributed: [];
}>();

const goalsStore = useGoalsStore();

const isSubmitting = ref(false);
const formData = ref({
  amount: 0,
  notes: '',
});

const newTotal = computed(() => {
  if (!props.goal) return 0;
  return Number(props.goal.current_amount) + (formData.value.amount || 0);
});

const newProgress = computed(() => {
  if (!props.goal || formData.value.amount <= 0) return null;
  return (newTotal.value / Number(props.goal.target_amount)) * 100;
});

const isValid = computed(() => {
  return formData.value.amount > 0;
});

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value || !props.goal) return;

  isSubmitting.value = true;
  try {
    await goalsStore.addContribution(props.goal.id, {
      amount: formData.value.amount,
      notes: formData.value.notes || undefined,
    });

    resetForm();
    emit('update:modelValue', false);
    emit('contributed');
  } catch (error) {
    console.error('Failed to add contribution:', error);
    alert('Failed to add contribution. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  formData.value = {
    amount: 0,
    notes: '',
  };
}

function close() {
  resetForm();
  emit('update:modelValue', false);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Reset form when modal opens
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    resetForm();
  }
});
</script>
