<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    data-testid="extra-money-assign-modal"
  >
    <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">
            {{ entry ? 'Assign Extra Money' : 'Add Extra Money' }}
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <span class="text-2xl">×</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Entry Details (if viewing existing) -->
        <div v-if="entry" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-lg">{{ entry.source }}</h3>
                <span v-if="entry.auto_detected" class="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  Auto-detected
                </span>
              </div>
              <div class="text-2xl font-bold text-green-600 mb-2">
                {{ formatCurrency(entry.amount) }}
              </div>
              <div class="text-sm text-gray-600">
                Received: {{ formatDate(entry.received_date) }}
              </div>
              <div v-if="entry.detection_reason" class="mt-2 text-sm text-gray-600 italic">
                💡 {{ entry.detection_reason }}
              </div>
              <div v-if="entry.notes" class="mt-2 text-sm text-gray-700">
                {{ entry.notes }}
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendations Banner -->
        <div v-if="hasRecommendations" class="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p class="text-sm text-purple-800">
            ✨ <strong>We've pre-filled suggestions</strong> based on your Extra Money Plan. Feel free to adjust!
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingRecommendations" class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p class="text-sm text-gray-600">
            <span class="inline-block animate-spin mr-2">⏳</span>
            Loading your personalized recommendations...
          </p>
        </div>

        <!-- Assignment Form -->
        <div class="space-y-6">
          <!-- Savings Reserve -->
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">Savings Reserve</h3>
                <p class="text-sm text-gray-600">Set aside for goals you choose later.</p>
              </div>
              <div class="w-40">
                <input
                  v-model.number="savingsReserve"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  data-testid="extra-money-savings-reserve"
                />
              </div>
            </div>
            <p class="text-xs text-amber-700 mt-2">
              This amount won’t be assigned to categories. You can apply it to goals below.
            </p>
          </div>

          <!-- Goal Allocation -->
          <div v-if="savingsReserve > 0 && goalsStore.activeGoals.length > 0" class="p-4 bg-white border border-gray-200 rounded-lg">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="font-semibold text-gray-900">Allocate Savings to Goals</h3>
                <p class="text-sm text-gray-600">Available: {{ formatCurrency(savingsReserve) }}</p>
              </div>
              <button
                @click="addGoalAllocation"
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                data-testid="extra-money-add-goal"
              >
                + Add Goal
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(allocation, index) in goalAllocations"
                :key="index"
                class="flex items-center gap-3"
              >
                <div class="flex-1">
                  <select
                    v-model="allocation.goal_id"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    data-testid="extra-money-goal-select"
                  >
                    <option value="">Select goal...</option>
                    <option
                      v-for="goal in goalsStore.activeGoals"
                      :key="goal.id"
                      :value="goal.id"
                    >
                      {{ goal.name }}
                    </option>
                  </select>
                </div>
                <div class="w-32">
                  <input
                    v-model.number="allocation.amount"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    data-testid="extra-money-goal-amount"
                  />
                </div>
                <button
                  v-if="goalAllocations.length > 1"
                  @click="removeGoalAllocation(index)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Remove"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div v-else class="w-9"></div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between">
              <p class="text-sm text-gray-600">Remaining: {{ formatCurrency(goalRemaining) }}</p>
              <button
                @click="saveGoalAllocations"
                :disabled="!canAssignGoals"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="extra-money-apply-goals"
              >
                Apply to Goals
              </button>
            </div>
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-gray-900">Assign to Categories</h3>
              <p class="text-sm text-gray-600">
                Choose where this money should go in your budget
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">To Assign</div>
              <div class="text-xl font-bold" :class="remaining === 0 ? 'text-green-600' : 'text-orange-600'">
                {{ formatCurrency(remaining) }}
              </div>
            </div>
          </div>

          <!-- Assignment Rows -->
          <div class="space-y-3">
            <div
              v-for="(assignment, index) in localAssignments"
              :key="index"
              class="flex items-center gap-3"
            >
              <div class="flex-1">
                <select
                  v-if="!assignment.section_id"
                  v-model="assignment.category_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  @change="updateAssignment()"
                  data-testid="extra-money-category"
                >
                  <option value="">Select category...</option>
                  <optgroup
                    v-for="section in categorySections"
                    :key="section.name"
                    :label="section.name"
                  >
                    <option
                      v-for="category in section.categories"
                      :key="category.id"
                      :value="category.id"
                      :disabled="isAlreadySelected(category.id, index)"
                    >
                      {{ category.name }}
                    </option>
                  </optgroup>
                </select>
                <div v-else class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                  Section: {{ sectionName(assignment.section_id) }}
                </div>
              </div>

              <div class="w-40">
                <input
                  v-model.number="assignment.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  @input="updateAssignment()"
                  data-testid="extra-money-category-amount"
                />
              </div>

              <button
                v-if="localAssignments.length > 1"
                @click="removeAssignment(index)"
                class="p-2 text-red-600 hover:bg-red-50 rounded"
                title="Remove"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div v-else class="w-9"></div>
            </div>
          </div>

          <!-- Add Assignment Button -->
          <button
            @click="addAssignment"
            class="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 font-medium"
            data-testid="extra-money-add-category"
          >
            + Add Another Category
          </button>

          <!-- Quick Assign Buttons -->
          <div class="flex gap-2">
          <button
            @click="assignRemaining"
            :disabled="!localAssignments.find(a => (a.category_id || a.section_id) && a.amount === 0)"
            class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="extra-money-assign-remaining"
          >
            Assign Remaining to Selected
          </button>
            <button
              @click="clearAssignments"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              data-testid="extra-money-clear-assignments"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
        <button
          v-if="entry"
          @click="ignoreEntry"
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
        >
          Not Extra Money - Ignore
        </button>
        <div v-else></div>

        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            @click="saveAssignments"
            :disabled="!canSave"
            class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="extra-money-assign-submit"
          >
            Assign Money
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useExtraMoneyStore } from '@/stores/extraMoney';
import { useCategoriesStore } from '@/stores/categories';
import { useGoalsStore } from '@/stores/goals';
import { useCelebrationStore } from '@/stores/celebration';
import api from '@/services/api';
import type { ExtraMoneyWithAssignments, ExtraMoneyRecommendation } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  entry?: ExtraMoneyWithAssignments | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
  ignored: [];
}>();

const extraMoneyStore = useExtraMoneyStore();
const categoriesStore = useCategoriesStore();
const goalsStore = useGoalsStore();
const celebrationStore = useCelebrationStore();

interface LocalAssignment {
  category_id?: string | null;
  section_id?: string | null;
  amount: number;
}

const localAssignments = ref<LocalAssignment[]>([
  { category_id: '', amount: 0 }
]);

const isLoadingRecommendations = ref(false);
const hasRecommendations = ref(false);
const savingsReserve = ref(0);

interface GoalAllocation {
  goal_id: string;
  amount: number;
}

const goalAllocations = ref<GoalAllocation[]>([
  { goal_id: '', amount: 0 }
]);

const categorySections = computed(() => {
  return categoriesStore.activeSections.map(section => ({
    name: section.name,
    categories: section.categories || []
  }));
});

const sectionMap = computed(() => {
  return new Map(categoriesStore.sections.map(section => [section.id, section.name]));
});

function sectionName(sectionId: string | null | undefined): string {
  if (!sectionId) return 'Unknown';
  return sectionMap.value.get(sectionId) || 'Unknown';
}

const totalAmount = computed(() => props.entry?.amount || 0);

const totalAssigned = computed(() =>
  localAssignments.value.reduce((sum, a) => sum + (a.amount || 0), 0)
);

const remaining = computed(() => totalAmount.value - totalAssigned.value - (savingsReserve.value || 0));

const totalGoalAssigned = computed(() =>
  goalAllocations.value.reduce((sum, a) => sum + (a.amount || 0), 0)
);

const goalRemaining = computed(() => Math.max(0, (savingsReserve.value || 0) - totalGoalAssigned.value));

const canAssignGoals = computed(() => {
  if (savingsReserve.value <= 0) return false;
  const hasValid = goalAllocations.value.some(a => a.goal_id && a.amount > 0);
  return hasValid && totalGoalAssigned.value <= (savingsReserve.value + 0.01);
});

const canSave = computed(() => {
  // Must have at least one valid assignment
  const hasValidAssignment = localAssignments.value.some(
    a => (a.category_id || a.section_id) && a.amount > 0
  );
  const hasReserve = savingsReserve.value > 0;

  // All money must be assigned (within 1 cent tolerance)
  const fullyAssigned = Math.abs(remaining.value) < 0.01;

  return (hasValidAssignment || hasReserve) && fullyAssigned;
});

// Auto-load recommendations when entry changes
watch(() => props.entry, async (entry) => {
  if (entry) {
    if (categoriesStore.categories.length === 0) {
      await categoriesStore.fetchCategories();
    }
    if (goalsStore.goals.length === 0) {
      await goalsStore.fetchGoals();
    }
    // Check if entry already has assignments (editing existing)
    if (entry.assignments && entry.assignments.length > 0) {
      localAssignments.value = entry.assignments.map(a => ({
        category_id: a.category_id || null,
        section_id: a.section_id || null,
        amount: a.amount
      }));
      hasRecommendations.value = false;
      savingsReserve.value = Number(entry.savings_reserve || 0);
    } else {
      // New entry - try to load recommendations
      await loadRecommendations(entry.amount);
    }
  } else {
    localAssignments.value = [{ category_id: '', amount: 0 }];
    hasRecommendations.value = false;
    savingsReserve.value = 0;
    goalAllocations.value = [{ goal_id: '', amount: 0 }];
  }
}, { immediate: true });

watch([totalAssigned, totalAmount], () => {
  const maxReserve = Math.max(0, totalAmount.value - totalAssigned.value);
  if (savingsReserve.value > maxReserve) {
    savingsReserve.value = maxReserve;
  }
  if (savingsReserve.value < 0) {
    savingsReserve.value = 0;
  }
});

async function loadRecommendations(amount: number) {
  isLoadingRecommendations.value = true;
  hasRecommendations.value = false;

  try {
    const response = await api.post('/extra-money/recommendations', { amount });
    const recommendations: ExtraMoneyRecommendation[] = response.data.data;

    if (recommendations.length > 0) {
      // Pre-fill localAssignments with recommendations
      const assignmentRecs = recommendations.filter(rec => rec.type !== 'reserve');
      const reserveRec = recommendations.find(rec => rec.type === 'reserve');

      localAssignments.value = assignmentRecs.map(rec => ({
        category_id: rec.category_id || null,
        section_id: rec.section_id || null,
        amount: rec.amount
      }));

      savingsReserve.value = reserveRec ? reserveRec.amount : 0;

      const assignedTotal = assignmentRecs.reduce((sum, rec) => sum + rec.amount, 0);
      const reserveTotal = reserveRec ? reserveRec.amount : 0;
      const delta = Math.round((amount - (assignedTotal + reserveTotal)) * 100) / 100;
      if (Math.abs(delta) >= 0.01) {
        if (reserveRec) {
          savingsReserve.value = Math.max(0, savingsReserve.value + delta);
        } else if (localAssignments.value.length > 0) {
          const lastIndex = localAssignments.value.length - 1;
          localAssignments.value[lastIndex].amount = Math.max(
            0,
            localAssignments.value[lastIndex].amount + delta
          );
        }
      }

      hasRecommendations.value = true;
    }
  } catch (error) {
    console.error('Failed to load recommendations:', error);
    // Silently fail - user can still manually assign
    localAssignments.value = [{ category_id: '', amount: 0 }];
    savingsReserve.value = 0;
  } finally {
    isLoadingRecommendations.value = false;
  }
}

function isAlreadySelected(categoryId: string, currentIndex: number): boolean {
  return localAssignments.value.some(
    (a, index) => index !== currentIndex && a.category_id === categoryId
  );
}

function addAssignment() {
  localAssignments.value.push({ category_id: '', amount: 0 });
}

function removeAssignment(index: number) {
  localAssignments.value.splice(index, 1);
}

function updateAssignment() {
  // Just to trigger reactivity
  localAssignments.value = [...localAssignments.value];
}

function assignRemaining() {
  // Find first assignment with a category selected but no amount
  const target = localAssignments.value.find(a => (a.category_id || a.section_id) && a.amount === 0);
  if (target && remaining.value > 0) {
    target.amount = Math.round(remaining.value * 100) / 100;
  }
}

function clearAssignments() {
  localAssignments.value = [{ category_id: '', amount: 0 }];
}

function addGoalAllocation() {
  goalAllocations.value.push({ goal_id: '', amount: 0 });
}

function removeGoalAllocation(index: number) {
  goalAllocations.value.splice(index, 1);
}

async function saveGoalAllocations() {
  if (!props.entry || !canAssignGoals.value) return;

  try {
    const allocations = goalAllocations.value.filter(a => a.goal_id && a.amount > 0);
    await api.post(`/extra-money/${props.entry.id}/assign-goals`, { allocations });

    savingsReserve.value = Math.max(0, savingsReserve.value - totalGoalAssigned.value);
    goalAllocations.value = [{ goal_id: '', amount: 0 }];
    await goalsStore.fetchGoals();
    await extraMoneyStore.fetchAllEntries();

    if (!localStorage.getItem('msyft_first_extra_money_assignment')) {
      localStorage.setItem('msyft_first_extra_money_assignment', 'true');
      celebrationStore.show('First extra money assignment complete!', '💜');
    }
  } catch (error) {
    console.error('Failed to assign savings to goals:', error);
    alert('Failed to assign savings to goals. Please try again.');
  }
}

async function saveAssignments() {
  if (!props.entry) return;

  try {
    // Filter out empty assignments
    const validAssignments = localAssignments.value.filter(
      a => (a.category_id || a.section_id) && a.amount > 0
    );

    await extraMoneyStore.assignToCategories(props.entry.id, {
      assignments: validAssignments,
      savings_reserve: savingsReserve.value
    });

    if (!localStorage.getItem('msyft_first_extra_money_assignment')) {
      localStorage.setItem('msyft_first_extra_money_assignment', 'true');
      celebrationStore.show('First extra money assignment complete!', '💜');
    }

    emit('saved');
    closeModal();
  } catch (error) {
    console.error('Failed to save assignments:', error);
    alert('Failed to assign extra money. Please try again.');
  }
}

async function ignoreEntry() {
  if (!props.entry) return;

  if (!confirm('Mark this as not extra money? It will be moved to ignored.')) {
    return;
  }

  try {
    await extraMoneyStore.ignoreEntry(props.entry.id);
    emit('ignored');
    closeModal();
  } catch (error) {
    console.error('Failed to ignore entry:', error);
    alert('Failed to ignore entry. Please try again.');
  }
}

function closeModal() {
  emit('update:modelValue', false);
  // Reset on next tick to avoid visual glitches
  setTimeout(() => {
    localAssignments.value = [{ category_id: '', amount: 0 }];
    savingsReserve.value = 0;
    goalAllocations.value = [{ goal_id: '', amount: 0 }];
  }, 300);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

import { formatDate } from '@/utils/dateUtils';

</script>
