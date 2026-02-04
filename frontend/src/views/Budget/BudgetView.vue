<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Month Selector -->
      <BudgetMonthSelector
        :current-month="budgetsStore.currentMonth"
        :unallocated="budgetsStore.toBeAssigned"
        @month-change="handleMonthChange"
      />

      <!-- "To Be Assigned" Header -->
      <div class="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <p class="text-sm opacity-90">Ready to Assign</p>
              <InfoTooltip text="Unassigned cash available to plan for this month." />
            </div>
            <h2 class="text-4xl font-bold privacy-value">
              {{ formatCurrency(budgetsStore.toBeAssigned) }}
            </h2>
            <p class="text-sm opacity-75 mt-2">
              Available to assign to categories
            </p>
          </div>
          <button
            v-if="budgetsStore.toBeAssigned > 0"
            @click="showAssignmentModal = true"
            class="px-6 py-3 bg-white text-green-600 hover:bg-gray-100 rounded-lg font-semibold transition shadow-md"
          >
            Assign Money
          </button>
        </div>

        <!-- Income Summary Grid -->
        <div class="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-xs opacity-75">Planned Income</p>
              <InfoTooltip text="What you expect to earn this month based on income sources." />
            </div>
            <p class="text-lg font-semibold privacy-value">
              {{ formatCurrency(budgetsStore.totalPlannedIncome) }}
            </p>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <p class="text-xs opacity-75">Actual Income</p>
              <InfoTooltip text="Income recorded from transactions so far this month." />
            </div>
            <p class="text-lg font-semibold privacy-value" :class="budgetsStore.incomeVariance >= 0 ? '' : 'text-red-200'">
              {{ formatCurrency(budgetsStore.totalRealIncome) }}
            </p>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <p class="text-xs opacity-75">Difference</p>
              <InfoTooltip text="Actual income minus planned income for this month." />
            </div>
            <p class="text-sm font-medium privacy-value" :class="budgetsStore.incomeVariance >= 0 ? 'text-green-200' : 'text-red-200'">
              {{ budgetsStore.incomeVariance >= 0 ? '+' : '' }}{{ formatCurrency(budgetsStore.incomeVariance) }}
            </p>
          </div>
        </div>

        <div v-if="budgetsStore.toBeAssigned === 0" class="mt-4 p-3 bg-white/20 rounded-lg">
          <p class="text-sm">
            ✨ Budget balanced! You’re ready for anything this month.
          </p>
        </div>
        <div v-else-if="budgetsStore.toBeAssigned < 0" class="mt-4 p-3 bg-white/20 rounded-lg">
          <p class="text-sm">
            Your plan is ahead of available cash. No stress—adjust a category or add income when it arrives.
          </p>
        </div>
      </div>

      <!-- Income Sources Section -->
      <div class="mt-6 bg-white rounded-lg shadow">
        <div
          @click="showIncomeSection = !showIncomeSection"
          class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">💰</span>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Monthly Income</h3>
              <p class="text-sm text-gray-600">
                {{ incomeStore.activeSources.length }} income source{{ incomeStore.activeSources.length !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-xl font-bold text-primary-600 privacy-value">
              {{ formatCurrency(incomeStore.totalMonthlyIncome) }}
            </span>
            <svg
              :class="['w-5 h-5 text-gray-400 transition-transform', showIncomeSection ? 'rotate-180' : '']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div v-if="showIncomeSection" class="border-t border-gray-200 p-4">
          <!-- Add Income Button -->
          <div class="mb-3">
            <button
              @click="showAddIncome = true"
              class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition font-medium"
            >
              + Add Income Source
            </button>
          </div>

          <div v-if="incomeStore.activeSources.length === 0" class="text-center py-4">
            <p class="text-sm text-gray-500">No income sources added yet</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="source in incomeStore.activeSources"
              :key="source.id"
              class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
            >
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ source.name }}</p>
                <p v-if="source.notes" class="text-sm text-gray-600 mt-1">{{ source.notes }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-lg font-semibold text-gray-900 privacy-value">
                  {{ formatCurrency(source.monthly_amount) }}
                </span>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    @click="editIncome(source)"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    @click="deleteIncome(source)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span class="font-semibold text-gray-900">Total Monthly Income:</span>
              <span class="text-xl font-bold text-primary-600 privacy-value">
                {{ formatCurrency(incomeStore.totalMonthlyIncome) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget what matters header -->
      <div class="my-6 text-center">
        <h2 class="text-xl font-semibold text-gray-900">
          Budget what matters
        </h2>
        <p class="text-sm text-gray-600 mt-1">
          Your budget automatically carries forward each month
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="budgetsStore.isLoading" class="text-center py-12">
        <p class="text-gray-500">Loading budget...</p>
      </div>

      <!-- Error State -->
      <div v-if="budgetsStore.error || categoriesStore.error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <p class="text-red-800">{{ budgetsStore.error || categoriesStore.error }}</p>
        <button
          @click="refreshBudget"
          class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>

      <!-- Budget Sections -->
      <div v-else class="space-y-6">
        <!-- No sections message -->
        <div v-if="allSections.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-600 mb-4">No budget sections yet. Let's get started!</p>
          <p class="text-sm text-gray-500">
            Tip: Create sections for Fixed Expenses, Variable Expenses, Flexible Spending, and Debt Payments
          </p>
        </div>

        <!-- Fixed Sections -->
        <div v-for="section in fixedSections" :key="section.id">
          <BudgetSection
            v-if="section.name !== 'Income'"
            :section="section"
            :summary="getSectionSummary(section.id)"
            @update-allocation="handleUpdateAllocation"
            @update-assigned="handleUpdateAssigned"
            @refresh="refreshBudget"
          />
        </div>

        <!-- Flexible Sections -->
        <div v-for="section in flexibleSections" :key="section.id">
          <BudgetSection
            v-if="section.name !== 'Income'"
            :section="section"
            :summary="getSectionSummary(section.id)"
            @update-allocation="handleUpdateAllocation"
            @update-assigned="handleUpdateAssigned"
            @refresh="refreshBudget"
          />
        </div>

        <!-- Debt Payments Section (Virtual) -->
        <div v-if="debtSection" class="bg-white rounded-lg shadow">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="text-3xl">💳</span>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Debt Payments</h3>
                  <p class="text-sm text-gray-600">Monthly debt payment progress</p>
                </div>
              </div>
              <router-link
                to="/debts"
                class="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition"
              >
                View Details →
              </router-link>
            </div>

            <!-- Motivational Message -->
            <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-800">
                💡 Keep making progress on your debt!
              </p>
            </div>

            <!-- Debt Summary Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
              <div>
                <p class="text-xs text-gray-600 mb-1">Planned</p>
                <p class="text-lg font-semibold text-gray-900 privacy-value">
                  {{ formatCurrency(debtSection.allocated) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 mb-1">Assigned</p>
                <p class="text-lg font-semibold text-blue-600 privacy-value">
                  {{ formatCurrency(debtSection.assigned) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 mb-1">Spent</p>
                <p class="text-lg font-semibold text-orange-600 privacy-value">
                  {{ formatCurrency(debtSection.spent) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 mb-1">Available</p>
                <p class="text-lg font-semibold privacy-value" :class="debtSection.available >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ formatCurrency(debtSection.available) }}
                </p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div v-if="debtSection.allocated > 0" class="mt-4">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                  :style="{ width: Math.min((debtSection.assigned / debtSection.allocated) * 100, 100) + '%' }"
                ></div>
              </div>
              <p class="text-xs text-gray-600 mt-2 text-center">
                <span class="privacy-value">{{ formatCurrency(debtSection.assigned) }}</span> of <span class="privacy-value">{{ formatCurrency(debtSection.allocated) }}</span> assigned this month
              </p>
            </div>

            <!-- Need More Message -->
            <div v-if="debtSection.need > 0" class="mt-3 text-center">
              <p class="text-sm text-orange-600 font-medium">
                Need <span class="privacy-value">{{ formatCurrency(debtSection.need) }}</span> more to reach budget
              </p>
            </div>
          </div>
        </div>

        <!-- Goals Section (Virtual) -->
        <div v-if="goalsSection" class="bg-white rounded-lg shadow">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="text-3xl">🎯</span>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Goals</h3>
                  <p class="text-sm text-gray-600">Monthly savings contributions</p>
                </div>
              </div>
              <router-link
                to="/goals"
                class="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition"
              >
                View Details →
              </router-link>
            </div>

            <!-- Goals Summary Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg">
              <div>
                <p class="text-xs text-gray-600 mb-1">Planned</p>
                <p class="text-lg font-semibold text-gray-900 privacy-value">
                  {{ formatCurrency(goalsSection.allocated) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 mb-1">Contributed</p>
                <p class="text-lg font-semibold text-green-600 privacy-value">
                  {{ formatCurrency(goalsSection.assigned) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 mb-1">Progress</p>
                <p class="text-lg font-semibold text-primary-600">
                  {{ goalsSection.allocated > 0 ? Math.round((goalsSection.assigned / goalsSection.allocated) * 100) : 0 }}%
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-600 mb-1">Still Needed</p>
                <p class="text-lg font-semibold privacy-value" :class="goalsSection.need > 0 ? 'text-orange-600' : 'text-gray-400'">
                  {{ formatCurrency(goalsSection.need) }}
                </p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div v-if="goalsSection.allocated > 0" class="mt-4">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all"
                  :style="{ width: Math.min((goalsSection.assigned / goalsSection.allocated) * 100, 100) + '%' }"
                ></div>
              </div>
              <p class="text-xs text-gray-600 mt-2 text-center">
                <span class="privacy-value">{{ formatCurrency(goalsSection.assigned) }}</span> of <span class="privacy-value">{{ formatCurrency(goalsSection.allocated) }}</span> saved this month
              </p>
            </div>
          </div>
        </div>

        <!-- Add Section Button -->
        <button
          @click="showAddSection = true"
          class="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition font-medium"
        >
          + Add Section
        </button>
      </div>

      <!-- Summary Card (sticky bottom on mobile) -->
      <div v-if="budgetsStore.currentSummary" class="mt-6 bg-white rounded-lg shadow p-4 sticky bottom-20 md:relative md:bottom-0">
        <div class="flex justify-between items-center">
          <span class="font-medium" title="Total of all category plans for the month">Total Planned:</span>
          <span class="text-xl font-bold text-primary-600 privacy-value">
            {{ formatCurrency(budgetsStore.totalAllocated) }}
          </span>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="font-medium" title="Actual spending recorded this month">Total Spent:</span>
          <span class="text-xl font-bold privacy-value" :class="spentColor">
            {{ formatCurrency(budgetsStore.totalSpent) }}
          </span>
        </div>
        <div v-if="budgetsStore.toBeAssigned !== 0" class="mt-3 pt-3 border-t border-gray-200 text-center">
          <span :class="budgetsStore.toBeAssigned > 0 ? 'text-yellow-600' : 'text-red-600'">
            {{ budgetsStore.toBeAssigned > 0 ? 'Ready to plan' : 'Over-planned' }}:
            <span class="font-bold privacy-value">{{ formatCurrency(Math.abs(budgetsStore.toBeAssigned)) }}</span>
          </span>
          <p v-if="budgetsStore.toBeAssigned < 0" class="text-xs text-gray-500 mt-1">
            It’s okay to be over-planned—adjust when you’re ready.
          </p>
        </div>
      </div>
    </div>

    <!-- Add Section Modal -->
    <AddSectionModal
      v-model="showAddSection"
      @submit="handleAddSection"
    />

    <!-- Manage Income Modal -->
    <ManageIncomeModal
      v-model="showAddIncome"
      :income="editingIncome"
      @submit="handleIncomeSaved"
    />

    <!-- Assignment Modal -->
    <AssignmentModal
      v-model="showAssignmentModal"
      @assigned="handleAssigned"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBudgetsStore } from '@/stores/budgets';
import { useCategoriesStore } from '@/stores/categories';
import { useIncomeStore } from '@/stores/income';
import { useAssignmentsStore } from '@/stores/assignments';
import { useUndoStore } from '@/stores/undo';
import AppLayout from '@/components/layout/AppLayout.vue';
import BudgetMonthSelector from '@/components/budget/BudgetMonthSelector.vue';
import BudgetSection from '@/components/budget/BudgetSection.vue';
import AddSectionModal from '@/components/budget/AddSectionModal.vue';
import ManageIncomeModal from '@/components/budget/ManageIncomeModal.vue';
import AssignmentModal from '@/components/budget/AssignmentModal.vue';
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import type { IncomeSource } from '@/types';

const budgetsStore = useBudgetsStore();
const categoriesStore = useCategoriesStore();
const incomeStore = useIncomeStore();
const assignmentsStore = useAssignmentsStore();
const undoStore = useUndoStore();

const showAddSection = ref(false);
const showIncomeSection = ref(false);
const showAddIncome = ref(false);
const showAssignmentModal = ref(false);
const editingIncome = ref<IncomeSource | null>(null);

const allSections = computed(() => categoriesStore.sections);

const fixedSections = computed(() =>
  categoriesStore.sections.filter(s => s.type === 'fixed')
);

const flexibleSections = computed(() =>
  categoriesStore.sections.filter(s => s.type === 'flexible')
);


const goalsSection = computed(() =>
  budgetsStore.currentSummary?.sections?.find(s => s.section_type === 'goals')
);

// Aggregate all debt sections into a single virtual section
const debtSection = computed(() => {
  const debtSections = budgetsStore.currentSummary?.sections?.filter(s => s.section_type === 'debt') || [];

  if (debtSections.length === 0) return null;

  // Aggregate metrics from all debt sections
  return {
    section_type: 'debt',
    section_name: 'Debt Payments',
    allocated: debtSections.reduce((sum, s) => sum + s.allocated, 0),
    assigned: debtSections.reduce((sum, s) => sum + s.assigned, 0),
    spent: debtSections.reduce((sum, s) => sum + s.spent, 0),
    available: debtSections.reduce((sum, s) => sum + s.available, 0),
    need: debtSections.reduce((sum, s) => sum + s.need, 0),
  };
});

const spentColor = computed(() => {
  if (!budgetsStore.currentSummary) return 'text-gray-900';
  if (budgetsStore.totalSpent > budgetsStore.totalAllocated) return 'text-red-600';
  return 'text-gray-900';
});

onMounted(async () => {
  await refreshBudget();
});

async function refreshBudget() {
  await Promise.all([
    categoriesStore.fetchCategories(),
    budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth),
    incomeStore.fetchIncomeSources(),
  ]);
}

async function handleMonthChange(newMonth: string) {
  budgetsStore.setCurrentMonth(newMonth);
  await budgetsStore.fetchBudgetSummary(newMonth);
}

async function handleUpdateAllocation(data: {
  categoryId?: string;
  sectionId?: string;
  amount: number;
  rollupMode: boolean;
}) {
  try {
    await budgetsStore.setAllocation(budgetsStore.currentMonth, {
      category_id: data.categoryId,
      section_id: data.sectionId,
      allocated_amount: data.amount,
      rollup_mode: data.rollupMode,
    });
  } catch (error) {
    console.error('Failed to update allocation:', error);
    // Error is already set in store
  }
}

async function handleUpdateAssigned(_data: { categoryId?: string; sectionId?: string; amount: number; rollupMode: boolean }) {
  // For now, show message that user should use Assign Money modal
  // Inline editing of "Assigned" is complex because assignments are tied to income transactions
  alert('To assign money to categories, please use the "Assign Money" button above.');

  // Refresh to reset the display
  await refreshBudget();

  // TODO: Implement proper assignment update logic
  // This would require either:
  // 1. Creating/deleting income assignments to match the new amount
  // 2. Adding a backend endpoint that handles bulk assignment updates
}

async function handleAddSection(data: { name: string; type: 'fixed' | 'flexible' | 'debt' }) {
  try {
    console.log('Creating section with data:', data);
    await categoriesStore.createSection(data);
    console.log('Section created successfully');
    // Refresh budget summary to include new section
    await budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth);
  } catch (error: any) {
    console.error('Failed to add section:', error);
    console.error('Error details:', error.response?.data);
    const details = error.response?.data?.details;
    if (details && Array.isArray(details)) {
      console.error('Validation details:', details);
      alert(`Validation failed: ${details.map((d: any) => d.message).join(', ')}`);
    } else {
      alert(`Failed to create section: ${error.response?.data?.error || error.message}`);
    }
  }
}

function getSectionSummary(sectionId: string) {
  return budgetsStore.currentSummary?.sections?.find(s => s.section_id === sectionId);
}

function editIncome(source: IncomeSource) {
  editingIncome.value = source;
  showAddIncome.value = true;
}

async function deleteIncome(source: IncomeSource) {
  if (!confirm(`Are you sure you want to delete "${source.name}"? This action cannot be undone.`)) {
    return;
  }

  const sourceId = source.id;
  const sourceName = source.name;
  undoStore.schedule({
    message: `Deleting "${sourceName}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await incomeStore.deleteIncomeSource(sourceId);
        // Refresh budget to update unallocated income
        await budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth);
      } catch (error) {
        console.error('Failed to delete income source:', error);
        alert('Failed to delete income source. Please try again.');
      }
    },
  });
}

async function handleIncomeSaved() {
  editingIncome.value = null;
  // Refresh budget to update unallocated income
  await budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth);
}

async function handleAssigned() {
  // Refresh both budget and assignments after money is assigned
  await Promise.all([
    budgetsStore.fetchBudgetSummary(budgetsStore.currentMonth),
    assignmentsStore.fetchAssignments(budgetsStore.currentMonth)
  ]);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
