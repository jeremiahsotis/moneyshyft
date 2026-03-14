<template>
  <div
    class="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200"
    data-testid="recurring-instance-row"
  >
    <div class="flex-1">
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-gray-900">{{ instance.payee }}</h4>
        <span
          :class="badgeClasses"
          class="px-2 py-0.5 text-xs font-medium rounded"
        >
          {{ formatDate(instance.due_date) }}
        </span>
      </div>
      <p class="text-sm text-gray-600 mt-1">
        {{ formatCurrency(instance.amount) }}
        <span v-if="instance.category_name" class="text-gray-500">• {{ instance.category_name }}</span>
        <span v-if="instance.notes" class="text-gray-400">• {{ instance.notes }}</span>
      </p>
    </div>

    <!-- Actions -->
    <div class="flex gap-1 ml-3">
      <button
        v-if="instance.status !== 'approved'"
        @click="$emit('approve')"
        class="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
        title="Approve"
        data-testid="recurring-approve"
      >
        ✓
      </button>
      <button
        v-else
        @click="$emit('post')"
        class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
        title="Post"
        data-testid="recurring-post"
      >
        Post
      </button>
      <button
        @click="$emit('skip')"
        class="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
        title="Skip"
        data-testid="recurring-skip"
      >
        ⏭️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecurringTransactionInstance } from '../../types';

const props = defineProps<{
  instance: RecurringTransactionInstance;
  badgeColor: 'red' | 'yellow' | 'blue' | 'gray';
}>();

defineEmits(['approve', 'skip', 'post']);

const badgeClasses = computed(() => {
  const colorMap = {
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800'
  };
  return colorMap[props.badgeColor];
});

import { formatDate } from '@/utils/dateUtils';


function formatCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });
  return formatter.format(amount);
}
</script>
