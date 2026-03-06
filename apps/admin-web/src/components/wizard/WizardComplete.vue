<template>
  <div class="bg-white rounded-lg shadow-lg p-8 text-center">
    <div class="mb-6">
      <div class="text-7xl mb-4 animate-bounce">🎉</div>
      <div class="flex items-center justify-center gap-2 mb-3">
        <h2 class="text-4xl font-bold text-gray-900">
          You're all set!
        </h2>
        <InfoTooltip text="You can return and tweak your budget anytime." />
      </div>
      <p class="text-lg text-gray-600">
        Your budget has been created and is ready to use
      </p>
    </div>

    <div class="bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-6 mb-6">
      <h3 class="font-semibold text-primary-900 mb-3">What happens next?</h3>
      <ul class="space-y-3 text-left text-sm text-primary-800">
        <li class="flex items-start">
          <span class="mr-2">✅</span>
          <span>Your income sources have been added</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">✅</span>
          <span>Your budget categories are set up with your estimated amounts</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">📊</span>
          <span>Start tracking your spending by adding transactions</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">🎯</span>
          <span>See how much you have left to spend in each category</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">💪</span>
          <span>Adjust as you go - budgets are flexible!</span>
        </li>
      </ul>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
      <p class="text-sm text-blue-900">
        💡 <strong>Pro tip:</strong> Your budget automatically rolls over each month, so you only need to set it up once. Make adjustments as your life changes!
      </p>
    </div>

    <button
      @click="$emit('done')"
      class="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium text-lg"
    >
      Go to My Budget →
    </button>

    <div class="mt-6">
      <p class="text-sm text-gray-500">
        You're doing great! 🌟
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';
defineEmits<{
  done: [];
}>();
</script>
