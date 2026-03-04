<template>
  <div class="h-screen flex flex-col pt-16 bg-gray-50">
    <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <!-- Header -->
      <div v-if="scenariosStore.currentScenario" class="mb-6 flex justify-between items-start">
        <div>
          <nav class="flex mb-2" aria-label="Breadcrumb">
            <ol class="flex items-center space-x-2">
              <li>
                <router-link to="/scenarios" class="text-gray-400 hover:text-gray-500">
                  <span class="sr-only">Scenarios</span>
                  <svg class="flex-shrink-0 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </router-link>
              </li>
              <li>
                <div class="flex items-center">
                  <svg class="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <router-link to="/scenarios" class="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700">Scenarios</router-link>
                </div>
              </li>
            </ol>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900">{{ scenariosStore.currentScenario.name }}</h1>
          <p class="text-sm text-gray-500">{{ scenariosStore.currentScenario.description }}</p>
        </div>
        <div class="flex space-x-3">
           <router-link :to="{ name: 'scenario-projection', params: { id: scenariosStore.currentScenario.id } }" class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
             View Projection
           </router-link>
           <button @click="showAddItemModal = true" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">
             Add Adjustment
           </button>
        </div>
      </div>

      <!-- Content -->
      <div v-if="scenariosStore.isLoading && !scenariosStore.currentScenario" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>

      <div v-else-if="scenariosStore.currentScenario" class="flex-1 overflow-y-auto bg-white rounded-lg shadow">
        <!-- Changes List -->
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Scenario Adjustments</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">Rules applied to your current budget.</p>
        </div>
        <ul class="divide-y divide-gray-200">
           <li v-if="!scenariosStore.currentScenario.items || scenariosStore.currentScenario.items.length === 0" class="px-4 py-12 text-center text-gray-500">
             No adjustments added yet. Click "Add Adjustment" to start.
           </li>
           <li v-for="item in scenariosStore.currentScenario.items" :key="item.id" class="px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-gray-50">
             <div>
               <p class="text-sm font-medium text-indigo-600 truncate">
                 {{ formatType(item.type) }}
               </p>
               <p class="mt-1 text-sm text-gray-500">
                 {{ formatDetails(item) }}
               </p>
             </div>
             <div class="flex items-center space-x-4">
               <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', item.amount < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800']">
                 {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}{{ item.is_percentage ? '%' : '' }}
               </span>
               <button @click="deleteItem(item.id)" class="text-red-400 hover:text-red-600">
                 <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
             </div>
           </li>
        </ul>
      </div>
    </div>

    <!-- Add Item Modal -->
    <div v-if="showAddItemModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showAddItemModal = false"></div>
        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <form @submit.prevent="addItem">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Add Adjustment</h3>
            
            <div class="space-y-4">
               <div>
                 <label class="block text-sm font-medium text-gray-700">Type</label>
                 <select v-model="newItem.type" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                   <option value="income_adjustment">Income Adjustment</option>
                   <option value="expense_adjustment">Expense Adjustment</option>
                   <option value="one_time_expense">One-Time Expense</option>
                   <option value="one_time_income">One-Time Income</option>
                 </select>
               </div>

               <div v-if="['income_adjustment', 'expense_adjustment'].includes(newItem.type)">
                 <label class="block text-sm font-medium text-gray-700">Scope</label>
                 <select v-model="newItem.scope" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                   <option value="global">Global (All Categories)</option>
                   <option value="section">Specific Section</option>
                   <option value="category">Specific Category</option>
                 </select>
               </div>
               
               <div v-if="newItem.scope === 'section'">
                 <label class="block text-sm font-medium text-gray-700">Section</label>
                 <select v-model="newItem.section_id" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                   <option :value="null" disabled>Select a section</option>
                   <option v-for="section in categoriesStore.sections" :key="section.id" :value="section.id">
                     {{ section.name }}
                   </option>
                 </select>
               </div>

               <div v-if="newItem.scope === 'category'">
                 <label class="block text-sm font-medium text-gray-700">Category</label>
                 <select v-model="newItem.category_id" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                   <option :value="null" disabled>Select a category</option>
                   <option v-for="category in categoriesStore.categories" :key="category.id" :value="category.id">
                     {{ category.name }}
                   </option>
                 </select>
               </div>
               
               <div>
                  <label class="block text-sm font-medium text-gray-700">Amount</label>
                  <div class="mt-1 relative rounded-md shadow-sm">
                    <input v-model.number="newItem.amount" type="number" step="0.01" class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md" placeholder="0.00">
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                       <span class="text-gray-500 sm:text-sm" id="price-currency">
                         {{ newItem.is_percentage ? '%' : '$' }}
                       </span>
                    </div>
                  </div>
               </div>

               <div class="flex items-center">
                 <input id="is_percentage" v-model="newItem.is_percentage" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                 <label for="is_percentage" class="ml-2 block text-sm text-gray-900">
                   This is a percentage adjustment
                 </label>
               </div>
            </div>

            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:col-start-2 sm:text-sm">
                Add
              </button>
              <button type="button" @click="showAddItemModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:col-start-1 sm:text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useScenariosStore } from '@/stores/scenarios';
import { useCategoriesStore } from '@/stores/categories';
import { useRoute } from 'vue-router';

const route = useRoute();
const scenariosStore = useScenariosStore();
const categoriesStore = useCategoriesStore();

const showAddItemModal = ref(false);
const newItem = reactive({
  type: 'expense_adjustment',
  scope: 'global',
  category_id: null as string | null,
  section_id: null as string | null,
  amount: 0,
  is_percentage: true
});

onMounted(async () => {
  const id = route.params.id as string;
  if (id) {
    scenariosStore.fetchScenarioById(id);
  }
  // Load categories for dropdowns
  if (categoriesStore.sections.length === 0) {
    await categoriesStore.fetchCategories();
  }
});

function formatType(type: string) {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDetails(item: any) {
  if (item.scope === 'global') return 'Applied Globally';
  
  if (item.scope === 'section') {
    const section = categoriesStore.sections.find(s => s.id === item.section_id);
    return `Applied to Section: ${section?.name || 'Unknown'} (ID: ${item.section_id})`;
  }
  
  if (item.scope === 'category') {
    const category = categoriesStore.categories.find(c => c.id === item.category_id);
    return `Applied to Category: ${category?.name || 'Unknown'} (ID: ${item.category_id})`;
  }
  
  return `Applied to ${item.scope}`;
}

async function addItem() {
  if (!scenariosStore.currentScenario) return;
  try {
    // Clear unused IDs based on scope
    if (newItem.scope === 'global') {
      newItem.category_id = null;
      newItem.section_id = null;
    } else if (newItem.scope === 'section') {
      newItem.category_id = null;
    } else if (newItem.scope === 'category') {
      newItem.section_id = null;
    }

    await scenariosStore.addItem(scenariosStore.currentScenario.id, newItem);
    showAddItemModal.value = false;
    // Reset form defaults
    newItem.amount = 0;
    newItem.category_id = null;
    newItem.section_id = null;
  } catch (e) {
    console.error(e);
  }
}

async function deleteItem(itemId: string) {
  if (!scenariosStore.currentScenario) return;
  if (confirm('Remove this adjustment?')) {
    await scenariosStore.removeItem(itemId, scenariosStore.currentScenario.id);
  }
}
</script>
