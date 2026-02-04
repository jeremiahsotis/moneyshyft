<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
    @click.self="close"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <span class="mr-2">↔️</span>
            Transfer Money
          </h2>
          <p class="text-gray-600 text-sm mt-1">
            Move assigned money between categories
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- From Category (pre-filled) -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              From <span class="text-red-500">*</span>
            </label>
            <div class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-gray-900">{{ sourceCategory?.category_name || sourceSection?.section_name }}</span>
                <span class="text-sm font-semibold text-green-600">
                  {{ formatCurrency(maxAmount) }} available
                </span>
              </div>
            </div>
          </div>

          <!-- To Category (select) -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              To <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.targetId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select category...</option>
              <optgroup
                v-for="section in categoriesStore.activeSections"
                :key="section.id"
                :label="section.name"
              >
                <option
                  v-for="category in getCategoriesForSection(section.id)"
                  :key="category.id"
                  :value="`category:${category.id}`"
                  :disabled="isCurrentSource(category.id, null)"
                >
                  {{ category.name }}
                  {{ isCurrentSource(category.id, null) ? '(current)' : '' }}
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Amount -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Amount <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-gray-500">$</span>
              <input
                v-model.number="formData.amount"
                type="number"
                step="0.01"
                min="0.01"
                :max="maxAmount"
                placeholder="0.00"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Maximum: {{ formatCurrency(maxAmount) }}
            </p>
          </div>

          <!-- Notes (Optional) -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              v-model="formData.notes"
              rows="2"
              placeholder="e.g., Covered groceries overage"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>

          <!-- Preview -->
          <div v-if="isValid" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-900">
              <strong>Transfer:</strong> {{ formatCurrency(formData.amount) }}
            </p>
            <p class="text-sm text-blue-700 mt-1">
              <strong>From:</strong> {{ sourceCategory?.category_name || sourceSection?.section_name }}
            </p>
            <p class="text-sm text-blue-700">
              <strong>To:</strong> {{ getTargetName() }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              @click="close"
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!isValid || isSubmitting"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Transferring...' : 'Transfer Money' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAssignmentsStore } from '@/stores/assignments';
import { useCategoriesStore } from '@/stores/categories';
import { useBudgetsStore } from '@/stores/budgets';
import type { CategorySummary, SectionSummary } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  sourceCategory?: CategorySummary | null;
  sourceSection?: SectionSummary | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  transferred: [];
}>();

const assignmentsStore = useAssignmentsStore();
const categoriesStore = useCategoriesStore();
const budgetsStore = useBudgetsStore();

const isSubmitting = ref(false);
const formData = ref({
  targetId: '',
  amount: 0,
  notes: '',
});

const maxAmount = computed(() => {
  if (props.sourceCategory) {
    return props.sourceCategory.available;
  }
  if (props.sourceSection) {
    return props.sourceSection.available;
  }
  return 0;
});

const isValid = computed(() => {
  return (
    formData.value.targetId &&
    formData.value.amount > 0 &&
    formData.value.amount <= maxAmount.value
  );
});

function getCategoriesForSection(sectionId: string) {
  const section = categoriesStore.activeSections.find(s => s.id === sectionId);
  return section?.categories || [];
}

function isCurrentSource(categoryId: string, sectionId: string | null): boolean {
  if (props.sourceCategory) {
    return categoryId === props.sourceCategory.category_id;
  }
  if (props.sourceSection) {
    return sectionId === props.sourceSection.section_id;
  }
  return false;
}

function getTargetName(): string {
  if (!formData.value.targetId) return '';

  const [type, id] = formData.value.targetId.split(':');

  if (type === 'category') {
    for (const section of categoriesStore.activeSections) {
      const category = section.categories?.find((c: any) => c.id === id);
      if (category) return category.name;
    }
    return '';
  }

  return '';
}

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const [targetType, targetId] = formData.value.targetId.split(':');

    const transferData: any = {
      amount: formData.value.amount,
      month: budgetsStore.currentMonth,
      notes: formData.value.notes || undefined,
    };

    // Set source
    if (props.sourceCategory) {
      transferData.from_category_id = props.sourceCategory.category_id;
    } else if (props.sourceSection) {
      transferData.from_section_id = props.sourceSection.section_id;
    }

    // Set destination
    if (targetType === 'category') {
      transferData.to_category_id = targetId;
    } else if (targetType === 'section') {
      transferData.to_section_id = targetId;
    }

    await assignmentsStore.transferMoney(transferData);

    resetForm();
    emit('update:modelValue', false);
    emit('transferred');
  } catch (error) {
    console.error('Failed to transfer money:', error);
    alert('Failed to transfer money. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  formData.value = {
    targetId: '',
    amount: 0,
    notes: '',
  };
}

function close() {
  resetForm();
  emit('update:modelValue', false);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Reset form when modal opens
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    resetForm();
  }
});
</script>
