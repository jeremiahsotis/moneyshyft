import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { IncomeAssignment, CreateAssignmentData, AutoAssignmentResult } from '@/types';

export const useAssignmentsStore = defineStore('assignments', () => {
  // State
  const assignments = ref<IncomeAssignment[]>([]);
  const toBeAssigned = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function fetchAssignments(month: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/assignments/${month}`);
      assignments.value = response.data.data.assignments;
      toBeAssigned.value = response.data.data.to_be_assigned;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch assignments';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createAssignment(data: CreateAssignmentData): Promise<IncomeAssignment> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/assignments', data);
      const newAssignment = response.data.data;
      assignments.value.push(newAssignment);

      // Update toBeAssigned
      toBeAssigned.value -= newAssignment.amount;

      return newAssignment;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create assignment';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function autoAssign(incomeTransactionId: string): Promise<AutoAssignmentResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/assignments/auto', {
        income_transaction_id: incomeTransactionId
      });

      const result = response.data.data as AutoAssignmentResult;

      // Refresh assignments to get updated state
      const currentMonth = new Date().toISOString().slice(0, 7);
      await fetchAssignments(currentMonth);

      return result;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to auto-assign';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteAssignment(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/assignments/${id}`);

      // Update local state
      const deleted = assignments.value.find(a => a.id === id);
      if (deleted) {
        toBeAssigned.value += deleted.amount;
      }

      assignments.value = assignments.value.filter(a => a.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete assignment';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getTransactionAssignments(transactionId: string): Promise<IncomeAssignment[]> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/assignments/transaction/${transactionId}`);
      return response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch transaction assignments';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function transferMoney(data: {
    from_category_id?: string;
    from_section_id?: string;
    to_category_id?: string;
    to_section_id?: string;
    amount: number;
    month: string;
    notes?: string;
  }): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.post('/assignments/transfer', data);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to transfer money';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function assignToCategories(
    month: string,
    categoryAssignments: { category_id?: string; section_id?: string; amount: number }[]
  ): Promise<AutoAssignmentResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/assignments/assign-to-categories', {
        month,
        assignments: categoryAssignments
      });

      const result = response.data.data as AutoAssignmentResult;

      // Refresh assignments to get updated state
      await fetchAssignments(month);

      return result;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to assign to categories';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function autoAssignAll(month: string): Promise<AutoAssignmentResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/assignments/auto-assign-all', { month });

      const result = response.data.data as AutoAssignmentResult;

      // Refresh assignments to get updated state
      await fetchAssignments(month);

      return result;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to auto-assign all';
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
    assignments,
    toBeAssigned,
    isLoading,
    error,

    // Actions
    fetchAssignments,
    createAssignment,
    autoAssign,
    deleteAssignment,
    getTransactionAssignments,
    transferMoney,
    assignToCategories,
    autoAssignAll,
    clearError,
  };
});
