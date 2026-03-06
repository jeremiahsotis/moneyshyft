<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    @click.self="closeModal"
    data-testid="recurring-modal"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ isEdit ? 'Edit Recurring Transaction' : 'Create Recurring Transaction' }}
        </h2>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-4">
        <!-- Account -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Account <span class="text-red-500">*</span>
          </label>
          <select
            v-model="form.account_id"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            data-testid="recurring-account"
          >
            <option value="">Select an account</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <!-- Payee -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Payee <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.payee"
            type="text"
            required
            placeholder="e.g., Netflix, Rent, Electric Company"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            data-testid="recurring-payee"
          />
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Amount <span class="text-red-500">*</span>
          </label>
          <input
            v-model.number="form.amount"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            data-testid="recurring-amount"
          />
          <p class="text-xs text-gray-500 mt-1">
            Use negative for expenses, positive for income
          </p>
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            v-model="form.category_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            data-testid="recurring-category"
          >
            <option :value="null">Uncategorized</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Frequency -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Frequency <span class="text-red-500">*</span>
          </label>
          <select
            v-model="form.frequency"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            data-testid="recurring-frequency"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly (every 2 weeks)</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <!-- Start Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.start_date"
            type="date"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            data-testid="recurring-start-date"
          />
        </div>

        <!-- End Date -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <input
              v-model="hasEndDate"
              type="checkbox"
              id="has-end-date"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="has-end-date" class="text-sm font-medium text-gray-700">
              Set end date
            </label>
          </div>
          <input
            v-if="hasEndDate"
            v-model="form.end_date"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Optional notes..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          ></textarea>
        </div>

        <!-- Advanced Settings -->
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h3>

          <!-- Auto-post -->
          <div class="flex items-start gap-2 mb-3">
            <input
              v-model="form.auto_post"
              type="checkbox"
              id="auto-post"
              class="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              data-testid="recurring-auto-post"
            />
            <div>
              <label for="auto-post" class="text-sm font-medium text-gray-700">
                Auto-post transactions
              </label>
              <p class="text-xs text-gray-500">
                Automatically post approved transactions without manual review
              </p>
            </div>
          </div>

          <!-- Skip Weekends -->
          <div class="flex items-start gap-2 mb-3">
            <input
              v-model="form.skip_weekends"
              type="checkbox"
              id="skip-weekends"
              class="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <label for="skip-weekends" class="text-sm font-medium text-gray-700">
                Skip weekends
              </label>
              <p class="text-xs text-gray-500">
                Move weekend occurrences to Monday
              </p>
            </div>
          </div>

          <!-- Advance Notice Days -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Advance Notice: {{ form.advance_notice_days }} day{{ form.advance_notice_days !== 1 ? 's' : '' }}
            </label>
            <input
              v-model.number="form.advance_notice_days"
              type="range"
              min="0"
              max="30"
              class="w-full"
            />
            <p class="text-xs text-gray-500">
              Show pending transactions this many days before they're due
            </p>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="form.frequency && form.start_date" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="text-sm font-medium text-blue-900 mb-2">Next 5 Occurrences:</h4>
          <div class="text-sm text-blue-800 space-y-1">
            <div v-for="(date, index) in previewDates" :key="index">
              {{ index + 1 }}. {{ formatPreviewDate(date) }}
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {{ error }}
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
            data-testid="recurring-submit"
          >
            {{ isLoading ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAccountsStore } from '../../stores/accounts';
import { useCategoriesStore } from '../../stores/categories';
import { useRecurringStore } from '../../stores/recurring';
import type { RecurringTransaction, FrequencyType } from '../../types';

const props = defineProps<{
  modelValue: boolean;
  recurringTransaction?: RecurringTransaction | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();
const recurringStore = useRecurringStore();

const accounts = computed(() => accountsStore.accounts);
const categories = computed(() => categoriesStore.activeCategories);

const isEdit = computed(() => !!props.recurringTransaction);
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasEndDate = ref(false);

const form = ref({
  account_id: '',
  category_id: null as string | null,
  payee: '',
  amount: 0,
  notes: null as string | null,
  frequency: 'monthly' as FrequencyType,
  start_date: new Date().toISOString().split('T')[0],
  end_date: null as string | null,
  auto_post: false,
  skip_weekends: false,
  advance_notice_days: 3
});

// Preview dates
const previewDates = computed(() => {
  if (!form.value.frequency || !form.value.start_date) return [];

  const dates: string[] = [];
  let currentDate = new Date(form.value.start_date);

  for (let i = 0; i < 5; i++) {
    if (form.value.end_date && currentDate > new Date(form.value.end_date)) {
      break;
    }

    dates.push(currentDate.toISOString().split('T')[0]);

    // Calculate next occurrence
    switch (form.value.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }

    // Skip weekends if enabled
    if (form.value.skip_weekends) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) { // Sunday
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (dayOfWeek === 6) { // Saturday
        currentDate.setDate(currentDate.getDate() + 2);
      }
    }
  }

  return dates;
});

// Load accounts and categories on mount
onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    categoriesStore.fetchCategories()
  ]);
});

// Watch for changes to recurring transaction prop
watch(() => props.recurringTransaction, (newVal) => {
  if (newVal) {
    form.value = {
      account_id: newVal.account_id,
      category_id: newVal.category_id,
      payee: newVal.payee,
      amount: newVal.amount,
      notes: newVal.notes,
      frequency: newVal.frequency,
      start_date: newVal.start_date.split('T')[0],
      end_date: newVal.end_date ? newVal.end_date.split('T')[0] : null,
      auto_post: newVal.auto_post,
      skip_weekends: newVal.skip_weekends,
      advance_notice_days: newVal.advance_notice_days
    };
    hasEndDate.value = !!newVal.end_date;
  }
}, { immediate: true });

// Watch hasEndDate checkbox
watch(hasEndDate, (newVal) => {
  if (!newVal) {
    form.value.end_date = null;
  }
});

function formatPreviewDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

async function handleSubmit() {
  try {
    isLoading.value = true;
    error.value = null;

    if (isEdit.value && props.recurringTransaction) {
      await recurringStore.updateRecurring(props.recurringTransaction.id, form.value);
    } else {
      await recurringStore.createRecurring(form.value);
    }

    emit('saved');
    closeModal();
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to save recurring transaction';
  } finally {
    isLoading.value = false;
  }
}

function closeModal() {
  emit('update:modelValue', false);
  // Reset form
  form.value = {
    account_id: '',
    category_id: null,
    payee: '',
    amount: 0,
    notes: null,
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    auto_post: false,
    skip_weekends: false,
    advance_notice_days: 3
  };
  hasEndDate.value = false;
  error.value = null;
}
</script>
