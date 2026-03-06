<template>
  <div
    v-if="modelValue && section"
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
    @click.self="close"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900">
            Edit Section
          </h2>
          <p class="text-gray-600 text-sm mt-1">
            Update the section name
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Section Name -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Section Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="sectionName"
              type="text"
              placeholder="e.g., Fixed Expenses, Flexible Spending"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
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
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCategoriesStore } from '@/stores/categories';
import type { CategorySection } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  section: CategorySection | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [];
}>();

const categoriesStore = useCategoriesStore();
const isSubmitting = ref(false);
const sectionName = ref('');

const isValid = computed(() => {
  return sectionName.value.trim().length > 0;
});

// Watch for section prop changes to populate form
watch(() => props.section, (newSection) => {
  if (newSection) {
    sectionName.value = newSection.name;
  }
}, { immediate: true });

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value || !props.section) return;

  isSubmitting.value = true;
  try {
    await categoriesStore.updateSection(props.section.id, {
      name: sectionName.value,
    });

    emit('update:modelValue', false);
    emit('submit');
  } catch (error) {
    console.error('Failed to update section:', error);
    alert('Failed to update section. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}

function close() {
  emit('update:modelValue', false);
}
</script>
