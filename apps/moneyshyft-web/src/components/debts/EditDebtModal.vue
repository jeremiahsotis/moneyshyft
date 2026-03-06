<template>
  <div v-if="modelValue && debt" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">Edit Debt</h3>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition"
          >
            <span class="text-2xl">&times;</span>
          </button>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-4">
        <!-- Debt Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Debt Name <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g., Chase Visa, Car Loan"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <!-- Debt Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Debt Type <span class="text-red-500">*</span>
          </label>
          <select
            v-model="form.debt_type"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select type...</option>
            <option value="credit_card">💳 Credit Card</option>
            <option value="auto_loan">🚗 Auto Loan</option>
            <option value="student_loan">🎓 Student Loan</option>
            <option value="personal_loan">💼 Personal Loan</option>
            <option value="mortgage">🏠 Mortgage</option>
            <option value="medical">🏥 Medical Debt</option>
            <option value="other">💰 Other</option>
          </select>
        </div>

        <!-- Current Balance -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Current Balance <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">$</span>
            <input
              v-model.number="form.current_balance"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <p class="text-xs text-gray-600 mt-1">💡 Update this manually or use payment tracking</p>
        </div>

        <!-- Interest Rate -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (APR %) <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model.number="form.interest_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <span class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>

        <!-- Minimum Payment -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Minimum Monthly Payment <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">$</span>
            <input
              v-model.number="form.minimum_payment"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            v-model="form.notes"
            rows="3"
            placeholder="Add any additional details..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          ></textarea>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="closeModal"
            class="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDebtsStore } from '@/stores/debts';
import type { Debt, UpdateDebtData } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  debt: Debt | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  updated: [];
}>();

const debtsStore = useDebtsStore();
const isLoading = ref(false);
const error = ref<string | null>(null);

const form = ref<UpdateDebtData>({
  name: '',
  debt_type: undefined,
  current_balance: 0,
  interest_rate: 0,
  minimum_payment: 0,
  notes: '',
});

// Populate form when modal opens with debt data
watch(() => [props.modelValue, props.debt], ([newModelValue, newDebt]) => {
  if (newModelValue && newDebt && typeof newDebt === 'object' && 'id' in newDebt) {
    populateForm(newDebt as Debt);
  }
}, { immediate: true });

function populateForm(debt: Debt) {
  form.value = {
    name: debt.name,
    debt_type: debt.debt_type,
    current_balance: debt.current_balance,
    interest_rate: debt.interest_rate,
    minimum_payment: debt.minimum_payment,
    notes: debt.notes || '',
  };
  error.value = null;
}

function closeModal() {
  emit('update:modelValue', false);
}

async function handleSubmit() {
  if (!props.debt) return;

  error.value = null;
  isLoading.value = true;

  try {
    // Clean up the data before sending
    const data: UpdateDebtData = {
      name: form.value.name?.trim(),
      debt_type: form.value.debt_type,
      current_balance: form.value.current_balance,
      interest_rate: form.value.interest_rate,
      minimum_payment: form.value.minimum_payment,
    };

    // Handle notes separately (can be null)
    if (form.value.notes && form.value.notes.trim()) {
      data.notes = form.value.notes.trim();
    } else {
      data.notes = '';
    }

    await debtsStore.updateDebt(props.debt.id, data);
    emit('updated');
    closeModal();
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to update debt. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>
