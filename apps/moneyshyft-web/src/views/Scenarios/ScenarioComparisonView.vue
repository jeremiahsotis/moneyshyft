<template>
  <div class="h-screen flex flex-col pt-16 bg-gray-50">
    <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <!-- Header -->
      <div v-if="scenariosStore.currentProjection" class="mb-6 flex justify-between items-start">
        <div>
          <nav class="flex mb-2" aria-label="Breadcrumb">
             <ol class="flex items-center space-x-2">
              <li>
                <router-link to="/scenarios" class="text-gray-400 hover:text-gray-500">Scenarios</router-link>
              </li>
              <li class="flex items-center">
                 <svg class="h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" /></svg>
                 <router-link :to="{ name: 'scenario-detail', params: { id: scenariosStore.currentProjection.scenario.id }}" class="ml-2 text-gray-500 hover:text-gray-700">
                   {{ scenariosStore.currentProjection.scenario.name }}
                 </router-link>
              </li>
              <li class="flex items-center">
                 <svg class="h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" /></svg>
                 <span class="ml-2 text-sm font-medium text-gray-700">Projection</span>
              </li>
             </ol>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900">Scenario Projection</h1>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="scenariosStore.isLoading && !scenariosStore.currentProjection" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>

      <!-- Comparison Content -->
      <div v-else-if="scenariosStore.currentProjection" class="flex-1 overflow-y-auto bg-white rounded-lg shadow">
         <div class="px-4 py-5 sm:p-6">
            
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <!-- Income -->
               <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 class="text-sm font-medium text-gray-500">Projected Planned Income</h3>
                  <div class="mt-2 flex items-baseline justify-between">
                     <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(scenariosStore.currentProjection.projected.total_planned_income) }}</p>
                     <span :class="getDiffClass(scenariosStore.currentProjection.projected.total_planned_income - scenariosStore.currentProjection.baseline.total_planned_income)">
                        {{ formatDiff(scenariosStore.currentProjection.projected.total_planned_income - scenariosStore.currentProjection.baseline.total_planned_income) }}
                     </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">vs {{ formatCurrency(scenariosStore.currentProjection.baseline.total_planned_income) }} (Baseline)</p>
               </div>
               
               <!-- Allocations -->
               <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 class="text-sm font-medium text-gray-500">Projected Expenses</h3>
                  <div class="mt-2 flex items-baseline justify-between">
                     <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(scenariosStore.currentProjection.projected.total_allocated) }}</p>
                     <span :class="getDiffCategoryClass(scenariosStore.currentProjection.projected.total_allocated - scenariosStore.currentProjection.baseline.total_allocated)">
                        {{ formatDiff(scenariosStore.currentProjection.projected.total_allocated - scenariosStore.currentProjection.baseline.total_allocated) }}
                     </span>
                  </div>
                   <p class="text-sm text-gray-500 mt-1">vs {{ formatCurrency(scenariosStore.currentProjection.baseline.total_allocated) }} (Baseline)</p>
               </div>

               <!-- Net -->
               <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 class="text-sm font-medium text-gray-500">Projected Net (Plan)</h3>
                  <div class="mt-2 flex items-baseline justify-between">
                     <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(scenariosStore.currentProjection.projected.projected_net) }}</p>
                     <span :class="getDiffClass(scenariosStore.currentProjection.projected.projected_net - (scenariosStore.currentProjection.baseline.total_planned_income - scenariosStore.currentProjection.baseline.total_allocated))">
                       {{ formatDiff(scenariosStore.currentProjection.projected.projected_net - (scenariosStore.currentProjection.baseline.total_planned_income - scenariosStore.currentProjection.baseline.total_allocated)) }}
                     </span>
                  </div>
                   <p class="text-sm text-gray-500 mt-1">Income - Expenses</p>
               </div>
            </div>

            <!-- Detailed Table -->
            <div class="overflow-x-auto">
               <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                     <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category / Section</th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Baseline Allocation</th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Projected Allocation</th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                     </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                     <template v-for="section in scenariosStore.currentProjection.projected.sections" :key="section.section_id">
                        <tr class="bg-gray-50">
                           <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ section.section_name }}</td>
                           <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {{ formatCurrency(getBaselineSection(section.section_id)?.allocated || 0) }}
                           </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {{ formatCurrency(section.allocated) }}
                           </td>
                           <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" :class="getDiffCategoryClass(section.allocated - (getBaselineSection(section.section_id)?.allocated || 0))">
                              {{ formatDiff(section.allocated - (getBaselineSection(section.section_id)?.allocated || 0)) }}
                           </td>
                        </tr>
                        <!-- Categories -->
                        <tr v-for="cat in section.categories" :key="cat.category_id">
                           <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 pl-10">{{ cat.category_name }}</td>
                           <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                              {{ formatCurrency(getBaselineCategory(section.section_id, cat.category_id)?.allocated || 0) }}
                           </td>
                           <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {{ formatCurrency(cat.allocated) }}
                           </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" :class="getDiffCategoryClass(cat.allocated - (getBaselineCategory(section.section_id, cat.category_id)?.allocated || 0))">
                              {{ formatDiff(cat.allocated - (getBaselineCategory(section.section_id, cat.category_id)?.allocated || 0)) }}
                           </td>
                        </tr>
                     </template>
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useScenariosStore } from '@/stores/scenarios';
import { useRoute } from 'vue-router';

const route = useRoute();
const scenariosStore = useScenariosStore();

onMounted(() => {
   const id = route.params.id as string;
   if (id) {
      scenariosStore.fetchProjection(id);
   }
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDiff(amount: number) {
  if (amount === 0) return '-';
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatCurrency(amount)}`;
}

// For Income/Net: Positive is Green, Negative is Red
function getDiffClass(amount: number) {
   if (amount > 0) return 'text-green-600';
   if (amount < 0) return 'text-red-600';
   return 'text-gray-400';
}

// For Expenses: Positive (increase) is Red, Negative (decrease) is Green
function getDiffCategoryClass(amount: number) {
   if (amount > 0) return 'text-red-600'; // Spending more is bad? Depends.
   if (amount < 0) return 'text-green-600'; // Saving money is good?
   return 'text-gray-400';
}

function getBaselineSection(id: string) {
   return scenariosStore.currentProjection?.baseline.sections.find((s: any) => s.section_id === id);
}

function getBaselineCategory(sectionId: string, categoryId: string) {
   const section = getBaselineSection(sectionId);
   return section?.categories.find((c: any) => c.category_id === categoryId);
}
</script>
