<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
    @click.self="close"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <span class="mr-2">💰</span>
            {{ isEditing ? 'Edit Income Source' : 'Add Income Source' }}
          </h2>
          <p class="text-gray-600 text-sm mt-1">
            {{ isEditing ? 'Update your income source details' : 'Add a new source of monthly income' }}
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Income Source Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Income Source Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="e.g., Primary Job, Side Gig, Freelance"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <!-- Pay Frequency -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              How Often Do You Get Paid? <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.frequency"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="hourly">Hourly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly (every 2 weeks)</option>
              <option value="semimonthly">Semi-monthly (twice per month)</option>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <!-- Expected Pay Day (monthly) -->
          <div v-if="formData.frequency === 'monthly'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Expected pay day of month <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="formData.expected_day_of_month"
              type="number"
              min="1"
              max="31"
              placeholder="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p class="text-xs text-gray-500 mt-1">Used to recognize regular deposits.</p>
          </div>

          <!-- Last Payment Date (weekly/biweekly) -->
          <div v-if="formData.frequency === 'weekly' || formData.frequency === 'biweekly'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Last payment date <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.last_payment_date"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p class="text-xs text-gray-500 mt-1">Helps predict your next expected deposit.</p>
          </div>

          <!-- Amount Input (varies by frequency) -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              <span v-if="formData.frequency === 'hourly'">Hourly Rate</span>
              <span v-else-if="formData.frequency === 'weekly'">Weekly Pay</span>
              <span v-else-if="formData.frequency === 'biweekly'">Bi-weekly Pay</span>
              <span v-else-if="formData.frequency === 'semimonthly'">Semi-monthly Pay</span>
              <span v-else-if="formData.frequency === 'monthly'">Monthly Pay</span>
              <span v-else-if="formData.frequency === 'annually'">Annual Salary</span>
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="formData.amount"
                type="number"
                step="0.01"
                min="0"
                :placeholder="formData.frequency === 'hourly' ? '15.00' : '0.00'"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <p class="text-xs text-blue-600 font-medium mt-1">
              💡 Enter your <strong>net take-home pay</strong> (after taxes & deductions)
            </p>
          </div>

          <!-- Hours per Week (only for hourly) -->
          <div v-if="formData.frequency === 'hourly'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Hours per Week <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="formData.hours_per_week"
              type="number"
              step="0.5"
              min="0"
              max="168"
              placeholder="40"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p class="text-xs text-gray-500 mt-1">
              How many hours do you typically work each week?
            </p>
          </div>

          <!-- Monthly Conversion Preview -->
          <div v-if="monthlyAmount > 0" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-start gap-3">
              <span class="text-2xl">✓</span>
              <div class="flex-1">
                <p class="text-sm text-gray-700 mb-1">{{ conversionDescription }}</p>
                <p class="text-2xl font-bold text-green-700">
                  {{ formatCurrency(monthlyAmount) }}<span class="text-base font-normal text-gray-600">/month</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Notes (Optional) -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              v-model="formData.notes"
              rows="2"
              placeholder="Any additional details..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
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
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Income Source' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useIncomeStore } from '@/stores/income';
import type { IncomeSource } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  income: IncomeSource | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [];
}>();

const incomeStore = useIncomeStore();
const isSubmitting = ref(false);

const formData = ref({
  name: '',
  frequency: 'monthly' as 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually',
  amount: 0,
  hours_per_week: 40,
  expected_day_of_month: 1,
  last_payment_date: null as string | null,
  notes: '',
});

const isEditing = computed(() => props.income !== null);

// Convert entered amount to monthly
const monthlyAmount = computed(() => {
  const { frequency, amount, hours_per_week } = formData.value;

  if (!amount || amount <= 0) return 0;

  try {
    return convertToMonthly(amount, frequency, hours_per_week);
  } catch (error) {
    return 0;
  }
});

// Description of what the user entered
const conversionDescription = computed(() => {
  const { frequency, amount, hours_per_week } = formData.value;

  switch (frequency) {
    case 'hourly':
      return `$${amount.toFixed(2)}/hour × ${hours_per_week} hours/week`;
    case 'weekly':
      return `$${amount.toFixed(2)}/week`;
    case 'biweekly':
      return `$${amount.toFixed(2)} every 2 weeks`;
    case 'semimonthly':
      return `$${amount.toFixed(2)} twice per month`;
    case 'monthly':
      return `$${amount.toFixed(2)}/month`;
    case 'annually':
      return `$${amount.toFixed(2)}/year`;
    default:
      return '';
  }
});

const isValid = computed(() => {
  const isNameValid = formData.value.name.trim().length > 0;
  const isAmountValid = formData.value.amount > 0;
  const isHoursValid = formData.value.frequency !== 'hourly' || formData.value.hours_per_week > 0;
  const isExpectedDayValid = formData.value.frequency !== 'monthly' || (formData.value.expected_day_of_month >= 1 && formData.value.expected_day_of_month <= 31);
  const isLastPaymentValid = !['weekly', 'biweekly'].includes(formData.value.frequency) || !!formData.value.last_payment_date;

  return isNameValid && isAmountValid && isHoursValid && isExpectedDayValid && isLastPaymentValid && monthlyAmount.value > 0;
});

// Conversion helper (mirrors backend logic)
function convertToMonthly(
  amount: number,
  frequency: 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually',
  hoursPerWeek?: number
): number {
  switch (frequency) {
    case 'hourly':
      if (!hoursPerWeek || hoursPerWeek <= 0) {
        throw new Error('Hours per week required');
      }
      return Number((amount * hoursPerWeek * 52 / 12).toFixed(2));
    case 'weekly':
      return Number((amount * 52 / 12).toFixed(2));
    case 'biweekly':
      return Number((amount * 26 / 12).toFixed(2));
    case 'semimonthly':
      return Number((amount * 2).toFixed(2));
    case 'monthly':
      return Number(amount.toFixed(2));
    case 'annually':
      return Number((amount / 12).toFixed(2));
    default:
      throw new Error('Unknown frequency');
  }
}

// Watch for income prop changes to populate form
watch(() => props.income, (newIncome) => {
  if (newIncome) {
    // When editing, we only have the monthly amount, so default to monthly frequency
    formData.value = {
      name: newIncome.name,
      frequency: newIncome.frequency || 'monthly',
      amount: Number(newIncome.monthly_amount),
      hours_per_week: newIncome.hours_per_week ?? 40,
      expected_day_of_month: newIncome.expected_day_of_month ?? 1,
      last_payment_date: newIncome.last_payment_date ?? null,
      notes: newIncome.notes || '',
    };
  } else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  formData.value = {
    name: '',
    frequency: 'monthly',
    amount: 0,
    hours_per_week: 40,
    expected_day_of_month: 1,
    last_payment_date: null,
    notes: '',
  };
}

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    if (isEditing.value && props.income) {
      // Update existing income source
      await incomeStore.updateIncomeSource(props.income.id, {
        name: formData.value.name,
        monthly_amount: monthlyAmount.value,
        frequency: formData.value.frequency,
        expected_day_of_month: formData.value.frequency === 'monthly' ? formData.value.expected_day_of_month : null,
        hours_per_week: formData.value.frequency === 'hourly' ? formData.value.hours_per_week : null,
        last_payment_date: ['weekly', 'biweekly'].includes(formData.value.frequency) ? formData.value.last_payment_date : null,
        notes: formData.value.notes || undefined,
      });
    } else {
      // Create new income source
      await incomeStore.createIncomeSource({
        name: formData.value.name,
        monthly_amount: monthlyAmount.value,
        frequency: formData.value.frequency,
        expected_day_of_month: formData.value.frequency === 'monthly' ? formData.value.expected_day_of_month : null,
        hours_per_week: formData.value.frequency === 'hourly' ? formData.value.hours_per_week : null,
        last_payment_date: ['weekly', 'biweekly'].includes(formData.value.frequency) ? formData.value.last_payment_date : null,
        notes: formData.value.notes || undefined,
      });
    }

    resetForm();
    emit('update:modelValue', false);
    emit('submit');
  } catch (error) {
    console.error('Failed to save income source:', error);
    alert('Failed to save income source. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
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
</script>
