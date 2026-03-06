<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-2 mb-2">
      <h2 class="text-2xl font-bold">Set Up Your Accounts</h2>
      <InfoTooltip text="Accounts show where your money lives so you can budget it." />
    </div>
    <p class="text-gray-600 mb-6">
      Add your bank accounts, credit cards, and cash. We'll collect their current balances so you can assign that money to your budget categories.
    </p>

    <!-- Account list -->
    <div class="space-y-3 mb-6">
      <div
        v-for="(account, index) in localAnswers.accounts"
        :key="index"
        class="border rounded-lg p-4 flex justify-between items-start hover:bg-gray-50 transition"
      >
        <div class="flex-1">
          <div class="font-medium text-gray-900">{{ account.name }}</div>
          <div class="text-sm text-gray-600 mt-1">
            {{ accountTypeLabel(account.type) }} •
            <span :class="account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ formatCurrency(account.current_balance) }}
            </span>
          </div>
        </div>
        <button
          @click="removeAccount(index)"
          type="button"
          class="text-red-600 hover:text-red-800 transition ml-4"
        >
          Remove
        </button>
      </div>

      <div v-if="localAnswers.accounts.length === 0" class="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
        No accounts added yet. Add your first account below to get started!
      </div>
    </div>

    <!-- Add account form -->
    <div class="border-2 border-primary-200 bg-primary-50 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-4 flex items-center gap-2">
        <span>Add Account</span>
        <span class="text-xs bg-primary-600 text-white px-2 py-0.5 rounded">Recommended: Add at least 1 account</span>
      </h3>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Account Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="newAccount.name"
              type="text"
              placeholder="e.g., Chase Checking"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Account Type <span class="text-red-500">*</span>
            </label>
            <select
              v-model="newAccount.type"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="checking">Checking Account</option>
              <option value="savings">Savings Account</option>
              <option value="credit">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="investment">Investment Account</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Current Balance <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-gray-500">$</span>
            <input
              v-model.number="newAccount.current_balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Enter the current balance as shown in your account today.
            <span v-if="newAccount.type === 'credit'">For credit cards, enter the amount you owe as a positive number.</span>
          </p>
        </div>

        <button
          @click="addAccount"
          type="button"
          :disabled="!canAddAccount"
          class="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Account
        </button>
      </div>
    </div>

    <!-- Info box -->
    <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <span class="text-2xl">💡</span>
        <div class="flex-1 text-sm text-blue-900">
          <p class="font-semibold mb-1">Why add accounts now?</p>
          <p>
            Your account balances become money you can assign to your budget categories. This gives you a complete picture of your finances and helps you start budgeting with your actual available money.
          </p>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="localAnswers.accounts.length > 0" class="mt-6 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200">
      <div class="flex justify-between items-center">
        <span class="font-medium text-gray-900">Total Across All Accounts:</span>
        <span class="text-2xl font-bold" :class="totalBalance >= 0 ? 'text-green-600' : 'text-red-600'">
          {{ formatCurrency(totalBalance) }}
        </span>
      </div>
      <p class="text-xs text-gray-600 mt-2">
        {{ localAnswers.accounts.length }} account{{ localAnswers.accounts.length !== 1 ? 's' : '' }} added
      </p>
    </div>

    <!-- Navigation buttons -->
    <div class="flex gap-3 justify-between mt-8">
      <button
        @click="$emit('back')"
        type="button"
        class="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
      >
        ← Back
      </button>

      <button
        @click="$emit('next')"
        type="button"
        class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium"
      >
        Continue →
      </button>
    </div>

    <!-- Skip option -->
    <div class="mt-4 text-center">
      <button
        @click="$emit('next')"
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Not now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import { ref, computed } from 'vue'

interface Account {
  name: string
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment'
  current_balance: number
}

interface WizardAnswers {
  accounts?: Account[]
  [key: string]: any
}

const props = defineProps<{
  answers: Partial<WizardAnswers>
}>()

const emit = defineEmits<{
  'update:answers': [value: Partial<WizardAnswers>]
  next: []
  back: []
}>()

// Initialize with empty accounts array if not present
const localAnswers = ref({
  ...props.answers,
  accounts: props.answers.accounts || []
})
const newAccount = ref<Account>({
  name: '',
  type: 'checking',
  current_balance: 0
})

const canAddAccount = computed(() => {
  return newAccount.value.name.trim().length > 0
})

const totalBalance = computed(() => {
  if (!localAnswers.value.accounts || localAnswers.value.accounts.length === 0) {
    return 0
  }
  return localAnswers.value.accounts.reduce((sum, acc) => sum + acc.current_balance, 0)
})

function addAccount() {
  if (!canAddAccount.value) {
    return
  }

  if (!localAnswers.value.accounts) {
    localAnswers.value.accounts = []
  }

  localAnswers.value.accounts.push({ ...newAccount.value })
  emit('update:answers', localAnswers.value)

  // Reset form
  newAccount.value = {
    name: '',
    type: 'checking',
    current_balance: 0
  }
}

function removeAccount(index: number) {
  if (localAnswers.value.accounts) {
    localAnswers.value.accounts.splice(index, 1)
    emit('update:answers', localAnswers.value)
  }
}

function accountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Checking Account',
    savings: 'Savings Account',
    credit: 'Credit Card',
    cash: 'Cash',
    investment: 'Investment Account'
  }
  return labels[type] || type
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount))
}
</script>
