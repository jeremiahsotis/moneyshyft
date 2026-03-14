import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';
import type {
  RecurringTransaction,
  RecurringTransactionInstance,
  CreateRecurringData,
  UpdateRecurringData,
  UpdateInstanceData,
  SkipInstanceData,
  UserPreferences
} from '../types';

export const useRecurringStore = defineStore('recurring', () => {
  // State
  const templates = ref<RecurringTransaction[]>([]);
  const pendingInstances = ref<RecurringTransactionInstance[]>([]);
  const allInstances = ref<RecurringTransactionInstance[]>([]);
  const userPreferences = ref<UserPreferences | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const activeTemplates = computed(() =>
    templates.value.filter(t => t.is_active)
  );

  const overdueInstances = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pendingInstances.value.filter(i => {
      const dueDate = new Date(i.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && i.status === 'pending';
    });
  });

  const dueTodayInstances = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pendingInstances.value.filter(i => {
      const dueDate = new Date(i.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime() && i.status === 'pending';
    });
  });

  const thisWeekInstances = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return pendingInstances.value.filter(i => {
      const dueDate = new Date(i.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate > today && dueDate <= endOfWeek && i.status === 'pending';
    });
  });

  const pendingCount = computed(() =>
    pendingInstances.value.filter(i => i.status === 'pending').length
  );

  // Template Actions
  async function fetchRecurring(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;
      const response = await api.get('/recurring-transactions');
      templates.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch recurring transactions';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getRecurring(id: string): Promise<RecurringTransaction> {
    try {
      const response = await api.get(`/recurring-transactions/${id}`);
      return response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch recurring transaction';
      throw err;
    }
  }

  async function createRecurring(data: CreateRecurringData): Promise<RecurringTransaction> {
    try {
      isLoading.value = true;
      error.value = null;
      const response = await api.post('/recurring-transactions', data);
      const newTemplate = response.data.data;

      templates.value.unshift(newTemplate);

      // Generate pending instances for the new template
      await generateInstances(newTemplate.id, 30);

      return newTemplate;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create recurring transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateRecurring(id: string, data: UpdateRecurringData): Promise<RecurringTransaction> {
    try {
      isLoading.value = true;
      error.value = null;
      const response = await api.patch(`/recurring-transactions/${id}`, data);
      const updated = response.data.data;

      const index = templates.value.findIndex(t => t.id === id);
      if (index !== -1) {
        templates.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update recurring transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteRecurring(id: string): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;
      await api.delete(`/recurring-transactions/${id}`);

      const index = templates.value.findIndex(t => t.id === id);
      if (index !== -1) {
        templates.value[index].is_active = false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete recurring transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function toggleAutoPost(id: string): Promise<RecurringTransaction> {
    try {
      const response = await api.post(`/recurring-transactions/${id}/toggle-auto-post`);
      const updated = response.data.data;

      const index = templates.value.findIndex(t => t.id === id);
      if (index !== -1) {
        templates.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to toggle auto-post';
      throw err;
    }
  }

  async function generateInstances(id: string, daysAhead: number = 30): Promise<void> {
    try {
      await api.post(`/recurring-transactions/${id}/generate-instances`, { days_ahead: daysAhead });
      // Refresh pending instances
      await fetchPendingInstances(daysAhead);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to generate instances';
      throw err;
    }
  }

  // Instance Actions
  async function fetchPendingInstances(daysAhead: number = 7): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;
      const response = await api.get(`/recurring-transactions/instances/pending?days=${daysAhead}`);
      pendingInstances.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch pending instances';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllInstances(status?: string): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;
      const url = status
        ? `/recurring-transactions/instances/all?status=${status}`
        : '/recurring-transactions/instances/all';
      const response = await api.get(url);
      allInstances.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch instances';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function approveInstance(id: string): Promise<RecurringTransactionInstance> {
    try {
      const response = await api.post(`/recurring-transactions/instances/${id}/approve`);
      const updated = response.data.data;

      // Update in pending list
      const index = pendingInstances.value.findIndex(i => i.id === id);
      if (index !== -1) {
        if (updated.status === 'posted') {
          // Remove from pending if auto-posted
          pendingInstances.value.splice(index, 1);
        } else {
          pendingInstances.value[index] = updated;
        }
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to approve instance';
      throw err;
    }
  }

  async function skipInstance(id: string, data?: SkipInstanceData): Promise<RecurringTransactionInstance> {
    try {
      const response = await api.post(`/recurring-transactions/instances/${id}/skip`, data || {});
      const updated = response.data.data;

      // Remove from pending list
      const index = pendingInstances.value.findIndex(i => i.id === id);
      if (index !== -1) {
        pendingInstances.value.splice(index, 1);
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to skip instance';
      throw err;
    }
  }

  async function postInstance(id: string): Promise<RecurringTransactionInstance> {
    try {
      const response = await api.post(`/recurring-transactions/instances/${id}/post`);
      const updated = response.data.data;

      // Remove from pending list since it's now posted
      const index = pendingInstances.value.findIndex(i => i.id === id);
      if (index !== -1) {
        pendingInstances.value.splice(index, 1);
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to post instance';
      throw err;
    }
  }

  async function updateInstance(id: string, data: UpdateInstanceData): Promise<RecurringTransactionInstance> {
    try {
      const response = await api.patch(`/recurring-transactions/instances/${id}`, data);
      const updated = response.data.data;

      const index = pendingInstances.value.findIndex(i => i.id === id);
      if (index !== -1) {
        pendingInstances.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update instance';
      throw err;
    }
  }

  async function batchApprove(ids: string[]): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      // Approve all instances in parallel
      await Promise.all(ids.map(id => approveInstance(id)));

    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to batch approve instances';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // User Preferences Actions
  async function fetchPreferences(): Promise<void> {
    try {
      const response = await api.get('/users/preferences');
      userPreferences.value = response.data.data;
    } catch (err: any) {
      // Preferences might not exist yet, that's ok
      if (err.response?.status !== 404) {
        error.value = err.response?.data?.error || 'Failed to fetch preferences';
      }
    }
  }

  async function updatePreferences(data: Partial<UserPreferences>): Promise<void> {
    try {
      const response = await api.patch('/users/preferences', data);
      userPreferences.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update preferences';
      throw err;
    }
  }

  // Helper to get frequency display name
  function getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[frequency] || frequency;
  }

  // Helper to get next N occurrences for preview
  function getNextOccurrences(template: RecurringTransaction, count: number = 5): string[] {
    const dates: string[] = [];
    let currentDate = new Date(template.next_occurrence);

    for (let i = 0; i < count; i++) {
      // Check if past end date
      if (template.end_date && currentDate > new Date(template.end_date)) {
        break;
      }

      dates.push(currentDate.toISOString().split('T')[0]);

      // Calculate next occurrence (simplified - server has full logic)
      switch (template.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }

      // Skip weekends if enabled (simplified)
      if (template.skip_weekends) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0) { // Sunday
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (dayOfWeek === 6) { // Saturday
          currentDate.setDate(currentDate.getDate() + 2);
        }
      }
    }

    return dates;
  }

  return {
    // State
    templates,
    pendingInstances,
    allInstances,
    userPreferences,
    isLoading,
    error,

    // Computed
    activeTemplates,
    overdueInstances,
    dueTodayInstances,
    thisWeekInstances,
    pendingCount,

    // Actions
    fetchRecurring,
    getRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    toggleAutoPost,
    generateInstances,
    fetchPendingInstances,
    fetchAllInstances,
    approveInstance,
    skipInstance,
    postInstance,
    updateInstance,
    batchApprove,
    fetchPreferences,
    updatePreferences,

    // Helpers
    getFrequencyLabel,
    getNextOccurrences
  };
});
