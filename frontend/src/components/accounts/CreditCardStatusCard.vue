<template>
  <div v-if="status" class="bg-white rounded-lg shadow p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900">💳 {{ status.account_name }}</h3>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </div>

    <!-- Success Message -->
    <div v-if="status.success_message" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p class="text-green-800 text-sm">{{ status.success_message }}</p>
    </div>

    <!-- Warning Message -->
    <div v-if="status.warning_message" class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p class="text-yellow-800 text-sm">{{ status.warning_message }}</p>
    </div>

    <!-- Status Breakdown -->
    <div class="space-y-3">
      <!-- Previous Balance -->
      <div v-if="status.previous_balance > 0" class="flex justify-between items-center text-sm">
        <span class="text-gray-600">Previous Balance ({{ formatDate(status.month_start_date) }})</span>
        <span class="font-medium text-gray-500">{{ formatCurrency(status.previous_balance) }}</span>
      </div>

      <!-- New Charges -->
      <div class="flex justify-between items-center text-sm">
        <span class="text-gray-600">New Charges This Month</span>
        <span :class="status.new_charges_this_month > 0 ? 'font-medium text-orange-600' : 'text-gray-500'">
          +{{ formatCurrency(status.new_charges_this_month) }}
        </span>
      </div>

      <!-- Payments Made -->
      <div v-if="status.payments_this_month > 0" class="flex justify-between items-center text-sm">
        <span class="text-gray-600">Payments Made</span>
        <span class="font-medium text-green-600">
          -{{ formatCurrency(status.payments_this_month) }}
        </span>
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-200 my-2"></div>

      <!-- Total Owed -->
      <div class="flex justify-between items-center">
        <span class="text-base font-semibold text-gray-900">Current Balance</span>
        <span :class="balanceClass" class="text-xl font-bold">
          {{ formatCurrency(status.total_owed) }}
        </span>
      </div>

      <!-- Budget Coverage -->
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p class="text-xs text-blue-800">
          💡 {{ formatCurrency(status.new_charges_covered_by_budget) }} in new charges is covered by your budget
        </p>
      </div>
    </div>

    <!-- Close Button -->
    <button
      @click="$emit('close')"
      class="mt-6 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium"
    >
      Close
    </button>
  </div>

  <div v-else class="bg-white rounded-lg shadow p-6 text-center">
    <p class="text-gray-500">Loading credit card status...</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CreditCardStatus } from '@/types';

const props = defineProps<{
  status: CreditCardStatus | null;
}>();

defineEmits<{
  close: [];
}>();

const balanceClass = computed(() => {
  if (!props.status) return 'text-gray-900';
  if (props.status.total_owed === 0) return 'text-green-600';
  if (props.status.is_current) return 'text-yellow-600';
  return 'text-red-600';
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

import { formatDate } from '@/utils/dateUtils';
</script>
