<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="close"></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add New Category</h3>
          <p class="text-sm text-gray-600 mt-1">
            Add a category to {{ sectionName }}
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Category Name -->
          <div class="mb-6">
            <label for="category-name" class="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <input
              id="category-name"
              v-model="categoryName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Groceries"
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
              :disabled="!categoryName.trim()"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  sectionId: string;
  sectionName: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [data: { section_id: string; name: string }];
}>();

const categoryName = ref('');

// Reset form when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    categoryName.value = '';
  }
});

function close() {
  emit('update:modelValue', false);
}

function handleSubmit() {
  if (categoryName.value.trim()) {
    emit('submit', {
      section_id: props.sectionId,
      name: categoryName.value.trim()
    });
    close();
  }
}
</script>
