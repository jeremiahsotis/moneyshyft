<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900">Debt Progress Planner</h1>
            <InfoTooltip text="Track balances and plan payments without judgment." />
          </div>
          <p class="text-gray-600 mt-2">Track your debts and choose a plan that fits your pace.</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
          data-testid="debts-add-button"
        >
          + Add Debt
        </button>
      </div>

      <!-- Overview Stats -->
      <div v-if="debtsStore.activeDebts.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Total Debt</p>
            <InfoTooltip text="Total remaining balances across active debts." />
          </div>
          <p class="text-2xl font-bold text-orange-600">{{ formatCurrency(debtsStore.totalDebt) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Monthly Minimums</p>
            <InfoTooltip text="Minimum payment total across active debts." />
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(debtsStore.totalMinimumPayments) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Highest APR</p>
            <InfoTooltip text="Highest interest rate among active debts." />
          </div>
          <p class="text-2xl font-bold text-red-600">{{ debtsStore.highestInterestRate.toFixed(2) }}%</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Debts Paid Off</p>
            <InfoTooltip text="Count of debts marked as paid off." />
          </div>
          <p class="text-2xl font-bold text-green-600">{{ debtsStore.paidOffDebts.length }}</p>
        </div>
      </div>

      <!-- Active Payment Plan -->
      <div v-if="activePaymentPlan && activePaymentPlan.plan" class="mb-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg border-2 border-green-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>{{ activePaymentPlan.plan.method === 'snowball' ? '❄️' : '⚡' }}</span>
              Active Payment Plan
              <span class="text-sm font-normal text-green-700">({{ activePaymentPlan.plan.method === 'snowball' ? 'Snowball' : 'Avalanche' }})</span>
            </h2>
            <p class="text-sm text-gray-700 mt-1">
              Total Monthly Payment: <span class="font-bold text-green-700">{{ formatCurrency(activePaymentPlan.plan.total_monthly_payment) }}</span>
            </p>
          </div>
          <button
            @click="activePaymentPlan = null; debtsStore.clearStrategyComparison()"
            class="px-4 py-2 text-green-700 hover:bg-green-100 rounded-lg font-medium transition text-sm"
          >
            Calculate New Plan
          </button>
        </div>

        <div class="bg-white rounded-lg p-4">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Payment Schedule (in order):</h3>
          <div class="space-y-2">
            <div
              v-for="scheduled in activePaymentPlan.schedule"
              :key="scheduled.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold text-sm">
                  {{ scheduled.payment_order }}
                </span>
                <div>
                  <p class="font-medium text-gray-900">{{ scheduled.debt_name }}</p>
                  <p class="text-xs text-gray-600">{{ formatCurrency(scheduled.current_balance) }} @ {{ scheduled.interest_rate }}% APR</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">{{ formatCurrency(scheduled.payment_amount) }}/mo</p>
                <p v-if="scheduled.is_extra_payment" class="text-xs text-green-600">
                  +{{ formatCurrency(scheduled.payment_amount - scheduled.minimum_payment) }} extra
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Strategy Comparison -->
      <div v-if="debtsStore.activeDebts.length > 1" class="mb-8">
        <div class="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-4">
            <h2 class="text-xl font-bold text-gray-900">Payment Strategy Calculator</h2>
            <InfoTooltip text="Compare payoff strategies based on your monthly amount." />
          </div>
          <p class="text-gray-700 mb-4">
            Enter how much you can put toward debt each month to see which strategy builds progress sooner.
          </p>

          <div class="flex gap-4 items-end mb-6">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Monthly Payment Budget
              </label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  v-model.number="monthlyBudget"
                  type="number"
                  step="10"
                  :min="debtsStore.totalMinimumPayments"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <p class="text-xs text-gray-600 mt-1">
                Minimum required: {{ formatCurrency(debtsStore.totalMinimumPayments) }}
              </p>
            </div>
            <button
              @click="calculateStrategy"
              :disabled="monthlyBudget < debtsStore.totalMinimumPayments || isCalculating"
              class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCalculating ? 'Calculating...' : 'Calculate' }}
            </button>
          </div>

          <!-- Strategy Results -->
          <div v-if="debtsStore.strategyComparison" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Snowball Strategy -->
            <div class="bg-white rounded-lg p-6 border-2" :class="debtsStore.strategyComparison.recommended === 'snowball' ? 'border-green-500' : 'border-gray-200'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">❄️ Snowball Method</h3>
                <span v-if="debtsStore.strategyComparison.recommended === 'snowball'" class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                  Recommended
                </span>
              </div>
              <p class="text-sm text-gray-600 mb-4">Pay smallest balance first for quick wins</p>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">Time to payoff:</span>
                  <span class="font-semibold">{{ debtsStore.strategyComparison.snowball.months_to_payoff }} months</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">Total interest paid:</span>
                  <span class="font-semibold text-orange-600">{{ formatCurrency(debtsStore.strategyComparison.snowball.total_interest_paid) }}</span>
                </div>
              </div>
            </div>

            <!-- Avalanche Strategy -->
            <div class="bg-white rounded-lg p-6 border-2" :class="debtsStore.strategyComparison.recommended === 'avalanche' ? 'border-green-500' : 'border-gray-200'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">⚡ Avalanche Method</h3>
                <span v-if="debtsStore.strategyComparison.recommended === 'avalanche'" class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                  Recommended
                </span>
              </div>
              <p class="text-sm text-gray-600 mb-4">Pay highest interest first to save money</p>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">Time to payoff:</span>
                  <span class="font-semibold">{{ debtsStore.strategyComparison.avalanche.months_to_payoff }} months</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">Total interest paid:</span>
                  <span class="font-semibold text-orange-600">{{ formatCurrency(debtsStore.strategyComparison.avalanche.total_interest_paid) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Savings Summary -->
          <div v-if="debtsStore.strategyComparison && debtsStore.strategyComparison.interest_savings > 0" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-900 font-semibold">
              💰 Avalanche saves you {{ formatCurrency(debtsStore.strategyComparison.interest_savings) }} in interest
              <span v-if="debtsStore.strategyComparison.time_savings_months > 0">
                and can shorten payoff by {{ debtsStore.strategyComparison.time_savings_months }} months.
              </span>
            </p>
          </div>

          <!-- Commit Plan Button -->
          <div v-if="debtsStore.strategyComparison" class="mt-6 flex justify-center">
            <button
              @click="commitPlan(debtsStore.strategyComparison.recommended)"
              :disabled="isCommitting"
              class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {{ isCommitting ? 'Committing...' : '✅ Use This Plan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="debtsStore.isLoading" class="text-center py-12">
        <p class="text-gray-500">Loading debts...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="debtsStore.error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-800">{{ debtsStore.error }}</p>
        <button
          @click="loadDebts"
          class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="debtsStore.debts.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <span class="text-6xl mb-4 block">💳</span>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No debts listed yet</h3>
        <p class="text-gray-600 mb-6">Add a debt if you want help tracking balances and payments.</p>
        <button
          @click="showCreateModal = true"
          class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
          data-testid="debts-add-button"
        >
          Add Your First Debt
        </button>
      </div>

      <!-- Debts Grid -->
      <div v-else>
        <!-- Active Debts -->
        <div v-if="debtsStore.activeDebts.length > 0" class="mb-8">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Active Debts ({{ debtsStore.activeDebts.length }})</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="debt in debtsStore.activeDebts"
              :key="debt.id"
              @click="openDebtDetail(debt)"
              class="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6"
              :data-testid="`debt-card-${debt.id}`"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 truncate">{{ debt.name }}</h3>
                <span class="text-2xl">{{ getDebtIcon(debt.debt_type) }}</span>
              </div>

              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Balance</span>
                    <span class="font-semibold text-orange-600">{{ formatCurrency(debt.current_balance) }}</span>
                  </div>
                  <div v-if="debt.original_balance" class="flex justify-between text-xs">
                    <span class="text-gray-500">Original</span>
                    <span class="text-gray-500">{{ formatCurrency(debt.original_balance) }}</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div>
                    <p class="text-xs text-gray-600">APR</p>
                    <p class="font-semibold text-red-600">{{ debt.interest_rate }}%</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-600">Minimum Payment</p>
                    <p class="font-semibold text-gray-900">{{ formatCurrency(debt.minimum_payment) }}</p>
                  </div>
                </div>

                <div v-if="debt.original_balance" class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-600 h-2 rounded-full transition-all"
                    :style="{ width: Math.min(((debt.original_balance - debt.current_balance) / debt.original_balance) * 100, 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Paid Off Debts -->
        <div v-if="debtsStore.paidOffDebts.length > 0">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Paid Off! 🎉 ({{ debtsStore.paidOffDebts.length }})</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="debt in debtsStore.paidOffDebts"
              :key="debt.id"
              @click="openDebtDetail(debt)"
              class="bg-green-50 border-2 border-green-200 rounded-lg hover:shadow-lg transition cursor-pointer p-6"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 truncate">{{ debt.name }}</h3>
                <span class="text-2xl">✅</span>
              </div>

              <p class="text-sm text-green-700 font-medium mb-2">
                Paid off {{ formatShortDate(debt.paid_off_at!) }}
              </p>

              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Final Balance</span>
                <span class="font-semibold text-green-600">$0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Debt Modal -->
    <CreateDebtModal
      v-model="showCreateModal"
      @created="handleDebtCreated"
    />

    <!-- Debt Detail Modal -->
    <DebtDetailModal
      v-model="showDetailModal"
      :debt="selectedDebt"
      @edit="handleEditDebt"
      @deleted="handleDebtDeleted"
      @updated="handleDebtUpdated"
    />

    <!-- Edit Debt Modal -->
    <EditDebtModal
      v-model="showEditModal"
      :debt="debtToEdit"
      @updated="handleDebtUpdated"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDebtsStore } from '@/stores/debts';
import AppLayout from '@/components/layout/AppLayout.vue';
import CreateDebtModal from '@/components/debts/CreateDebtModal.vue';
import DebtDetailModal from '@/components/debts/DebtDetailModal.vue';
import EditDebtModal from '@/components/debts/EditDebtModal.vue';
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import type { Debt } from '@/types';

const debtsStore = useDebtsStore();
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showEditModal = ref(false);
const selectedDebt = ref<Debt | null>(null);
const debtToEdit = ref<Debt | null>(null);
const monthlyBudget = ref(0);
const isCalculating = ref(false);
const isCommitting = ref(false);
const activePaymentPlan = ref<any>(null);

onMounted(async () => {
  await loadDebts();
  await loadActivePaymentPlan();
});

async function loadDebts() {
  await debtsStore.fetchDebts();
  // Set default monthly budget to minimums + $100
  if (debtsStore.totalMinimumPayments > 0) {
    monthlyBudget.value = Math.ceil(debtsStore.totalMinimumPayments + 100);
  }
}

async function loadActivePaymentPlan() {
  try {
    activePaymentPlan.value = await debtsStore.getActivePaymentPlan();
  } catch (error) {
    console.error('Failed to load active payment plan:', error);
  }
}

function openDebtDetail(debt: Debt) {
  selectedDebt.value = debt;
  showDetailModal.value = true;
}

async function handleDebtCreated() {
  await loadDebts();
}

async function handleDebtUpdated() {
  await loadDebts();
  // Also recalculate strategy if it was previously calculated
  if (debtsStore.strategyComparison && monthlyBudget.value > 0) {
    await calculateStrategy();
  }
}

async function handleDebtDeleted() {
  await loadDebts();
  showDetailModal.value = false;
  selectedDebt.value = null;
  // Recalculate strategy if it was previously calculated
  if (debtsStore.strategyComparison && monthlyBudget.value > 0) {
    await calculateStrategy();
  }
}

function handleEditDebt(debt: Debt) {
  // Close detail modal and open edit modal
  showDetailModal.value = false;
  debtToEdit.value = debt;
  showEditModal.value = true;
}

async function calculateStrategy() {
  if (monthlyBudget.value < debtsStore.totalMinimumPayments) {
    alert(`Monthly budget must be at least ${formatCurrency(debtsStore.totalMinimumPayments)}`);
    return;
  }

  isCalculating.value = true;
  try {
    await debtsStore.calculatePayoffStrategy(monthlyBudget.value);
  } catch (error) {
    console.error('Failed to calculate strategy:', error);
    alert('Failed to calculate payoff strategy. Please try again.');
  } finally {
    isCalculating.value = false;
  }
}

async function commitPlan(method: 'snowball' | 'avalanche') {
  if (!debtsStore.strategyComparison) return;

  const strategy = method === 'snowball'
    ? debtsStore.strategyComparison.snowball
    : debtsStore.strategyComparison.avalanche;

  // Build the debts array with payment amounts
  const debtsData = strategy.payoff_order.map((debtInfo) => {
    const debt = debtsStore.activeDebts.find(d => d.id === debtInfo.debt_id);
    if (!debt) throw new Error('Debt not found');

    // Calculate payment amount for this debt
    // For the first debt in the order, it gets all extra payment
    // Others get minimum payment
    const isFirstDebt = debtInfo.order === 1;
    const extraPayment = isFirstDebt
      ? monthlyBudget.value - debtsStore.totalMinimumPayments
      : 0;
    const paymentAmount = debt.minimum_payment + extraPayment;

    return {
      debt_id: debt.id,
      payment_amount: paymentAmount,
      order: debtInfo.order,
      minimum_payment: debt.minimum_payment,
    };
  });

  isCommitting.value = true;
  try {
    await debtsStore.commitPaymentPlan({
      method,
      total_monthly_payment: monthlyBudget.value,
      debts: debtsData,
    });

    // Reload active payment plan
    await loadActivePaymentPlan();

    // Clear calculator results
    debtsStore.clearStrategyComparison();

    alert(`✅ ${method === 'snowball' ? 'Snowball' : 'Avalanche'} payment plan committed! Your budget has been updated.`);
  } catch (error) {
    console.error('Failed to commit payment plan:', error);
    alert('Failed to commit payment plan. Please try again.');
  } finally {
    isCommitting.value = false;
  }
}

function getDebtIcon(debtType: string): string {
  switch (debtType) {
    case 'credit_card': return '💳';
    case 'auto_loan': return '🚗';
    case 'student_loan': return '🎓';
    case 'personal_loan': return '💼';
    case 'medical': return '🏥';
    default: return '💰';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
</script>
