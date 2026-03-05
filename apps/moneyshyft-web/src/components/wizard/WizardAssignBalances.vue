<template>
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-6">
      <div class="text-5xl mb-3">💰</div>
      <div class="flex items-center justify-center gap-2 mb-2">
        <h2 class="text-2xl font-bold">Assign Your Account Balances</h2>
        <InfoTooltip text="Match your real balances to categories so your budget starts accurate." />
      </div>
      <p class="text-gray-600">
        You have <strong>{{ formatCurrency(totalAccountBalance) }}</strong> across your accounts.
        Let's assign this money to your budget categories to complete your setup.
      </p>
    </div>

    <!-- Summary Card -->
    <div class="bg-gradient-to-br from-blue-50 to-green-50 border-2 rounded-lg p-5 mb-6">
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-700">Total Available:</span>
          <span class="text-xl font-bold">{{ formatCurrency(totalAccountBalance) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-700">Assigned:</span>
          <span class="text-xl font-bold text-blue-600">{{ formatCurrency(totalAssigned) }}</span>
        </div>
        <div class="h-px bg-gray-300 my-2"></div>
        <div class="flex justify-between items-center">
          <span class="font-bold text-gray-900">Remaining to Assign:</span>
          <span
            class="text-2xl font-bold"
            :class="remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'"
          >
            {{ formatCurrency(remaining) }}
          </span>
        </div>
      </div>

      <p v-if="remaining < 0" class="text-sm text-red-700 mt-3 flex items-start gap-2">
        <span>⚠️</span>
        <span>You've assigned more than you have! Please reduce some amounts.</span>
      </p>
      <p v-else-if="remaining > 0" class="text-sm text-orange-700 mt-3 flex items-start gap-2">
        <span>💡</span>
        <span>You still have money to assign. Keep going or leave some unassigned for later.</span>
      </p>
      <p v-else class="text-sm text-green-700 mt-3 flex items-start gap-2">
        <span>✓</span>
        <span>Perfect! You've assigned all your available money.</span>
      </p>
    </div>

    <!-- Quick Assign Buttons -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        @click="assignEqually"
        type="button"
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm"
      >
        Assign Equally
      </button>
      <button
        @click="assignByBudget"
        type="button"
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm"
      >
        Assign by Budget
      </button>
      <button
        @click="clearAssignments"
        type="button"
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm"
      >
        Clear All
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="text-gray-500">Loading categories...</div>
    </div>

    <!-- Categories by Section -->
    <div v-else class="space-y-6 mb-8">
      <div
        v-for="section in sections"
        :key="section.id"
        class="border-2 border-gray-200 rounded-lg p-5 bg-white shadow-sm"
      >
        <h3 class="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
          <span v-if="section.type === 'fixed'">🔒</span>
          <span v-else-if="section.type === 'flexible'">🛒</span>
          <span v-else-if="section.type === 'debt'">💳</span>
          {{ section.name }}
        </h3>

        <div class="space-y-3">
          <div
            v-for="category in section.categories"
            :key="category.id"
            class="flex items-center justify-between gap-4 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900">{{ category.name }}</div>
              <div class="text-sm text-gray-600">
                Budget: {{ formatCurrency(getBudgetAmount(category.name)) }}/month
              </div>
            </div>

            <div class="w-40 flex-shrink-0">
              <div class="relative">
                <span class="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  v-model.number="balanceAssignments[category.id]"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  @input="updateAssignments"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="sections.length === 0" class="text-center py-12 text-gray-500">
        <p>No categories found. This shouldn't happen!</p>
        <p class="text-sm mt-2">Please go back and try again.</p>
      </div>
    </div>

    <!-- Info Box -->
    <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <span class="text-2xl">💡</span>
        <div class="flex-1 text-sm text-blue-900">
          <p class="font-semibold mb-1">What does this mean?</p>
          <p>
            You're telling each dollar where to go. This is the foundation of envelope budgeting -
            every dollar has a job! Don't worry if you don't assign everything now; you can always
            assign more money later as you earn income.
          </p>
        </div>
      </div>
    </div>

    <!-- Navigation buttons -->
    <div class="flex gap-3 justify-between">
      <button
        @click="$emit('back')"
        type="button"
        class="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
      >
        ← Back
      </button>

      <button
        @click="handleNext"
        type="button"
        :disabled="remaining < 0"
        class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue →
      </button>
    </div>

    <!-- Skip option -->
    <div class="mt-4 text-center">
      <button
        @click="handleSkip"
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
import { ref, computed, onMounted } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import type { WizardAnswers } from '@/types'

const props = defineProps<{
  answers: Partial<WizardAnswers>
}>()

const emit = defineEmits<{
  'update:assignments': [value: Record<string, number>]
  next: []
  back: []
}>()

const categoriesStore = useCategoriesStore()
const balanceAssignments = ref<Record<string, number>>({})
const isLoading = ref(true)

// Computed values
const sections = computed(() => categoriesStore.activeSections)

const totalAccountBalance = computed(() => {
  if (!props.answers.accounts || props.answers.accounts.length === 0) {
    return 0
  }
  return props.answers.accounts.reduce((sum, acc) => sum + acc.current_balance, 0)
})

const totalAssigned = computed(() => {
  return Object.values(balanceAssignments.value).reduce((sum, val) => sum + (val || 0), 0)
})

const remaining = computed(() => {
  const diff = totalAccountBalance.value - totalAssigned.value
  return Math.abs(diff) < 0.01 ? 0 : diff
})

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount) || 0)
}

function getBudgetAmount(categoryName: string): number {
  const answers = props.answers

  // Map category names to their budget amounts from wizard answers
  if (categoryName === 'Rent') return answers.housing_amount || 0
  if (categoryName === 'Mortgage') return answers.housing_amount || 0
  if (categoryName === 'Rent/Mortgage') return answers.housing_amount || 0
  if (categoryName.startsWith('Car Payment')) {
    const carPayments = answers.car_payments || []
    return carPayments.reduce((sum, p) => sum + p.amount, 0)
  }
  if (categoryName === 'Insurance' || categoryName.startsWith('Car Insurance')) {
    const insurance = answers.car_insurance_payments || []
    return insurance.reduce((sum, p) => sum + p.amount, 0)
  }
  if (categoryName === 'Utilities') return answers.utilities_estimate || 0
  if (categoryName === 'Minimum Debt Payments') {
    const ccPayments = answers.credit_card_debts?.reduce((sum: number, p: any) => sum + p.minimum_payment, 0) || 0
    const otherPayments = answers.other_debts?.reduce((sum: number, p: any) => sum + p.minimum_payment, 0) || 0
    return ccPayments + otherPayments
  }
  if (categoryName === 'Groceries') return answers.groceries_estimate || 0
  if (categoryName === 'Dining Out') return answers.dining_out_estimate || 0
  if (categoryName === 'Entertainment') return answers.entertainment_estimate || 0
  if (categoryName === 'Entertainment & Recreation') return answers.entertainment_estimate || 0
  if (categoryName === 'Gas & Transportation') return answers.gas_transportation_estimate || 0
  if (categoryName === 'Shopping') return answers.shopping_estimate || 0
  if (categoryName === 'Personal Care') return answers.personal_care_estimate || 0
  if (categoryName === 'Charitable Giving') return answers.charitable_giving_estimate || 0
  if (categoryName === 'Home Improvement / Maintenance') return answers.home_improvement_estimate || 0
  if (categoryName === 'Healthcare / Medical Expenses') return answers.healthcare_medical_estimate || 0
  if (categoryName === 'Pet Care') return answers.pet_care_estimate || 0
  if (categoryName === 'Unplanned Expenses') return answers.unplanned_expenses_estimate || 0
  if (categoryName === 'Gifts') return answers.gifts_estimate || 0
  if (categoryName === 'Fun Money') return answers.fun_money_estimate || 0
  if (categoryName === 'Bank Fees / Charges') return answers.bank_fees_charges_estimate || 0
  if (categoryName === 'Subscriptions') return answers.subscriptions_estimate || 0

  return 0
}

function updateAssignments() {
  emit('update:assignments', balanceAssignments.value)
}

function assignEqually() {
  const allCategories = sections.value.flatMap(s => s.categories || [])
  if (allCategories.length === 0) return

  const perCategory = Math.floor((totalAccountBalance.value / allCategories.length) * 100) / 100

  allCategories.forEach(cat => {
    balanceAssignments.value[cat.id] = perCategory
  })

  updateAssignments()
}

function assignByBudget() {
  const allCategories = sections.value.flatMap(s => s.categories || [])
  if (allCategories.length === 0) return

  // Calculate total budgeted amount
  const totalBudgeted = allCategories.reduce((sum, cat) => sum + getBudgetAmount(cat.name), 0)

  if (totalBudgeted === 0) {
    // If no budget amounts, fall back to equal distribution
    assignEqually()
    return
  }

  // Assign proportionally based on budget amounts
  allCategories.forEach(cat => {
    const budgetAmount = getBudgetAmount(cat.name)
    const proportion = budgetAmount / totalBudgeted
    balanceAssignments.value[cat.id] = Math.round(proportion * totalAccountBalance.value * 100) / 100
  })

  const totalAssigned = Object.values(balanceAssignments.value).reduce((sum, val) => sum + (val || 0), 0)
  const difference = Math.round((totalAccountBalance.value - totalAssigned) * 100) / 100

  if (Math.abs(difference) >= 0.01) {
    const targetCategory = allCategories
      .filter(cat => getBudgetAmount(cat.name) > 0)
      .sort((a, b) => getBudgetAmount(b.name) - getBudgetAmount(a.name))[0] || allCategories[0]

    if (targetCategory) {
      balanceAssignments.value[targetCategory.id] =
        Math.round((balanceAssignments.value[targetCategory.id] + difference) * 100) / 100
    }
  }

  updateAssignments()
}

function clearAssignments() {
  balanceAssignments.value = {}
  updateAssignments()
}

function handleNext() {
  if (remaining.value < 0) {
    alert('You cannot assign more than you have available. Please adjust your assignments.')
    return
  }

  updateAssignments()
  emit('next')
}

function handleSkip() {
  // Clear all assignments and proceed
  balanceAssignments.value = {}
  updateAssignments()
  emit('next')
}

// Load categories on mount
onMounted(async () => {
  try {
    await categoriesStore.fetchCategories()
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    isLoading.value = false
  }
})
</script>
