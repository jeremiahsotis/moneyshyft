<template>
  <div class="h-screen flex flex-col pt-16 bg-gray-50">
    <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Budget Scenarios</h1>
          <p class="mt-1 text-sm text-gray-500">Plan for the future with "What-If" scenarios.</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
        >
          Create Scenario
        </button>
      </div>

      <!-- Scenarios List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="scenariosStore.isLoading && scenariosStore.scenarios.length === 0" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>

        <div v-else-if="scenariosStore.scenarios.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
          <h3 class="mt-2 text-sm font-medium text-gray-900">No scenarios</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new budget scenario.</p>
          <div class="mt-6">
            <button
              @click="showCreateModal = true"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Create Scenario
            </button>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="scenario in scenariosStore.scenarios"
            :key="scenario.id"
            class="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
          >
            <div class="flex-1 min-w-0">
              <router-link :to="{ name: 'scenario-detail', params: { id: scenario.id } }" class="focus:outline-none">
                <span class="absolute inset-0" aria-hidden="true" />
                <p class="text-sm font-medium text-gray-900">{{ scenario.name }}</p>
                <p class="text-sm text-gray-500 truncate">{{ scenario.description || 'No description' }}</p>
              </router-link>
            </div>
            <div class="z-10 absolute top-2 right-2 flex space-x-2 opacity-50 hover:opacity-100">
               <button @click.prevent="deleteScenario(scenario.id)" class="p-1 text-red-600 hover:bg-red-50 rounded">
                 <!-- Trash Icon -->
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showCreateModal = false"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <form @submit.prevent="createScenario">
            <div>
              <div class="mt-3 text-center sm:mt-5">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">New Scenario</h3>
                <div class="mt-2 text-left">
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700">Name</label>
                    <input v-model="newScenarioName" type="text" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g. Job Loss, New House">
                  </div>
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea v-model="newScenarioDesc" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button type="submit" :disabled="scenariosStore.isLoading" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm">
                {{ scenariosStore.isLoading ? 'Creating...' : 'Create' }}
              </button>
              <button type="button" @click="showCreateModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm">
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
import { ref, onMounted } from 'vue';
import { useScenariosStore } from '@/stores/scenarios';
import { useRouter } from 'vue-router';

const scenariosStore = useScenariosStore();
const router = useRouter();

const showCreateModal = ref(false);
const newScenarioName = ref('');
const newScenarioDesc = ref('');

onMounted(() => {
  scenariosStore.fetchScenarios();
});

async function createScenario() {
  if (!newScenarioName.value) return;
  try {
    const scenario = await scenariosStore.createScenario({
      name: newScenarioName.value,
      description: newScenarioDesc.value
    });
    showCreateModal.value = false;
    newScenarioName.value = '';
    newScenarioDesc.value = '';
    router.push({ name: 'scenario-detail', params: { id: scenario.id } });
  } catch (e) {
    // Error handled in store
  }
}

async function deleteScenario(id: string) {
  if (confirm('Are you sure you want to delete this scenario?')) {
    await scenariosStore.deleteScenario(id);
  }
}
</script>
