<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900">💰 Extra Money Tracker</h1>
            <InfoTooltip text="Track irregular income and decide how to allocate it." />
          </div>
          <p class="text-sm text-gray-600">Manage irregular income like bonuses, tax refunds & gifts</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="showCreateModal = true"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            data-testid="extra-money-add-button"
          >
            + Add Manually
          </button>
        </div>
      </div>

      <div v-if="totalSavingsReserve > 0" class="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-1 text-emerald-900">
          <span class="text-sm font-medium">Savings Reserve</span>
          <InfoTooltip text="A portion of extra money set aside for goals. Allocate it when you're ready." />
        </div>
        <p class="text-sm text-emerald-800">
          🏦 You have {{ formatCurrency(totalSavingsReserve) }} set aside for goals.
          Open an entry to allocate it.
        </p>
      </div>

      <!-- Status Filter Tabs -->
      <div class="mb-6 border-b border-gray-200">
        <div class="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <span>What this means</span>
          <InfoTooltip text="Pending needs assignment. Assigned is already allocated. Ignored won't prompt you again." />
        </div>
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.status"
            @click="activeTab = tab.status"
            :class="[
              activeTab === tab.status
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
            :data-testid="`extra-money-tab-${tab.status}`"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Loading State -->
      <div v-if="extraMoneyStore.isLoading" class="text-center py-12">
        <div class="text-gray-500">Loading...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="extraMoneyStore.error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700">{{ extraMoneyStore.error }}</p>
      </div>

      <!-- Entries List -->
      <div v-else-if="filteredEntries.length > 0" class="space-y-4">
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="bg-white border rounded-lg p-6 hover:shadow-md transition"
          :data-testid="`extra-money-entry-${entry.id}`"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900">{{ entry.source }}</h3>
                <span
                  v-if="entry.auto_detected"
                  class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded"
                >
                  Auto-detected
                </span>
                <span
                  :class="statusBadgeClass(entry.status)"
                  class="px-2 py-1 text-xs font-medium rounded"
                >
                  {{ statusLabel(entry.status) }}
                </span>
              </div>

              <div class="text-2xl font-bold text-green-600 mb-1">
                {{ formatCurrency(entry.amount) }}
              </div>

              <div class="text-sm text-gray-600 mb-2">
                Received: {{ formatDate(entry.received_date) }}
              </div>

              <div v-if="entry.detection_reason" class="text-sm text-gray-700 italic mb-3">
                💡 {{ entry.detection_reason }}
              </div>

              <div v-if="entry.notes" class="text-sm text-gray-600 mb-3">
                {{ entry.notes }}
              </div>

              <div v-if="entry.savings_reserve && entry.savings_reserve > 0" class="mb-3 text-sm text-emerald-700">
                🏦 Savings reserve available: {{ formatCurrency(entry.savings_reserve) }}
              </div>

              <!-- Assignment Details -->
              <div v-if="entry.assignments && entry.assignments.length > 0" class="mt-4 pt-4 border-t">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Assigned to:</h4>
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="(assignment, index) in entry.assignments"
                    :key="assignment.category_id || assignment.section_id || `assignment-${index}`"
                    class="flex justify-between text-sm"
                  >
                    <span class="text-gray-700">
                      {{ assignment.category_name || assignment.section_name }}
                    </span>
                    <span class="font-medium">{{ formatCurrency(assignment.amount) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 ml-4">
              <button
                v-if="entry.status === 'pending'"
                @click="handleAssign(entry)"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm whitespace-nowrap"
                data-testid="extra-money-assign-button"
              >
                Assign →
              </button>
              <button
                v-if="entry.savings_reserve && entry.savings_reserve > 0"
                @click="handleAssign(entry)"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm whitespace-nowrap"
                data-testid="extra-money-allocate-button"
              >
                Allocate Savings
              </button>
              <button
                v-if="entry.status === 'pending'"
                @click="handleIgnore(entry)"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                data-testid="extra-money-ignore-button"
              >
                Ignore
              </button>
              <button
                @click="handleDelete(entry)"
                class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium text-sm"
                data-testid="extra-money-delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <div class="text-4xl mb-4">💰</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {{ emptyStateTitle }}
        </h3>
        <p class="text-gray-600 mb-6">{{ emptyStateMessage }}</p>
        <div class="flex justify-center gap-3">
          <button
            @click="showCreateModal = true"
            class="px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
          >
            + Add Manually
          </button>
        </div>
      </div>

      <!-- Create Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg max-w-lg w-full p-6" data-testid="extra-money-create-modal">
          <h2 class="text-xl font-bold mb-4">Add Extra Money Entry</h2>

          <form @submit.prevent="handleCreate">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Source <span class="text-red-500">*</span>
              </label>
              <input
                v-model="createForm.source"
                type="text"
                placeholder="e.g., Year-end Bonus, Tax Refund"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
                data-testid="extra-money-source"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Amount <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="createForm.amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
                data-testid="extra-money-amount"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Date Received <span class="text-red-500">*</span>
              </label>
              <input
                v-model="createForm.received_date"
                type="date"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
                data-testid="extra-money-date"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                v-model="createForm.notes"
                placeholder="Additional details..."
                rows="3"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                data-testid="extra-money-notes"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="closeCreateModal"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                data-testid="extra-money-submit"
              >
                Add Entry
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Assignment Modal -->
      <ExtraMoneyModal
        v-model="showAssignModal"
        :entry="selectedEntry"
        @saved="handleAssignmentSaved"
        @ignored="handleIgnored"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useExtraMoneyStore } from '@/stores/extraMoney';
import { useUndoStore } from '@/stores/undo';
import AppLayout from '@/components/layout/AppLayout.vue';
import ExtraMoneyModal from '@/components/extraMoney/ExtraMoneyModal.vue';
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import type { ExtraMoneyWithAssignments, CreateExtraMoneyData } from '@/types';

const extraMoneyStore = useExtraMoneyStore();
const undoStore = useUndoStore();

const activeTab = ref<'all' | 'pending' | 'assigned' | 'ignored'>('pending');
const showCreateModal = ref(false);
const showAssignModal = ref(false);
const selectedEntry = ref<ExtraMoneyWithAssignments | null>(null);

const createForm = ref<CreateExtraMoneyData>({
  source: '',
  amount: 0,
  received_date: new Date().toISOString().split('T')[0],
  notes: ''
});

const tabs = computed(() => [
  { status: 'all' as const, label: 'All', count: extraMoneyStore.entries.length },
  { status: 'pending' as const, label: 'Pending', count: extraMoneyStore.pendingEntries.length },
  { status: 'assigned' as const, label: 'Assigned', count: extraMoneyStore.assignedEntries.length },
  { status: 'ignored' as const, label: 'Ignored', count: extraMoneyStore.ignoredEntries.length }
]);

const filteredEntries = computed(() => {
  if (activeTab.value === 'all') return extraMoneyStore.entries;
  if (activeTab.value === 'pending') return extraMoneyStore.pendingEntries;
  if (activeTab.value === 'assigned') return extraMoneyStore.assignedEntries;
  if (activeTab.value === 'ignored') return extraMoneyStore.ignoredEntries;
  return [];
});

const emptyStateTitle = computed(() => {
  if (activeTab.value === 'pending') return 'No pending extra money';
  if (activeTab.value === 'assigned') return 'No assigned extra money';
  if (activeTab.value === 'ignored') return 'No ignored entries';
  return 'No extra money entries';
});

const emptyStateMessage = computed(() => {
  if (activeTab.value === 'pending') {
    return 'New extra money appears automatically when you record income.';
  }
  return 'Add an entry manually if you need to capture irregular income.';
});

const totalSavingsReserve = computed(() => {
  return extraMoneyStore.entries.reduce((sum, entry) => sum + Number(entry.savings_reserve || 0), 0);
});

onMounted(async () => {
  await extraMoneyStore.fetchAllEntries();
});

async function handleCreate() {
  try {
    await extraMoneyStore.createEntry(createForm.value);
    closeCreateModal();
    alert('Extra money entry created successfully!');
  } catch (error) {
    console.error('Failed to create entry:', error);
    alert('Failed to create entry. Please try again.');
  }
}

function closeCreateModal() {
  showCreateModal.value = false;
  createForm.value = {
    source: '',
    amount: 0,
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  };
}

function handleAssign(entry: ExtraMoneyWithAssignments) {
  selectedEntry.value = entry;
  showAssignModal.value = true;
}

async function handleIgnore(entry: ExtraMoneyWithAssignments) {
  if (confirm(`Mark "${entry.source}" as not extra money?`)) {
    try {
      await extraMoneyStore.ignoreEntry(entry.id);
      alert('Entry marked as ignored.');
    } catch (error) {
      console.error('Failed to ignore entry:', error);
      alert('Failed to ignore entry.');
    }
  }
}

async function handleDelete(entry: ExtraMoneyWithAssignments) {
  if (!confirm(`Delete "${entry.source}" ($${entry.amount})?`)) {
    return;
  }

  const entryId = entry.id;
  const entryLabel = entry.source;
  undoStore.schedule({
    message: `Deleting "${entryLabel}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await extraMoneyStore.deleteEntry(entryId);
      } catch (error) {
        console.error('Failed to delete entry:', error);
        alert('Failed to delete entry.');
      }
    },
  });
}

function handleAssignmentSaved() {
  showAssignModal.value = false;
  selectedEntry.value = null;
}

function handleIgnored() {
  showAssignModal.value = false;
  selectedEntry.value = null;
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: string): string {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'assigned') return 'bg-green-100 text-green-700';
  if (status === 'ignored') return 'bg-gray-100 text-gray-700';
  return 'bg-gray-100 text-gray-700';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

import { formatDate } from '@/utils/dateUtils';
</script>
