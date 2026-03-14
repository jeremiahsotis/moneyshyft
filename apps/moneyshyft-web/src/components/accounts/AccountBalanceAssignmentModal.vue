<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">Assign Account Balance</h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Account Info -->
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">💰</span>
            <div class="flex-1">
              <div class="font-semibold text-gray-900">{{ account.name }}</div>
              <div class="text-sm text-gray-600">{{ accountTypeLabel(account.type) }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">Balance</div>
              <div class="text-xl font-bold text-green-600">{{ formatCurrency(account.current_balance) }}</div>
            </div>
          </div>
        </div>

        <!-- Choice Step (if not assigning yet) -->
        <div v-if="!isAssigning" class="space-y-4">
          <p class="text-gray-700 mb-6">
            How would you like to handle this balance?
          </p>

          <button
            @click="startAssigning"
            class="w-full p-5 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left group"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition">
                <span class="text-xl">📊</span>
              </div>
              <div class="flex-1">
                <div class="font-semibold text-gray-900 mb-1">Assign to Budget Categories</div>
                <div class="text-sm text-gray-600">
                  Allocate this money to specific budget categories to fund your planned expenses
                </div>
              </div>
            </div>
          </button>

          <button
            @click="skipAssignment"
            class="w-full p-5 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition text-left group"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition">
                <span class="text-xl">⏭️</span>
              </div>
              <div class="flex-1">
                <div class="font-semibold text-gray-900 mb-1">Leave Unassigned for Now</div>
                <div class="text-sm text-gray-600">
                  Add to your "To Be Assigned" pool and allocate it manually later
                </div>
              </div>
            </div>
          </button>
        </div>

        <!-- Assignment Step -->
        <div v-else>
          <!-- Summary Card -->
          <div class="mb-6 p-4 bg-gradient-to-br from-blue-50 to-green-50 border-2 rounded-lg">
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-700">Total Available:</span>
                <span class="text-lg font-bold">{{ formatCurrency(account.current_balance) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-700">Assigned:</span>
                <span class="text-lg font-bold text-blue-600">{{ formatCurrency(totalAssigned) }}</span>
              </div>
              <div class="h-px bg-gray-300 my-2"></div>
              <div class="flex justify-between items-center">
                <span class="font-bold text-gray-900">Remaining:</span>
                <span
                  class="text-xl font-bold"
                  :class="remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'"
                >
                  {{ formatCurrency(remaining) }}
                </span>
              </div>
            </div>

            <p v-if="remaining < 0" class="text-sm text-red-700 mt-3 flex items-start gap-2">
              <span>⚠️</span>
              <span>You've assigned more than available! Please reduce some amounts.</span>
            </p>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingCategories" class="text-center py-8">
            <p class="text-gray-500">Loading categories...</p>
          </div>

          <!-- Categories by Section -->
          <div v-else class="space-y-4 mb-6">
            <div
              v-for="section in sections"
              :key="section.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span v-if="section.type === 'fixed'">🔒</span>
                <span v-else-if="section.type === 'flexible'">🛒</span>
                <span v-else-if="section.type === 'debt'">💳</span>
                {{ section.name }}
              </h3>

              <div class="space-y-2">
                <div
                  v-for="category in section.categories"
                  :key="category.id"
                  class="flex items-center justify-between gap-3 pb-2 border-b border-gray-100 last:border-b-0 last:pb-0"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm text-gray-900">{{ category.name }}</div>
                  </div>

                  <div class="w-32 flex-shrink-0">
                    <div class="relative">
                      <span class="absolute left-2 top-2 text-gray-500 text-sm">$</span>
                      <input
                        v-model.number="assignments[category.id]"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        class="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Info Box -->
          <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <span class="text-xl">💡</span>
              <div class="flex-1 text-sm text-blue-900">
                <p class="font-semibold mb-1">What does this mean?</p>
                <p>
                  You're telling each dollar where to go. This connects your real money to your budget plan.
                  Don't worry if you don't assign everything now - you can always assign more later!
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              @click="cancelAssignment"
              type="button"
              class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              @click="confirmAssignments"
              type="button"
              :disabled="isSaving || remaining < 0"
              class="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSaving ? 'Assigning...' : 'Confirm Assignments' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import api from '@/services/api'
import type { Account } from '@/types'

const props = defineProps<{
  account: Account
}>()

const emit = defineEmits<{
  close: []
  assigned: []
}>()

const categoriesStore = useCategoriesStore()
const isAssigning = ref(false)
const isLoadingCategories = ref(false)
const isSaving = ref(false)
const assignments = ref<Record<string, number>>({})

const sections = computed(() => categoriesStore.activeSections)

const totalAssigned = computed(() => {
  return Object.values(assignments.value).reduce((sum, val) => sum + (val || 0), 0)
})

const remaining = computed(() => {
  return props.account.current_balance - totalAssigned.value
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount) || 0)
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

async function startAssigning() {
  isAssigning.value = true
  isLoadingCategories.value = true

  try {
    await categoriesStore.fetchCategories()
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    isLoadingCategories.value = false
  }
}

function cancelAssignment() {
  isAssigning.value = false
  assignments.value = {}
}

function skipAssignment() {
  // User chose to leave unassigned - just close the modal
  emit('close')
}

async function confirmAssignments() {
  if (remaining.value < 0) {
    alert('You cannot assign more than the available balance. Please adjust your assignments.')
    return
  }

  if (totalAssigned.value === 0) {
    // Nothing to assign
    emit('close')
    return
  }

  isSaving.value = true

  try {
    // Send each assignment to the backend
    for (const [categoryId, amount] of Object.entries(assignments.value)) {
      if (amount > 0) {
        await api.post('/budgets/assign-account-balance', {
          category_id: categoryId,
          account_id: props.account.id,
          amount: amount,
        })
      }
    }

    emit('assigned')
    emit('close')
  } catch (error) {
    console.error('Failed to assign balances:', error)
    alert('There was an error assigning your account balance. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>
