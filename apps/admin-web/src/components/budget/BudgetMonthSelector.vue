<template>
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <!-- Month Navigation -->
    <div class="flex items-center justify-between mb-4">
      <button
        @click="handlePrevious"
        class="p-2 hover:bg-gray-100 rounded-lg transition"
        aria-label="Previous month"
      >
        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900">{{ monthDisplay }}</h2>
        <p class="text-sm text-gray-500 mt-1">Your budget carries forward each month</p>
      </div>

      <button
        @click="handleNext"
        class="p-2 hover:bg-gray-100 rounded-lg transition"
        aria-label="Next month"
      >
        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Ready to Plan Display -->
    <div class="text-center pt-4 border-t border-gray-200">
      <div v-if="unallocated === 0" class="text-green-600">
        <p class="text-sm font-medium">✓ All income planned</p>
      </div>
      <div v-else-if="unallocated > 0" class="text-yellow-600">
        <p class="text-sm font-medium mb-1" title="Unassigned cash available for categories">Ready to plan:</p>
        <p class="text-2xl font-bold privacy-value">{{ formatCurrency(unallocated) }}</p>
      </div>
      <div v-else class="text-red-600">
        <p class="text-sm font-medium mb-1">Over-planned by:</p>
        <p class="text-2xl font-bold privacy-value">{{ formatCurrency(Math.abs(unallocated)) }}</p>
        <p class="text-xs text-red-500 mt-2">
          You’re not behind—this is just a signal to adjust or add income later.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  currentMonth: string; // YYYY-MM format
  unallocated: number;
}>();

const emit = defineEmits<{
  monthChange: [month: string];
  previous: [];
  next: [];
}>();

// Helper function to add/subtract months without timezone issues
function addMonths(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  let newYear = year;
  let newMonth = month + delta;

  // Handle month overflow/underflow
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }

  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }

  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

const monthDisplay = computed(() => {
  const [year, month] = props.currentMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1); // Use local timezone
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

function handlePrevious() {
  const newMonth = addMonths(props.currentMonth, -1);
  emit('monthChange', newMonth);
  emit('previous');
}

function handleNext() {
  const newMonth = addMonths(props.currentMonth, 1);
  emit('monthChange', newMonth);
  emit('next');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
