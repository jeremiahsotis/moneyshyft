<template>
  <div
    v-if="undoStore.current"
    class="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-center justify-between gap-4">
      <p class="text-sm text-gray-700">{{ undoStore.current.message }}</p>
      <button
        type="button"
        class="text-sm font-semibold text-blue-600 hover:text-blue-700"
        @click="undoStore.undo"
      >
        Undo
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUndoStore } from '@/stores/undo';

const undoStore = useUndoStore();
</script>
