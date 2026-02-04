<template>
  <div class="bg-white rounded-lg shadow mb-4">
    <!-- Section Header -->
    <div class="p-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 group">
          <span class="text-2xl">{{ sectionIcon }}</span>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-900">{{ section.name }}</h3>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  @click="editSection"
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                  title="Edit section name"
                >
                  ✏️
                </button>
                <button
                  @click="deleteSection"
                  class="p-1 text-red-600 hover:bg-red-50 rounded transition text-sm"
                  title="Delete section"
                >
                  🗑️
                </button>
              </div>
            </div>
            <span :class="typeBadgeClass" class="text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block">
              {{ sectionTypeLabel }}
            </span>
          </div>
        </div>

        <!-- Total Planned/Spent for section -->
        <div class="text-right">
          <div class="text-sm text-gray-600">
            <span class="font-medium">{{ formatCurrency(summary?.allocated || 0) }}</span>
            <span class="text-gray-400"> planned</span>
          </div>
          <div class="text-sm text-gray-600">
            <span :class="spentColor">{{ formatCurrency(summary?.spent || 0) }}</span>
            <span class="text-gray-400"> spent</span>
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="summary && summary.allocated > 0" class="mt-3">
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            :class="progressBarColor"
            class="h-2 rounded-full transition-all"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-gray-500">{{ progressPercentage }}% used</span>
          <span class="text-xs font-medium" :class="remainingColor">
            {{ formatCurrency(remainingAmount) }} {{ remainingLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Section Content -->
    <div class="p-4">
      <!-- Fixed and Debt Sections: Category-level allocation -->
      <div v-if="section.type === 'fixed' || section.type === 'debt'">
        <div class="flex items-center justify-between mb-3">
          <button
            @click="expanded = !expanded"
            class="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>{{ expanded ? '▼' : '▶' }} Categories ({{ categories.length }})</span>
          </button>
          <button
            @click="showAddCategory = true"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Category
          </button>
        </div>

        <div v-if="expanded" class="space-y-3">
          <div
            v-for="category in categories"
            :key="category.category_id"
            class="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
          >
            <!-- Category Header -->
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1 flex items-center gap-2">
                <span class="text-2xl" :title="getEnvelopeStatusText(category)">{{ getEnvelopeIcon(category) }}</span>
                <h4 class="font-semibold text-gray-900">{{ category.category_name }}</h4>
              </div>
              <div class="flex gap-1">
                <button
                  @click="editCategory(category)"
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded transition text-xs"
                  title="Edit category"
                >
                  ✏️
                </button>
                <button
                  @click="deleteCategory(category)"
                  class="p-1 text-red-600 hover:bg-red-50 rounded transition text-xs"
                  title="Archive category"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Four-metric display -->
            <div class="grid grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <p class="text-xs text-gray-500">{{ section.type === 'debt' ? 'Planned' : 'Budgeted' }}</p>
                <input
                  v-if="editingCategoryAllocation === category.category_id"
                  v-model.number="editAmount"
                  @blur="saveAllocation(category.category_id)"
                  @keyup.enter="saveAllocation(category.category_id)"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-2 py-1 text-sm border border-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                  @click.stop
                />
                <button
                  v-else
                  @click="startEdit(category.category_id, category.allocated)"
                  class="font-semibold text-gray-900 hover:text-primary-600"
                >
                  {{ formatCurrency(category.allocated) }}
                </button>
              </div>
              <div>
                <p class="text-xs text-gray-500">Assigned</p>
                <input
                  v-if="editingCategoryAssigned === category.category_id"
                  v-model.number="editAssignedAmount"
                  @blur="saveAssigned(category.category_id)"
                  @keyup.enter="saveAssigned(category.category_id)"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                  @click.stop
                />
                <button
                  v-else
                  @click="startEditAssigned(category.category_id, category.assigned)"
                  class="font-semibold text-blue-600 hover:text-blue-800"
                >
                  {{ formatCurrency(category.assigned) }}
                </button>
              </div>
              <div>
                <p class="text-xs text-gray-500">Spent</p>
                <p class="font-semibold text-orange-600">{{ formatCurrency(category.spent) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Available</p>
                <div class="flex items-center gap-2">
                  <p class="font-semibold" :class="category.available >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(category.available) }}
                  </p>
                  <button
                    v-if="category.available > 0"
                    @click="openTransferModal(category)"
                    class="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition"
                    title="Transfer money to another category"
                  >
                    ↔️ Move
                  </button>
                </div>
              </div>
            </div>

            <!-- Progress Bar (Assigned vs Budgeted) -->
            <div v-if="category.allocated > 0">
              <div class="flex justify-between text-xs text-gray-600 mb-1">
                <span>Funding Progress</span>
                <span>{{ Math.round((category.assigned / category.allocated) * 100) }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all"
                  :style="{ width: Math.min((category.assigned / category.allocated) * 100, 100) + '%' }"
                ></div>
              </div>
              <p v-if="category.need > 0" class="text-xs text-gray-500 mt-1">
                Need {{ formatCurrency(category.need) }} more to reach budget
              </p>
            </div>
          </div>

          <div v-if="section.type === 'debt'" class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p class="text-sm text-orange-800">💡 Keep making progress on your debt!</p>
          </div>
        </div>
      </div>

      <!-- Flexible Section: Section-level allocation -->
      <div v-else-if="section.type === 'flexible'">
        <!-- Section 4-Metric Card -->
        <div class="mb-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
          <p class="text-sm text-gray-600 mb-3">💸 Allocate total, spend flexibly across categories</p>

          <!-- Four-metric display at section level -->
          <div class="grid grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <p class="text-xs text-gray-500">Budgeted</p>
              <input
                v-if="editingSection"
                v-model.number="editAmount"
                @blur="saveSectionAllocation"
                @keyup.enter="saveSectionAllocation"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-2 py-1 text-sm border border-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                @click.stop
              />
              <button
                v-else
                @click="startSectionEdit"
                class="font-semibold text-gray-900 hover:text-primary-600"
              >
                {{ formatCurrency(summary?.allocated || 0) }}
              </button>
            </div>
            <div>
              <p class="text-xs text-gray-500">Assigned</p>
              <input
                v-if="editingSectionAssigned"
                v-model.number="editAssignedAmount"
                @blur="saveSectionAssigned"
                @keyup.enter="saveSectionAssigned"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                @click.stop
              />
              <button
                v-else
                @click="startSectionAssignedEdit"
                class="font-semibold text-blue-600 hover:text-blue-800"
              >
                {{ formatCurrency(summary?.assigned || 0) }}
              </button>
            </div>
            <div>
              <p class="text-xs text-gray-500">Spent</p>
              <p class="font-semibold text-orange-600">{{ formatCurrency(summary?.spent || 0) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Available</p>
              <p class="font-semibold" :class="(summary?.available || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(summary?.available || 0) }}
              </p>
            </div>
          </div>

          <!-- Progress Bar (Assigned vs Budgeted) -->
          <div v-if="(summary?.allocated || 0) > 0">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Funding Progress</span>
              <span>{{ Math.round(((summary?.assigned || 0) / (summary?.allocated || 1)) * 100) }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all"
                :style="{ width: Math.min(((summary?.assigned || 0) / (summary?.allocated || 1)) * 100, 100) + '%' }"
              ></div>
            </div>
            <p v-if="(summary?.need || 0) > 0" class="text-xs text-gray-500 mt-1">
              Need {{ formatCurrency(summary?.need || 0) }} more to reach budget
            </p>
          </div>
        </div>

        <!-- Spending Breakdown -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <button
              @click="expanded = !expanded"
              class="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>{{ expanded ? '▼' : '▶' }} Spending breakdown ({{ categories.length }})</span>
            </button>
            <button
              @click="showAddCategory = true"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Category
            </button>
          </div>

          <div v-if="expanded && categories.length > 0" class="space-y-1">
            <div
              v-for="category in categories"
              :key="category.category_id"
              class="flex items-center justify-between py-2 px-3 text-sm hover:bg-gray-50 rounded group"
            >
              <div class="flex items-center gap-2 flex-1">
                <span class="text-lg" :title="getEnvelopeStatusText(category)">{{ getEnvelopeIcon(category) }}</span>
                <span class="text-gray-700">{{ category.category_name }}</span>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    @click="editCategory(category)"
                    class="p-0.5 text-blue-600 hover:bg-blue-50 rounded transition text-xs"
                    title="Edit category"
                  >
                    ✏️
                  </button>
                  <button
                    @click="deleteCategory(category)"
                    class="p-0.5 text-red-600 hover:bg-red-50 rounded transition text-xs"
                    title="Delete category"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <span class="font-medium text-gray-900">{{ formatCurrency(category.spent) }}</span>
            </div>
          </div>
          <div v-else-if="expanded && categories.length === 0" class="text-sm text-gray-500 text-center py-4">
            No categories yet. Add one to start tracking spending.
          </div>
        </div>
      </div>
    </div>

    <!-- Add Category Modal -->
    <AddCategoryModal
      v-model="showAddCategory"
      :section-id="section.id"
      :section-name="section.name"
      @submit="handleAddCategory"
    />

    <!-- Edit Section Modal -->
    <EditSectionModal
      v-model="showEditSection"
      :section="section"
      @submit="handleEditSection"
    />

    <!-- Edit Category Modal -->
    <EditCategoryModal
      v-model="showEditCategory"
      :category="editingCategoryData"
      @submit="handleEditCategory"
    />

    <!-- Transfer Money Modal -->
    <TransferModal
      v-model="showTransferModal"
      :source-category="transferSourceCategory"
      @transferred="handleTransferred"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCategoriesStore } from '@/stores/categories';
import { useUndoStore } from '@/stores/undo';
import type { CategorySection, SectionSummary, CategorySummary } from '@/types';
import AddCategoryModal from './AddCategoryModal.vue';
import EditSectionModal from './EditSectionModal.vue';
import EditCategoryModal from './EditCategoryModal.vue';
import TransferModal from './TransferModal.vue';

const props = defineProps<{
  section: CategorySection;
  summary: SectionSummary | undefined;
}>();

const emit = defineEmits<{
  updateAllocation: [data: { categoryId?: string; sectionId?: string; amount: number; rollupMode: boolean }];
  updateAssigned: [data: { categoryId?: string; sectionId?: string; amount: number; rollupMode: boolean }];
  refresh: [];
}>();

const categoriesStore = useCategoriesStore();
const undoStore = useUndoStore();

const expanded = ref(true);
const editingCategoryAllocation = ref<string | null>(null);
const editingCategoryAssigned = ref<string | null>(null);
const editingSection = ref(false);
const editingSectionAssigned = ref(false);
const editAmount = ref(0);
const editAssignedAmount = ref(0);
const showAddCategory = ref(false);
const showEditSection = ref(false);
const showEditCategory = ref(false);
const showTransferModal = ref(false);
const editingCategoryData = ref<CategorySummary | null>(null);
const transferSourceCategory = ref<CategorySummary | null>(null);

const categories = computed(() => (props.summary?.categories || []).filter(category => !category.is_archived));

const sectionIcon = computed(() => {
  // If we have summary data, show envelope status
  if (props.summary) {
    const { assigned, allocated, available } = props.summary;

    // Empty envelope - has plan but no money
    if (assigned === 0 && allocated > 0) {
      return '📭';
    }
    // Has money available
    if (available > 0) {
      return '💰';
    }
    // Fully spent
    if (allocated > 0) {
      return '✅';
    }
  }

  // Fallback to type icon if no summary
  switch (props.section.type) {
    case 'fixed': return '📌';
    case 'flexible': return '🎯';
    case 'debt': return '💳';
    default: return '📊';
  }
});

const sectionTypeLabel = computed(() => {
  switch (props.section.type) {
    case 'fixed': return 'Fixed';
    case 'flexible': return 'Flexible';
    case 'debt': return 'Debt';
    default: return '';
  }
});

const typeBadgeClass = computed(() => {
  switch (props.section.type) {
    case 'fixed': return 'bg-blue-100 text-blue-800';
    case 'flexible': return 'bg-green-100 text-green-800';
    case 'debt': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
});

const progressPercentage = computed(() => {
  if (!props.summary || props.summary.allocated === 0) return 0;
  const percentage = (props.summary.spent / props.summary.allocated) * 100;
  return Math.min(Math.round(percentage), 100);
});

const progressBarColor = computed(() => {
  const percent = progressPercentage.value;
  if (percent < 75) return 'bg-green-500';
  if (percent < 100) return 'bg-yellow-500';
  return 'bg-red-500';
});

const spentColor = computed(() => {
  if (!props.summary) return 'text-gray-900';
  if (props.summary.spent > props.summary.allocated) return 'text-red-600';
  return 'text-gray-900';
});

const remainingColor = computed(() => {
  if (!props.summary) return 'text-gray-600';
  if (props.summary.remaining < 0) return 'text-red-600';
  if (props.summary.remaining === 0) return 'text-gray-600';
  return 'text-green-600';
});

const remainingLabel = computed(() => {
  if (!props.summary) return 'remaining';
  if (props.summary.remaining < 0) return 'over by';
  return 'remaining';
});

const remainingAmount = computed(() => {
  if (!props.summary) return 0;
  return Math.abs(props.summary.remaining);
});

// Envelope icon helpers
function getEnvelopeIcon(category: CategorySummary): string {
  // Has a plan but no money assigned yet
  if (category.assigned === 0 && category.allocated > 0) {
    return '📭'; // Empty/open envelope
  }
  // Over plan or overspent
  if (category.available < 0) {
    return '⚠️'; // Needs attention
  }
  // Has money available to spend
  if (category.available > 0) {
    return '💰'; // Envelope with money
  }
  // All spent or overspent
  return '✅'; // Closed/complete
}

function getEnvelopeStatusText(category: CategorySummary): string {
  if (category.assigned === 0 && category.allocated > 0) {
    return 'Waiting for funding';
  }
  if (category.available < 0) {
    return `Over by $${Math.abs(category.available).toFixed(2)} - Move money or adjust your plan`;
  }
  if (category.available > 0) {
    return `Has money - $${category.available.toFixed(2)} available`;
  }
  return 'All used';
}

function startEdit(categoryId: string, currentAmount: number) {
  editingCategoryAllocation.value = categoryId;
  editAmount.value = currentAmount;
}

function startSectionEdit() {
  editingSection.value = true;
  editAmount.value = props.summary?.allocated || 0;
}

function saveAllocation(categoryId: string) {
  if (editAmount.value < 0) {
    editAmount.value = 0;
  }

  emit('updateAllocation', {
    categoryId,
    amount: editAmount.value,
    rollupMode: false,
  });

  editingCategoryAllocation.value = null;
}

// Assigned amount editing functions
function startEditAssigned(categoryId: string, currentAmount: number) {
  editingCategoryAssigned.value = categoryId;
  editAssignedAmount.value = currentAmount;
}

function startSectionAssignedEdit() {
  editingSectionAssigned.value = true;
  editAssignedAmount.value = props.summary?.assigned || 0;
}

function saveAssigned(categoryId: string) {
  if (editAssignedAmount.value < 0) {
    editAssignedAmount.value = 0;
  }

  emit('updateAssigned', {
    categoryId,
    amount: editAssignedAmount.value,
    rollupMode: false,
  });

  editingCategoryAssigned.value = null;
}

function saveSectionAssigned() {
  if (editAssignedAmount.value < 0) {
    editAssignedAmount.value = 0;
  }

  emit('updateAssigned', {
    amount: editAssignedAmount.value,
    rollupMode: true,
  });

  editingSectionAssigned.value = false;
}

function editSection() {
  showEditSection.value = true;
}

async function deleteSection() {
  const categoryCount = categories.value.length;
  const message = categoryCount > 0
    ? `Are you sure you want to delete "${props.section.name}"? This will also delete ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}. This action cannot be undone.`
    : `Are you sure you want to delete "${props.section.name}"? This action cannot be undone.`;

  if (!confirm(message)) return;

  const sectionId = props.section.id;
  const sectionName = props.section.name;
  undoStore.schedule({
    message: `Deleting "${sectionName}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await categoriesStore.deleteSection(sectionId);
        emit('refresh');
      } catch (error) {
        console.error('Failed to delete section:', error);
        alert('Failed to delete section. Please try again.');
      }
    },
  });
}

function editCategory(category: CategorySummary) {
  editingCategoryData.value = category;
  showEditCategory.value = true;
}

async function deleteCategory(category: CategorySummary) {
  if (!confirm(`Archive "${category.category_name}"? You can restore it later in Settings.`)) {
    return;
  }

  const categoryId = category.category_id;
  const categoryName = category.category_name;
  undoStore.schedule({
    message: `Archiving "${categoryName}"...`,
    timeoutMs: 5000,
    onCommit: async () => {
      try {
        await categoriesStore.updateCategory(categoryId, { is_archived: true });
        emit('refresh');
      } catch (error: any) {
        console.error('Failed to archive category:', error);
        alert(error.response?.data?.error || error.message || 'Failed to archive category. Please try again.');
      }
    },
  });
}

function handleEditSection() {
  emit('refresh');
}

function handleEditCategory() {
  editingCategoryData.value = null;
  emit('refresh');
}

function saveSectionAllocation() {
  if (editAmount.value < 0) {
    editAmount.value = 0;
  }

  emit('updateAllocation', {
    sectionId: props.section.id,
    amount: editAmount.value,
    rollupMode: true,
  });

  editingSection.value = false;
}

async function handleAddCategory(data: { section_id: string; name: string }) {
  try {
    await categoriesStore.createCategory(data);
    // Trigger a refresh of the budget summary to get the new category
    emit('refresh');
  } catch (error) {
    console.error('Failed to add category:', error);
  }
}

function openTransferModal(category: CategorySummary) {
  transferSourceCategory.value = category;
  showTransferModal.value = true;
}

function handleTransferred() {
  transferSourceCategory.value = null;
  emit('refresh');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
</script>
