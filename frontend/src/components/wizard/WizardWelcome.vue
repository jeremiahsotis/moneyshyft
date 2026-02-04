<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <div class="text-center mb-8">
      <div class="text-6xl mb-4">👋</div>
      <div class="flex items-center justify-center gap-2 mb-3">
        <h2 class="text-3xl font-bold text-gray-900">
          Welcome to MoneyShyft!
        </h2>
        <InfoTooltip text="A quick setup to build your first budget. You can edit everything later." />
      </div>
      <p class="text-lg text-gray-600 mb-2">
        Let's set up your budget together
      </p>
      <p class="text-sm text-gray-500">
        This will take about 5-10 minutes
      </p>
    </div>

    <div class="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
      <h3 class="font-semibold text-primary-900 mb-3">What we'll do together:</h3>
      <ul class="space-y-2 text-sm text-primary-800">
        <li class="flex items-start">
          <span class="mr-2">💰</span>
          <span>Add your income sources</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">🏠</span>
          <span>Set up your housing costs</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">🚗</span>
          <span>Add transportation expenses</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">💡</span>
          <span>Estimate utilities and bills</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">💳</span>
          <span>Track any debt payments (optional)</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">🛒</span>
          <span>Plan for everyday spending</span>
        </li>
      </ul>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-gray-900">First Wins (Quick Start)</h3>
        <span class="text-xs text-gray-500">3–5 basics to get started</span>
      </div>
      <p class="text-sm text-gray-600 mb-3">
        Prefer a shorter setup? We'll create a simple starter budget you can expand later.
      </p>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="px-2 py-1 bg-gray-100 rounded-full">Income</span>
        <span class="px-2 py-1 bg-gray-100 rounded-full">Housing</span>
        <span class="px-2 py-1 bg-gray-100 rounded-full">Groceries</span>
        <span class="px-2 py-1 bg-gray-100 rounded-full">Transportation</span>
        <span class="px-2 py-1 bg-gray-100 rounded-full">Utilities</span>
      </div>
      <button
        @click="$emit('first-wins')"
        class="mt-4 w-full px-4 py-2 bg-white border border-primary-300 text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition"
      >
        Start with First Wins →
      </button>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <p class="text-sm text-blue-900">
        💡 <strong>Don't worry about being perfect!</strong> You can skip questions, estimate amounts, and come back to edit everything later. This is just to help you get started.
      </p>
    </div>

    <div class="flex justify-center">
      <button
        @click="$emit('next')"
        class="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium text-lg"
      >
        Let's get started! →
      </button>
    </div>

    <div class="mt-6 text-center text-sm text-gray-600">
      <button
        @click="$emit('pause')"
        class="text-sm text-gray-500 hover:text-gray-700 underline mr-4"
      >
        Pause & Save
      </button>
      <button
        @click="$emit('skip')"
        class="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Not now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';

defineEmits<{
  next: [];
  skip: [];
  pause: [];
  'first-wins': [];
}>();
</script>
