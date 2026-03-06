<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="close"></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- Header -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add New Section</h3>
          <p class="text-sm text-gray-600 mt-1">Create a new budget section</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Section Name -->
          <div class="mb-4">
            <label for="section-name" class="block text-sm font-medium text-gray-700 mb-1">
              Section Name
            </label>
            <input
              id="section-name"
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Fixed Expenses"
            />
          </div>

          <!-- Section Type -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Section Type
            </label>
            <div class="space-y-2">
              <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  v-model="formData.type"
                  type="radio"
                  value="fixed"
                  class="mr-3"
                />
                <div>
                  <span class="font-medium">📌 Fixed</span>
                  <p class="text-xs text-gray-600">Allocate to each category individually</p>
                </div>
              </label>

              <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  v-model="formData.type"
                  type="radio"
                  value="flexible"
                  class="mr-3"
                />
                <div>
                  <span class="font-medium">🎯 Flexible</span>
                  <p class="text-xs text-gray-600">Allocate total to section, spend flexibly</p>
                </div>
              </label>

              <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  v-model="formData.type"
                  type="radio"
                  value="debt"
                  class="mr-3"
                />
                <div>
                  <span class="font-medium">💳 Debt</span>
                  <p class="text-xs text-gray-600">Track debt payments separately</p>
                </div>
              </label>
            </div>
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
              :disabled="!formData.name || !formData.type"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Section
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
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [data: { name: string; type: 'fixed' | 'flexible' | 'debt' }];
}>();

const formData = ref({
  name: '',
  type: 'fixed' as 'fixed' | 'flexible' | 'debt'
});

// Reset form when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    formData.value = {
      name: '',
      type: 'fixed'
    };
  }
});

function close() {
  emit('update:modelValue', false);
}

function handleSubmit() {
  if (formData.value.name && formData.value.type) {
    emit('submit', {
      name: formData.value.name,
      type: formData.value.type
    });
    close();
  }
}
</script>
