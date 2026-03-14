import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { Transaction, CreateTransactionData, SplitData, SplitResult, TransactionCreateResult, ExtraMoneyEntry } from '@/types';

export const useTransactionsStore = defineStore('transactions', () => {
  // State
  const transactions = ref<Transaction[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function fetchTransactions(params?: {
    account_id?: string;
    category_id?: string;
    start_date?: string;
    end_date?: string;
    min_amount?: number;
    max_amount?: number;
    search?: string;
    type?: string;
  }): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/transactions', { params });
      transactions.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch transactions';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createTransaction(data: CreateTransactionData): Promise<TransactionCreateResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/transactions', data);
      const responseData = response.data.data as Transaction & {
        extra_money_detected?: boolean;
        extra_money_entry?: ExtraMoneyEntry | null;
      };
      const newTransaction = responseData;
      transactions.value.unshift(newTransaction);
      return {
        transaction: newTransaction,
        extra_money_detected: responseData.extra_money_detected ?? false,
        extra_money_entry: responseData.extra_money_entry ?? null
      };
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTransaction(id: string, data: Partial<CreateTransactionData>): Promise<Transaction> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/transactions/${id}`, data);
      const updatedTransaction = response.data.data;
      const index = transactions.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        transactions.value[index] = updatedTransaction;
      }
      return updatedTransaction;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTransaction(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/transactions/${id}`);
      transactions.value = transactions.value.filter((t) => t.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function clearTransaction(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/transactions/${id}/clear`);
      const updatedTransaction = response.data.data;
      const index = transactions.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        transactions.value[index] = updatedTransaction;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to clear transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  // Split Transaction Actions
  async function splitTransaction(id: string, splits: SplitData[]): Promise<SplitResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post(`/transactions/${id}/split`, { splits });
      const result = response.data.data;

      // Update the parent transaction in the local state
      const index = transactions.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        transactions.value[index] = result.parent;
      }

      return result;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to split transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getSplits(id: string): Promise<SplitResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/transactions/${id}/splits`);
      return response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to get split details';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateSplits(id: string, splits: SplitData[]): Promise<SplitResult> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/transactions/${id}/splits`, { splits });
      const result = response.data.data;

      // Update the parent transaction in the local state
      const index = transactions.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        transactions.value[index] = result.parent;
      }

      return result;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update splits';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function unsplitTransaction(id: string, categoryId?: string | null): Promise<Transaction> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.delete(`/transactions/${id}/split`, {
        data: { category_id: categoryId }
      });
      const unsplitTransaction = response.data.data;

      // Update the transaction in the local state
      const index = transactions.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        transactions.value[index] = unsplitTransaction;
      }

      return unsplitTransaction;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to unsplit transaction';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    transactions,
    isLoading,
    error,
    // Actions
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    clearTransaction,
    clearError,
    // Split Actions
    splitTransaction,
    getSplits,
    updateSplits,
    unsplitTransaction,
  };
});
