<template>
  <div
    v-if="modelValue && debt"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
    data-testid="debt-detail-modal"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ getDebtIcon(debt.debt_type) }}</span>
            <div>
              <h3 class="text-xl font-bold text-gray-900">{{ debt.name }}</h3>
              <p class="text-sm text-gray-600">{{ getDebtTypeLabel(debt.debt_type) }}</p>
            </div>
          </div>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition"
          >
            <span class="text-2xl">&times;</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 space-y-6">
        <!-- Balance & Progress -->
        <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm text-gray-600 mb-1">Current Balance</p>
              <p class="text-3xl font-bold text-orange-600">{{ formatCurrency(debt.current_balance) }}</p>
            </div>
            <div v-if="debt.original_balance" class="text-right">
              <p class="text-sm text-gray-600 mb-1">Original Balance</p>
              <p class="text-lg font-semibold text-gray-700">{{ formatCurrency(debt.original_balance) }}</p>
            </div>
          </div>

          <!-- Progress Bar -->
          <div v-if="debt.original_balance && debt.original_balance > 0">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{{ progressPercent }}% paid off</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div
                class="bg-green-600 h-3 rounded-full transition-all"
                :style="{ width: progressPercent + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="debt.is_paid_off" class="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p class="text-green-800 font-semibold text-center">
              🎉 Paid Off on {{ formatDate(debt.paid_off_at!) }}
            </p>
          </div>
        </div>

        <!-- Debt Details Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-xs text-gray-600 mb-1">Interest Rate (APR)</p>
            <p class="text-xl font-bold text-red-600">{{ debt.interest_rate }}%</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-xs text-gray-600 mb-1">Minimum Payment</p>
            <p class="text-xl font-bold text-gray-900">{{ formatCurrency(debt.minimum_payment) }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="debt.notes" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm font-medium text-blue-900 mb-1">Notes:</p>
          <p class="text-sm text-blue-800">{{ debt.notes }}</p>
        </div>

        <!-- Add Payment Section (only if not paid off) -->
        <div v-if="!debt.is_paid_off" class="border-t border-gray-200 pt-6">
          <h4 class="text-lg font-semibold text-gray-900 mb-4">Record a Payment</h4>

          <form @submit.prevent="handleAddPayment" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Payment Amount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    v-model.number="paymentForm.amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                    class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    data-testid="debt-payment-amount"
                  />
                </div>
              </div>

              <!-- Payment Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="paymentForm.payment_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  data-testid="debt-payment-date"
                />
              </div>
            </div>

            <!-- Payment Account -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Payment Account <span class="text-red-500">*</span>
              </label>
              <select
                v-model="paymentForm.account_id"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="debt-payment-account"
              >
                <option value="">Select account...</option>
                <option
                  v-for="account in accountsStore.accounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.name }} ({{ formatCurrency(account.current_balance) }})
                </option>
              </select>
            </div>

            <!-- Payment Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <input
                v-model="paymentForm.notes"
                type="text"
                placeholder="e.g., Extra payment from bonus"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="debt-payment-notes"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isAddingPayment"
              class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="debt-payment-submit"
            >
              {{ isAddingPayment ? 'Recording Payment...' : 'Record Payment' }}
            </button>
          </form>
        </div>

        <!-- Payment History -->
        <div class="border-t border-gray-200 pt-6">
          <h4 class="text-lg font-semibold text-gray-900 mb-4">Payment History</h4>

          <div v-if="isLoadingPayments" class="text-center py-4">
            <p class="text-gray-500">Loading payments...</p>
          </div>

          <div v-else-if="payments.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
            <p class="text-gray-600">No payments recorded yet</p>
          </div>

          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="payment in payments"
              :key="payment.id"
              class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div>
                <p class="font-semibold text-gray-900">{{ formatCurrency(payment.amount) }}</p>
                <p class="text-sm text-gray-600">{{ formatDate(payment.payment_date) }}</p>
                <p v-if="payment.notes" class="text-xs text-gray-500 mt-1">{{ payment.notes }}</p>
              </div>
              <span class="text-green-600 text-xl">✓</span>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
        <div class="flex gap-3">
          <button
            @click="handleEdit"
            class="flex-1 px-4 py-2 text-primary-600 hover:bg-primary-50 border border-primary-600 rounded-lg transition font-medium"
          >
            Edit Debt
          </button>
          <button
            @click="handleDelete"
            :disabled="isDeleting"
            class="flex-1 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-600 rounded-lg transition font-medium disabled:opacity-50"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Debt' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useDebtsStore } from '@/stores/debts';
import { useAccountsStore } from '@/stores/accounts';
import { useTransactionsStore } from '@/stores/transactions';
import { useUndoStore } from '@/stores/undo';
import { useCelebrationStore } from '@/stores/celebration';
import type { Debt, DebtPayment, AddDebtPaymentData } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  debt: Debt | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  edit: [debt: Debt];
  deleted: [];
  updated: [];
}>();

const debtsStore = useDebtsStore();
const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();
const undoStore = useUndoStore();
const celebrationStore = useCelebrationStore();
const isAddingPayment = ref(false);
const isLoadingPayments = ref(false);
const isDeleting = ref(false);
const error = ref<string | null>(null);
const payments = ref<DebtPayment[]>([]);

const paymentForm = ref<AddDebtPaymentData>({
  amount: 0,
  payment_date: new Date().toISOString().slice(0, 10), // Today's date
  notes: '',
  account_id: '',  // NEW: Account to pay from
});

// Load accounts on component mount
onMounted(async () => {
  await accountsStore.fetchAccounts();
});

const progressPercent = computed(() => {
  if (!props.debt || !props.debt.original_balance || props.debt.original_balance === 0) {
    return 0;
  }
  const paid = props.debt.original_balance - props.debt.current_balance;
  return Math.min(Math.round((paid / props.debt.original_balance) * 100), 100);
});

// Load payment history when modal opens
watch(() => props.modelValue, async (newValue) => {
  if (newValue && props.debt) {
    await loadPaymentHistory();
    resetPaymentForm();
  }
});

async function loadPaymentHistory() {
  if (!props.debt) return;

  isLoadingPayments.value = true;
  error.value = null;
  try {
    payments.value = await debtsStore.getPaymentHistory(props.debt.id);
  } catch (err: any) {
    error.value = 'Failed to load payment history';
  } finally {
    isLoadingPayments.value = false;
  }
}

function resetPaymentForm() {
  paymentForm.value = {
    amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
    account_id: '',  // Reset account selection
  };
  error.value = null;
}

async function handleAddPayment() {
  if (!props.debt) return;

  // Validate account selection
  if (!paymentForm.value.account_id) {
    error.value = 'Please select an account to pay from';
    return;
  }

  error.value = null;
  isAddingPayment.value = true;

  try {
    const data: AddDebtPaymentData = {
      amount: paymentForm.value.amount,
      payment_date: paymentForm.value.payment_date,
      account_id: paymentForm.value.account_id,  // NEW: Include account
    };

    if (paymentForm.value.notes && paymentForm.value.notes.trim()) {
      data.notes = paymentForm.value.notes.trim();
    }

    await debtsStore.addPayment(props.debt.id, data);

    // Reload payment history
    await loadPaymentHistory();

    // Refresh transactions to show new payment transaction
    await transactionsStore.fetchTransactions();

    // Refresh accounts to show updated balance
    await accountsStore.fetchAccounts();

    // Reset form
    resetPaymentForm();

    if (!localStorage.getItem('msyft_first_debt_payment')) {
      localStorage.setItem('msyft_first_debt_payment', 'true');
      celebrationStore.show('First debt payment recorded!', '💪');
    }

    // Notify parent to refresh
    emit('updated');
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to record payment. Please try again.';
  } finally {
    isAddingPayment.value = false;
  }
}

function handleEdit() {
  if (props.debt) {
    emit('edit', props.debt);
  }
}

async function handleDelete() {
  if (!props.debt) return;

  const confirmed = confirm(
    `Are you sure you want to delete "${props.debt.name}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  error.value = null;
  const debtId = props.debt.id;
  const debtName = props.debt.name;
  closeModal();

  undoStore.schedule({
    message: `Deleting "${debtName}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await debtsStore.deleteDebt(debtId);
        emit('deleted');
      } catch (err: any) {
        error.value = err.response?.data?.error || 'Failed to delete debt. Please try again.';
        alert('Failed to delete debt. Please try again.');
      }
    },
  });
}

function closeModal() {
  emit('update:modelValue', false);
}

function getDebtIcon(debtType: string): string {
  switch (debtType) {
    case 'credit_card': return '💳';
    case 'auto_loan': return '🚗';
    case 'student_loan': return '🎓';
    case 'personal_loan': return '💼';
    case 'mortgage': return '🏠';
    case 'medical': return '🏥';
    default: return '💰';
  }
}

function getDebtTypeLabel(debtType: string): string {
  switch (debtType) {
    case 'credit_card': return 'Credit Card';
    case 'auto_loan': return 'Auto Loan';
    case 'student_loan': return 'Student Loan';
    case 'personal_loan': return 'Personal Loan';
    case 'mortgage': return 'Mortgage';
    case 'medical': return 'Medical Debt';
    default: return 'Other Debt';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
}

import { formatDate } from '@/utils/dateUtils';

</script>
