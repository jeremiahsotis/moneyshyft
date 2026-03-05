import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import type { Tag } from '@/types';

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTags(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/tags');
      tags.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch tags';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createTag(data: {
    name: string;
    parent_tag_id?: string | null;
    color?: string | null;
    icon?: string | null;
  }): Promise<Tag> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/tags', data);
      const newTag = response.data.data;
      tags.value.push(newTag);
      return newTag;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create tag';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTag(tagId: string, data: {
    name?: string;
    parent_tag_id?: string | null;
    color?: string | null;
    icon?: string | null;
    is_active?: boolean;
  }): Promise<Tag> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/tags/${tagId}`, data);
      const updated = response.data.data;
      const index = tags.value.findIndex(tag => tag.id === tagId);
      if (index !== -1) {
        tags.value[index] = updated;
      }
      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update tag';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTag(tagId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/tags/${tagId}`);
      tags.value = tags.value.filter(tag => tag.id !== tagId);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete tag';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    tags,
    isLoading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    clearError
  };
});
