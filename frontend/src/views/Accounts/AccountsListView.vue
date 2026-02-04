<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Accounts</h1>
        <div class="flex space-x-3">
          <button
            @click="showTransferModal = true"
            class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
          >
            Transfer Money
          </button>
          <button
            @click="showAddModal = true"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
          >
            + Add Account
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="accountsStore.isLoading && accounts.length === 0" class="text-center py-12">
        <p class="text-gray-500">Loading accounts...</p>
      </div>

      <!-- Accounts Grid -->
      <div v-else-if="accounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AccountCard
          v-for="account in accounts"
          :key="account.id"
          :account="account"
          @view-transactions="viewTransactions"
          @view-credit-status="viewCreditStatus"
          @edit="editAccount"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <p class="text-gray-500 mb-4">No accounts yet. Create your first account to get started!</p>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          + Add Your First Account
        </button>
      </div>

      <!-- Credit Card Status Modal -->
      <div
        v-if="showCreditStatus"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeCreditStatus"
      >
        <div class="max-w-md w-full">
          <CreditCardStatusCard :status="creditStatus" @close="closeCreditStatus" />
        </div>
      </div>

      <!-- Add/Edit Account Modal -->
      <div
        v-if="showAddModal || editingAccount"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 class="text-xl font-semibold mb-4">
            {{ editingAccount ? 'Edit Account' : 'Add Account' }}
          </h2>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Chase Checking"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select
                v-model="formData.type"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="investment">Investment</option>
              </select>
            </div>
            <div v-if="!editingAccount">
              <label class="block text-sm font-medium text-gray-700 mb-1">Starting Balance</label>
              <input
                v-model.number="formData.starting_balance"
                type="number"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div class="flex gap-2 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="accountsStore.isLoading"
                class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {{ editingAccount ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Balance Assignment Modal -->
      <AccountBalanceAssignmentModal
        v-if="showBalanceAssignment && newlyCreatedAccount"
        :account="newlyCreatedAccount"
        @close="closeBalanceAssignmentModal"
        @assigned="handleBalanceAssigned"
      />
      <!-- Transfer Modal -->
      <TransferModal
        v-if="showTransferModal"
        :accounts="accounts"
        @close="showTransferModal = false"
        @success="handleTransferSuccess"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountsStore } from '@/stores/accounts';
import { useBudgetsStore } from '@/stores/budgets';
import AppLayout from '@/components/layout/AppLayout.vue';
import AccountCard from '@/components/accounts/AccountCard.vue';
import CreditCardStatusCard from '@/components/accounts/CreditCardStatusCard.vue';
import AccountBalanceAssignmentModal from '@/components/accounts/AccountBalanceAssignmentModal.vue';
import TransferModal from '@/components/Transfers/TransferModal.vue';
import type { Account, CreateAccountData, CreditCardStatus } from '@/types';

const router = useRouter();
const accountsStore = useAccountsStore();
const budgetsStore = useBudgetsStore();

const showAddModal = ref(false);
const showTransferModal = ref(false);
const editingAccount = ref<Account | null>(null);
const showCreditStatus = ref(false);
const creditStatus = ref<CreditCardStatus | null>(null);
const showBalanceAssignment = ref(false);
const newlyCreatedAccount = ref<Account | null>(null);

const formData = ref<CreateAccountData>({
  name: '',
  type: 'checking',
  starting_balance: 0,
});

const accounts = computed(() => accountsStore.accounts);

onMounted(async () => {
  await accountsStore.fetchAccounts();
});

function viewTransactions(accountId: string) {
  router.push({ name: 'transactions', query: { account_id: accountId } });
}

async function viewCreditStatus(accountId: string) {
  try {
    creditStatus.value = await accountsStore.getCreditCardStatus(accountId);
    showCreditStatus.value = true;
  } catch (error) {
    console.error('Failed to load credit card status:', error);
  }
}

function closeCreditStatus() {
  showCreditStatus.value = false;
  creditStatus.value = null;
}

function editAccount(account: Account) {
  editingAccount.value = account;
  formData.value = {
    name: account.name,
    type: account.type,
    is_active: account.is_active,
  };
}

function closeModal() {
  showAddModal.value = false;
  editingAccount.value = null;
  formData.value = {
    name: '',
    type: 'checking',
    starting_balance: 0,
  };
}

async function handleSubmit() {
  try {
    if (editingAccount.value) {
      await accountsStore.updateAccount(editingAccount.value.id, formData.value);
      closeModal();
    } else {
      // Create new account
      const newAccount = await accountsStore.createAccount(formData.value);
      closeModal();

      // If account has a positive balance, prompt for balance assignment
      if (newAccount && newAccount.current_balance > 0) {
        newlyCreatedAccount.value = newAccount;
        showBalanceAssignment.value = true;
      }
    }
  } catch (error) {
    console.error('Failed to save account:', error);
  }
}

function closeBalanceAssignmentModal() {
  showBalanceAssignment.value = false;
  newlyCreatedAccount.value = null;
}

async function handleBalanceAssigned() {
  // Refresh budget to show updated assignments
  const currentMonth = new Date().toISOString().slice(0, 7);
  await budgetsStore.fetchBudgetSummary(currentMonth);
}

async function handleTransferSuccess() {
  // Refresh accounts to show updated balances
  await accountsStore.fetchAccounts();
}
</script>
