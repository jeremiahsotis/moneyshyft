<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span class="text-lg">🔍</span> Filter Transactions
      </h3>
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-sm text-red-600 hover:text-red-700 font-medium"
      >
        Clear Filters
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Search -->
      <div class="col-span-1 md:col-span-2">
        <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search payee or notes..."
            class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            @input="emitFilters"
          />
        </div>
      </div>

      <!-- Date Range -->
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Date From</label>
        <input
          v-model="filters.start_date"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @change="emitFilters"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Date To</label>
        <input
          v-model="filters.end_date"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @change="emitFilters"
        />
      </div>

      <!-- Amount Range -->
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Min Amount</label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-gray-400">$</span>
          <input
            v-model.number="filters.min_amount"
            type="number"
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            @input="emitFilters"
          />
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Max Amount</label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-gray-400">$</span>
          <input
            v-model.number="filters.max_amount"
            type="number"
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            @input="emitFilters"
          />
        </div>
      </div>

      <!-- Category -->
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Category</label>
        <select
          v-model="filters.category_id"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @change="emitFilters"
        >
          <option value="">All Categories</option>
          <optgroup v-for="section in categorySections" :key="section.id" :label="section.name">
            <option v-for="category in section.categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Transaction Type -->
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Type</label>
        <select
          v-model="filters.type"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @change="emitFilters"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCategoriesStore } from '@/stores/categories';
import { storeToRefs } from 'pinia';

// Initialize categories store
const categoriesStore = useCategoriesStore();
const { activeSections: categorySections } = storeToRefs(categoriesStore);

// Load categories if not already loaded
if (categorySections.value.length === 0) {
  categoriesStore.fetchCategories();
}

const emit = defineEmits<{
  'update:filters': [filters: FilterState]
}>();

interface FilterState {
  search: string;
  start_date: string;
  end_date: string;
  min_amount: number | null;
  max_amount: number | null;
  category_id: string;
  type: string;
}

const filters = ref<FilterState>({
  search: '',
  start_date: '',
  end_date: '',
  min_amount: null,
  max_amount: null,
  category_id: '',
  type: ''
});

const hasActiveFilters = computed(() => {
  return !!(
    filters.value.search ||
    filters.value.start_date ||
    filters.value.end_date ||
    filters.value.min_amount ||
    filters.value.max_amount ||
    filters.value.category_id ||
    filters.value.type
  );
});

// Debounce emit for text inputs
let timeout: ReturnType<typeof setTimeout>;

function emitFilters() {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    emit('update:filters', { ...filters.value });
  }, 300);
}

function clearFilters() {
  filters.value = {
    search: '',
    start_date: '',
    end_date: '',
    min_amount: null,
    max_amount: null,
    category_id: '',
    type: ''
  };
  emit('update:filters', { ...filters.value });
}
</script>
