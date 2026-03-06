<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
          <InfoTooltip text="A quick snapshot of your money this month." />
        </div>
        <p class="text-gray-600 mt-2">Welcome back, {{ authStore.fullName }}!</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Balance"
          :value="totalBalance"
          type="currency"
          icon="💰"
          :color-class="totalBalance >= 0 ? 'text-green-600' : 'text-red-600'"
          tooltip-text="All account balances added together."
        />
        <StatCard
          title="Monthly Income"
          :value="incomeStore.totalMonthlyIncome"
          type="currency"
          icon="📈"
          color-class="text-primary-600"
          tooltip-text="Planned income for the month from income sources."
        />
        <StatCard
          title="This Month Spent"
          :value="Math.abs(monthlySpending)"
          type="currency"
          icon="📊"
          :color-class="monthlySpending < 0 ? 'text-red-600' : 'text-green-600'"
          tooltip-text="Spending recorded so far this month."
        />
        <StatCard
          title="Ready to Plan"
          :value="budgetsStore.toBeAssigned"
          type="currency"
          icon="💵"
          :color-class="budgetsStore.toBeAssigned > 0 ? 'text-green-600' : 'text-orange-600'"
          subtitle="Unassigned cash"
          tooltip-text="Money not yet assigned to categories."
        />
      </div>

      <!-- Budget Health & Goals Overview -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Budget Health -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                <span class="mr-2">📊</span>
                Budget Health ({{ currentMonth }})
              </h2>
              <InfoTooltip text="Compares income, plans, and spending for this month." />
            </div>
          </div>
          <div class="p-6">
            <div v-if="budgetsStore.currentSummary" class="space-y-4">
              <!-- Income vs Planned -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">Income vs Planned</span>
                    <InfoTooltip text="How much of your income has been planned into categories." />
                  </div>
                  <span class="text-sm font-medium">
                    <span class="privacy-value">{{ formatCurrency(budgetsStore.totalAllocated) }}</span> /
                    <span class="privacy-value">{{ formatCurrency(incomeStore.totalMonthlyIncome) }}</span>
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full"
                    :class="allocationPercentage > 100 ? 'bg-red-600' : 'bg-primary-600'"
                    :style="{ width: Math.min(allocationPercentage, 100) + '%' }"
                  ></div>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ allocationPercentage.toFixed(1) }}% planned</p>
              </div>

              <!-- Planned vs Spent -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">Planned vs Spent</span>
                    <InfoTooltip text="How much you have spent compared to your plan." />
                  </div>
                  <span class="text-sm font-medium">
                    <span class="privacy-value">{{ formatCurrency(Math.abs(budgetsStore.totalSpent)) }}</span> /
                    <span class="privacy-value">{{ formatCurrency(budgetsStore.totalAllocated) }}</span>
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full"
                    :class="spentPercentage > 100 ? 'bg-red-600' : 'bg-green-600'"
                    :style="{ width: Math.min(spentPercentage, 100) + '%' }"
                  ></div>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ spentPercentage.toFixed(1) }}% spent</p>
              </div>

              <!-- Summary Stats -->
              <div class="pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs text-gray-600">Total Income</p>
                    <InfoTooltip text="Planned income for the current month." />
                  </div>
                  <p class="text-lg font-bold text-primary-600 privacy-value">{{ formatCurrency(incomeStore.totalMonthlyIncome) }}</p>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs text-gray-600">Ready to Plan</p>
                    <InfoTooltip text="Money still waiting to be assigned." />
                  </div>
                  <p class="text-lg font-bold privacy-value" :class="budgetsStore.toBeAssigned >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(budgetsStore.toBeAssigned) }}
                  </p>
                </div>
              </div>

              <div v-if="budgetsStore.toBeAssigned === 0" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p class="text-sm text-green-800">🎉 Balanced month! Everything has a job.</p>
              </div>
              <div v-else-if="allocationPercentage > 100" class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p class="text-sm text-orange-800">
                  You’re planning more than income. That’s okay—trim a category or add income when it lands.
                </p>
              </div>

              <router-link
                to="/budget"
                class="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium mt-4"
              >
                View Full Budget →
              </router-link>
            </div>
            <div v-else class="text-center py-4 text-gray-500">
              <p class="mb-2">No budget data yet</p>
              <router-link to="/budget/setup" class="text-primary-600 hover:text-primary-700 text-sm">
                Set up your budget →
              </router-link>
            </div>
          </div>
        </div>

        <!-- Goals Overview -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                  <span class="mr-2">🎯</span>
                  Goals Progress
                </h2>
                <InfoTooltip text="Top goals and how close they are to completion." />
              </div>
              <router-link to="/goals" class="text-sm text-primary-600 hover:text-primary-700">
                View all →
              </router-link>
            </div>
          </div>
          <div class="p-6">
            <div v-if="goalsStore.activeGoals.length > 0" class="space-y-4">
              <div
                v-for="goal in topGoals"
                :key="goal.id"
                class="pb-4 border-b last:border-b-0 last:pb-0"
              >
                <div class="flex justify-between items-start mb-2">
                  <span class="font-medium text-gray-900">{{ goal.name }}</span>
                  <span class="text-sm text-gray-600">{{ ((goal.current_amount / goal.target_amount) * 100).toFixed(0) }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    class="bg-primary-600 h-2 rounded-full"
                    :style="{ width: Math.min((goal.current_amount / goal.target_amount) * 100, 100) + '%' }"
                  ></div>
                </div>
                <div class="flex justify-between text-xs text-gray-500">
                  <span>{{ formatCurrency(goal.current_amount) }} saved</span>
                  <span>{{ formatCurrency(goal.target_amount) }} target</span>
                </div>
              </div>

              <div v-if="goalsStore.activeGoals.length > 3" class="pt-2 text-center">
                <router-link to="/goals" class="text-sm text-primary-600 hover:text-primary-700">
                  +{{ goalsStore.activeGoals.length - 3 }} more goals
                </router-link>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500">
              <span class="text-4xl block mb-2">🎯</span>
              <p class="mb-2">No active goals</p>
              <router-link to="/goals" class="text-primary-600 hover:text-primary-700 text-sm">
                Create your first goal →
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Extra Money Alert -->
      <div class="mb-8">
        <PendingExtraMoneyCard
          @view-all="$router.push('/extra-money')"
          @assign="handleAssignExtraMoney"
        />
      </div>

      <!-- Recurring Transactions -->
      <div class="mb-8">
        <PendingRecurringCard
          @view-all="$router.push('/transactions')"
          @create-recurring="showRecurringModal = true"
        />
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Transactions -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <router-link to="/transactions" class="text-sm text-primary-600 hover:text-primary-700">
                View all →
              </router-link>
            </div>
          </div>
          <div v-if="recentTransactions.length > 0" class="divide-y">
            <div
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="p-4 hover:bg-gray-50"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900">{{ transaction.payee }}</p>
                  <p class="text-sm text-gray-500">{{ formatDate(transaction.transaction_date) }}</p>
                </div>
                <p
                  :class="transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'"
                  class="font-semibold"
                >
                  {{ formatCurrency(transaction.amount) }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="p-8 text-center text-gray-500">
            <p>No transactions yet</p>
            <router-link to="/transactions" class="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
              Add your first transaction →
            </router-link>
          </div>
        </div>

        <!-- Accounts Summary -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Accounts</h2>
              <router-link to="/accounts" class="text-sm text-primary-600 hover:text-primary-700">
                View all →
              </router-link>
            </div>
          </div>
          <div v-if="accountsStore.accounts.length > 0" class="divide-y">
            <div
              v-for="account in accountsStore.accounts.slice(0, 5)"
              :key="account.id"
              class="p-4 hover:bg-gray-50"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900">{{ account.name }}</p>
                  <p class="text-sm text-gray-500 capitalize">{{ account.type }}</p>
                </div>
                <p class="font-semibold text-gray-900">
                  {{ formatCurrency(account.current_balance) }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="p-8 text-center text-gray-500">
            <p>No accounts yet</p>
            <router-link to="/accounts" class="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
              Add your first account →
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Recurring Transaction Modal -->
    <RecurringTransactionModal
      v-model="showRecurringModal"
      @saved="handleRecurringSaved"
    />

    <!-- Extra Money Modal -->
    <ExtraMoneyModal
      v-model="showExtraMoneyModal"
      :entry="selectedExtraMoneyEntry"
      @saved="handleExtraMoneySaved"
      @ignored="handleExtraMoneyIgnored"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAccountsStore } from '@/stores/accounts';
import { useTransactionsStore } from '@/stores/transactions';
import { useIncomeStore } from '@/stores/income';
import { useBudgetsStore } from '@/stores/budgets';
import { useGoalsStore } from '@/stores/goals';
import { useRecurringStore } from '@/stores/recurring';
import { useExtraMoneyStore } from '@/stores/extraMoney';
import AppLayout from '@/components/layout/AppLayout.vue';
import StatCard from '@/components/common/StatCard.vue';
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import PendingRecurringCard from '@/components/dashboard/PendingRecurringCard.vue';
import PendingExtraMoneyCard from '@/components/dashboard/PendingExtraMoneyCard.vue';
import RecurringTransactionModal from '@/components/transactions/RecurringTransactionModal.vue';
import ExtraMoneyModal from '@/components/extraMoney/ExtraMoneyModal.vue';
import type { ExtraMoneyWithAssignments } from '@/types';

const authStore = useAuthStore();
const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();
const incomeStore = useIncomeStore();
const budgetsStore = useBudgetsStore();
const goalsStore = useGoalsStore();
const recurringStore = useRecurringStore();
const extraMoneyStore = useExtraMoneyStore();

const showRecurringModal = ref(false);
const showExtraMoneyModal = ref(false);
const selectedExtraMoneyEntry = ref<ExtraMoneyWithAssignments | null>(null);

const currentMonth = computed(() => {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

const totalBalance = computed(() => {
  return accountsStore.accounts.reduce((sum, account) => {
    return sum + Number(account.current_balance);
  }, 0);
});

const monthlySpending = computed(() => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return transactionsStore.transactions
    .filter(t => new Date(t.transaction_date) >= monthStart)
    .reduce((sum, t) => sum + Number(t.amount), 0);
});

const recentTransactions = computed(() => {
  return transactionsStore.transactions.slice(0, 5);
});

const allocationPercentage = computed(() => {
  if (incomeStore.totalMonthlyIncome === 0) return 0;
  return (budgetsStore.totalAllocated / incomeStore.totalMonthlyIncome) * 100;
});

const spentPercentage = computed(() => {
  if (budgetsStore.totalAllocated === 0) return 0;
  return (Math.abs(budgetsStore.totalSpent) / budgetsStore.totalAllocated) * 100;
});

const topGoals = computed(() => {
  return goalsStore.activeGoals.slice(0, 3);
});

onMounted(async () => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  await Promise.all([
    accountsStore.fetchAccounts(),
    transactionsStore.fetchTransactions(),
    incomeStore.fetchIncomeSources(),
    budgetsStore.fetchBudgetSummary(currentMonthStr),
    goalsStore.fetchGoals(),
    recurringStore.fetchPendingInstances(7),
    extraMoneyStore.fetchPendingEntries(),
  ]);
});

async function handleRecurringSaved() {
  // Refresh pending instances after creating a new recurring transaction
  await recurringStore.fetchPendingInstances(7);
}

function handleAssignExtraMoney(entry: ExtraMoneyWithAssignments) {
  selectedExtraMoneyEntry.value = entry;
  showExtraMoneyModal.value = true;
}

async function handleExtraMoneySaved() {
  showExtraMoneyModal.value = false;
  selectedExtraMoneyEntry.value = null;

  // Refresh budget summary and extra money entries
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  await Promise.all([
    budgetsStore.fetchBudgetSummary(currentMonthStr),
    extraMoneyStore.fetchPendingEntries()
  ]);
}

async function handleExtraMoneyIgnored() {
  showExtraMoneyModal.value = false;
  selectedExtraMoneyEntry.value = null;

  // Refresh extra money entries
  await extraMoneyStore.fetchPendingEntries();
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absAmount);
  return amount < 0 ? `-${formatted}` : formatted;
}

import { formatDate } from '@/utils/dateUtils';
</script>
