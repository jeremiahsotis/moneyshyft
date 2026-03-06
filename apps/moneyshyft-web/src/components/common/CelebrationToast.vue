<template>
  <div
    v-if="celebrationStore.current"
    class="fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-lg"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-center gap-3">
      <span class="text-xl">{{ celebrationStore.current.emoji || '🎉' }}</span>
      <p class="text-sm font-semibold">{{ celebrationStore.current.message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCelebrationStore } from '@/stores/celebration';

const celebrationStore = useCelebrationStore();
</script>
