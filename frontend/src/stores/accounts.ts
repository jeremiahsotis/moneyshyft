import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { Account, CreateAccountData } from '@/types';

export const useAccountsStore = defineStore('accounts', () => {
  // State
  const accounts = ref<Account[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function fetchAccounts(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/accounts');
      accounts.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch accounts';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createAccount(data: CreateAccountData): Promise<Account> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/accounts', data);
      const newAccount = response.data.data;
      accounts.value.push(newAccount);
      return newAccount;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create account';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateAccount(id: string, data: Partial<CreateAccountData>): Promise<Account> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/accounts/${id}`, data);
      const updatedAccount = response.data.data;
      const index = accounts.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        accounts.value[index] = updatedAccount;
      }
      return updatedAccount;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update account';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteAccount(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/accounts/${id}`);
      accounts.value = accounts.value.filter((a) => a.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete account';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getCreditCardStatus(id: string): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/accounts/${id}/credit-card-status`);
      return response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch credit card status';
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
    accounts,
    isLoading,
    error,
    // Actions
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getCreditCardStatus,
    clearError,
  };
});
