import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type { BudgetSummary, BudgetAllocation } from '@/types';

// Helper function to get current month in local timezone
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper function to add/subtract months without timezone issues
function addMonths(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  let newYear = year;
  let newMonth = month + delta;

  // Handle month overflow/underflow
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }

  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }

  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

export const useBudgetsStore = defineStore('budgets', () => {
  // State
  const currentMonth = ref<string>(getCurrentYearMonth()); // YYYY-MM format
  const currentSummary = ref<BudgetSummary | null>(null);
  const allocations = ref<BudgetAllocation[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed - Income
  const totalPlannedIncome = computed(() => {
    return currentSummary.value?.total_planned_income || 0;
  });

  const totalRealIncome = computed(() => {
    return currentSummary.value?.total_real_income || 0;
  });

  const incomeVariance = computed(() => {
    return currentSummary.value?.income_variance || 0;
  });

  // Computed - Budget
  const totalAllocated = computed(() => {
    return currentSummary.value?.total_allocated || 0;
  });

  const totalAssigned = computed(() => {
    return currentSummary.value?.total_assigned || 0;
  });

  const toBeAssigned = computed(() => {
    return currentSummary.value?.to_be_assigned || 0;
  });

  // Computed - Spending
  const totalSpent = computed(() => {
    return currentSummary.value?.total_spent || 0;
  });

  const totalRemaining = computed(() => {
    return currentSummary.value?.total_remaining || 0;
  });

  const totalAvailable = computed(() => {
    return currentSummary.value?.total_available || 0;
  });

  // Actions
  async function fetchBudgetSummary(month: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/budgets/${month}/summary`);
      console.log('Budget Summary Response:', response.data.data);
      console.log('Envelope Fields:', {
        total_planned_income: response.data.data.total_planned_income,
        total_real_income: response.data.data.total_real_income,
        total_assigned: response.data.data.total_assigned,
        to_be_assigned: response.data.data.to_be_assigned
      });
      console.log('RAW VALUES:',
        'planned=', response.data.data.total_planned_income,
        'real=', response.data.data.total_real_income,
        'assigned=', response.data.data.total_assigned,
        'TBA=', response.data.data.to_be_assigned
      );
      currentSummary.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch budget summary';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllocations(month: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/budgets/${month}/allocations`);
      allocations.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch allocations';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function setAllocation(
    month: string,
    data: {
      category_id?: string;
      section_id?: string;
      allocated_amount: number;
      rollup_mode: boolean;
      notes?: string;
    }
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.post(`/budgets/${month}/allocations`, data);
      // Refresh summary after updating
      await fetchBudgetSummary(month);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to set allocation';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  // Month Navigation
  function setCurrentMonth(month: string): void {
    currentMonth.value = month;
  }

  function nextMonth(): string {
    const newMonth = addMonths(currentMonth.value, 1);
    currentMonth.value = newMonth;
    return newMonth;
  }

  function previousMonth(): string {
    const newMonth = addMonths(currentMonth.value, -1);
    currentMonth.value = newMonth;
    return newMonth;
  }

  function getCurrentMonthDisplay(): string {
    const date = new Date(currentMonth.value + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return {
    // State
    currentMonth,
    currentSummary,
    allocations,
    isLoading,
    error,
    // Computed - Income
    totalPlannedIncome,
    totalRealIncome,
    incomeVariance,
    // Computed - Budget
    totalAllocated,
    totalAssigned,
    toBeAssigned,
    // Computed - Spending
    totalSpent,
    totalRemaining,
    totalAvailable,
    // Actions
    fetchBudgetSummary,
    fetchAllocations,
    setAllocation,
    clearError,
    // Month Navigation
    setCurrentMonth,
    nextMonth,
    previousMonth,
    getCurrentMonthDisplay,
  };
});
