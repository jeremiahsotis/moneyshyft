<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4">
        <div class="flex justify-between items-center">
          <div class="flex-1">
            <h2 class="text-2xl font-bold">Assign Money to Categories</h2>
            <p class="text-sm opacity-90 mt-1">
              Available to assign: {{ formatCurrency(budgetsStore.toBeAssigned) }}
            </p>
          </div>
          <button
            v-if="underfundedCategories.length > 0 && budgetsStore.toBeAssigned > 0"
            @click="handleAutoAssignAll"
            :disabled="isLoading"
            class="px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-md mr-4"
          >
            Auto-Assign All
          </button>
          <button
            @click="close"
            class="text-white hover:bg-white/20 rounded-full p-2 transition"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3"></div>
          <p class="text-gray-600">Processing assignments...</p>
        </div>

        <!-- No Underfunded Categories -->
        <div v-else-if="underfundedCategories.length === 0" class="text-center py-8">
          <div class="text-6xl mb-4">🎉</div>
          <p class="text-xl font-semibold text-green-600 mb-2">All Categories Fully Funded!</p>
          <p class="text-gray-600">
            Every category has been assigned the money it needs.
          </p>
        </div>

        <!-- Category List -->
        <div v-else class="space-y-3">
          <div
            v-for="category in underfundedCategories"
            :key="category.id"
            class="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition"
          >
            <!-- Category/Section Info -->
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-semibold text-gray-900">
                  {{ category.name }}
                  <span v-if="category.isSection" class="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Section</span>
                </h3>
                <p class="text-xs text-gray-600 mt-1">
                  Budgeted: {{ formatCurrency(category.allocated) }} •
                  Assigned: {{ formatCurrency(category.assigned) }} •
                  <span class="text-orange-600 font-medium">Need: {{ formatCurrency(category.need) }}</span>
                </p>
              </div>
            </div>

            <!-- Assignment Input -->
            <div class="flex gap-2">
              <div class="relative flex-1">
                <span class="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                <input
                  v-model.number="categoryAssignments[category.id]"
                  type="number"
                  step="0.01"
                  min="0"
                  :max="Math.min(category.need, currentRemainingBalance + (categoryAssignments[category.id] || 0))"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                />
              </div>
              <button
                @click="quickFillCategory(category)"
                class="px-4 py-2 border border-green-600 text-green-600 rounded-lg font-semibold hover:bg-green-50 transition whitespace-nowrap"
              >
                Quick Fill
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <!-- Summary Bar -->
        <div v-if="underfundedCategories.length > 0" class="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <div class="flex justify-between items-center">
            <div>
              <span class="text-sm text-gray-600">Total to Assign:</span>
              <span class="ml-2 text-lg font-bold text-gray-900">{{ formatCurrency(totalToAssign) }}</span>
            </div>
            <div>
              <span class="text-sm text-gray-600">Remaining:</span>
              <span class="ml-2 text-lg font-bold" :class="remainingBalance < 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(remainingBalance) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <button
            @click="close"
            class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            v-if="underfundedCategories.length > 0"
            @click="handleAssignToCategories"
            :disabled="totalToAssign <= 0 || remainingBalance < 0 || isLoading"
            class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
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
import { useAssignmentsStore } from '@/stores/assignments';
import { useBudgetsStore } from '@/stores/budgets';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  assigned: [];
}>();

const assignmentsStore = useAssignmentsStore();
const budgetsStore = useBudgetsStore();

const isLoading = ref(false);
const categoryAssignments = ref<Record<string, number>>({});

const close = () => {
  emit('update:modelValue', false);
};

// Interface for assignable items (categories or sections)
interface AssignableItem {
  id: string; // category_id or section_id
  name: string;
  allocated: number;
  assigned: number;
  need: number;
  isSection: boolean; // true if rollup section, false if category
}

// Get underfunded categories AND rollup sections from budget summary
const underfundedCategories = computed<AssignableItem[]>(() => {
  if (!budgetsStore.currentSummary) return [];

  const items: AssignableItem[] = [];

  for (const section of budgetsStore.currentSummary.sections) {
    // Skip Income section
    if (section.section_type === 'income') continue;

    // If section is in rollup mode and needs money, add the section itself
    if (section.rollup_mode && section.need > 0) {
      items.push({
        id: section.section_id,
        name: section.section_name,
        allocated: section.allocated,
        assigned: section.assigned,
        need: section.need,
        isSection: true
      });
    }

    // Add individual categories that need money (if not rollup)
    if (!section.rollup_mode) {
      for (const category of section.categories) {
        if (!category.is_archived && category.need > 0) {
          items.push({
            id: category.category_id,
            name: `${section.section_name} → ${category.category_name}`,
            allocated: category.allocated,
            assigned: category.assigned,
            need: category.need,
            isSection: false
          });
        }
      }
    }
  }

  // Sort by need (descending)
  return items.sort((a, b) => b.need - a.need);
});

// Calculate total amount to assign
const totalToAssign = computed(() => {
  return Object.values(categoryAssignments.value)
    .reduce((sum, amount) => sum + (amount || 0), 0);
});

// Calculate remaining balance
const remainingBalance = computed(() => {
  return budgetsStore.toBeAssigned - totalToAssign.value;
});

// Current remaining balance (for max validation)
const currentRemainingBalance = computed(() => {
  return budgetsStore.toBeAssigned - totalToAssign.value;
});

// Quick fill a single category or section
function quickFillCategory(item: AssignableItem) {
  // Calculate how much we can assign
  const otherTotal = Object.entries(categoryAssignments.value)
    .filter(([id]) => id !== item.id)
    .reduce((sum, [_, amount]) => sum + (amount || 0), 0);

  const maxAssignable = Math.min(
    item.need,
    budgetsStore.toBeAssigned - otherTotal
  );

  categoryAssignments.value[item.id] = Math.round(maxAssignable * 100) / 100;
}

// Manually assign to categories/sections
async function handleAssignToCategories() {
  if (isLoading.value) return;
  isLoading.value = true;

  // Build assignments array (only non-zero amounts)
  const assignments = Object.entries(categoryAssignments.value)
    .filter(([_, amount]) => amount > 0)
    .map(([id, amount]) => {
      // Find the item to determine if it's a section or category
      const item = underfundedCategories.value.find(c => c.id === id);

      if (!item) {
        throw new Error(`Item ${id} not found`);
      }

      // Return with correct field based on type
      return {
        ...(item.isSection ? { section_id: id } : { category_id: id }),
        amount: Math.round(amount * 100) / 100 // Round to 2 decimals
      };
    });

  if (assignments.length === 0) {
    alert('Please enter at least one assignment');
    isLoading.value = false;
    return;
  }

  if (remainingBalance.value < 0) {
    alert('Cannot assign more than available balance');
    isLoading.value = false;
    return;
  }

  try {
    await assignmentsStore.assignToCategories(
      budgetsStore.currentMonth,
      assignments
    );

    // Refresh budget summary to update all values
    await budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth);

    // Clear assignments and close
    categoryAssignments.value = {};
    emit('assigned');
    close();
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to assign money. Please try again.');
  } finally {
    isLoading.value = false;
  }
}

// Auto-assign all available money
async function handleAutoAssignAll() {
  if (isLoading.value) return;
  if (!confirm('Automatically distribute all available money to underfunded categories?\n\nThis will assign money based on each category\'s need.')) {
    return;
  }

  isLoading.value = true;
  try {
    await assignmentsStore.autoAssignAll(budgetsStore.currentMonth);

    // Refresh budget summary
    await budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth);

    // Clear and close
    categoryAssignments.value = {};
    emit('assigned');
    close();
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to auto-assign. Please try again.');
  } finally {
    isLoading.value = false;
  }
}

// Reset form when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    categoryAssignments.value = {};
  }
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
</script>
