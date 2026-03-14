<template>
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-2">
      <h2 class="text-2xl font-bold text-gray-900">💰 Extra Money Plan</h2>
      <InfoTooltip text="Set a default plan for irregular income and windfalls." />
    </div>
    <p class="text-gray-600 mb-6">
      When you receive irregular income (bonuses, tax refunds, gifts), how should we split it?
    </p>

    <!-- Educational Context -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <p class="text-sm text-gray-700 mb-2">
        <strong>Why set this now?</strong> When extra money arrives, it's easy to spend it randomly.
        This plan helps you intentionally allocate windfalls toward what matters most.
      </p>
      <p class="text-xs text-gray-600">
        ✓ You can adjust these percentages anytime in Settings<br>
        ✓ These are suggestions—you can always customize when assigning
      </p>
    </div>

    <!-- 5 Default Categories -->
    <div class="space-y-4 mb-6">
      <div
        v-for="category in defaultCategories"
        :key="category.key"
        class="border rounded-lg p-4 hover:border-primary-300 transition-colors"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">{{ category.emoji }}</span>
              <h3 class="font-semibold text-gray-900">{{ category.name }}</h3>
            </div>
            <p class="text-sm text-gray-600">{{ category.description }}</p>

            <!-- Category/Section Selection -->
            <div v-if="category.targetType !== 'reserve'" class="mt-3">
              <label class="text-xs text-gray-500 block mb-1">
                {{ category.targetType === 'section' ? 'Assign to section:' : 'Assign to category:' }}
              </label>
              <select
                v-if="category.targetType === 'category'"
                v-model="categoryMappings[category.key as CategoryKey]"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @change="validatePercentages"
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
                v-model="sectionMappings[category.key as SectionKey]"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @change="validatePercentages"
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
              :class="{ 'border-red-300': !totalValid && percentages[category.key] > 0 }"
              @input="validatePercentages"
            />
            <span class="text-xs text-gray-500">%</span>
          </div>
        </div>

        <!-- Slider -->
        <input
          v-model.number="percentages[category.key]"
          type="range"
          min="0"
          max="100"
          step="5"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          :class="{
            'accent-primary-600': totalValid || percentages[category.key] === 0,
            'accent-red-600': !totalValid && percentages[category.key] > 0
          }"
          @input="validatePercentages"
        />
      </div>
    </div>

    <!-- Total Validation -->
    <div
      class="mb-6 p-4 rounded-lg border-2 transition-all"
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
        ⚠️ Percentages must add up to 100%
      </p>
      <p v-else class="text-sm text-green-600 mt-2">
        ✓ Perfect! Your plan is ready
      </p>
    </div>

    <!-- Preview Example -->
    <div v-if="totalValid" class="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <p class="text-sm font-medium text-purple-900 mb-2">📊 Preview: $1,000 bonus would split as:</p>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div v-for="category in defaultCategories" :key="category.key" class="flex justify-between">
          <span class="text-gray-700">{{ category.name }}:</span>
          <span class="font-semibold text-purple-900">${{ (1000 * percentages[category.key] / 100).toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Preset Buttons -->
    <div class="mb-6">
      <p class="text-sm font-medium text-gray-700 mb-2">Quick Presets:</p>
      <div class="flex flex-wrap gap-2">
        <button
          @click="applyPreset('balanced')"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          ⚖️ Balanced (20% each)
        </button>
        <button
          @click="applyPreset('debtFocus')"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          💳 Debt Focus (50% debt)
        </button>
        <button
          @click="applyPreset('savingsFocus')"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          🏦 Savings Focus (60% savings)
        </button>
        <button
          @click="applyPreset('givingFocus')"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          🤲 Giving Focus (50% giving)
        </button>
      </div>
    </div>

    <!-- Skip Option -->
    <div class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <p class="text-sm text-gray-700">
        Don't want to set this up now? You can skip and configure it later in Settings.
      </p>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between pt-4">
      <button
        @click="$emit('back')"
        class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
      >
        ← Back
      </button>
      <div class="flex gap-3">
        <button
          @click="handleSkip"
          class="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Not now
        </button>
        <button
          @click="handleNext"
          :disabled="!canProceed"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InfoTooltip from '@/components/common/InfoTooltip.vue';
import { ref, computed, onMounted } from 'vue';
import { useCategoriesStore } from '@/stores/categories';
import type { SavePreferencesData } from '@/types';

const emit = defineEmits<{
  (e: 'next', data: SavePreferencesData | null): void;
  (e: 'back'): void;
}>();

const categoriesStore = useCategoriesStore();

type ExtraMoneyKey = 'giving' | 'debt' | 'fun' | 'savings';
type CategoryKey = 'giving';
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
    description: 'Emergency fund, retirement, long-term savings goals',
    targetType: 'reserve'
  }
];

const percentages = ref<Record<ExtraMoneyKey, number>>({
  giving: 20,
  debt: 20,
  fun: 20,
  savings: 40
});

const categoryMappings = ref<Record<CategoryKey, string>>({
  giving: ''
});

const sectionMappings = ref<Record<SectionKey, string>>({
  debt: '',
  fun: ''
});

const totalPercentage = computed(() => {
  return Object.values(percentages.value).reduce((sum, val) => sum + val, 0);
});

const totalValid = computed(() => {
  return Math.abs(totalPercentage.value - 100) < 0.1;
});

const allCategoriesMapped = computed(() => {
  const categoryTargets = ['giving'] as CategoryKey[];
  return categoryTargets.every(key => categoryMappings.value[key] !== '');
});

const allSectionsMapped = computed(() => {
  const sectionTargets = ['debt', 'fun'] as SectionKey[];
  return sectionTargets.every(key => sectionMappings.value[key] !== '');
});

const canProceed = computed(() => {
  // Can proceed if valid percentages AND all categories mapped
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

function validatePercentages() {
  // Ensure all values are numbers
  (Object.keys(percentages.value) as ExtraMoneyKey[]).forEach(key => {
    const val = percentages.value[key];
    if (isNaN(val) || val < 0) {
      percentages.value[key] = 0;
    }
    if (val > 100) {
      percentages.value[key] = 100;
    }
  });
}

function applyPreset(preset: 'balanced' | 'debtFocus' | 'savingsFocus' | 'givingFocus') {
  if (preset === 'balanced') {
    percentages.value = {
      giving: 25,
      debt: 25,
      fun: 25,
      savings: 25
    };
  } else if (preset === 'debtFocus') {
    percentages.value = {
      giving: 10,
      debt: 60,
      fun: 10,
      savings: 20
    };
  } else if (preset === 'savingsFocus') {
    percentages.value = {
      giving: 10,
      debt: 10,
      fun: 10,
      savings: 70
    };
  } else if (preset === 'givingFocus') {
    percentages.value = {
      giving: 60,
      debt: 20,
      fun: 10,
      savings: 10
    };
  }
}

function handleSkip() {
  // Skip: emit null to indicate no preferences
  emit('next', null);
}

function handleNext() {
  if (!canProceed.value) {
    if (!totalValid.value) {
      alert('Please ensure percentages add up to 100%');
    } else if (!allCategoriesMapped.value) {
      alert('Please select a category for each percentage');
    } else if (!allSectionsMapped.value) {
      alert('Please select a section for Debt and Fun');
    }
    return;
  }

  // Build category_percentages mapping (category_id -> decimal)
  const categoryPercentages: Record<string, number> = {};
  (['giving'] as CategoryKey[]).forEach(key => {
    const categoryId = categoryMappings.value[key];
    if (categoryId) {
      categoryPercentages[categoryId] = percentages.value[key] / 100;
    }
  });

  // Build section_percentages mapping
  const sectionPercentages: Record<string, number> = {};
  (['debt', 'fun'] as SectionKey[]).forEach(key => {
    const sectionId = sectionMappings.value[key];
    if (sectionId) {
      sectionPercentages[sectionId] = percentages.value[key] / 100;
    }
  });

  // Build default_categories mapping
  const defaultCats = {
    giving: categoryMappings.value.giving || undefined
  };

  const defaultSections = {
    debt: sectionMappings.value.debt || undefined,
    fun: sectionMappings.value.fun || undefined
  };

  const data: SavePreferencesData = {
    category_percentages: categoryPercentages,
    section_percentages: sectionPercentages,
    default_categories: defaultCats,
    default_sections: defaultSections,
    reserve_percentage: percentages.value.savings / 100
  };

  emit('next', data);
}

onMounted(async () => {
  await categoriesStore.fetchCategories();

  if (!categoryMappings.value.giving) {
    // Try to find "Charitable Giving", "Giving", or "Donations"
    const giving = categoriesStore.categories.find(cat =>
      cat.name === 'Charitable Giving' || cat.name === 'Giving' || cat.name === 'Donations'
    );
    if (giving) categoryMappings.value.giving = giving.id;
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
});
</script>

<style scoped>
/* Custom range slider styling */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  border: none;
}
</style>
