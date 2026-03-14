import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type {
  Debt,
  CreateDebtData,
  UpdateDebtData,
  DebtPayment,
  AddDebtPaymentData,
  StrategyComparison,
} from '@/types';

export const useDebtsStore = defineStore('debts', () => {
  // State
  const debts = ref<Debt[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const strategyComparison = ref<StrategyComparison | null>(null);

  // Computed
  const activeDebts = computed(() => {
    return debts.value.filter(d => !d.is_paid_off);
  });

  const paidOffDebts = computed(() => {
    return debts.value.filter(d => d.is_paid_off);
  });

  const totalDebt = computed(() => {
    return activeDebts.value.reduce((sum, d) => sum + Number(d.current_balance), 0);
  });

  const totalMinimumPayments = computed(() => {
    return activeDebts.value.reduce((sum, d) => sum + Number(d.minimum_payment), 0);
  });

  const highestInterestRate = computed(() => {
    if (activeDebts.value.length === 0) return 0;
    return Math.max(...activeDebts.value.map(d => Number(d.interest_rate)));
  });

  const totalPaidOff = computed(() => {
    return paidOffDebts.value.reduce((sum, d) => sum + Number(d.current_balance || 0), 0);
  });

  const progressPercentage = computed(() => {
    const total = activeDebts.value.reduce((sum, d) => {
      const original = d.original_balance || d.current_balance;
      return sum + Number(original);
    }, 0);

    const remaining = totalDebt.value;

    if (total === 0) return 0;
    return ((total - remaining) / total) * 100;
  });

  // Actions
  async function fetchDebts(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/debts');
      debts.value = response.data.data.debts.map((debt: Debt) => ({
        ...debt,
        current_balance: Number(debt.current_balance),
        original_balance: debt.original_balance ? Number(debt.original_balance) : null,
        interest_rate: Number(debt.interest_rate),
        minimum_payment: Number(debt.minimum_payment),
      }));
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch debts';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createDebt(data: CreateDebtData): Promise<Debt> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/debts', data);
      const newDebt = {
        ...response.data.data,
        current_balance: Number(response.data.data.current_balance),
        original_balance: response.data.data.original_balance ? Number(response.data.data.original_balance) : null,
        interest_rate: Number(response.data.data.interest_rate),
        minimum_payment: Number(response.data.data.minimum_payment),
      };
      debts.value.unshift(newDebt);
      return newDebt;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create debt';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateDebt(id: string, data: UpdateDebtData): Promise<Debt> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/debts/${id}`, data);
      const updated = {
        ...response.data.data,
        current_balance: Number(response.data.data.current_balance),
        original_balance: response.data.data.original_balance ? Number(response.data.data.original_balance) : null,
        interest_rate: Number(response.data.data.interest_rate),
        minimum_payment: Number(response.data.data.minimum_payment),
      };

      const index = debts.value.findIndex(d => d.id === id);
      if (index !== -1) {
        debts.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update debt';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteDebt(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/debts/${id}`);
      debts.value = debts.value.filter(d => d.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete debt';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function addPayment(debtId: string, data: AddDebtPaymentData): Promise<Debt> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post(`/debts/${debtId}/payments`, data);
      const updated = {
        ...response.data.data,
        current_balance: Number(response.data.data.current_balance),
        original_balance: response.data.data.original_balance ? Number(response.data.data.original_balance) : null,
        interest_rate: Number(response.data.data.interest_rate),
        minimum_payment: Number(response.data.data.minimum_payment),
      };

      const index = debts.value.findIndex(d => d.id === debtId);
      if (index !== -1) {
        debts.value[index] = updated;
      }

      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add payment';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getPaymentHistory(debtId: string): Promise<DebtPayment[]> {
    try {
      const response = await api.get(`/debts/${debtId}/payments`);
      return response.data.data.map((payment: DebtPayment) => ({
        ...payment,
        amount: Number(payment.amount),
      }));
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch payment history';
      throw err;
    }
  }

  async function calculatePayoffStrategy(monthlyBudget: number): Promise<StrategyComparison> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/debts/calculate-payoff', {
        monthly_payment_budget: monthlyBudget,
      });
      strategyComparison.value = response.data.data;
      return response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to calculate payoff strategy';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  function clearStrategyComparison(): void {
    strategyComparison.value = null;
  }

  async function commitPaymentPlan(data: {
    method: 'snowball' | 'avalanche';
    total_monthly_payment: number;
    debts: Array<{
      debt_id: string;
      payment_amount: number;
      order: number;
      minimum_payment: number;
    }>;
  }): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.post('/debts/commit-plan', data);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to commit payment plan';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getActivePaymentPlan(): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/debts/active-plan');
      return response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch active payment plan';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    debts,
    isLoading,
    error,
    strategyComparison,
    // Computed
    activeDebts,
    paidOffDebts,
    totalDebt,
    totalMinimumPayments,
    highestInterestRate,
    totalPaidOff,
    progressPercentage,
    // Actions
    fetchDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    addPayment,
    getPaymentHistory,
    calculatePayoffStrategy,
    commitPaymentPlan,
    getActivePaymentPlan,
    clearError,
    clearStrategyComparison,
  };
});
