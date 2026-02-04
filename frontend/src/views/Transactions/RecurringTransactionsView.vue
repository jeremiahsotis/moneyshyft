<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Recurring Transactions</h1>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
          data-testid="recurring-add-button"
        >
          + Add Recurring Transaction
        </button>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'templates'"
            :class="activeTab === 'templates'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            data-testid="recurring-tab-templates"
          >
            Templates ({{ activeTemplates.length }})
          </button>
          <button
            @click="activeTab = 'pending'"
            :class="activeTab === 'pending'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            data-testid="recurring-tab-pending"
          >
            Pending Instances ({{ pendingInstances.length }})
          </button>
          <button
            @click="activeTab = 'history'"
            :class="activeTab === 'history'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            data-testid="recurring-tab-history"
          >
            History
          </button>
        </nav>
      </div>

      <!-- Templates Tab -->
      <div v-if="activeTab === 'templates'">
        <div v-if="recurringStore.isLoading && activeTemplates.length === 0" class="text-center py-12">
          <p class="text-gray-500">Loading templates...</p>
        </div>

        <div v-else-if="activeTemplates.length === 0" class="text-center py-12">
          <p class="text-gray-500 mb-4">No recurring transactions yet.</p>
          <button
            @click="showAddModal = true"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
            data-testid="recurring-add-button"
          >
            Create Your First Recurring Transaction
          </button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="template in activeTemplates"
            :key="template.id"
            class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="font-semibold text-gray-900">{{ template.payee }}</h3>
                  <span class="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {{ recurringStore.getFrequencyLabel(template.frequency) }}
                  </span>
                  <span v-if="template.auto_post" class="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                    Auto-post
                  </span>
                </div>

                <div class="text-sm text-gray-600 space-y-1">
                  <div>
                    <span class="font-medium">Amount:</span>
                    {{ formatCurrency(template.amount) }}
                    <span v-if="template.category_name" class="text-gray-500">• {{ template.category_name }}</span>
                  </div>
                  <div>
                    <span class="font-medium">Next:</span>
                    {{ formatDate(template.next_occurrence) }}
                  </div>
                  <div v-if="template.notes" class="text-gray-400">
                    {{ template.notes }}
                  </div>
                </div>
              </div>

              <div class="flex gap-2 ml-4">
                <button
                  @click="editTemplate(template)"
                  class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  @click="toggleAutoPost(template)"
                  class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  :title="template.auto_post ? 'Disable auto-post' : 'Enable auto-post'"
                >
                  {{ template.auto_post ? '🔕' : '🔔' }}
                </button>
                <button
                  @click="deleteTemplate(template)"
                  class="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Instances Tab -->
      <div v-if="activeTab === 'pending'">
        <div v-if="recurringStore.isLoading && pendingInstances.length === 0" class="text-center py-12">
          <p class="text-gray-500">Loading instances...</p>
        </div>

        <div v-else-if="pendingInstances.length === 0" class="text-center py-12">
          <p class="text-gray-500">No pending instances.</p>
        </div>

        <div v-else class="space-y-3">
          <InstanceRow
            v-for="instance in pendingInstances"
            :key="instance.id"
            :instance="instance"
            :badge-color="getBadgeColor(instance.due_date)"
            @approve="approveInstance(instance.id)"
            @post="postInstance(instance.id)"
            @skip="skipInstance(instance.id)"
          />
        </div>
      </div>

      <!-- History Tab -->
      <div v-if="activeTab === 'history'">
        <div class="mb-4 flex gap-2">
          <button
            v-for="status in historyStatuses"
            :key="status"
            @click="historyStatus = status"
            :class="historyStatus === status
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300'"
            class="px-4 py-2 rounded-lg font-medium text-sm capitalize"
            :data-testid="`recurring-history-status-${status}`"
          >
            {{ status }}
          </button>
        </div>

        <div v-if="recurringStore.isLoading" class="text-center py-12">
          <p class="text-gray-500">Loading history...</p>
        </div>

        <div v-else-if="allInstances.length === 0" class="text-center py-12">
          <p class="text-gray-500">No {{ historyStatus }} instances.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="instance in allInstances"
            :key="instance.id"
            class="bg-white border border-gray-200 rounded-lg p-4"
            :data-testid="`recurring-history-row-${instance.id}`"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 mb-1" data-testid="recurring-history-payee">{{ instance.payee }}</h3>
                <div class="text-sm text-gray-600">
                  <div>
                    {{ formatCurrency(instance.amount) }}
                    <span v-if="instance.category_name" class="text-gray-500">• {{ instance.category_name }}</span>
                  </div>
                  <div class="text-gray-400">
                    Due: {{ formatDate(instance.due_date) }}
                    <span v-if="instance.posted_at"> • Posted: {{ formatDate(instance.posted_at) }}</span>
                    <span v-if="instance.skipped_at"> • Skipped: {{ formatDate(instance.skipped_at) }}</span>
                  </div>
                  <div v-if="instance.skip_reason" class="text-gray-400 italic">
                    Reason: {{ instance.skip_reason }}
                  </div>
                </div>
              </div>
              <span
                :class="{
                  'bg-green-100 text-green-800': instance.status === 'posted',
                  'bg-gray-100 text-gray-800': instance.status === 'skipped',
                  'bg-blue-100 text-blue-800': instance.status === 'approved'
                }"
                class="px-2 py-1 text-xs font-medium rounded capitalize"
                data-testid="recurring-history-status"
              >
                {{ instance.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <RecurringTransactionModal
        v-model="showModal"
        :recurring-transaction="editingTemplate"
        @saved="handleSaved"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRecurringStore } from '@/stores/recurring';
import { useUndoStore } from '@/stores/undo';
import AppLayout from '@/components/layout/AppLayout.vue';
import InstanceRow from '@/components/dashboard/InstanceRow.vue';
import RecurringTransactionModal from '@/components/transactions/RecurringTransactionModal.vue';
import type { RecurringTransaction, InstanceStatus } from '@/types';

const recurringStore = useRecurringStore();
const undoStore = useUndoStore();

const activeTab = ref<'templates' | 'pending' | 'history'>('templates');
const showAddModal = ref(false);
const editingTemplate = ref<RecurringTransaction | null>(null);
const historyStatus = ref<InstanceStatus>('posted');
const historyStatuses: InstanceStatus[] = ['posted', 'skipped', 'approved'];

const activeTemplates = computed(() => recurringStore.activeTemplates);
const pendingInstances = computed(() => recurringStore.pendingInstances);
const allInstances = computed(() => recurringStore.allInstances);

// Computed property for modal visibility
const showModal = computed({
  get: () => showAddModal.value || !!editingTemplate.value,
  set: (value: boolean) => {
    if (!value) {
      showAddModal.value = false;
      editingTemplate.value = null;
    }
  }
});

onMounted(async () => {
  await recurringStore.fetchRecurring();
  await recurringStore.fetchPendingInstances(30); // 30 days ahead
});

watch(activeTab, async (newTab) => {
  if (newTab === 'history') {
    await recurringStore.fetchAllInstances(historyStatus.value);
  }
});

watch(historyStatus, async (newStatus) => {
  if (activeTab.value === 'history') {
    await recurringStore.fetchAllInstances(newStatus);
  }
});

import { formatDate } from '@/utils/dateUtils';


function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getBadgeColor(dueDate: string): 'red' | 'yellow' | 'blue' | 'gray' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due < today) return 'red';
  if (due.getTime() === today.getTime()) return 'yellow';
  return 'blue';
}

function editTemplate(template: RecurringTransaction) {
  editingTemplate.value = template;
}

async function toggleAutoPost(template: RecurringTransaction) {
  try {
    await recurringStore.toggleAutoPost(template.id);
  } catch (error) {
    console.error('Failed to toggle auto-post:', error);
    alert('Failed to toggle auto-post setting');
  }
}

async function deleteTemplate(template: RecurringTransaction) {
  if (!confirm(`Delete recurring transaction "${template.payee}"?`)) {
    return;
  }

  const templateId = template.id;
  const templateName = template.payee;
  undoStore.schedule({
    message: `Deleting "${templateName}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await recurringStore.deleteRecurring(templateId);
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('Failed to delete recurring transaction');
      }
    },
  });
}

async function approveInstance(id: string) {
  try {
    await recurringStore.approveInstance(id);
  } catch (error) {
    console.error('Failed to approve instance:', error);
    alert('Failed to approve instance');
  }
}

async function postInstance(id: string) {
  try {
    await recurringStore.postInstance(id);
  } catch (error) {
    console.error('Failed to post instance:', error);
    alert('Failed to post instance');
  }
}

async function skipInstance(id: string) {
  const reason = prompt('Reason for skipping (optional):');
  if (reason === null) return; // User cancelled

  try {
    await recurringStore.skipInstance(id, { reason });
  } catch (error) {
    console.error('Failed to skip instance:', error);
    alert('Failed to skip instance');
  }
}

async function handleSaved() {
  // Close modal by resetting state
  showAddModal.value = false;
  editingTemplate.value = null;

  // Refresh data
  await recurringStore.fetchRecurring();
  await recurringStore.fetchPendingInstances(30);
}
</script>
