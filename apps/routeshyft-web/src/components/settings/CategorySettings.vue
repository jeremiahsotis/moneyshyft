<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-2">Categories</h2>
    <p class="text-sm text-gray-600 mb-4">
      Archive categories to hide them from pickers while keeping history intact. You can restore archived categories anytime.
    </p>

    <div v-if="categoriesStore.isLoading" class="text-sm text-gray-500">Loading categories...</div>

    <div v-else class="space-y-4">
      <div v-for="section in sections" :key="section.id" class="border border-gray-200 rounded-lg">
        <div class="px-4 py-2 bg-gray-50 rounded-t-lg font-semibold text-gray-900">
          {{ section.name }}
        </div>
        <div class="divide-y">
          <div
            v-for="category in section.categories || []"
            :key="category.id"
            class="px-4 py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-900">{{ category.name }}</span>
              <span v-if="category.is_archived" class="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                Archived
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!category.is_archived"
                @click="archiveCategory(category.id, category.name)"
                class="text-xs text-red-600 hover:text-red-700"
              >
                Archive
              </button>
              <button
                v-else
                @click="restoreCategory(category.id, category.name)"
                class="text-xs text-blue-600 hover:text-blue-700"
              >
                Restore
              </button>
              <button
                @click="deleteCategory(category.id, category.name)"
                class="text-xs text-gray-600 hover:text-gray-900"
              >
                Delete
              </button>
            </div>
          </div>
          <div v-if="(section.categories || []).length === 0" class="px-4 py-3 text-sm text-gray-500">
            No categories yet.
          </div>
        </div>
      </div>

      <div v-if="sections.length === 0" class="text-sm text-gray-500">
        No sections yet.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCategoriesStore } from '@/stores/categories';

const categoriesStore = useCategoriesStore();

const sections = computed(() => categoriesStore.sections);

async function archiveCategory(categoryId: string, name: string): Promise<void> {
  if (!confirm(`Archive "${name}"? You can restore it later.`)) return;
  try {
    await categoriesStore.updateCategory(categoryId, { is_archived: true });
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to archive category.');
  }
}

async function restoreCategory(categoryId: string, name: string): Promise<void> {
  if (!confirm(`Restore "${name}"?`)) return;
  try {
    await categoriesStore.updateCategory(categoryId, { is_archived: false });
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to restore category.');
  }
}

async function deleteCategory(categoryId: string, name: string): Promise<void> {
  if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
  try {
    await categoriesStore.deleteCategory(categoryId);
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to delete category.');
  }
}

onMounted(async () => {
  await categoriesStore.fetchCategories();
});
</script>
