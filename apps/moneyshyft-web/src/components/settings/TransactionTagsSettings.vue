<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-2">Transaction Tags</h2>
    <p class="text-sm text-gray-600 mb-4">
      Tags are optional labels for reporting. You can select parent or child tags when categorizing transactions.
    </p>

    <div class="border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Add a new tag</h3>
      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Tag name</label>
          <input
            v-model="newTag.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Housing"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Parent tag (optional)</label>
          <select
            v-model="newTag.parent_tag_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option :value="null">No parent</option>
            <option v-for="tag in parentTags" :key="tag.id" :value="tag.id">
              {{ tag.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button
          @click="createTag"
          :disabled="!newTag.name"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          Add Tag
        </button>
        <button
          @click="resetNewTag"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>

    <div v-if="tagsStore.isLoading" class="text-sm text-gray-500">Loading tags...</div>

    <div v-else class="space-y-4">
      <div v-for="parent in parentTags" :key="parent.id">
        <div class="flex items-center justify-between">
          <div class="font-semibold text-gray-900">{{ parent.name }}</div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-gray-600 hover:text-gray-900"
              @click="startEdit(parent)"
            >
              Edit
            </button>
            <button
              class="text-xs text-red-600 hover:text-red-700"
              @click="confirmDelete(parent)"
            >
              Delete
            </button>
          </div>
        </div>

        <div v-if="isEditing(parent.id)" class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="grid gap-2 md:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                v-model="editTag.name"
                type="text"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Parent</label>
              <select
                v-model="editTag.parent_tag_id"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                :disabled="hasChildren(parent.id)"
              >
                <option :value="null">No parent</option>
                <option
                  v-for="tag in parentOptions(parent.id)"
                  :key="tag.id"
                  :value="tag.id"
                >
                  {{ tag.name }}
                </option>
              </select>
              <p v-if="hasChildren(parent.id)" class="text-xs text-gray-500 mt-1">
                Parent tags with children can’t be nested.
              </p>
            </div>
          </div>
          <div class="mt-2 flex gap-2">
            <button
              class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
              @click="saveEdit(parent.id)"
            >
              Save
            </button>
            <button
              class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </div>

        <div v-if="childrenByParent.get(parent.id)?.length" class="mt-2 space-y-2 pl-4">
          <div
            v-for="child in childrenByParent.get(parent.id)"
            :key="child.id"
            class="flex items-center justify-between"
          >
            <div class="text-sm text-gray-700">{{ child.name }}</div>
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-gray-600 hover:text-gray-900"
                @click="startEdit(child)"
              >
                Edit
              </button>
              <button
                class="text-xs text-red-600 hover:text-red-700"
                @click="confirmDelete(child)"
              >
                Delete
              </button>
            </div>
          </div>

          <div
            v-if="childrenByParent.get(parent.id)?.some(child => isEditing(child.id))"
            class="pl-4"
          >
            <div
              v-for="child in childrenByParent.get(parent.id)"
              :key="`${child.id}-edit`"
            >
              <div
                v-if="isEditing(child.id)"
                class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div class="grid gap-2 md:grid-cols-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Name</label>
                    <input
                      v-model="editTag.name"
                      type="text"
                      class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Parent</label>
                    <select
                      v-model="editTag.parent_tag_id"
                      class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option :value="null">No parent</option>
                      <option
                        v-for="tag in parentOptions(child.id)"
                        :key="tag.id"
                        :value="tag.id"
                      >
                        {{ tag.name }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="mt-2 flex gap-2">
                  <button
                    class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    @click="saveEdit(child.id)"
                  >
                    Save
                  </button>
                  <button
                    class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    @click="cancelEdit"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="parentTags.length === 0" class="text-sm text-gray-500">
        No tags yet. Add your first tag above.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTagsStore } from '@/stores/tags';
import type { Tag } from '@/types';

const tagsStore = useTagsStore();

const newTag = ref<{ name: string; parent_tag_id: string | null }>({
  name: '',
  parent_tag_id: null
});

const editingTagId = ref<string | null>(null);
const editTag = ref<{ name: string; parent_tag_id: string | null }>({
  name: '',
  parent_tag_id: null
});

const parentTags = computed(() => tagsStore.tags.filter(tag => !tag.parent_tag_id));

const childrenByParent = computed(() => {
  const map = new Map<string, Tag[]>();
  tagsStore.tags
    .filter(tag => tag.parent_tag_id)
    .forEach(tag => {
      const parentId = tag.parent_tag_id as string;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(tag);
    });
  return map;
});

function hasChildren(tagId: string): boolean {
  return (childrenByParent.value.get(tagId) || []).length > 0;
}

function parentOptions(excludeId: string): Tag[] {
  return parentTags.value.filter(tag => tag.id !== excludeId);
}

function isEditing(tagId: string): boolean {
  return editingTagId.value === tagId;
}

function startEdit(tag: Tag): void {
  editingTagId.value = tag.id;
  editTag.value = {
    name: tag.name,
    parent_tag_id: tag.parent_tag_id
  };
}

function cancelEdit(): void {
  editingTagId.value = null;
  editTag.value = { name: '', parent_tag_id: null };
}

async function saveEdit(tagId: string): Promise<void> {
  await tagsStore.updateTag(tagId, {
    name: editTag.value.name,
    parent_tag_id: editTag.value.parent_tag_id
  });
  cancelEdit();
}

async function createTag(): Promise<void> {
  if (!newTag.value.name) return;
  await tagsStore.createTag({
    name: newTag.value.name,
    parent_tag_id: newTag.value.parent_tag_id
  });
  resetNewTag();
}

function resetNewTag(): void {
  newTag.value = { name: '', parent_tag_id: null };
}

async function confirmDelete(tag: Tag): Promise<void> {
  const hasKids = hasChildren(tag.id);
  const message = hasKids
    ? `Delete "${tag.name}"? Its children will become top-level tags.`
    : `Delete "${tag.name}"?`;
  if (!confirm(message)) return;
  await tagsStore.deleteTag(tag.id);
}

onMounted(async () => {
  await tagsStore.fetchTags();
});
</script>
