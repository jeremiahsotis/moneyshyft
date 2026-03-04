import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type { Goal, CreateGoalData, UpdateGoalData, GoalContribution, AddContributionData } from '@/types';

export const useGoalsStore = defineStore('goals', () => {
  // State
  const goals = ref<Goal[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const activeGoals = computed(() => {
    return goals.value.filter(g => !g.is_completed);
  });

  const completedGoals = computed(() => {
    return goals.value.filter(g => g.is_completed);
  });

  const totalGoalsAmount = computed(() => {
    return activeGoals.value.reduce((sum, g) => sum + Number(g.target_amount), 0);
  });

  const totalSavedAmount = computed(() => {
    return activeGoals.value.reduce((sum, g) => sum + Number(g.current_amount), 0);
  });

  const overallProgress = computed(() => {
    if (totalGoalsAmount.value === 0) return 0;
    return (totalSavedAmount.value / totalGoalsAmount.value) * 100;
  });

  // Actions
  async function fetchGoals(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/goals');
      goals.value = response.data.data.map((goal: Goal) => ({
        ...goal,
        target_amount: Number(goal.target_amount),
        current_amount: Number(goal.current_amount),
        progress_percentage: goal.progress_percentage || 0,
      }));
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch goals';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createGoal(data: CreateGoalData): Promise<Goal> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/goals', data);
      const newGoal = {
        ...response.data.data,
        target_amount: Number(response.data.data.target_amount),
        current_amount: Number(response.data.data.current_amount),
      };
      goals.value.unshift(newGoal);
      return newGoal;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create goal';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/goals/${id}`, data);
      const updated = {
        ...response.data.data,
        target_amount: Number(response.data.data.target_amount),
        current_amount: Number(response.data.data.current_amount),
      };

      const index = goals.value.findIndex(g => g.id === id);
      if (index !== -1) {
        goals.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update goal';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteGoal(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/goals/${id}`);
      goals.value = goals.value.filter(g => g.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete goal';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function addContribution(goalId: string, data: AddContributionData): Promise<Goal> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post(`/goals/${goalId}/contributions`, data);
      const updated = {
        ...response.data.data,
        target_amount: Number(response.data.data.target_amount),
        current_amount: Number(response.data.data.current_amount),
      };

      const index = goals.value.findIndex(g => g.id === goalId);
      if (index !== -1) {
        goals.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add contribution';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getGoalContributions(goalId: string): Promise<GoalContribution[]> {
    try {
      const response = await api.get(`/goals/${goalId}/contributions`);
      return response.data.data.map((contrib: GoalContribution) => ({
        ...contrib,
        amount: Number(contrib.amount),
      }));
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch contributions';
      throw err;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    goals,
    isLoading,
    error,
    // Computed
    activeGoals,
    completedGoals,
    totalGoalsAmount,
    totalSavedAmount,
    overallProgress,
    // Actions
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    getGoalContributions,
    clearError,
  };
});
