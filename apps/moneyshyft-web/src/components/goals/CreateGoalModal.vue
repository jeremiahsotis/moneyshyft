<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
    @click.self="$emit('update:modelValue', false)"
    data-testid="goal-create-modal"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <span class="mr-2">🎯</span>
            Create a New Goal
          </h2>
          <p class="text-gray-600 text-sm mt-1">
            Set a target and start saving for what matters most
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Goal Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Goal Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="goalData.name"
              type="text"
              placeholder="e.g., Emergency Fund, Vacation, New Car"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              data-testid="goal-name"
            />
          </div>

          <!-- Description -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              v-model="goalData.description"
              rows="2"
              placeholder="What's this goal for?"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="goal-description"
            ></textarea>
          </div>

          <!-- Target Amount -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Target Amount <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="goalData.target_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                data-testid="goal-target-amount"
              />
            </div>
          </div>

          <!-- Starting Amount -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Starting Amount (Optional)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="goalData.current_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="goal-starting-amount"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              💡 If you already have some money saved for this goal
            </p>
          </div>

          <!-- Target Date -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Target Date (Optional)
            </label>
            <input
              v-model="goalData.target_date"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="goal-target-date"
            />
            <p v-if="monthsRemaining > 0 && monthlyContribution > 0" class="text-xs text-primary-600 mt-1">
              💡 You'll need to save {{ formatCurrency(monthlyContribution) }}/month to reach this goal
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              @click="$emit('update:modelValue', false)"
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="goal-submit"
            >
              {{ isSubmitting ? 'Creating...' : 'Create Goal' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGoalsStore } from '@/stores/goals';
import type { CreateGoalData } from '@/types';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [];
}>();

const goalsStore = useGoalsStore();
const isSubmitting = ref(false);

const goalData = ref<CreateGoalData>({
  name: '',
  description: null,
  target_amount: 0,
  current_amount: 0,
  target_date: null,
});

const isValid = computed(() => {
  return goalData.value.name.trim() && goalData.value.target_amount > 0;
});

const monthsRemaining = computed(() => {
  if (!goalData.value.target_date) return 0;
  const target = new Date(goalData.value.target_date);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(0, months);
});

const monthlyContribution = computed(() => {
  if (monthsRemaining.value === 0) return 0;
  const remaining = (goalData.value.target_amount || 0) - (goalData.value.current_amount || 0);
  return remaining / monthsRemaining.value;
});

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    await goalsStore.createGoal({
      ...goalData.value,
      description: goalData.value.description || null,
      current_amount: goalData.value.current_amount || 0,
    });

    // Reset form
    goalData.value = {
      name: '',
      description: null,
      target_amount: 0,
      current_amount: 0,
      target_date: null,
    };

    emit('update:modelValue', false);
    emit('submit');
  } catch (error) {
    console.error('Failed to create goal:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
