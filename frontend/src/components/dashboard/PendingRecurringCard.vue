<template>
  <div class="bg-white rounded-lg shadow p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-semibold text-gray-900">Recurring Transactions</h3>
        <span
          v-if="pendingCount > 0"
          class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
        >
          {{ pendingCount }}
        </span>
      </div>
      <button
        @click="$emit('view-all')"
        class="text-sm text-primary-600 hover:text-primary-700"
      >
        View All
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="recurringStore.isLoading" class="text-center py-8">
      <p class="text-gray-500 text-sm">Loading...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="pendingCount === 0" class="text-center py-8">
      <p class="text-gray-500 text-sm">No pending recurring transactions</p>
      <button
        @click="$emit('create-recurring')"
        class="mt-3 text-sm text-primary-600 hover:text-primary-700"
      >
        + Create Recurring Transaction
      </button>
    </div>

    <!-- Pending Instances -->
    <div v-else class="space-y-4">
      <!-- Overdue -->
      <div v-if="recurringStore.overdueInstances.length > 0">
        <h4 class="text-xs font-medium text-red-600 uppercase mb-2">Overdue</h4>
        <div class="space-y-2">
          <InstanceRow
            v-for="instance in recurringStore.overdueInstances"
            :key="instance.id"
            :instance="instance"
            badge-color="red"
            @approve="handleApprove(instance.id)"
            @post="handlePost(instance.id)"
            @skip="handleSkip(instance.id)"
          />
        </div>
      </div>

      <!-- Due Today -->
      <div v-if="recurringStore.dueTodayInstances.length > 0">
        <h4 class="text-xs font-medium text-yellow-600 uppercase mb-2">Due Today</h4>
        <div class="space-y-2">
          <InstanceRow
            v-for="instance in recurringStore.dueTodayInstances"
            :key="instance.id"
            :instance="instance"
            badge-color="yellow"
            @approve="handleApprove(instance.id)"
            @post="handlePost(instance.id)"
            @skip="handleSkip(instance.id)"
          />
        </div>
      </div>

      <!-- This Week -->
      <div v-if="recurringStore.thisWeekInstances.length > 0">
        <h4 class="text-xs font-medium text-blue-600 uppercase mb-2">This Week</h4>
        <div class="space-y-2">
          <InstanceRow
            v-for="instance in recurringStore.thisWeekInstances.slice(0, 3)"
            :key="instance.id"
            :instance="instance"
            badge-color="blue"
            @approve="handleApprove(instance.id)"
            @post="handlePost(instance.id)"
            @skip="handleSkip(instance.id)"
          />
        </div>
        <button
          v-if="recurringStore.thisWeekInstances.length > 3"
          @click="$emit('view-all')"
          class="mt-2 text-sm text-gray-600 hover:text-gray-900"
        >
          +{{ recurringStore.thisWeekInstances.length - 3 }} more
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRecurringStore } from '../../stores/recurring';
import InstanceRow from './InstanceRow.vue';

defineEmits(['view-all', 'create-recurring']);

const recurringStore = useRecurringStore();

const pendingCount = recurringStore.pendingCount;

onMounted(async () => {
  await recurringStore.fetchPendingInstances(7);
});

async function handleApprove(id: string) {
  try {
    await recurringStore.approveInstance(id);
  } catch (error) {
    console.error('Failed to approve instance:', error);
  }
}

async function handlePost(id: string) {
  try {
    await recurringStore.postInstance(id);
  } catch (error) {
    console.error('Failed to post instance:', error);
  }
}

async function handleSkip(id: string) {
  try {
    const reason = prompt('Skip reason (optional):');
    await recurringStore.skipInstance(id, { reason: reason || null });
  } catch (error) {
    console.error('Failed to skip instance:', error);
  }
}
</script>
