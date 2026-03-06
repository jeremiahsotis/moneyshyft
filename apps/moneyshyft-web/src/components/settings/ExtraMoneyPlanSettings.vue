<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Extra Money Plan</h2>
        <p class="text-sm text-gray-600">Adjust how irregular income is split.</p>
      </div>
      <button
        @click="savePreferences"
        :disabled="!canProceed || isSaving"
        class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
      >
        {{ isSaving ? 'Saving...' : 'Save Plan' }}
      </button>
    </div>

    <div class="space-y-4 mb-6">
      <div
        v-for="category in defaultCategories"
        :key="category.key"
        class="border rounded-lg p-4"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">{{ category.emoji }}</span>
              <h3 class="font-semibold text-gray-900">{{ category.name }}</h3>
            </div>
            <p class="text-sm text-gray-600">{{ category.description }}</p>

            <div v-if="category.targetType !== 'reserve'" class="mt-3">
              <label class="text-xs text-gray-500 block mb-1">
                {{ category.targetType === 'section' ? 'Assign to section:' : 'Assign to category:' }}
              </label>
              <select
                v-if="category.targetType === 'category'"
                v-model="categoryMappings[category.key]"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a category...</option>
                <option
                  v-for="cat in availableCategories"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </option>
              </select>
              <select
                v-else
                v-model="sectionMappings[category.key]"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a section...</option>
                <option
                  v-for="section in availableSections(category.sectionType)"
                  :key="section.id"
                  :value="section.id"
                >
                  {{ section.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="w-24 text-right ml-4">
            <input
              v-model.number="percentages[category.key]"
              type="number"
              min="0"
              max="100"
              step="1"
              class="w-full px-3 py-2 border rounded-lg text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <span class="text-xs text-gray-500">%</span>
          </div>
        </div>

        <input
          v-model.number="percentages[category.key]"
          type="range"
          min="0"
          max="100"
          step="5"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>

    <div
      class="p-4 rounded-lg border-2 transition-all"
      :class="totalValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'"
    >
      <div class="flex justify-between items-center">
        <span class="font-medium" :class="totalValid ? 'text-green-700' : 'text-red-700'">
          Total:
        </span>
        <span class="text-2xl font-bold" :class="totalValid ? 'text-green-700' : 'text-red-700'">
          {{ totalPercentage }}%
        </span>
      </div>
      <p v-if="!totalValid" class="text-sm text-red-600 mt-2">
        Percentages must add up to 100%
      </p>
      <p v-else class="text-sm text-green-600 mt-2">
        ✓ Your plan will be used for future extra money
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import api from '@/services/api';
import { useCategoriesStore } from '@/stores/categories';
import type { ExtraMoneyPreferences, SavePreferencesData } from '@/types';

const categoriesStore = useCategoriesStore();
const isSaving = ref(false);

type ExtraMoneyKey = 'giving' | 'debt' | 'fun' | 'savings' | 'helping';
type CategoryKey = 'giving' | 'helping';
type SectionKey = 'debt' | 'fun';
type SectionType = 'fixed' | 'flexible' | 'debt';
type TargetType = 'category' | 'section' | 'reserve';

interface DefaultCategoryOption {
  key: ExtraMoneyKey;
  name: string;
  emoji: string;
  description: string;
  targetType: TargetType;
  sectionType?: SectionType;
}

const defaultCategories: DefaultCategoryOption[] = [
  {
    key: 'giving',
    name: 'Giving',
    emoji: '🤲',
    description: 'Charitable donations, tithing, supporting causes you care about',
    targetType: 'category'
  },
  {
    key: 'debt',
    name: 'Debt',
    emoji: '💳',
    description: 'Extra payments on credit cards, loans, or other debts',
    targetType: 'section',
    sectionType: 'debt'
  },
  {
    key: 'fun',
    name: 'Fun / Flexible Money',
    emoji: '🎉',
    description: 'Entertainment, hobbies, dining out, guilt-free spending',
    targetType: 'section',
    sectionType: 'flexible'
  },
  {
    key: 'savings',
    name: 'Savings',
    emoji: '🏦',
    description: 'Reserved for goals you pick later',
    targetType: 'reserve'
  },
  {
    key: 'helping',
    name: 'Helping Friends/Family',
    emoji: '👨‍👩‍👧',
    description: 'Support loved ones, family gifts, helping others',
    targetType: 'category'
  }
];

const percentages = ref<Record<ExtraMoneyKey, number>>({
  giving: 10,
  debt: 10,
  fun: 10,
  savings: 60,
  helping: 10
});

const categoryMappings = ref<Record<ExtraMoneyKey, string>>({
  giving: '',
  helping: '',
  debt: '',
  fun: '',
  savings: ''
});

const sectionMappings = ref<Record<ExtraMoneyKey, string>>({
  giving: '',
  helping: '',
  debt: '',
  fun: '',
  savings: ''
});

const totalPercentage = computed(() => {
  return Object.values(percentages.value).reduce((sum, val) => sum + val, 0);
});

const totalValid = computed(() => {
  return Math.abs(totalPercentage.value - 100) < 0.1;
});

const allCategoriesMapped = computed(() => {
  return (['giving', 'helping'] as CategoryKey[]).every(key => categoryMappings.value[key]);
});

const allSectionsMapped = computed(() => {
  return (['debt', 'fun'] as SectionKey[]).every(key => sectionMappings.value[key]);
});

const canProceed = computed(() => {
  return totalValid.value && allCategoriesMapped.value && allSectionsMapped.value;
});

const availableCategories = computed(() => {
  return categoriesStore.activeCategories;
});

function availableSections(type?: SectionType) {
  if (!type) return categoriesStore.sections;
  const filtered = categoriesStore.sections.filter(section => section.type === type);
  if (type === 'flexible') {
    return filtered.filter(section => section.name !== 'Income');
  }
  return filtered;
}

async function loadPreferences() {
  const response = await api.get('/extra-money/preferences');
  const preferences = response.data.data as ExtraMoneyPreferences | null;
  if (!preferences) return;

  const givingId = preferences.default_categories?.giving;
  const helpingId = preferences.default_categories?.helping;
  const debtSectionId = preferences.default_sections?.debt;
  const funSectionId = preferences.default_sections?.fun;
  const categoryIds = Object.keys(preferences.category_percentages || {});
  const sectionIds = Object.keys(preferences.section_percentages || {});

  if (givingId && preferences.category_percentages[givingId] !== undefined) {
    percentages.value.giving = Math.round(preferences.category_percentages[givingId] * 100);
    categoryMappings.value.giving = givingId;
  } else if (categoryIds.length === 1) {
    const id = categoryIds[0];
    percentages.value.giving = Math.round(preferences.category_percentages[id] * 100);
    categoryMappings.value.giving = id;
  }

  if (helpingId && preferences.category_percentages[helpingId] !== undefined) {
    percentages.value.helping = Math.round(preferences.category_percentages[helpingId] * 100);
    categoryMappings.value.helping = helpingId;
  }

  if (debtSectionId && preferences.section_percentages?.[debtSectionId] !== undefined) {
    percentages.value.debt = Math.round(preferences.section_percentages[debtSectionId] * 100);
    sectionMappings.value.debt = debtSectionId;
  } else if (sectionIds.length === 1) {
    const id = sectionIds[0];
    if (preferences.section_percentages?.[id] !== undefined) {
      percentages.value.debt = Math.round(preferences.section_percentages[id] * 100);
      sectionMappings.value.debt = id;
    }
  }

  if (funSectionId && preferences.section_percentages?.[funSectionId] !== undefined) {
    percentages.value.fun = Math.round(preferences.section_percentages[funSectionId] * 100);
    sectionMappings.value.fun = funSectionId;
  }

  if (preferences.reserve_percentage !== undefined) {
    percentages.value.savings = Math.round(preferences.reserve_percentage * 100);
  }
}

async function savePreferences() {
  if (!canProceed.value || isSaving.value) return;
  isSaving.value = true;
  try {
    const categoryPercentages: Record<string, number> = {};
    (['giving', 'helping'] as CategoryKey[]).forEach(key => {
      const id = categoryMappings.value[key];
      if (id) {
        categoryPercentages[id] = percentages.value[key] / 100;
      }
    });

    const sectionPercentages: Record<string, number> = {};
    (['debt', 'fun'] as SectionKey[]).forEach(key => {
      const id = sectionMappings.value[key];
      if (id) {
        sectionPercentages[id] = percentages.value[key] / 100;
      }
    });

    const payload: SavePreferencesData = {
      category_percentages: categoryPercentages,
      section_percentages: sectionPercentages,
      default_categories: {
        giving: categoryMappings.value.giving,
        helping: categoryMappings.value.helping
      },
      default_sections: {
        debt: sectionMappings.value.debt,
        fun: sectionMappings.value.fun
      },
      reserve_percentage: percentages.value.savings / 100
    };

    await api.post('/extra-money/preferences', payload);
  } finally {
    isSaving.value = false;
  }
}

onMounted(async () => {
  await categoriesStore.fetchCategories();

  if (!categoryMappings.value.giving) {
    const giving = categoriesStore.categories.find(cat =>
      cat.name === 'Charitable Giving' || cat.name === 'Donations' || cat.name === 'Giving'
    );
    if (giving) categoryMappings.value.giving = giving.id;
  }

  if (!categoryMappings.value.helping) {
    const helping = categoriesStore.categories.find(cat => cat.name === 'Helping Friends/Family');
    if (helping) categoryMappings.value.helping = helping.id;
  }

  if (!sectionMappings.value.debt) {
    const debtSection = availableSections('debt')[0];
    if (debtSection) sectionMappings.value.debt = debtSection.id;
  }
  if (!sectionMappings.value.fun) {
    const flexibleSection =
      availableSections('flexible').find(section => section.name === 'Flexible Spending') ||
      availableSections('flexible')[0];
    if (flexibleSection) sectionMappings.value.fun = flexibleSection.id;
  }

  await loadPreferences();
});
</script>
