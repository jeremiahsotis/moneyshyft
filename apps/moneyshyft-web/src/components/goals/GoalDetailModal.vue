<template>
  <div
    v-if="modelValue && goal"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
    @click.self="$emit('update:modelValue', false)"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-gray-900 flex items-center">
                <span class="mr-2">🎯</span>
                {{ goal.name }}
              </h2>
              <p v-if="goal.description" class="text-gray-600 mt-1">
                {{ goal.description }}
              </p>
            </div>
            <button
              @click="$emit('update:modelValue', false)"
              class="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Progress Section -->
        <div class="mb-6 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Progress</span>
            <span class="text-sm font-bold text-primary-600">{{ progressPercent.toFixed(1) }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              class="bg-primary-600 h-3 rounded-full transition-all duration-300"
              :style="{ width: Math.min(progressPercent, 100) + '%' }"
            ></div>
          </div>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-xs text-gray-600">Current</p>
              <p class="text-lg font-bold text-gray-900">{{ formatCurrency(goal.current_amount) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Remaining</p>
              <p class="text-lg font-bold text-orange-600">{{ formatCurrency(remaining) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Target</p>
              <p class="text-lg font-bold text-primary-600">{{ formatCurrency(goal.target_amount) }}</p>
            </div>
          </div>
          <div v-if="goal.target_date" class="mt-3 pt-3 border-t border-primary-200 text-center">
            <p class="text-sm text-gray-700">
              Target Date: <span class="font-semibold">{{ formatDate(goal.target_date) }}</span>
            </p>
            <p v-if="goal.monthly_contribution_needed && goal.monthly_contribution_needed > 0" class="text-xs text-primary-600 mt-1">
              💡 Save {{ formatCurrency(goal.monthly_contribution_needed) }}/month to reach your goal
            </p>
          </div>
        </div>

        <!-- Add Contribution Form -->
        <div v-if="!goal.is_completed" class="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 class="font-semibold text-gray-900 mb-3">Add Contribution</h3>
          <form @submit.prevent="handleAddContribution">
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    v-model.number="contributionAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  v-model="contributionDate"
                  type="date"
                  :max="today"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>
            <div class="mt-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <input
                v-model="contributionNotes"
                type="text"
                placeholder="e.g., Birthday money, Bonus"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div class="mt-3 flex justify-end">
              <button
                type="submit"
                :disabled="isSubmitting || contributionAmount <= 0"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Adding...' : 'Add Contribution' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Completed Badge -->
        <div v-else class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p class="text-green-800 font-semibold">🎉 Goal Completed!</p>
          <p class="text-sm text-green-700 mt-1">Congratulations on reaching your goal!</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-between border-t pt-4">
          <button
            @click="handleDelete"
            class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Delete Goal
          </button>
          <button
            @click="$emit('update:modelValue', false)"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGoalsStore } from '@/stores/goals';
import { useUndoStore } from '@/stores/undo';
import type { Goal } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  goal: Goal | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  deleted: [];
}>();

const goalsStore = useGoalsStore();
const undoStore = useUndoStore();
const isSubmitting = ref(false);
const contributionAmount = ref(0);
const contributionDate = ref(new Date().toISOString().split('T')[0]);
const contributionNotes = ref('');

const today = new Date().toISOString().split('T')[0];

const progressPercent = computed(() => {
  if (!props.goal || props.goal.target_amount === 0) return 0;
  return (Number(props.goal.current_amount) / Number(props.goal.target_amount)) * 100;
});

const remaining = computed(() => {
  if (!props.goal) return 0;
  return Math.max(0, Number(props.goal.target_amount) - Number(props.goal.current_amount));
});

async function handleAddContribution() {
  if (!props.goal || isSubmitting.value || contributionAmount.value <= 0) return;

  isSubmitting.value = true;
  try {
    await goalsStore.addContribution(props.goal.id, {
      amount: contributionAmount.value,
      contribution_date: contributionDate.value,
      notes: contributionNotes.value || undefined,
    });

    // Reset form
    contributionAmount.value = 0;
    contributionNotes.value = '';
    contributionDate.value = new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Failed to add contribution:', error);
    alert('Failed to add contribution. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDelete() {
  if (!props.goal) return;

  if (!confirm(`Are you sure you want to delete "${props.goal.name}"? This action cannot be undone.`)) {
    return;
  }

  const goalId = props.goal.id;
  const goalName = props.goal.name;
  emit('update:modelValue', false);

  undoStore.schedule({
    message: `Deleting "${goalName}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await goalsStore.deleteGoal(goalId);
        emit('deleted');
      } catch (error) {
        console.error('Failed to delete goal:', error);
        alert('Failed to delete goal. Please try again.');
      }
    },
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
}

import { formatDate } from '@/utils/dateUtils';
</script>
