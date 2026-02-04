<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Transactions</h1>
        <div class="flex gap-2">
          <button
            @click="$router.push('/recurring-transactions')"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            📅 Manage Recurring
          </button>
          <button
            @click="showTransferModal = true"
            class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
          >
            Transfer Money
          </button>
          <button
            @click="showAddModal = true"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
            data-testid="transactions-add-button"
          >
            + Add Transaction
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="transactionsStore.isLoading && transactions.length === 0" class="text-center py-12">
        <p class="text-gray-500">Loading transactions...</p>
      </div>

      <TransactionFilters @update:filters="handleFilterUpdate" />

      <!-- Transactions List -->
      <div v-if="transactions.length > 0 && !transactionsStore.isLoading" class="bg-white rounded-lg shadow">
        <div
          v-for="transaction in transactions"
          :key="transaction.id"
          class="p-4 border-b last:border-b-0 hover:bg-gray-50"
          :data-testid="`transaction-row-${transaction.id}`"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-medium text-gray-900">{{ transaction.payee }}</h3>
                <span
                  v-if="transaction.is_cleared"
                  class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded"
                >
                  Cleared
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1">
                {{ formatDate(transaction.transaction_date) }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                <span>Account: {{ getAccountName(transaction.account_id) }}</span>
                <span class="mx-1">•</span>
                <span>Category: {{ getCategoryName(transaction.category_id) }}</span>
                <template v-if="getTagLabel(transaction.tag_id)">
                  <span class="mx-1">•</span>
                  <span>Tag: {{ getTagLabel(transaction.tag_id) }}</span>
                </template>
              </p>
              <p v-if="transaction.notes" class="text-sm text-gray-600 mt-1">
                {{ transaction.notes }}
              </p>

              <!-- Split Indicator (async loaded when needed) -->
              <div v-if="!transaction.is_split_child && transaction.parent_transaction_id === null" class="mt-2">
                <TransactionSplitIndicator
                  v-if="splitDetailsCache.has(transaction.id)"
                  :splits="splitDetailsCache.get(transaction.id) || []"
                  :categories="allCategories"
                />
                <button
                  v-else-if="transaction.category_id === null"
                  @click="getSplitDetails(transaction.id)"
                  class="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Show splits
                </button>
              </div>
            </div>
            <div class="text-right">
              <p
                :class="transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'"
                class="font-semibold privacy-value"
              >
                {{ formatCurrency(transaction.amount) }}
              </p>
              <div class="flex gap-2 justify-end mt-1 flex-wrap">
                <button
                  @click="editTransaction(transaction)"
                  class="text-xs text-gray-600 hover:text-gray-900"
                >
                  Edit
                </button>
                <button
                  v-if="!transaction.is_cleared"
                  @click="clearTransaction(transaction.id)"
                  class="text-xs text-primary-600 hover:text-primary-700"
                >
                  Mark Cleared
                </button>

                <!-- Split Actions -->
                <button
                  v-if="transaction.category_id === null && !transaction.is_split_child"
                  @click="openEditSplitModal(transaction)"
                  class="text-xs text-blue-600 hover:text-blue-700"
                  data-testid="transaction-edit-split-button"
                >
                  Edit Splits
                </button>
                <button
                  v-else-if="!transaction.is_split_child && transaction.parent_transaction_id === null"
                  @click="openSplitModal(transaction)"
                  class="text-xs text-blue-600 hover:text-blue-700"
                  data-testid="transaction-split-button"
                >
                  Split
                </button>
                <button
                  v-if="transaction.category_id === null && !transaction.is_split_child"
                  @click="unsplitTransaction(transaction)"
                  class="text-xs text-red-600 hover:text-red-700"
                  data-testid="transaction-unsplit-button"
                >
                  Unsplit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!transactionsStore.isLoading" class="text-center py-12">
        <p class="text-gray-500 mb-4">No transactions yet. Add your first transaction!</p>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
          data-testid="transactions-add-button"
        >
          + Add Transaction
        </button>
      </div>

      <!-- Add Transaction Modal -->
      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
        data-testid="transaction-modal"
      >
        <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-semibold mb-4">
            {{ editingTransaction ? 'Edit Transaction' : 'Add Transaction' }}
          </h2>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                v-model="formData.account_id"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                data-testid="transaction-account"
              >
                <option value="">Select an account</option>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Payee</label>
              <input
                v-model="formData.payee"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Whole Foods"
                data-testid="transaction-payee"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div class="flex gap-2 mb-4">
                <button
                  type="button"
                  @click="transactionType = 'expense'"
                  :class="transactionType === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'"
                  class="flex-1 py-2 px-4 rounded-lg font-medium hover:opacity-90 transition"
                >
                  Expense
                </button>
                <button
                  type="button"
                  @click="transactionType = 'income'"
                  :class="transactionType === 'income' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'"
                  class="flex-1 py-2 px-4 rounded-lg font-medium hover:opacity-90 transition"
                >
                  Income
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                v-model.number="formAmount"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
                data-testid="transaction-amount"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                v-model="formData.transaction_date"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                data-testid="transaction-date"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                v-model="formData.category_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                data-testid="transaction-category"
              >
                <option :value="null">Uncategorized</option>
                <optgroup v-for="section in activeSections" :key="section.id" :label="section.name">
                  <option
                    v-for="category in section.categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </optgroup>
              </select>

              <!-- Add Category Button -->
              <button
                v-if="!showAddCategory"
                type="button"
                @click="showAddCategory = true"
                class="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + New Category
              </button>

              <!-- Inline Category Creation Form -->
              <div v-if="showAddCategory" class="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 class="text-sm font-medium text-gray-900 mb-3">Create New Category</h4>
                <div class="space-y-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Section</label>
                    <select
                      v-model="newCategoryData.section_id"
                      required
                      class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a section</option>
                      <option v-for="section in sections" :key="section.id" :value="section.id">
                        {{ section.name }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                      v-model="newCategoryData.name"
                      type="text"
                      required
                      class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Groceries"
                    />
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button
                      type="button"
                      @click="cancelAddCategory"
                      class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      @click="handleCreateCategory"
                      :disabled="!newCategoryData.section_id || !newCategoryData.name"
                      class="flex-1 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tag (optional)</label>
              <select
                v-model="formData.tag_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option :value="null">No tag</option>
                <option
                  v-for="option in tagOptions"
                  :key="option.id"
                  :value="option.id"
                  :class="option.isParent ? 'tag-option-parent' : ''"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div v-if="activeGoals.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Link to Goal (optional)
              </label>
              <select
                v-model="selectedGoalId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option :value="null">No goal</option>
                <option
                  v-for="goal in activeGoals"
                  :key="goal.id"
                  :value="goal.id"
                >
                  {{ goal.name }} ({{ formatCurrency(goal.current_amount) }} / {{ formatCurrency(goal.target_amount) }})
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                This transaction will count as a contribution to the selected goal
              </p>
            </div>

            <!-- Debt Selector - only show when "Debt Payments" category is selected -->
            <div v-if="selectedCategory?.name === 'Debt Payments' && activeDebts.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Which Debt? (optional)
              </label>
              <select
                v-model="formData.debt_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option :value="null">General debt payment</option>
                <option
                  v-for="debt in activeDebts"
                  :key="debt.id"
                  :value="debt.id"
                >
                  {{ debt.name }} ({{ formatCurrency(debt.current_balance) }} remaining)
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                This transaction will be recorded as a payment to the selected debt
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                v-model="formData.notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Add any notes..."
                data-testid="transaction-notes"
              ></textarea>
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
                :disabled="transactionsStore.isLoading"
                class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
                data-testid="transaction-submit"
              >
                {{ editingTransaction ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Split Transaction Modal -->
    <SplitTransactionModal
      v-model="showSplitModal"
      :transaction="splitTransaction"
      :account-name="splitTransaction ? (accounts.find(a => a.id === splitTransaction?.account_id)?.name || '') : ''"
      :categories-by-section="categoriesBySection"
      :is-edit="isEditingSplit"
      :existing-splits="existingSplits"
      @submit="handleSplitSubmit"
    />

    <ExtraMoneyModal
      v-model="showExtraMoneyModal"
      :entry="detectedExtraMoneyEntry"
      @update:modelValue="handleExtraMoneyModalUpdate"
    />

    <!-- Transfer Modal -->
    <TransferModal
      v-if="showTransferModal"
      :accounts="accounts"
      @close="showTransferModal = false"
      @success="handleTransferSuccess"
    />
  </AppLayout>
</template>



<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTransactionsStore } from '@/stores/transactions';
import { useCelebrationStore } from '@/stores/celebration';
import { useAccountsStore } from '@/stores/accounts';
import { useCategoriesStore } from '@/stores/categories';
import { useGoalsStore } from '@/stores/goals';
import { useDebtsStore } from '@/stores/debts';
import { useTagsStore } from '@/stores/tags';
import AppLayout from '@/components/layout/AppLayout.vue';
import SplitTransactionModal from '@/components/transactions/SplitTransactionModal.vue';
import ExtraMoneyModal from '@/components/extraMoney/ExtraMoneyModal.vue';
import TransactionSplitIndicator from '@/components/transactions/TransactionSplitIndicator.vue';
import TransferModal from '@/components/Transfers/TransferModal.vue';
import TransactionFilters from '@/components/transactions/TransactionFilters.vue';
import { formatDate } from '@/utils/dateUtils';
import type { CreateTransactionData, Transaction, SplitData, ExtraMoneyWithAssignments } from '@/types';

const route = useRoute();
const transactionsStore = useTransactionsStore();
const celebrationStore = useCelebrationStore();
const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();
const goalsStore = useGoalsStore();
const debtsStore = useDebtsStore();
const tagsStore = useTagsStore();

const showAddModal = ref(false);
const showTransferModal = ref(false);
const showExtraMoneyModal = ref(false);
const editingTransaction = ref<Transaction | null>(null);
const transactionType = ref<'expense' | 'income'>('expense');
const formAmount = ref(0);
const detectedExtraMoneyEntry = ref<ExtraMoneyWithAssignments | null>(null);
const pendingTransactionClose = ref(false);

// Filter state
const activeFilters = ref({});

function handleFilterUpdate(filters: any) {
  activeFilters.value = filters;
  fetchTransactions();
}

async function fetchTransactions() {
  const params: any = { ...activeFilters.value };
  if (route.query.account_id) {
    params.account_id = route.query.account_id as string;
  }
  await transactionsStore.fetchTransactions(params);
}

// Category creation state
const showAddCategory = ref(false);
const newCategoryData = ref({
  section_id: '',
  name: '',
});

// Goal selection state
const selectedGoalId = ref<string | null>(null);

// Debt selection state
const selectedDebtId = ref<string | null>(null);

// Split transaction state
const showSplitModal = ref(false);
const splitTransaction = ref<Transaction | null>(null);
const existingSplits = ref<SplitData[]>([]);
const isEditingSplit = ref(false);
const splitDetailsCache = ref<Map<string, SplitData[]>>(new Map());

const formData = ref<CreateTransactionData>({
  account_id: '',
  payee: '',
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  category_id: null,
  tag_id: null,
  debt_id: null,  // NEW: Debt link
  notes: '',
});

const transactions = computed(() => transactionsStore.transactions);
const accounts = computed(() => accountsStore.accounts);
const sections = computed(() => categoriesStore.sections);
const activeSections = computed(() => {
  return sections.value.map(section => ({
    ...section,
    categories: (section.categories || []).filter(category => !category.is_archived)
  }));
});
const tags = computed(() => tagsStore.tags);
const activeGoals = computed(() => goalsStore.goals.filter(g => !g.is_completed));
const activeDebts = computed(() => debtsStore.activeDebts);

// Get selected category to check if it's "Debt Payments"
const selectedCategory = computed(() => {
  if (!formData.value.category_id) return null;
  for (const section of sections.value) {
    const category = section.categories?.find(c => c.id === formData.value.category_id);
    if (category) return category;
  }
  return null;
});

const selectedCategorySectionName = computed(() => {
  if (!formData.value.category_id) return null;
  for (const section of sections.value) {
    const category = section.categories?.find(c => c.id === formData.value.category_id);
    if (category) return section.name;
  }
  return null;
});

// Computed properties for split components
const categoriesBySection = computed(() => {
  return activeSections.value.map(section => ({
    id: section.id,
    name: section.name,
    categories: section.categories || []
  }));
});

const tagOptions = computed(() => {
  const parents = tags.value.filter(tag => !tag.parent_tag_id);
  const children = tags.value.filter(tag => tag.parent_tag_id);
  const childrenByParent = new Map<string, typeof children>();

  children.forEach(tag => {
    if (!tag.parent_tag_id) return;
    if (!childrenByParent.has(tag.parent_tag_id)) {
      childrenByParent.set(tag.parent_tag_id, []);
    }
    childrenByParent.get(tag.parent_tag_id)!.push(tag);
  });

  const options: Array<{ id: string; label: string; isParent: boolean }> = [];
  parents.forEach(parent => {
    options.push({ id: parent.id, label: parent.name, isParent: true });
    const kids = childrenByParent.get(parent.id) || [];
    kids.forEach(child => {
      options.push({
        id: child.id,
        label: `${parent.name} / ${child.name}`,
        isParent: false
      });
    });
  });

  return options;
});

const allCategories = computed(() => {
  return sections.value.flatMap(section => section.categories || []);
});

onMounted(async () => {
  await Promise.all([
    fetchTransactions(),
    accountsStore.fetchAccounts(),
    categoriesStore.fetchCategories(),
    tagsStore.fetchTags(),
    goalsStore.fetchGoals(),
    debtsStore.fetchDebts(),  // NEW: Load debts
  ]);

  if (route.query.account_id) {
    formData.value.account_id = route.query.account_id as string;
  }
});

watch(selectedCategorySectionName, (sectionName) => {
  if (sectionName === 'Income') {
    transactionType.value = 'income';
  }
});

function closeModal() {
  showAddModal.value = false;
  editingTransaction.value = null;
  transactionType.value = 'expense';
  formAmount.value = 0;
  selectedGoalId.value = null;
  selectedDebtId.value = null;  // NEW: Reset debt selection
  formData.value = {
    account_id: route.query.account_id ? (route.query.account_id as string) : '',
    payee: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: null,
    tag_id: null,
    debt_id: null,  // NEW: Reset debt link
    notes: '',
  };

  // Reset category creation form
  cancelAddCategory();
}

async function handleSubmit() {
  try {
    // Apply sign based on transaction type
    const isIncomeCategory = selectedCategorySectionName.value === 'Income';
    const amount = isIncomeCategory
      ? Math.abs(formAmount.value)
      : (transactionType.value === 'expense' ? -Math.abs(formAmount.value) : Math.abs(formAmount.value));

    let transaction;
    let extraMoneyEntry = null;
    if (editingTransaction.value) {
      // Update existing transaction
      transaction = await transactionsStore.updateTransaction(editingTransaction.value.id, {
        ...formData.value,
        amount,
      });
    } else {
      // Create new transaction
      const result = await transactionsStore.createTransaction({
        ...formData.value,
        amount,
      });
      transaction = result.transaction;
      extraMoneyEntry = result.extra_money_entry;
      updateTransactionStreak(formData.value.transaction_date);
    }

    // If a goal is selected, create a contribution
    if (selectedGoalId.value && transaction) {
      await goalsStore.addContribution(selectedGoalId.value, {
        amount: Math.abs(formAmount.value), // Use positive amount for contributions
        transaction_id: transaction.id,
        notes: formData.value.notes || `Contribution from transaction: ${formData.value.payee}`,
      });
    }

    if (extraMoneyEntry) {
      detectedExtraMoneyEntry.value = {
        ...extraMoneyEntry,
        assignments: []
      };
      pendingTransactionClose.value = true;
      showExtraMoneyModal.value = true;
      return;
    }

    closeModal();
  } catch (error) {
    console.error('Failed to save transaction:', error);
  }
}

function updateTransactionStreak(transactionDate: string) {
  const dateKey = transactionDate || new Date().toISOString().split('T')[0];
  const lastDate = localStorage.getItem('msyft_last_txn_date');
  const streakRaw = localStorage.getItem('msyft_txn_streak') || '0';
  let streak = Number(streakRaw) || 0;

  if (lastDate === dateKey) {
    return;
  }

  const last = lastDate ? new Date(lastDate) : null;
  const current = new Date(dateKey);
  const dayMs = 24 * 60 * 60 * 1000;

  if (last && Math.round((current.getTime() - last.getTime()) / dayMs) === 1) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem('msyft_last_txn_date', dateKey);
  localStorage.setItem('msyft_txn_streak', String(streak));

  const label = streak === 1 ? '1-day streak' : `${streak}-day streak`;
  celebrationStore.show(`Nice work! ${label}.`, '🔥');
}

async function clearTransaction(id: string) {
  try {
    await transactionsStore.clearTransaction(id);
  } catch (error) {
    console.error('Failed to clear transaction:', error);
  }
}

function editTransaction(transaction: Transaction) {
  editingTransaction.value = transaction;
  showAddModal.value = true;

  // Pre-populate form with transaction data
  formData.value = {
    account_id: transaction.account_id,
    payee: transaction.payee,
    amount: Math.abs(transaction.amount),
    transaction_date: transaction.transaction_date,
    category_id: transaction.category_id,
    tag_id: transaction.tag_id ?? null,
    notes: transaction.notes || '',
  };

  // Set transaction type based on amount sign
  transactionType.value = transaction.amount < 0 ? 'expense' : 'income';
  formAmount.value = Math.abs(transaction.amount);
}

async function handleCreateCategory() {
  try {
    if (!newCategoryData.value.section_id || !newCategoryData.value.name) {
      return;
    }

    const newCategory = await categoriesStore.createCategory({
      section_id: newCategoryData.value.section_id,
      name: newCategoryData.value.name,
    });

    // Automatically select the newly created category
    formData.value.category_id = newCategory.id;

    // Reset and hide the form
    cancelAddCategory();
  } catch (error) {
    console.error('Failed to create category:', error);
  }
}

function cancelAddCategory() {
  showAddCategory.value = false;
  newCategoryData.value = {
    section_id: '',
    name: '',
  };
}

// Split Transaction Functions
async function openSplitModal(transaction: Transaction) {
  splitTransaction.value = transaction;
  isEditingSplit.value = false;
  existingSplits.value = [];
  showSplitModal.value = true;
}

async function openEditSplitModal(transaction: Transaction) {
  splitTransaction.value = transaction;
  isEditingSplit.value = true;

  try {
    const result = await transactionsStore.getSplits(transaction.id);
    existingSplits.value = result.splits.map(split => ({
      category_id: split.category_id || '',
      amount: split.amount,
      notes: split.notes
    }));
    splitDetailsCache.value.set(transaction.id, existingSplits.value);
    showSplitModal.value = true;
  } catch (error) {
    console.error('Failed to load splits:', error);
  }
}

async function handleSplitSubmit(splits: SplitData[]) {
  if (!splitTransaction.value) return;

  try {
    if (isEditingSplit.value) {
      await transactionsStore.updateSplits(splitTransaction.value.id, splits);
    } else {
      await transactionsStore.splitTransaction(splitTransaction.value.id, splits);
    }

    // Refresh transactions to show updated state
    await transactionsStore.fetchTransactions();
    showSplitModal.value = false;
  } catch (error: any) {
    console.error('Failed to save split:', error);
    alert(error.response?.data?.error || 'Failed to save split transaction');
  }
}

async function unsplitTransaction(transaction: Transaction) {
  if (!confirm('Are you sure you want to unsplit this transaction? This will remove all category splits.')) {
    return;
  }

  try {
    await transactionsStore.unsplitTransaction(transaction.id);
    splitDetailsCache.value.delete(transaction.id);
    await transactionsStore.fetchTransactions();
  } catch (error: any) {
    console.error('Failed to unsplit transaction:', error);
    alert(error.response?.data?.error || 'Failed to unsplit transaction');
  }
}

async function getSplitDetails(transactionId: string): Promise<SplitData[]> {
  if (splitDetailsCache.value.has(transactionId)) {
    return splitDetailsCache.value.get(transactionId)!;
  }

  try {
    const result = await transactionsStore.getSplits(transactionId);
    const splits = result.splits.map(split => ({
      category_id: split.category_id || '',
      amount: split.amount,
      notes: split.notes
    }));
    splitDetailsCache.value.set(transactionId, splits);
    return splits;
  } catch (error) {
    console.error('Failed to load split details:', error);
    return [];
  }
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absAmount);
  return amount < 0 ? `-${formatted}` : formatted;
}

function getAccountName(accountId: string): string {
  return accounts.value.find(account => account.id === accountId)?.name || 'Unknown Account';
}

function getCategoryName(categoryId: string | null): string {
  if (!categoryId) return 'Uncategorized';
  for (const section of sections.value) {
    const category = section.categories?.find(c => c.id === categoryId);
    if (category) return category.name;
  }
  return 'Uncategorized';
}

function getTagLabel(tagId?: string | null): string | null {
  if (!tagId) return null;
  const tag = tags.value.find(t => t.id === tagId);
  if (!tag) return null;
  if (!tag.parent_tag_id) return tag.name;
  const parent = tags.value.find(t => t.id === tag.parent_tag_id);
  return parent ? `${parent.name} / ${tag.name}` : tag.name;
}



async function handleTransferSuccess() {
  // Refresh transactions and accounts
  await Promise.all([
    fetchTransactions(),
    accountsStore.fetchAccounts()
  ]);
}

function finalizeExtraMoneyFlow() {
  detectedExtraMoneyEntry.value = null;
  if (pendingTransactionClose.value) {
    pendingTransactionClose.value = false;
    closeModal();
  }
}

function handleExtraMoneyModalUpdate(value: boolean) {
  showExtraMoneyModal.value = value;
  if (!value) {
    finalizeExtraMoneyFlow();
  }
}
</script>

<style scoped>
.tag-option-parent {
  font-weight: 600;
}
</style>
