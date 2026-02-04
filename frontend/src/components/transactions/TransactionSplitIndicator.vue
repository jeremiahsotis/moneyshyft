<template>
  <div class="split-indicator">
    <!-- Split Badge (Clickable) -->
    <button
      @click="toggleExpanded"
      class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
      :class="{ 'ring-2 ring-blue-300': isExpanded }"
    >
      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
      </svg>
      Split ({{ splitCount }})
      <svg
        class="w-3 h-3 ml-1 transition-transform"
        :class="{ 'rotate-180': isExpanded }"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Expanded Split Details -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 transform -translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-2"
    >
      <div
        v-if="isExpanded && splits.length > 0"
        class="mt-3 ml-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
      >
        <div class="text-xs font-medium text-gray-700 mb-2">Split Details:</div>
        <div class="space-y-2">
          <div
            v-for="(split, index) in splits"
            :key="index"
            class="flex justify-between items-center text-sm"
          >
            <div class="flex items-center gap-2">
              <div class="w-1 h-1 rounded-full bg-blue-500"></div>
              <span class="text-gray-900 font-medium">{{ getCategoryName(split.category_id) }}</span>
              <span v-if="split.notes" class="text-gray-500 text-xs">{{ split.notes }}</span>
            </div>
            <span class="text-gray-900 font-medium">
              ${{ formatAmount(split.amount) }}
            </span>
          </div>
        </div>
        <div class="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-semibold">
          <span class="text-gray-700">Total:</span>
          <span class="text-gray-900">${{ formatAmount(totalAmount) }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  splits: Array<{ category_id: string; amount: number; notes?: string | null }>;
  categories: Array<{ id: string; name: string }>; // For looking up category names
}>();

const isExpanded = ref(false);

// Computed properties
const splitCount = computed(() => props.splits.length);

const totalAmount = computed(() => {
  return props.splits.reduce((sum, split) => sum + split.amount, 0);
});

// Methods
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function getCategoryName(categoryId: string): string {
  const category = props.categories.find(c => c.id === categoryId);
  return category?.name || 'Unknown Category';
}

function formatAmount(amount: number): string {
  return Math.abs(amount).toFixed(2);
}
</script>

<style scoped>
.split-indicator {
  display: inline-block;
}
</style>
