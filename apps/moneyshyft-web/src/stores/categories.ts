import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type { CategorySection } from '@/types';

export const useCategoriesStore = defineStore('categories', () => {
  // State
  const sections = ref<CategorySection[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed - Flat list of all categories across all sections
  const categories = computed(() => {
    return sections.value.flatMap(section => section.categories || []);
  });

  const activeSections = computed(() => {
    return sections.value.map(section => ({
      ...section,
      categories: (section.categories || []).filter(category => !category.is_archived)
    }));
  });

  const activeCategories = computed(() => {
    return activeSections.value.flatMap(section => section.categories || []);
  });

  // Actions
  async function fetchCategories(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.get('/categories');
      sections.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch categories';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createSection(data: {
    name: string;
    type: 'fixed' | 'flexible' | 'debt';
  }): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/categories/sections', data);
      const newSection = response.data.data;

      // Add the new section to local state
      sections.value.push(newSection);

      return newSection;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create section';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createCategory(data: {
    section_id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  }): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/categories', data);
      const newCategory = response.data.data;

      // Add the new category to the appropriate section in local state
      const sectionIndex = sections.value.findIndex(s => s.id === data.section_id);
      if (sectionIndex !== -1) {
        if (!sections.value[sectionIndex].categories) {
          sections.value[sectionIndex].categories = [];
        }
        sections.value[sectionIndex].categories.push(newCategory);
      }

      return newCategory;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create category';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteCategory(categoryId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/categories/${categoryId}`);

      // Remove from local state
      sections.value.forEach(section => {
        if (section.categories) {
          section.categories = section.categories.filter(c => c.id !== categoryId);
        }
      });
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete category';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteSection(sectionId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await api.delete(`/categories/sections/${sectionId}`);

      // Remove from local state
      sections.value = sections.value.filter(s => s.id !== sectionId);
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete section';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateCategory(categoryId: string, data: {
    name?: string;
    color?: string | null;
    icon?: string | null;
    is_archived?: boolean;
  }): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/categories/${categoryId}`, data);
      const updatedCategory = response.data.data;

      // Update in local state
      sections.value.forEach(section => {
        if (section.categories) {
          const categoryIndex = section.categories.findIndex(c => c.id === categoryId);
          if (categoryIndex !== -1) {
            section.categories[categoryIndex] = updatedCategory;
          }
        }
      });

      return updatedCategory;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update category';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateSection(sectionId: string, data: {
    name?: string;
    type?: 'fixed' | 'flexible' | 'debt';
  }): Promise<any> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.patch(`/categories/sections/${sectionId}`, data);
      const updatedSection = response.data.data;

      // Update in local state
      const sectionIndex = sections.value.findIndex(s => s.id === sectionId);
      if (sectionIndex !== -1) {
        sections.value[sectionIndex] = { ...sections.value[sectionIndex], ...updatedSection };
      }

      return updatedSection;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update section';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    sections,
    categories,  // Flat list of all categories
    activeSections,
    activeCategories,
    isLoading,
    error,
    // Actions
    fetchCategories,
    createSection,
    createCategory,
    deleteCategory,
    deleteSection,
    updateCategory,
    updateSection,
    clearError,
  };
});
