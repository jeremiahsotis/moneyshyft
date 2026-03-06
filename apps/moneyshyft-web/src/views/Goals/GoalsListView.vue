<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900">Goals</h1>
            <InfoTooltip text="Track savings goals and celebrate progress over time." />
          </div>
          <p class="text-gray-600 mt-2">Save for what matters most</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
          data-testid="goals-add-button"
        >
          + New Goal
        </button>
      </div>

      <!-- Overview Stats -->
      <div v-if="goalsStore.activeGoals.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Total Goal Amount</p>
            <InfoTooltip text="Sum of target amounts for active goals." />
          </div>
          <p class="text-2xl font-bold text-primary-600">{{ formatCurrency(goalsStore.totalGoalsAmount) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Total Saved</p>
            <InfoTooltip text="Total saved so far across active goals." />
          </div>
          <p class="text-2xl font-bold text-green-600">{{ formatCurrency(goalsStore.totalSavedAmount) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-gray-600">Overall Progress</p>
            <InfoTooltip text="Average progress across active goals." />
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ goalsStore.overallProgress.toFixed(1) }}%</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="goalsStore.isLoading" class="text-center py-12">
        <p class="text-gray-500">Loading goals...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="goalsStore.error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-800">{{ goalsStore.error }}</p>
        <button
          @click="loadGoals"
          class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="goalsStore.goals.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
        <span class="text-6xl mb-4 block">🎯</span>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No Goals Yet</h3>
        <p class="text-gray-600 mb-6">Start saving for what matters by creating your first goal!</p>
        <button
          @click="showCreateModal = true"
          class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
          data-testid="goals-add-button"
        >
          Create Your First Goal
        </button>
      </div>

      <!-- Goals Grid -->
      <div v-else>
        <!-- Active Goals -->
        <div v-if="goalsStore.activeGoals.length > 0" class="mb-8">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Active Goals</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="goal in goalsStore.activeGoals"
              :key="goal.id"
              @click="openGoalDetail(goal)"
              class="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6"
              :data-testid="`goal-card-${goal.id}`"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 truncate">{{ goal.name }}</h3>
                <span class="text-2xl">{{ getGoalEmoji(goal.name) }}</span>
              </div>

              <p v-if="goal.description" class="text-sm text-gray-600 mb-4 line-clamp-2">
                {{ goal.description }}
              </p>

              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Progress</span>
                  <span class="font-medium">
                    {{ formatCurrency(goal.current_amount) }} / {{ formatCurrency(goal.target_amount) }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-primary-600 h-2 rounded-full transition-all"
                    :style="{ width: Math.min((goal.current_amount / goal.target_amount) * 100, 100) + '%' }"
                  ></div>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-primary-600 font-medium">{{ ((goal.current_amount / goal.target_amount) * 100).toFixed(1) }}%</span>
                  <span v-if="goal.target_date" class="text-gray-500">
                    Target: {{ formatShortDate(goal.target_date) }}
                  </span>
                </div>
              </div>

              <!-- Add Contribution Button -->
              <button
                @click.stop="openContributionModal(goal)"
                class="mt-4 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition text-sm"
                data-testid="goal-contribution-button"
              >
                💵 Add Contribution
              </button>
            </div>
          </div>
        </div>

        <!-- Completed Goals -->
        <div v-if="goalsStore.completedGoals.length > 0">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Completed Goals 🎉</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="goal in goalsStore.completedGoals"
              :key="goal.id"
              @click="openGoalDetail(goal)"
              class="bg-green-50 border-2 border-green-200 rounded-lg hover:shadow-lg transition cursor-pointer p-6"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 truncate">{{ goal.name }}</h3>
                <span class="text-2xl">✅</span>
              </div>

              <p class="text-sm text-green-700 font-medium mb-2">
                Completed {{ formatShortDate(goal.completed_at!) }}
              </p>

              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Final Amount</span>
                <span class="font-semibold text-green-600">{{ formatCurrency(goal.current_amount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CreateGoalModal
      v-model="showCreateModal"
      @submit="loadGoals"
    />
    <GoalDetailModal
      v-model="showDetailModal"
      :goal="selectedGoal"
      @deleted="loadGoals"
    />
    <ContributionModal
      v-model="showContributionModal"
      :goal="contributionGoal"
      @contributed="loadGoals"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGoalsStore } from '@/stores/goals';
import AppLayout from '@/components/layout/AppLayout.vue';
import CreateGoalModal from '@/components/goals/CreateGoalModal.vue';
import GoalDetailModal from '@/components/goals/GoalDetailModal.vue';
import ContributionModal from '@/components/goals/ContributionModal.vue';
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import type { Goal } from '@/types';

const goalsStore = useGoalsStore();
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showContributionModal = ref(false);
const selectedGoal = ref<Goal | null>(null);
const contributionGoal = ref<Goal | null>(null);

onMounted(() => {
  loadGoals();
});

async function loadGoals() {
  await goalsStore.fetchGoals();
}

function openGoalDetail(goal: Goal) {
  selectedGoal.value = goal;
  showDetailModal.value = true;
}

function openContributionModal(goal: Goal) {
  contributionGoal.value = goal;
  showContributionModal.value = true;
}

function getGoalEmoji(name: string): string {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('emergency') || lowercaseName.includes('fund')) return '💰';
  if (lowercaseName.includes('vacation') || lowercaseName.includes('trip') || lowercaseName.includes('travel')) return '✈️';
  if (lowercaseName.includes('car') || lowercaseName.includes('vehicle')) return '🚗';
  if (lowercaseName.includes('house') || lowercaseName.includes('home')) return '🏠';
  if (lowercaseName.includes('wedding')) return '💒';
  if (lowercaseName.includes('education') || lowercaseName.includes('school') || lowercaseName.includes('college')) return '🎓';
  if (lowercaseName.includes('business') || lowercaseName.includes('startup')) return '💼';
  if (lowercaseName.includes('retirement')) return '🌴';
  return '🎯';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
</script>
