<template>
  <!-- Always show card, but change appearance based on state -->
  <div class="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg shadow-lg p-6">
    <!-- STATE 1: Pending entries exist -->
    <div v-if="hasPendingEntries">
      <!-- Header with emphasis -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="text-3xl">💰</span>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-gray-900">Extra Money Detected!</h3>
              <InfoTooltip text="Irregular income that is waiting to be assigned to categories." />
            </div>
            <p class="text-sm text-gray-600">Irregular income needs your attention</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-green-600">{{ formatCurrency(totalPending) }}</div>
          <div class="text-xs text-gray-600">{{ pendingCount }} {{ pendingCount === 1 ? 'entry' : 'entries' }}</div>
        </div>
      </div>

      <!-- Pending Entries List -->
      <div class="space-y-3 mb-4">
        <div
          v-for="entry in displayEntries"
          :key="entry.id"
          class="bg-white border border-purple-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
          @click="handleAssign(entry)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-semibold text-gray-900">{{ entry.source }}</h4>
                <span v-if="entry.auto_detected" class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                  Auto-detected
                </span>
              </div>
          <div class="text-lg font-bold text-green-600">{{ formatCurrency(entry.amount) }}</div>
          <div class="text-sm text-gray-500">{{ formatDate(entry.received_date) }}</div>
          <div v-if="entry.detection_reason" class="mt-2 text-xs text-gray-600 italic">
            💡 {{ entry.detection_reason }}
          </div>
          <div v-if="entry.savings_reserve && entry.savings_reserve > 0" class="mt-2 text-xs text-emerald-700">
            🏦 Savings reserve: {{ formatCurrency(entry.savings_reserve) }}
          </div>
        </div>
            <button
              @click.stop="handleAssign(entry)"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm"
            >
              Assign →
            </button>
          </div>
        </div>

        <button
          v-if="pendingCount > 2"
          @click="$emit('view-all')"
          class="w-full text-center py-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          +{{ pendingCount - 2 }} more entries
        </button>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="$emit('view-all')"
          class="flex-1 px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg font-medium hover:bg-purple-50"
        >
          View All Extra Money
        </button>
      </div>
    </div>

    <!-- STATE 2: No pending entries -->
    <div v-else>
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="text-3xl">💰</span>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-gray-900">Extra Money Tracker</h3>
              <InfoTooltip text="Manage bonuses, refunds, and other irregular income." />
            </div>
            <p class="text-sm text-gray-600">Track irregular income like bonuses, tax refunds & gifts</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-purple-200 rounded-lg p-4 mb-4">
        <p class="text-sm text-gray-700 mb-3">
          <strong>No extra money detected yet.</strong> Extra money appears automatically when you record income.
        </p>
        <div class="text-xs text-gray-600 space-y-1">
          <div>✓ Detects bonuses, refunds, gifts & large deposits</div>
          <div>✓ Helps assign unexpected income to budget categories</div>
          <div>✓ Prevents irregular income from being forgotten</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="$emit('view-all')"
          class="flex-1 px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg font-medium hover:bg-purple-50"
          title="View all extra money entries and add manually"
        >
          Manage
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useExtraMoneyStore } from '@/stores/extraMoney';
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import type { ExtraMoneyWithAssignments } from '@/types';

const emit = defineEmits<{
  'view-all': [];
  'assign': [entry: ExtraMoneyWithAssignments];
}>();

const extraMoneyStore = useExtraMoneyStore();

const hasPendingEntries = computed(() => extraMoneyStore.hasPendingEntries);
const pendingCount = computed(() => extraMoneyStore.pendingEntries.length);
const totalPending = computed(() => extraMoneyStore.totalPendingAmount);

// Show max 2 entries on dashboard
const displayEntries = computed(() =>
  extraMoneyStore.pendingEntries.slice(0, 2)
);

onMounted(async () => {
  await extraMoneyStore.fetchPendingEntries();
});

function handleAssign(entry: ExtraMoneyWithAssignments) {
  emit('assign', entry);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

import { formatDate } from '@/utils/dateUtils';
</script>
