import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type {
  ExtraMoneyWithAssignments,
  CreateExtraMoneyData,
  AssignExtraMoneyData
} from '@/types';

export const useExtraMoneyStore = defineStore('extraMoney', () => {
  // State
  const entries = ref<ExtraMoneyWithAssignments[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const pendingEntries = computed(() =>
    entries.value.filter(e => e.status === 'pending')
  );

  const assignedEntries = computed(() =>
    entries.value.filter(e => e.status === 'assigned')
  );

  const ignoredEntries = computed(() =>
    entries.value.filter(e => e.status === 'ignored')
  );

  const totalPendingAmount = computed(() =>
    pendingEntries.value.reduce((sum, e) => sum + e.amount, 0)
  );

  const hasPendingEntries = computed(() =>
    pendingEntries.value.length > 0
  );

  // Actions
  async function fetchAllEntries(status?: 'pending' | 'assigned' | 'ignored'): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const params = status ? { status } : {};
      const response = await api.get('/extra-money', { params });
      entries.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch extra money entries';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPendingEntries(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/extra-money/pending');
      entries.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch pending entries';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createEntry(data: CreateExtraMoneyData): Promise<ExtraMoneyWithAssignments> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/extra-money', data);
      const newEntry = response.data.data;

      // Add to local state
      entries.value.unshift(newEntry);

      return newEntry;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create entry';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function assignToCategories(
    entryId: string,
    data: AssignExtraMoneyData
  ): Promise<ExtraMoneyWithAssignments> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post(`/extra-money/${entryId}/assign`, data);
      const updatedEntry = response.data.data;

      // Update in local state
      const index = entries.value.findIndex(e => e.id === entryId);
      if (index !== -1) {
        entries.value[index] = updatedEntry;
      }

      return updatedEntry;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to assign extra money';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function ignoreEntry(entryId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post(`/extra-money/${entryId}/ignore`);
      const updatedEntry = response.data.data;

      // Update in local state
      const index = entries.value.findIndex(e => e.id === entryId);
      if (index !== -1) {
        entries.value[index] = updatedEntry;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to ignore entry';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteEntry(entryId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/extra-money/${entryId}`);

      // Remove from local state
      entries.value = entries.value.filter(e => e.id !== entryId);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete entry';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function runDetectionScan(): Promise<number> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/extra-money/scan');
      const flaggedCount = response.data.flagged_count;

      // Refresh entries to show newly detected items
      await fetchPendingEntries();

      return flaggedCount;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to run detection scan';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    entries,
    isLoading,
    error,
    // Computed
    pendingEntries,
    assignedEntries,
    ignoredEntries,
    totalPendingAmount,
    hasPendingEntries,
    // Actions
    fetchAllEntries,
    fetchPendingEntries,
    createEntry,
    assignToCategories,
    ignoreEntry,
    deleteEntry,
    runDetectionScan,
    clearError
  };
});
