<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto" data-testid="split-modal">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="close"></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <!-- Header -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEdit ? 'Edit Split Transaction' : 'Split Transaction' }}
          </h3>
          <p class="text-sm text-gray-600 mt-1">
            Divide this transaction across multiple categories
          </p>
        </div>

        <!-- Parent Transaction Info (Read-only) -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Payee:</span>
              <span class="ml-2 font-medium">{{ transaction?.payee }}</span>
            </div>
            <div>
              <span class="text-gray-600">Total Amount:</span>
              <span class="ml-2 font-medium">${{ formatAmount(parentAbsoluteAmount) }}</span>
            </div>
            <div>
              <span class="text-gray-600">Date:</span>
              <span class="ml-2 font-medium">{{ formatDate(transaction?.transaction_date || '') }}</span>
            </div>
            <div>
              <span class="text-gray-600">Account:</span>
              <span class="ml-2 font-medium">{{ accountName }}</span>
            </div>
          </div>
        </div>

        <!-- Splits Form -->
        <form @submit.prevent="handleSubmit">
          <div class="mb-6">
            <div class="flex justify-between items-center mb-3">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Category Splits
                </label>
                <p class="text-xs text-gray-500 mt-1">
                  Enter positive amounts - the system will handle income/expense automatically
                </p>
              </div>
              <button
                type="button"
                @click="addSplit"
                class="text-sm text-primary-600 hover:text-primary-700 font-medium"
                data-testid="split-add"
              >
                + Add Split
              </button>
            </div>

            <!-- Split Rows -->
            <div class="space-y-3">
              <div
                v-for="(split, index) in splits"
                :key="index"
                class="flex gap-3 items-start p-3 bg-gray-50 rounded-lg"
              >
                <!-- Category -->
                <div class="flex-1">
                  <label :for="`category-${index}`" class="block text-xs text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    :id="`category-${index}`"
                    v-model="split.category_id"
                    required
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    data-testid="split-category"
                  >
                    <option value="">Select category...</option>
                    <optgroup
                      v-for="section in categoriesBySection"
                      :key="section.id"
                      :label="section.name"
                    >
                      <option
                        v-for="category in section.categories"
                        :key="category.id"
                        :value="category.id"
                      >
                        {{ category.name }}
                      </option>
                    </optgroup>
                  </select>
                </div>

                <!-- Amount -->
                <div class="w-32">
                  <label :for="`amount-${index}`" class="block text-xs text-gray-600 mb-1">
                    Amount
                  </label>
                  <input
                    :id="`amount-${index}`"
                    v-model.number="split.amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                    data-testid="split-amount"
                    @keydown="(e) => {
                      // Prevent entering negative sign
                      if (e.key === '-' || e.key === 'Minus') {
                        e.preventDefault();
                      }
                    }"
                  />
                </div>

                <!-- Notes (Optional) -->
                <div class="flex-1">
                  <label :for="`notes-${index}`" class="block text-xs text-gray-600 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    :id="`notes-${index}`"
                    v-model="split.notes"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add notes..."
                    data-testid="split-notes"
                  />
                </div>

                <!-- Remove Button -->
                <button
                  type="button"
                  @click="removeSplit(index)"
                  :disabled="splits.length <= 2"
                  class="mt-6 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title="Remove split"
                  data-testid="split-remove"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Running Total and Validation -->
            <div class="mt-4 p-3 rounded-lg" :class="isValidSum ? 'bg-green-50' : 'bg-red-50'">
              <div class="flex justify-between items-center text-sm">
                <div>
                  <span class="text-gray-700">Total Allocated:</span>
                  <span class="ml-2 font-medium">${{ formatAmount(totalAllocated) }}</span>
                </div>
                <div>
                  <span class="text-gray-700">Remaining:</span>
                  <span
                    class="ml-2 font-medium"
                    :class="isValidSum ? 'text-green-600' : 'text-red-600'"
                  >
                    ${{ formatAmount(remaining) }}
                  </span>
                </div>
                <div>
                  <span v-if="isValidSum" class="flex items-center text-green-600">
                    <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    Valid
                  </span>
                  <span v-else class="flex items-center text-red-600">
                    <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    Invalid
                  </span>
                </div>
              </div>
            </div>

            <!-- Helper Button: Equal Split -->
            <div class="mt-3">
              <button
                type="button"
                @click="suggestEqualSplit"
                class="text-sm text-gray-600 hover:text-gray-700 underline"
                data-testid="split-equal"
              >
                Use equal split across {{ splits.length }} categories
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {{ errorMessage }}
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
              :disabled="!isValidSum || splits.length < 2 || isSubmitting"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="split-submit"
            >
              {{ isSubmitting ? 'Saving...' : (isEdit ? 'Update Splits' : 'Split Transaction') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Transaction, SplitData } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  transaction: Transaction | null;
  accountName: string;
  categoriesBySection: Array<{ id: string; name: string; categories: Array<{ id: string; name: string }> }>;
  isEdit?: boolean;
  existingSplits?: SplitData[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [splits: SplitData[]];
}>();

const splits = ref<SplitData[]>([]);
const isSubmitting = ref(false);
const errorMessage = ref('');

// Helper to get absolute amount of parent transaction
const parentAbsoluteAmount = computed(() => {
  return Math.abs(props.transaction?.amount || 0);
});

// Helper to determine if parent is income (positive) or expense (negative)
const parentSign = computed(() => {
  return (props.transaction?.amount || 0) >= 0 ? 1 : -1;
});

// Computed properties - work with absolute values for UX
const totalAllocated = computed(() => {
  return splits.value.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
});

const remaining = computed(() => {
  return parentAbsoluteAmount.value - totalAllocated.value;
});

const isValidSum = computed(() => {
  return Math.abs(remaining.value) < 0.01; // Allow for floating point precision
});

// Initialize splits when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    errorMessage.value = '';
    isSubmitting.value = false;

    if (props.isEdit && props.existingSplits && props.existingSplits.length > 0) {
      // Load existing splits for editing - convert to absolute values for user input
      splits.value = props.existingSplits.map(split => ({
        category_id: split.category_id,
        amount: Math.abs(split.amount), // Show as positive number
        notes: split.notes || ''
      }));
    } else {
      // Initialize with 2 empty splits
      splits.value = [
        { category_id: '', amount: 0, notes: '' },
        { category_id: '', amount: 0, notes: '' }
      ];
    }
  }
});

function addSplit() {
  splits.value.push({ category_id: '', amount: 0, notes: '' });
}

function removeSplit(index: number) {
  if (splits.value.length > 2) {
    splits.value.splice(index, 1);
  }
}

function suggestEqualSplit() {
  // Work with absolute value for UX
  const amount = parentAbsoluteAmount.value;
  const equalAmount = Math.round((amount / splits.value.length) * 100) / 100;
  const remainder = amount - (equalAmount * splits.value.length);

  splits.value.forEach((split, index) => {
    // Add remainder to the last split to ensure exact sum
    // All values stay positive - sign will be applied on submit
    split.amount = index === splits.value.length - 1
      ? equalAmount + remainder
      : equalAmount;
  });
}

function formatAmount(amount: number): string {
  return Math.abs(amount).toFixed(2);
}

import { formatDate } from '@/utils/dateUtils';


function close() {
  emit('update:modelValue', false);
}

async function handleSubmit() {
  if (!isValidSum.value) {
    errorMessage.value = 'Split amounts must equal the transaction amount';
    return;
  }

  if (splits.value.length < 2) {
    errorMessage.value = 'At least 2 splits are required';
    return;
  }

  // Validate all splits have categories
  const hasEmptyCategory = splits.value.some(split => !split.category_id);
  if (hasEmptyCategory) {
    errorMessage.value = 'All splits must have a category selected';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    // Clean up splits data and apply the parent transaction's sign
    // User enters positive numbers, but we need to match parent's sign (negative for expenses)
    const cleanedSplits = splits.value.map(split => ({
      category_id: split.category_id,
      amount: Number(split.amount) * parentSign.value, // Apply sign here!
      notes: split.notes?.trim() || null
    }));

    emit('submit', cleanedSplits);
    close();
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to save splits';
    isSubmitting.value = false;
  }
}
</script>
