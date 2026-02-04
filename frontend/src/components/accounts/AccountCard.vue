<template>
  <div class="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
    <!-- Account Header -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ account.name }}</h3>
        <p class="text-sm text-gray-500 capitalize">{{ account.type }}</p>
      </div>
      <span :class="accountTypeIcon" class="text-2xl">
        {{ getAccountIcon(account.type) }}
      </span>
    </div>

    <!-- Balance -->
    <div class="mb-4">
      <p class="text-sm text-gray-600 mb-1">Current Balance</p>
      <p :class="balanceClass" class="text-2xl font-bold">
        {{ formatCurrency(account.current_balance) }}
      </p>
    </div>

    <!-- Credit Card Status Link -->
    <div v-if="account.type === 'credit'" class="border-t pt-4">
      <button
        @click="$emit('view-credit-status', account.id)"
        class="text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        View Credit Card Status →
      </button>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-4 pt-4 border-t">
      <button
        @click="$emit('view-transactions', account.id)"
        class="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
      >
        Transactions
      </button>
      <button
        @click="$emit('edit', account)"
        class="px-3 py-2 text-sm bg-primary-50 hover:bg-primary-100 rounded text-primary-700"
      >
        Edit
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Account } from '@/types';

const props = defineProps<{
  account: Account;
}>();

defineEmits<{
  'view-transactions': [accountId: string];
  'view-credit-status': [accountId: string];
  edit: [account: Account];
}>();

const balanceClass = computed(() => {
  if (props.account.type === 'credit') {
    // For credit cards, negative is owed (red), positive is credit (green)
    return props.account.current_balance < 0
      ? 'text-red-600'
      : props.account.current_balance > 0
      ? 'text-green-600'
      : 'text-gray-900';
  }
  // For other accounts, negative is overdrawn (red)
  return props.account.current_balance < 0 ? 'text-red-600' : 'text-gray-900';
});

const accountTypeIcon = computed(() => {
  // Return empty string or a CSS class if needed
  return '';
});

function getAccountIcon(type: string): string {
  const icons: Record<string, string> = {
    checking: '🏦',
    savings: '💰',
    credit: '💳',
    cash: '💵',
    investment: '📈',
  };
  return icons[type] || '💰';
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absAmount);

  // For credit cards, show negative amounts in parentheses
  if (props.account.type === 'credit' && amount < 0) {
    return `(${formatted})`;
  }

  return amount < 0 ? `-${formatted}` : formatted;
}
</script>
