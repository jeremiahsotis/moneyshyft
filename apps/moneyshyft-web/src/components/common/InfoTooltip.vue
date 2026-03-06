<template>
  <span class="relative inline-flex items-center gap-2 text-xs text-gray-500 group">
    <span class="hidden sm:inline">What this means</span>
    <button
      type="button"
      class="w-5 h-5 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
      :aria-label="`What this means: ${text}`"
    >
      ?
    </button>
    <span
      class="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
      role="tooltip"
    >
      {{ text }}
    </span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>
